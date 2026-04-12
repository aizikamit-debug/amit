const router = require('express').Router();
const Groq = require('groq-sdk');

// ── Generate treatment summary ──
router.post('/patient/:patient_id', async (req, res) => {
  const db = req.app.locals.db;
  const { instructions = '' } = req.body;

  try {
    const patientRes = await db.query('SELECT * FROM patients WHERE id = $1', [req.params.patient_id]);
    if (!patientRes.rows.length) return res.status(404).json({ error: 'מטופל לא נמצא' });
    const patient = patientRes.rows[0];

    // Get intake (latest)
    const intakeRes = await db.query(
      'SELECT content FROM intake_versions WHERE patient_id = $1 ORDER BY version_number DESC LIMIT 1',
      [req.params.patient_id]
    );
    const intakeContent = intakeRes.rows[0]?.content || null;

    // Get all session notes
    const notesRes = await db.query(
      `SELECT cn.*, s.session_date, s.session_time
       FROM clinical_notes cn
       LEFT JOIN sessions s ON cn.session_id = s.id
       WHERE cn.patient_id = $1
       ORDER BY COALESCE(s.session_date, cn.note_date) ASC`,
      [req.params.patient_id]
    );

    // Get questionnaire results
    const qRes = await db.query(
      `SELECT qr.total_score, qr.interpretation, qr.completed_at, qt.name_he
       FROM questionnaire_responses qr
       JOIN questionnaire_types qt ON qr.questionnaire_type_id = qt.id
       WHERE qr.patient_id = $1 ORDER BY qr.completed_at ASC`,
      [req.params.patient_id]
    );

    // Get session stats
    const statsRes = await db.query(
      `SELECT COUNT(*) as total,
              MIN(session_date) as first_date,
              MAX(session_date) as last_date
       FROM sessions WHERE patient_id = $1 AND status = 'completed'`,
      [req.params.patient_id]
    );
    const stats = statsRes.rows[0];

    const fullName = `${patient.first_name} ${patient.last_name}`;
    const instructionLine = instructions.trim() ? `\n\nהוראות המטפל: ${instructions.trim()}` : '';

    // Build context
    let context = `## פרטי מטופל\nשם: ${fullName}\n`;
    if (patient.date_of_birth) context += `תאריך לידה: ${patient.date_of_birth}\n`;
    if (patient.treatment_type) context += `סוג טיפול: ${patient.treatment_type}\n`;
    context += `סה"כ פגישות: ${stats.total}\n`;
    if (stats.first_date) context += `תקופת טיפול: ${new Date(stats.first_date).toLocaleDateString('he-IL')} — ${new Date(stats.last_date).toLocaleDateString('he-IL')}\n`;

    if (intakeContent) {
      context += `\n## אינטייק\n`;
      const sections = {
        presenting_problem: 'סיבת פנייה',
        psychiatric_history: 'היסטוריה פסיכיאטרית',
        medical_history: 'היסטוריה רפואית',
        family_history: 'היסטוריה משפחתית',
        developmental_history: 'היסטוריה התפתחותית',
        substance_use: 'שימוש בחומרים',
        risk_assessment: 'הערכת סיכון',
        mse: 'MSE',
        clinical_formulation: 'ניסוח קליני ראשוני',
      };
      for (const [key, label] of Object.entries(sections)) {
        if (intakeContent[key]) context += `### ${label}\n${intakeContent[key]}\n`;
      }
    }

    if (notesRes.rows.length > 0) {
      context += `\n## סיכומי פגישות\n`;
      notesRes.rows.forEach((n, i) => {
        const dateStr = n.session_date ? new Date(n.session_date).toLocaleDateString('he-IL') : 'לא ידוע';
        const text = n.processed_text || n.content || '';
        if (text) context += `\nפגישה ${i + 1} (${dateStr}):\n${text}\n`;
      });
    }

    if (qRes.rows.length > 0) {
      context += `\n## תוצאות שאלונים\n`;
      qRes.rows.forEach(q => {
        context += `${q.name_he}: ${q.total_score}${q.interpretation ? ` (${q.interpretation})` : ''} — ${new Date(q.completed_at).toLocaleDateString('he-IL')}\n`;
      });
    }

    const prompt = `אתה פסיכולוג קליני מומחה הכותב סיכום טיפול רשמי.
בהתבסס על החומרים הבאים — כתוב סיכום טיפול מקצועי ומלא בעברית.${instructionLine}

המסמך יכלול:
1. פרטים מזהים ותקופת הטיפול
2. סיבת הפנייה המקורית
3. ניסוח קליני ואבחנה (אם ידוע)
4. גישה טיפולית ושיטות עבודה (לפי מה שעולה מהסיכומים)
5. מהלך הטיפול — נושאים מרכזיים ותהליכים משמעותיים
6. מדדי שינוי — כולל ציוני שאלונים אם קיימים
7. מצב המטופל בסיום
8. המלצות להמשך (אם רלוונטי)

כתוב בעברית רשמית, פרוזה רציפה ולא נקודות, ברמה של פסיכולוג קליני מומחה.
אל תמציא מידע שאינו קיים בחומרים. אם חסר מידע — דלג על הסעיף.

--- החומרים ---
${context}`;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 3000,
    });

    const summary = completion.choices[0].message.content;
    res.json({ summary, patient_name: fullName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
