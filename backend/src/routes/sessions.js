const router = require('express').Router();

router.get('/', async (req, res) => {
  const db = req.app.locals.db;
  const { patient_id, month, year, status, from_date, to_date } = req.query;
  try {
    let query = `SELECT s.*, p.first_name, p.last_name, p.treatment_type
                 FROM sessions s JOIN patients p ON s.patient_id = p.id WHERE 1=1`;
    const params = [];
    if (patient_id) { params.push(patient_id); query += ` AND s.patient_id = $${params.length}`; }
    if (month && year) {
      params.push(year, month);
      query += ` AND EXTRACT(YEAR FROM s.session_date) = $${params.length-1} AND EXTRACT(MONTH FROM s.session_date) = $${params.length}`;
    }
    if (from_date) { params.push(from_date); query += ` AND s.session_date >= $${params.length}`; }
    if (to_date)   { params.push(to_date);   query += ` AND s.session_date <= $${params.length}`; }
    if (status) { params.push(status); query += ` AND s.status = $${params.length}`; }
    query += ' ORDER BY s.session_date ASC, s.session_time ASC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const db = req.app.locals.db;
  const { patient_id, session_date, session_time, duration_minutes, session_type, fee, google_event_id, notes } = req.body;
  try {
    // Get default fee from patient if not provided
    let sessionFee = fee;
    if (!sessionFee) {
      const patient = await db.query('SELECT session_fee FROM patients WHERE id = $1', [patient_id]);
      sessionFee = patient.rows[0]?.session_fee || 450;
    }
    const result = await db.query(
      `INSERT INTO sessions (patient_id, session_date, session_time, duration_minutes, session_type, fee, google_event_id, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [patient_id, session_date, session_time, duration_minutes || 50, session_type || 'individual', sessionFee, google_event_id, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const db = req.app.locals.db;
  const { status, payment_status, notes, fee } = req.body;
  try {
    const result = await db.query(
      `UPDATE sessions SET status = COALESCE($1, status), payment_status = COALESCE($2, payment_status),
       notes = COALESCE($3, notes), fee = COALESCE($4, fee), updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [status, payment_status, notes, fee, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
