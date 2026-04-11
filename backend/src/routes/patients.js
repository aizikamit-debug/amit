const router = require('express').Router();

// GET all patients
router.get('/', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const { status, search } = req.query;
    let query = `SELECT id, first_name, last_name, phone, email, treatment_type, status, 
                        session_fee, date_of_birth, diagnosis, created_at
                 FROM patients WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); query += ` AND status = $${params.length}`; }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR phone ILIKE $${params.length})`;
    }
    query += ' ORDER BY last_name, first_name';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single patient
router.get('/:id', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const result = await db.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'לא נמצא' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create patient
router.post('/', async (req, res) => {
  const db = req.app.locals.db;
  const {
    first_name, last_name, phone, email, date_of_birth, gender, id_number,
    address, referral_source, treatment_type, presenting_problem, diagnosis,
    status, session_fee, calendar_name, emergency_contact_name,
    emergency_contact_phone, notes
  } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO patients (first_name, last_name, phone, email, date_of_birth, gender,
        id_number, address, referral_source, treatment_type, presenting_problem, diagnosis,
        status, session_fee, calendar_name, emergency_contact_name, emergency_contact_phone, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING *`,
      [first_name, last_name, phone, email || null, date_of_birth || null, gender || null, id_number || null,
       address || null, referral_source || null, treatment_type, presenting_problem || null, diagnosis || null,
       status || 'active', session_fee || 450, calendar_name || null,
       emergency_contact_name || null, emergency_contact_phone || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update patient
router.put('/:id', async (req, res) => {
  const db = req.app.locals.db;
  const fields = ['first_name','last_name','phone','email','date_of_birth','gender',
    'id_number','address','referral_source','treatment_type','presenting_problem',
    'diagnosis','status','session_fee','calendar_name','emergency_contact_name',
    'emergency_contact_phone','notes','green_invoice_client_id'];
  const updates = [];
  const values = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      values.push(req.body[f]);
      updates.push(`${f} = $${values.length}`);
    }
  });
  if (!updates.length) return res.status(400).json({ error: 'אין שדות לעדכון' });
  values.push(req.params.id);
  try {
    const result = await db.query(
      `UPDATE patients SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE patient
router.delete('/:id', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const check = await db.query('SELECT id FROM patients WHERE id = $1', [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ error: 'לא נמצא' });
    // ON DELETE CASCADE מטפל בכל הטבלאות הקשורות אוטומטית
    await db.query('DELETE FROM patients WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET patient sessions summary
router.get('/:id/summary', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const sessions = await db.query(
      `SELECT
         COUNT(*) as total_sessions,
         SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed_sessions,
         SUM(CASE WHEN payment_status='pending' AND status='completed' THEN COALESCE(fee,0) ELSE 0 END) as total_debt,
         MAX(CASE WHEN status='completed' THEN session_date END) as last_session
       FROM sessions WHERE patient_id = $1`,
      [req.params.id]
    );
    res.json(sessions.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
