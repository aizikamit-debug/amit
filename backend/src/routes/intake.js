const router = require('express').Router();
const Groq = require('groq-sdk');

// ── GET intake for a patient (latest version) ──
router.get('/patient/:patient_id', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const result = await db.query(
      `SELECT * FROM intake_versions WHERE patient_id = $1 ORDER BY version_number DESC LIMIT 1`,
      [req.params.patient_id]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET all versions for a patient ──
router.get('/patient/:patient_id/versions', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const result = await db.query(
      `SELECT id, patient_id, version_number, edit_type, ai_instructions, created_at
       FROM intake_versions WHERE patient_id = $1 ORDER BY version_number DESC`,
      [req.params.patient_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET specific version ──
router.get('/versions/:id', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const result = await db.query('SELECT * FROM intake_versions WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'גרסה לא נמצאה' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SAVE intake (new version) ──
router.post('/patient/:patient_id', async (req, res) => {
  const db = req.app.locals.db;
  const { content, edit_type = 'manual', ai_instructions = null } = req.body;
  try {
    // Get next version number
    const vResult = await db.query(
      'SELECT COALESCE(MAX(version_number), 0) + 1 AS next_v FROM intake_versions WHERE patient_id = $1',
      [req.params.patient_id]
    );
    const version_number = vResult.rows[0].next_v;

    const result = await db.query(
      `INSERT INTO intake_versions (patient_id, version_number, content, edit_type, ai_instructions)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.patient_id, version_number, JSON.stringify(content), edit_type, ai_instructions]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ORGANIZE free text with AI (no save) ──
router.post('/organize', async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'טקסט ריק' });
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const prompt = `אתה עוזר קליני המסייע לארגן תיעוד פסיכולוגי.
קיבלת טקסט חופשי מתוך מפגש אינטייק.

המשימה: הפץ את תוכן הטקסט לסעיפים הרלוונטיים בלבד.

חוקים מחייבים:
1. אל תמציא מידע שאינו קיים בטקסט
2. אם סעיף לא מכוסה בטקסט — השאר אותו ריק לחלוטין. אל תכתוב "לא צוין" או "לא ידוע"
3. השתמש אך ורק במידע שמופיע במפורש בטקסט
4. שמור על לשון המטופל / המטפל ככל האפשר
5. אל תוסיף פרשנות קלינית — רק ארגון

החזר JSON בלבד בפורמט:
{
  "presenting_problem": "",
  "psychiatric_history": "",
  "medical_history": "",
  "family_history": "",
  "developmental_history": "",
  "substance_use": "",
  "risk_assessment": "",
  "mse": "",
  "clinical_formulation": ""
}

סעיף ריק = מחרוזת ריקה "". לא טקסט placeholder.

הטקסט לארגון:
${text}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 2000,
    });

    const raw = completion.choices[0].message.content;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'תשובה לא תקינה מה-AI' });
    const organized = JSON.parse(jsonMatch[0]);
    res.json({ organized });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── EDIT with AI (clinical polish) ──
router.post('/edit-ai', async (req, res) => {
  const { content, instructions = '' } = req.body;
  if (!content) return res.status(400).json({ error: 'תוכן ריק' });
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const instructionLine = instructions.trim()
      ? `\n\nהוראות המטפל: ${instructions.trim()}`
      : '';

    const prompt = `אתה פסיכולוג קליני מומחה. קיבלת אינטייק פסיכולוגי גולמי.
משימתך: ערוך וחדד את הניסוח ברמה קלינית גבוהה.${instructionLine}

חוקים:
1. אל תמציא מידע שלא קיים
2. שפר ניסוח, בהירות ורמה קלינית
3. שמור על כל המידע המקורי
4. כתוב פרוזה קלינית רהוטה בעברית
5. השאר שדות ריקים ריקים — אל תמלא מידע שאינו קיים

התוכן לעריכה (JSON):
${JSON.stringify(content, null, 2)}

החזר JSON בלבד באותו מבנה, ללא הסברים.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 2000,
    });

    const raw = completion.choices[0].message.content;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'תשובה לא תקינה מה-AI' });
    const edited = JSON.parse(jsonMatch[0]);
    res.json({ edited });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
