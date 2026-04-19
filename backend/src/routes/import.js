const router = require('express').Router();
const axios = require('axios');

// Lazy-load heavy packages to avoid startup crashes
let multer, xlsxLib, pdfParse;
try { multer = require('multer'); } catch(e) { console.error('multer not available:', e.message); }
try { xlsxLib = require('xlsx'); } catch(e) { console.error('xlsx not available:', e.message); }
try { pdfParse = require('pdf-parse/lib/pdf-parse.js'); } catch(e) {
  try { pdfParse = require('pdf-parse'); } catch(e2) { console.error('pdf-parse not available:', e2.message); }
}

function getUpload() {
  if (!multer) throw new Error('multer לא זמין');
  return multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
}

// ─── POST /api/import/preview ─────────────────────────────────────────────────
// Accepts Excel or PDF, returns extracted patient list for preview
router.post('/preview', (req, res, next) => {
  try { getUpload().single('file')(req, res, next); }
  catch(e) { res.status(500).json({ error: e.message }); }
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'לא הועלה קובץ' });

  const mime = req.file.mimetype;
  const name = req.file.originalname.toLowerCase();
  let rawText = '';

  try {
    // ── Extract raw text from file ──────────────────────────────────────────
    if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv') ||
        mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) {
      if (!xlsxLib) return res.status(500).json({ error: 'ספריית Excel לא זמינה בשרת' });
      // Excel / CSV
      const wb = xlsxLib.read(req.file.buffer, { type: 'buffer' });
      const lines = [];
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const csv = xlsxLib.utils.sheet_to_csv(ws, { blankrows: false });
        if (csv.trim()) lines.push(`[גיליון: ${sheetName}]\n${csv}`);
      }
      rawText = lines.join('\n\n');
    } else if (name.endsWith('.pdf') || mime === 'application/pdf') {
      if (!pdfParse) return res.status(500).json({ error: 'ספריית PDF לא זמינה בשרת' });
      // PDF
      const data = await pdfParse(req.file.buffer);
      rawText = data.text;
    } else {
      return res.status(400).json({ error: 'פורמט לא נתמך. השתמש ב-Excel (.xlsx/.xls/.csv) או PDF' });
    }

    if (!rawText.trim()) return res.status(400).json({ error: 'הקובץ ריק או לא ניתן לקריאה' });

    // ── Send to Claude for intelligent extraction ───────────────────────────
    const prompt = `אתה עוזר לפסיכולוג קליני לייבא מטופלים לתוך מערכת ניהול קליניקה.

להלן תוכן קובץ (Excel או PDF) שהועלה. המשימה שלך: זהה וחלץ פרטי מטופלים מהטקסט.

שדות לחילוץ לכל מטופל (מלא רק את מה שקיים):
- first_name: שם פרטי
- last_name: שם משפחה
- phone: מספר טלפון
- email: אימייל
- date_of_birth: תאריך לידה (פורמט YYYY-MM-DD אם אפשר)
- id_number: תעודת זהות
- address: כתובת
- session_fee: תעריף פגישה (מספר בלבד, ללא ₪)
- notes: כל מידע רלוונטי נוסף (אבחנה, הפניה, מידע רפואי וכו')

כללים:
- אם יש מספר מטופלים — החזר כולם
- אם השם לא ברור — נסה לפצל לשם פרטי ומשפחה
- תאריך לידה: המר לפורמט YYYY-MM-DD
- טלפון: שמור ספרות בלבד (עם מקפים זה בסדר)
- אם שדה לא קיים — השמט אותו מהאובייקט
- first_name ו-last_name הם שדות חובה — אם לא ניתן לזהות שם, דלג על הרשומה

החזר JSON בלבד, ללא הסבר:
[{"first_name": "...", "last_name": "...", "phone": "...", ...}]

תוכן הקובץ:
${rawText.slice(0, 8000)}`; // limit to 8000 chars

    const aiRes = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }]
    }, {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    });

    const aiText = aiRes.data.content[0].text.trim();
    const jsonMatch = aiText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return res.status(500).json({ error: 'לא זוהו מטופלים בקובץ' });

    const patients = JSON.parse(jsonMatch[0]).filter(p => p.first_name && p.last_name);
    if (!patients.length) return res.status(400).json({ error: 'לא נמצאו מטופלים עם שם מלא בקובץ' });

    res.json({ patients, total: patients.length });
  } catch (err) {
    console.error('Import error:', err.message);
    res.status(500).json({ error: 'שגיאה בעיבוד הקובץ: ' + err.message });
  }
});

// ─── POST /api/import/confirm ─────────────────────────────────────────────────
// Save confirmed patients to DB
router.post('/confirm', async (req, res) => {
  const db = req.app.locals.db;
  const { patients } = req.body;
  if (!Array.isArray(patients) || !patients.length) {
    return res.status(400).json({ error: 'אין מטופלים לשמירה' });
  }

  const saved = [], skipped = [], errors = [];

  for (const p of patients) {
    if (!p.first_name?.trim() || !p.last_name?.trim()) {
      skipped.push(p);
      continue;
    }
    try {
      // Check for duplicate (same first + last name)
      const dup = await db.query(
        `SELECT id FROM patients WHERE LOWER(first_name)=LOWER($1) AND LOWER(last_name)=LOWER($2)`,
        [p.first_name.trim(), p.last_name.trim()]
      );
      if (dup.rows.length) { skipped.push({ ...p, reason: 'כבר קיים' }); continue; }

      const result = await db.query(
        `INSERT INTO patients
           (first_name, last_name, phone, email, date_of_birth, id_number, address, session_fee, notes, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active') RETURNING id`,
        [
          p.first_name.trim(),
          p.last_name.trim(),
          p.phone || null,
          p.email || null,
          p.date_of_birth || null,
          p.id_number || null,
          p.address || null,
          p.session_fee ? Number(p.session_fee) : 450,
          p.notes || null
        ]
      );
      saved.push({ ...p, id: result.rows[0].id });
    } catch (err) {
      errors.push({ ...p, error: err.message });
    }
  }

  res.json({ saved: saved.length, skipped: skipped.length, errors: errors.length, details: { saved, skipped, errors } });
});

module.exports = router;
