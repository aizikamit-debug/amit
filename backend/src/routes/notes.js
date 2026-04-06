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
    const patientsRes = await db.query(`SELECT id, first_name, last_name FROM patients WHERE status != 'ended'`);
    const patients = patientsRes.rows;
    const patientNames = patients.map(p => `${p.first_name} ${p.last_name}`).join('\n');
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{ role: 'user', content: `אתה עוזר לפסיכולוג קליני. יש לך תמלול של מספר פגישות טיפוליות מהשבוע.

רשימת מטופלים:
${patientNames}

המשימה: פרק את התמלול לסגמנטים לפי מטופל. כל סגמנט מתחיל כשנזכר שם מטופל (שם פרטי בלבד מספיק). עבד כל סגמנט לתיעוד קליני קצר ומקצועי בעברית.

החזר JSON בלבד (ללא טקסט נוסף):
[{"patient_name": "שם מלא כפי שמופיע ברשימה", "content": "תיעוד מעובד"}]

אם קטע לא שייך למטופל מהרשימה, דלג עליו.

תמלול:
${transcription}` }]
    }, { headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' } });

    const text = response.data.content[0].text.trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return res.status(500).json({ error: 'AI לא החזיר פורמט תקין' });
    const segments = JSON.parse(jsonMatch[0]);

    const previews = segments.map(seg => {
      const patient = patients.find(p =>
        `${p.first_name} ${p.last_name}` === seg.patient_name ||
        p.first_name === seg.patient_name.split(' ')[0] ||
        seg.patient_name.includes(p.first_name)
      );
      return { ...seg, patient_id: patient?.id || null, matched: !!patient };
    });
    res.json({ previews });
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
