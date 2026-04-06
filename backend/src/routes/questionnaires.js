const router = require('express').Router();

router.get('/types', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const result = await db.query('SELECT id, code, name_he, description FROM questionnaire_types ORDER BY code');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/types/:code', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const result = await db.query('SELECT * FROM questionnaire_types WHERE code = $1', [req.params.code]);
    if (!result.rows.length) return res.status(404).json({ error: 'לא נמצא' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/patient/:patient_id', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const result = await db.query(
      `SELECT qr.*, qt.name_he, qt.code FROM questionnaire_responses qr
       JOIN questionnaire_types qt ON qr.questionnaire_type_id = qt.id
       WHERE qr.patient_id = $1 ORDER BY qr.completed_at DESC`,
      [req.params.patient_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/submit', async (req, res) => {
  const db = req.app.locals.db;
  const { patient_id, questionnaire_code, answers, completed_by } = req.body;
  try {
    const qType = await db.query('SELECT * FROM questionnaire_types WHERE code = $1', [questionnaire_code]);
    if (!qType.rows.length) return res.status(404).json({ error: 'שאלון לא נמצא' });
    
    const qt = qType.rows[0];
    const questions = qt.questions;
    const scoringRules = qt.scoring_rules;
    
    // Calculate score
    let totalScore = 0;
    const answersArr = Array.isArray(answers) ? answers : Object.values(answers);
    answersArr.forEach((val, idx) => {
      const q = questions[idx];
      if (q && q.reverse) {
        totalScore += (q.options.length - 1 - val);
      } else {
        totalScore += (typeof val === 'number' ? val : 0);
      }
    });

    // Interpret
    let interpretation = '';
    const ranges = qt.interpretation?.ranges || [];
    for (const range of ranges) {
      if (totalScore >= range.min && totalScore <= range.max) {
        interpretation = range.label;
        break;
      }
    }

    const result = await db.query(
      `INSERT INTO questionnaire_responses (patient_id, questionnaire_type_id, answers, total_score, interpretation, completed_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [patient_id, qt.id, JSON.stringify(answers), totalScore, interpretation, completed_by || 'therapist']
    );
    res.status(201).json({ ...result.rows[0], total_score: totalScore, interpretation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
