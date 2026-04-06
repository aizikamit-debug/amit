const router = require('express').Router();

router.get('/', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const result = await db.query('SELECT key, value FROM settings ORDER BY key');
    const settings = {};
    result.rows.forEach(r => settings[r.key] = r.value);
    // Mask secrets
    if (settings.green_invoice_api_secret) settings.green_invoice_api_secret = '***';
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const allowed = ['default_session_fee','therapist_name','clinic_name','auto_billing_day',
      'auto_billing_enabled','green_invoice_api_id','green_invoice_api_secret','google_calendar_id'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        await db.query(
          `INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
          [key, req.body[key]]
        );
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
