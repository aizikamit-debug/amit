require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// DB Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Make pool available globally
app.locals.db = pool;

// Middleware
app.use(cors({
  origin: (origin, cb) => {
    // Allow localhost on any port, and no-origin requests (mobile/curl)
    if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
    return cb(null, process.env.FRONTEND_URL || false);
  }
}));
app.use(express.json({ limit: '10mb' }));

// Initialize DB
async function initDB() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    // Migrations — add columns that may not exist in older installs
    await pool.query(`ALTER TABLE billing_records ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)`).catch(() => {});
    await pool.query(`ALTER TABLE billing_records ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100)`).catch(() => {});
    await pool.query(`ALTER TABLE billing_records ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0`).catch(() => {});

    // Intake versions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS intake_versions (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL DEFAULT 1,
        content JSONB NOT NULL DEFAULT '{}',
        edit_type VARCHAR(20) DEFAULT 'manual',
        ai_instructions TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `).catch(() => {});

    console.log('✅ Database initialized');
  } catch (err) {
    console.error('❌ DB init error:', err.message);
  }
}

// Auth route (public)
app.use('/api/auth', require('./routes/auth'));

// Routes
app.use('/api/patients', require('./routes/patients'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/questionnaires', require('./routes/questionnaires'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/transcribe', require('./routes/transcribe'));
app.use('/api/intake', require('./routes/intake'));
app.use('/api/export', require('./routes/export'));
app.use('/api/summary', require('./routes/summary'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));


initDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 Tiuderech server running on port ${PORT}`));

  // Google Calendar auto-sync every 5 minutes
  const cron = require('node-cron');
  const { syncCalendar } = require('./routes/calendar');
  cron.schedule('*/5 * * * *', async () => {
    try { await syncCalendar(pool); }
    catch (err) { console.error('Calendar sync error:', err.message); }
  });
  console.log('⏰ Google Calendar sync scheduled (every 5 min)');
});

