const router = require('express').Router();
const axios = require('axios');

router.get('/patient/:patient_id', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const result = await db.query(
      `SELECT n.*, s.session_date FROM clinical_notes n
       LEFT JOIN sessions s ON n.session_id = s.id
       WHERE n.patient_id = $1 ORDER BY n.note_date DESC`,
      [req.params.patient_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const db = req.app.locals.db;
  const { patient_id, session_id, note_date, note_type, raw_text, is_transcribed } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO clinical_notes (patient_id, session_id, note_date, note_type, raw_text, is_transcribed)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [patient_id, session_id, note_date || new Date().toISOString().split('T')[0], note_type || 'session', raw_text, is_transcribed || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const db = req.app.locals.db;
  const { raw_text, processed_text } = req.body;
  try {
    const result = await db.query(
      `UPDATE clinical_notes SET raw_text = COALESCE($1, raw_text), processed_text = COALESCE($2, processed_text),
       updated_at = NOW() WHERE id = $3 RETURNING *`,
      [raw_text, processed_text, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI processing endpoint
router.post('/:id/process', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const note = await db.query('SELECT * FROM clinical_notes WHERE id = $1', [req.params.id]);
    if (!note.rows.length) return res.status(404).json({ error: 'לא נמצא' });

    const rawText = note.rows[0].raw_text;
    if (!rawText) return res.status(400).json({ error: 'אין טקסט לעיבוד' });

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `אתה עוזר לפסיכולוג קליני לעבד תיעוד פגישה. 
        
הטקסט הבא הוא תיעוד גולמי של פגישה טיפולית (תמליל קולי או כתיבה מהירה). 
המשימה שלך: הפוך אותו לתיעוד קליני קריא, מסודר ומדויק. שמור על המידע הקליני, ארגן לפסקאות ברורות, השתמש בשפה מקצועית אך ברורה. 
אל תוסיף מידע שלא קיים בטקסט המקורי. כתוב בעברית.

טקסט גולמי:
${rawText}

תיעוד מעובד:`
      }]
    }, {
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }
    });

    const processedText = response.data.content[0].text;
    await db.query('UPDATE clinical_notes SET processed_text = $1, updated_at = NOW() WHERE id = $2', [processedText, req.params.id]);
    res.json({ processed_text: processedText });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST parse weekly transcription with AI, split by patient
router.post('/parse-weekly', async (req, res) => {
  const db = req.app.locals.db;
  const { transcription } = req.body;
  if (!transcription?.trim()) return res.status(400).json({ error: 'חסר תמלול' });
  try {
    // Get this week's sessions (Sunday–Friday) ordered by date/time
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sunday
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 5); // Sunday to Friday
    weekEnd.setHours(23, 59, 59, 999);

    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const sessionsRes = await db.query(
      `SELECT s.id as session_id, s.session_date, s.session_time,
              p.id as patient_id, p.first_name, p.last_name
       FROM sessions s
       JOIN patients p ON s.patient_id = p.id
       WHERE s.session_date BETWEEN $1 AND $2
         AND p.status != 'ended'
       ORDER BY s.session_date ASC, s.session_time ASC NULLS LAST`,
      [weekStartStr, weekEndStr]
    );
    const weekSessions = sessionsRes.rows;

    // Also get all active patients as fallback for matching
    const patientsRes = await db.query(`SELECT id, first_name, last_name FROM patients WHERE status != 'ended'`);
    const allPatients = patientsRes.rows;

    // Build patient list for AI prompt — week sessions first (with date), then rest
    const weekPatientIds = new Set(weekSessions.map(s => s.patient_id));
    const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

    const weekPatientsContext = weekSessions.map(s => {
      const date = new Date(s.session_date);
      const day = dayNames[date.getDay()];
      const time = s.session_time ? s.session_time.slice(0, 5) : '';
      return `${s.first_name} ${s.last_name} (יום ${day}${time ? ' ' + time : ''})`;
    }).join('\n');

    const otherPatients = allPatients
      .filter(p => !weekPatientIds.has(p.id))
      .map(p => `${p.first_name} ${p.last_name}`)
      .join('\n');

    const prompt = `אתה עוזר לפסיכולוג קליני. יש לך תמלול של מספר פגישות טיפוליות מהשבוע.

מטופלים שהיו השבוע (לפי סדר הפגישות ביומן):
${weekPatientsContext || 'אין נתונים מהיומן'}

${otherPatients ? `מטופלים נוספים במערכת:\n${otherPatients}` : ''}

המשימה: זהה כל מטופל שמוזכר בתמלול לפי שם פרטי. פרק את התמלול לסגמנטים לפי מטופל ועבד כל סגמנט לתיעוד קליני קצר ומקצועי בעברית.

חשוב:
- שם פרטי בלבד מספיק לזיהוי
- אם מוזכר מטופל מרשימת השבוע — ודא שהשם המלא הוא לפי הרשימה
- החזר את הסגמנטים לפי סדר הופעתם בתמלול

החזר JSON בלבד (ללא טקסט נוסף):
[{"patient_name": "שם מלא", "content": "תיעוד מעובד"}]

אם קטע לא שייך לאף מטופל מהרשימות — דלג עליו.

תמלול:
${transcription}`;

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    }, { headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' } });

    const text = response.data.content[0].text.trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return res.status(500).json({ error: 'AI לא החזיר פורמט תקין' });
    const segments = JSON.parse(jsonMatch[0]);

    // Match each segment to a patient, annotate with session info
    const previews = segments.map(seg => {
      // Try to find in week sessions first
      const weekSession = weekSessions.find(s =>
        `${s.first_name} ${s.last_name}` === seg.patient_name ||
        s.first_name === seg.patient_name.split(' ')[0] ||
        seg.patient_name.includes(s.first_name)
      );
      if (weekSession) {
        const date = new Date(weekSession.session_date);
        const dayNames2 = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
        return {
          ...seg,
          patient_name: `${weekSession.first_name} ${weekSession.last_name}`,
          patient_id: weekSession.patient_id,
          session_id: weekSession.session_id,
          matched: true,
          session_date: weekSession.session_date,
          session_time: weekSession.session_time,
          day_name: dayNames2[date.getDay()]
        };
      }
      // Fallback: any patient in system
      const patient = allPatients.find(p =>
        `${p.first_name} ${p.last_name}` === seg.patient_name ||
        p.first_name === seg.patient_name.split(' ')[0] ||
        seg.patient_name.includes(p.first_name)
      );
      return { ...seg, patient_id: patient?.id || null, matched: !!patient, session_date: null, day_name: null };
    });

    // Sort by calendar order: week sessions first (by date/time), then unmatched
    const sessionOrder = weekSessions.map(s => s.patient_id);
    previews.sort((a, b) => {
      const ai = sessionOrder.indexOf(a.patient_id);
      const bi = sessionOrder.indexOf(b.patient_id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    res.json({ previews, weekRange: { start: weekStartStr, end: weekEndStr } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST split weekly transcription by patient name (no AI processing — raw text)
router.post('/split-weekly', async (req, res) => {
  const db = req.app.locals.db;
  const { transcription } = req.body;
  if (!transcription?.trim()) return res.status(400).json({ error: 'חסר תמלול' });
  try {
    const patientsRes = await db.query(`SELECT id, first_name, last_name FROM patients WHERE status != 'ended'`);
    const patients = patientsRes.rows;

    // Build a sorted list of {patient, index} where patient name appears in text
    const mentions = [];
    for (const p of patients) {
      const names = [p.first_name, `${p.first_name} ${p.last_name}`];
      for (const name of names) {
        let idx = 0;
        while (true) {
          const pos = transcription.indexOf(name, idx);
          if (pos === -1) break;
          mentions.push({ patient: p, pos, name });
          idx = pos + name.length;
        }
      }
    }
    mentions.sort((a, b) => a.pos - b.pos);

    if (mentions.length === 0) {
      return res.json({ previews: [] });
    }

    // Split text into segments
    const segments = [];
    for (let i = 0; i < mentions.length; i++) {
      const start = mentions[i].pos;
      const end = i + 1 < mentions.length ? mentions[i + 1].pos : transcription.length;
      const content = transcription.slice(start, end).trim();
      // De-duplicate: if same patient already added, merge content
      const existing = segments.find(s => s.patient_id === mentions[i].patient.id);
      if (existing) {
        existing.content += '\n\n' + content;
      } else {
        segments.push({
          patient_name: `${mentions[i].patient.first_name} ${mentions[i].patient.last_name}`,
          patient_id: mentions[i].patient.id,
          matched: true,
          content
        });
      }
    }
    res.json({ previews: segments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST save parsed weekly notes
router.post('/save-weekly', async (req, res) => {
  const db = req.app.locals.db;
  const { segments } = req.body; // [{patient_id, content}]
  try {
    const saved = [];
    for (const seg of (segments || [])) {
      if (!seg.patient_id || !seg.content) continue;
      const note = await db.query(
        `INSERT INTO clinical_notes (patient_id, note_date, note_type, raw_text, processed_text, is_transcribed)
         VALUES ($1, CURRENT_DATE, 'session', $2, $2, true) RETURNING id`,
        [seg.patient_id, seg.content]
      );
      saved.push(note.rows[0].id);
    }
    res.json({ saved: saved.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
