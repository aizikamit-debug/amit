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

router.delete('/:id', async (req, res) => {
  const db = req.app.locals.db;
  try {
    await db.query('DELETE FROM clinical_notes WHERE id = $1', [req.params.id]);
    res.json({ success: true });
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

    // Per-name duplicate tracking (NOT a global flag — only blocks ambiguous names)
    const firstNameCount = {};
    for (const p of allPatients) {
      const fn = p.first_name.trim();
      firstNameCount[fn] = (firstNameCount[fn] || 0) + 1;
    }
    // Set of first names that belong to more than one patient
    const duplicateFirstNames = new Set(
      Object.entries(firstNameCount).filter(([, c]) => c > 1).map(([fn]) => fn)
    );

    const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const weekPatientIds = new Set(weekSessions.map(s => s.patient_id));

    // Build AI prompt context — ordered week sessions with index numbers
    const weekPatientsContext = weekSessions.map((s, i) => {
      const date = new Date(s.session_date);
      const day = dayNames[date.getDay()];
      const time = s.session_time ? s.session_time.slice(0, 5) : '';
      return `${i + 1}. ${s.first_name.trim()} ${s.last_name.trim()} (יום ${day}${time ? ' ' + time : ''})`;
    }).join('\n');

    const otherPatients = allPatients
      .filter(p => !weekPatientIds.has(p.id))
      .map(p => `${p.first_name.trim()} ${p.last_name.trim()}`)
      .join('\n');

    // Highlight ambiguous names for AI
    const ambiguousNote = duplicateFirstNames.size > 0
      ? `שמות פרטיים שמשותפים למספר מטופלים (חובה שם משפחה): ${[...duplicateFirstNames].join(', ')}`
      : '';

    const prompt = `אתה עוזר לפסיכולוג קליני. יש לך תמלול של פגישות טיפוליות מהשבוע.

פגישות השבוע לפי סדר ביומן:
${weekPatientsContext || 'אין נתונים מהיומן'}

${otherPatients ? `מטופלים נוספים במערכת:\n${otherPatients}` : ''}

המשימה: זהה כל מטופל שמוזכר בתמלול ופרק אותו לסגמנטים. עבד כל סגמנט לתיעוד קליני קצר ומקצועי בעברית.

כללי זיהוי:
- השתמש בסדר הפגישות ביומן כרפרנס — אם מוזכר שם שמתאים לפגישה הבאה בסדר, זהו אותה
- אם שם פרטי לבד מוזכר (כגון "ערן") וברשימת הפגישות יש רק "ערן מליכ" — זהו אותו
${ambiguousNote ? `- ${ambiguousNote}` : ''}
- אם אותו שם מוזכר פעמיים — צור שני סגמנטים נפרדים
- החזר תמיד שם פרטי + שם משפחה מלא מהרשימה
- אם שם אינו ברשימות — דלג עליו

החזר JSON בלבד:
[{"patient_name": "שם פרטי שם משפחה", "content": "תיעוד מעובד"}]

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

    const dayNames2 = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

    // matchPatient: per-name duplicate awareness (not global flag)
    const matchPatient = (segName, candidates) => {
      const normSeg = segName.trim().replace(/\s+/g, ' ');
      // 1. Exact full name
      let match = candidates.find(p => `${p.first_name.trim()} ${p.last_name.trim()}` === normSeg);
      if (match) return match;
      // 2. Segment contains full name
      match = candidates.find(p => normSeg.includes(`${p.first_name.trim()} ${p.last_name.trim()}`));
      if (match) return match;
      // 3. First name only — allowed if this specific first name is NOT duplicated
      const segFirst = normSeg.split(' ')[0];
      if (!duplicateFirstNames.has(segFirst)) {
        match = candidates.find(p => p.first_name.trim() === segFirst);
        if (match) return match;
      }
      return null;
    };

    // Track matched session IDs to handle same patient on multiple days
    const matchedSessionIds = new Set();

    const previews = segments.map(seg => {
      const normName = seg.patient_name.trim().replace(/\s+/g, ' ');
      const segFirst = normName.split(' ')[0];

      // 1. Try full-name match in week sessions (skip already matched)
      let weekSession = weekSessions.find(s =>
        !matchedSessionIds.has(s.session_id) &&
        matchPatient(normName, [{ first_name: s.first_name, last_name: s.last_name }])
      );

      // 2. Positional fallback: if first name matches a week session (even if duplicate),
      //    pick the next unmatched session with that first name in calendar order
      if (!weekSession) {
        weekSession = weekSessions.find(s =>
          !matchedSessionIds.has(s.session_id) &&
          s.first_name.trim() === segFirst
        );
      }

      if (weekSession) {
        matchedSessionIds.add(weekSession.session_id);
        const date = new Date(weekSession.session_date);
        return {
          ...seg,
          patient_name: `${weekSession.first_name.trim()} ${weekSession.last_name.trim()}`,
          patient_id: weekSession.patient_id,
          session_id: weekSession.session_id,
          matched: true,
          session_date: weekSession.session_date,
          session_time: weekSession.session_time,
          day_name: dayNames2[date.getDay()]
        };
      }

      // 3. Fallback: search all patients
      const patient = matchPatient(normName, allPatients);
      return { ...seg, patient_id: patient?.id || null, matched: !!patient, session_date: null, day_name: null };
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

    // Get this week's sessions for smart disambiguation
    const now = new Date();
    const dow = now.getDay();
    const sun = new Date(now); sun.setDate(now.getDate() - dow); sun.setHours(0,0,0,0);
    const sat = new Date(sun); sat.setDate(sun.getDate() + 6); sat.setHours(23,59,59,999);
    const weekSessionsRes = await db.query(
      `SELECT DISTINCT s.patient_id FROM sessions s
       WHERE s.session_date BETWEEN $1 AND $2 AND s.status != 'cancelled'`,
      [sun.toISOString().split('T')[0], sat.toISOString().split('T')[0]]
    );
    const weekPatientIds = new Set(weekSessionsRes.rows.map(r => r.patient_id));

    // Find which first names are shared by multiple patients
    const firstNameCount = {};
    for (const p of patients) {
      const fn = p.first_name.trim();
      firstNameCount[fn] = (firstNameCount[fn] || 0) + 1;
    }

    // For duplicate first names, check if exactly one of them has a session this week
    // If so, we can safely match the first name to that patient
    const firstNameWeekUnique = {}; // first_name → patient (if exactly 1 with that name has a session this week)
    const byFirstName = {};
    for (const p of patients) {
      const fn = p.first_name.trim();
      if (!byFirstName[fn]) byFirstName[fn] = [];
      byFirstName[fn].push(p);
    }
    for (const [fn, group] of Object.entries(byFirstName)) {
      if (group.length > 1) {
        const weekOnes = group.filter(p => weekPatientIds.has(p.id));
        if (weekOnes.length === 1) firstNameWeekUnique[fn] = weekOnes[0];
      }
    }

    // Build a sorted list of {patient, pos, name} where patient name appears in text
    const mentions = [];
    for (const p of patients) {
      const fn = p.first_name.trim();
      const fullName = `${fn} ${p.last_name.trim()}`;
      const namesToSearch = [fullName];

      if (firstNameCount[fn] === 1) {
        // Unique first name → safe to match by first name only
        namesToSearch.push(fn);
      } else if (firstNameWeekUnique[fn]?.id === p.id) {
        // Duplicate first name BUT this patient is the only one with a session this week
        // → safe to match by first name (context: this week's transcription)
        namesToSearch.push(fn);
      }

      for (const name of namesToSearch) {
        let idx = 0;
        while (true) {
          const pos = transcription.indexOf(name, idx);
          if (pos === -1) break;
          // Avoid double-adding: if a longer name already covers this position, skip
          const alreadyCovered = mentions.some(m => m.patient.id === p.id && m.pos === pos);
          if (!alreadyCovered) mentions.push({ patient: p, pos, name });
          idx = pos + name.length;
        }
      }
    }

    // Remove shorter-name duplicates: if both "דניאל" and "דניאל אסם" found at same pos,
    // keep only the longer (more specific) match
    const deduped = mentions.filter((m, i) => {
      return !mentions.some((other, j) => j !== i && other.pos === m.pos && other.name.length > m.name.length);
    });

    deduped.sort((a, b) => a.pos - b.pos);

    if (deduped.length === 0) {
      return res.json({ previews: [] });
    }

    // Split text into segments
    const segments = [];
    for (let i = 0; i < deduped.length; i++) {
      const start = deduped[i].pos;
      const end = i + 1 < deduped.length ? deduped[i + 1].pos : transcription.length;
      const content = transcription.slice(start, end).trim();
      // Each mention = separate segment (patient may appear on multiple dates)
      segments.push({
        patient_name: `${deduped[i].patient.first_name.trim()} ${deduped[i].patient.last_name.trim()}`,
        patient_id: deduped[i].patient.id,
        matched: true,
        content
      });
    }
    res.json({ previews: segments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST save parsed weekly notes
router.post('/save-weekly', async (req, res) => {
  const db = req.app.locals.db;
  const { segments } = req.body; // [{patient_id, content, session_id?}]
  try {
    const saved = [];
    for (const seg of (segments || [])) {
      if (!seg.patient_id || !seg.content) continue;
      // Get note_date from the linked session if available
      let noteDate = new Date().toISOString().split('T')[0];
      if (seg.session_id) {
        const sess = await db.query('SELECT session_date FROM sessions WHERE id=$1', [seg.session_id]);
        if (sess.rows[0]?.session_date) noteDate = sess.rows[0].session_date;
      }
      const note = await db.query(
        `INSERT INTO clinical_notes (patient_id, session_id, note_date, note_type, raw_text, processed_text, is_transcribed)
         VALUES ($1, $2, $3, 'session', $4, $4, true) RETURNING id`,
        [seg.patient_id, seg.session_id || null, noteDate, seg.content]
      );
      saved.push(note.rows[0].id);
    }
    res.json({ saved: saved.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
