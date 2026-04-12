const router = require('express').Router();

router.get('/', async (req, res) => {
  const db = req.app.locals.db;
  const now = new Date();
  const year = req.query.year || now.getFullYear();
  const month = req.query.month || (now.getMonth() + 1);
  const periodStart = `${year}-${String(month).padStart(2,'0')}-01`;
  const periodEnd = new Date(year, month, 0).toISOString().split('T')[0];

  try {
    // Active patients
    const patientsRes = await db.query(
      `SELECT COUNT(*) as active FROM patients WHERE status = 'active'`
    );

    // Monthly sessions
    const sessionsRes = await db.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status='scheduled' THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status='no_show' THEN 1 ELSE 0 END) as no_show
       FROM sessions WHERE session_date BETWEEN $1 AND $2`,
      [periodStart, periodEnd]
    );

    // Expected income (scheduled + completed)
    const incomeRes = await db.query(
      `SELECT 
        SUM(CASE WHEN status IN ('scheduled','completed') THEN fee ELSE 0 END) as expected,
        SUM(CASE WHEN status='completed' AND payment_status='paid' THEN fee ELSE 0 END) as collected,
        SUM(CASE WHEN status='completed' AND payment_status='pending' THEN fee ELSE 0 END) as pending
       FROM sessions WHERE session_date BETWEEN $1 AND $2`,
      [periodStart, periodEnd]
    );

    // Last 6 months trend
    const trendRes = await db.query(
      `SELECT TO_CHAR(session_date, 'YYYY-MM') as month,
              COUNT(*) as sessions,
              SUM(fee) as amount
       FROM sessions WHERE status='completed' 
         AND session_date >= NOW() - INTERVAL '6 months'
       GROUP BY TO_CHAR(session_date, 'YYYY-MM')
       ORDER BY month`
    );

    // Unpaid billing
    const unpaidRes = await db.query(
      `SELECT b.*, p.first_name, p.last_name FROM billing_records b
       JOIN patients p ON b.patient_id = p.id
       WHERE b.status IN ('pending','sent','partial')
       ORDER BY b.created_at DESC LIMIT 10`
    );

    // Inactive patients (no session in 30+ days)
    const inactiveRes = await db.query(
      `SELECT p.id, p.first_name, p.last_name, MAX(s.session_date) as last_session
       FROM patients p LEFT JOIN sessions s ON p.id = s.patient_id AND s.status='completed'
       WHERE p.status = 'active'
       GROUP BY p.id, p.first_name, p.last_name
       HAVING MAX(s.session_date) < NOW() - INTERVAL '30 days' OR MAX(s.session_date) IS NULL
       ORDER BY last_session ASC NULLS FIRST LIMIT 5`
    );

    // Week changes: cancelled/no_show sessions this week
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const wStart = weekStart.toISOString().split('T')[0];
    const wEnd = weekEnd.toISOString().split('T')[0];

    // Cancelled / no-show this week
    const weekCancelledRes = await db.query(
      `SELECT s.id, s.session_date, s.session_time, s.status, p.first_name, p.last_name
       FROM sessions s JOIN patients p ON s.patient_id = p.id
       WHERE s.session_date BETWEEN $1 AND $2
         AND s.status IN ('cancelled', 'no_show')
       ORDER BY s.session_date ASC, s.session_time ASC`,
      [wStart, wEnd]
    );

    // Rescheduled this week (original date was this week, session moved)
    const weekRescheduledRes = await db.query(
      `SELECT s.id, s.session_date, s.session_time, s.status,
              s.original_session_date, s.original_session_time,
              p.first_name, p.last_name
       FROM sessions s JOIN patients p ON s.patient_id = p.id
       WHERE s.original_session_date BETWEEN $1 AND $2
         AND s.original_session_date IS NOT NULL
       ORDER BY s.original_session_date ASC, s.original_session_time ASC`,
      [wStart, wEnd]
    );

    res.json({
      period: { year, month, start: periodStart, end: periodEnd },
      patients: { active: parseInt(patientsRes.rows[0].active) },
      sessions: sessionsRes.rows[0],
      income: incomeRes.rows[0],
      trend: trendRes.rows,
      unpaid_billing: unpaidRes.rows,
      inactive_patients: inactiveRes.rows,
      week_cancelled: weekCancelledRes.rows,
      week_rescheduled: weekRescheduledRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
