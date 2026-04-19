const router = require('express').Router();
const axios = require('axios');

// ── File parsing helpers (safe lazy load) ─────────────────────────────────────
function parseExcel(buffer) {
  const xlsx = require('xlsx');
  const wb = xlsx.read(buffer, { type: 'buffer' });
  const lines = [];
  for (const name of wb.SheetNames) {
    const csv = xlsx.utils.sheet_to_csv(wb.Sheets[name], { blankrows: false });
    if (csv.trim()) lines.push(`[גיליון: ${name}]\n${csv}`);
  }
  return lines.join('\n\n');
}

async function parsePdf(buffer) {
  // Use the internal module to avoid pdf-parse's test-file require bug
  const pdfParse = require('pdf-parse/lib/pdf-parse.js');
  const data = await pdfParse(buffer);
  return data.text;
}

// ── Multer setup ──────────────────────────────────────────────────────────────
function upload(req, res, next) {
  const multer = require('multer');
  multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } })
    .single('file')(req, res, next);
}

// ─── POST /api/import/preview ─────────────────────────────────────────────────
router.post('/preview', upload, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'לא הועלה קובץ' });

  const name = req.file.originalname.toLowerCase();
  const mime = req.file.mimetype;
  const mode = req.body.mode || 'patients'; // 'patients' | 'notes'
  let rawText = '';

  try {
    if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv') ||
        mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) {
      rawText = parseExcel(req.file.buffer);
    } else if (name.endsWith('.pdf') || mime === 'application/pdf') {
      rawText = await parsePdf(req.file.buffer);
    } else {
      return res.status(400).json({ error: 'פורמט לא נתמך. השתמש ב-Excel (.xlsx/.xls/.csv) או PDF' });
    }

    if (!rawText.trim()) return res.status(400).json({ error: 'הקובץ ריק או לא ניתן לקריאה' });

    // ── AI prompt based on mode ───────────────────────────────────────────────
    let prompt;

    if (mode === 'notes') {
      // Get active patients for matching
      const db = req.app.locals.db;
      const { rows: patients } = await db.query(
        `SELECT id, first_name, last_name FROM patients WHERE status != 'ended'`
      );
      const patientList = patients.map(p => `${p.first_name} ${p.last_name}`).join('\n');

      prompt = `אתה עוזר לפסיכולוג קליני לייבא סיכומי פגישות ממסמך.

מטופלים קיימים במערכת:
${patientList || 'אין מטופלים עדיין'}

המשימה: זהה וחלץ סיכומי פגישות מהטקסט.

שדות לחילוץ לכל פגישה:
- patient_name: שם מלא של המטופל (חובה — התאם לרשימה למעלה)
- session_date: תאריך הפגישה (YYYY-MM-DD אם אפשר, אחרת כפי שכתוב)
- content: תוכן הסיכום / תיעוד הפגישה (טקסט מלא, כולל כל הפרטים הקליניים)
- note_type: סוג הרשומה — "session" (פגישה), "summary" (סיכום), "intake" (קבלה)

כללים:
- כל פגישה = אובייקט נפרד
- אם יש מספר פגישות לאותו מטופל — צור אובייקט לכל פגישה
- שמור את תוכן הפגישה המלא ב-content, אל תקצר
- אם התאריך לא ברור — השאר null

החזר JSON בלבד:
[{"patient_name": "...", "session_date": "...", "content": "...", "note_type": "session"}]

תוכן הקובץ:
${rawText.slice(0, 10000)}`;

    } else {
      // patients mode
      prompt = `אתה עוזר לפסיכולוג קליני לייבא מטופלים לתוך מערכת ניהול קליניקה.

המשימה: זהה וחלץ פרטי מטופלים מהטקסט.

שדות לחילוץ (מלא רק מה שקיים):
- first_name: שם פרטי (חובה)
- last_name: שם משפחה (חובה)
- phone: מספר טלפון
- email: אימייל
- date_of_birth: תאריך לידה (YYYY-MM-DD)
- id_number: תעודת זהות
- address: כתובת
- session_fee: תעריף פגישה (מספר בלבד)
- notes: מידע קליני נוסף (אבחנה, הפניה, מצב וכו')

כללים:
- אם יש מספר מטופלים — החזר כולם
- תאריך לידה: המר לפורמט YYYY-MM-DD
- first_name ו-last_name הם חובה — אם לא ניתן לזהות שם מלא, דלג
- החזר JSON בלבד

[{"first_name": "...", "last_name": "...", "phone": "..."}]

תוכן הקובץ:
${rawText.slice(0, 8000)}`;
    }

    const aiRes = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
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
    if (!jsonMatch) return res.status(400).json({ error: 'לא זוהו נתונים בקובץ' });

    const items = JSON.parse(jsonMatch[0]);

    if (mode === 'notes') {
      const valid = items.filter(i => i.patient_name && i.content);
      if (!valid.length) return res.status(400).json({ error: 'לא נמצאו פגישות בקובץ' });

      // Try to match patients
      const db = req.app.locals.db;
      const { rows: patients } = await db.query(`SELECT id, first_name, last_name FROM patients WHERE status != 'ended'`);
      const enriched = valid.map(item => {
        const nameLow = (item.patient_name || '').toLowerCase();
        const matched = patients.find(p =>
          nameLow.includes(p.first_name.toLowerCase()) && nameLow.includes(p.last_name.toLowerCase())
        );
        return { ...item, patient_id: matched?.id || null, matched: !!matched };
      });
      return res.json({ items: enriched, total: enriched.length, mode: 'notes' });
    } else {
      const valid = items.filter(i => i.first_name && i.last_name);
      if (!valid.length) return res.status(400).json({ error: 'לא נמצאו מטופלים עם שם מלא בקובץ' });
      return res.json({ items: valid, total: valid.length, mode: 'patients' });
    }

  } catch (err) {
    console.error('Import error:', err.message);
    res.status(500).json({ error: 'שגיאה בעיבוד הקובץ: ' + err.message });
  }
});

// ─── POST /api/import/confirm ─────────────────────────────────────────────────
router.post('/confirm', async (req, res) => {
  const db = req.app.locals.db;
  const { items, mode } = req.body;
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'אין פריטים לשמירה' });

  const saved = [], skipped = [], errors = [];

  if (mode === 'notes') {
    for (const item of items) {
      if (!item.patient_id || !item.content) { skipped.push({ ...item, reason: 'חסר מטופל או תוכן' }); continue; }
      try {
        let noteDate = item.session_date || new Date().toISOString().split('T')[0];
        // Normalize date
        if (noteDate && !/^\d{4}-\d{2}-\d{2}$/.test(noteDate)) {
          const d = new Date(noteDate);
          noteDate = isNaN(d) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
        }
        const r = await db.query(
          `INSERT INTO clinical_notes (patient_id, note_date, note_type, raw_text, processed_text, is_transcribed)
           VALUES ($1,$2,$3,$4,$4,false) RETURNING id`,
          [item.patient_id, noteDate, item.note_type || 'session', item.content]
        );
        saved.push({ ...item, id: r.rows[0].id });
      } catch (err) { errors.push({ ...item, error: err.message }); }
    }
  } else {
    for (const p of items) {
      if (!p.first_name?.trim() || !p.last_name?.trim()) { skipped.push(p); continue; }
      try {
        const dup = await db.query(
          `SELECT id FROM patients WHERE LOWER(first_name)=LOWER($1) AND LOWER(last_name)=LOWER($2)`,
          [p.first_name.trim(), p.last_name.trim()]
        );
        if (dup.rows.length) { skipped.push({ ...p, reason: 'כבר קיים' }); continue; }
        const r = await db.query(
          `INSERT INTO patients (first_name,last_name,phone,email,date_of_birth,id_number,address,session_fee,notes,status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active') RETURNING id`,
          [p.first_name.trim(), p.last_name.trim(), p.phone||null, p.email||null,
           p.date_of_birth||null, p.id_number||null, p.address||null,
           p.session_fee ? Number(p.session_fee) : 450, p.notes||null]
        );
        saved.push({ ...p, id: r.rows[0].id });
      } catch (err) { errors.push({ ...p, error: err.message }); }
    }
  }

  res.json({ saved: saved.length, skipped: skipped.length, errors: errors.length });
});

module.exports = router;
