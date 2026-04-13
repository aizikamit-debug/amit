const router = require('express').Router();
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '../../backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function runBackup(db) {
  const [patients, sessions, notes, billing, settings, questionnaire_responses, intake_versions] = await Promise.all([
    db.query('SELECT * FROM patients ORDER BY id'),
    db.query('SELECT * FROM sessions ORDER BY id'),
    db.query('SELECT * FROM clinical_notes ORDER BY id'),
    db.query('SELECT * FROM billing_records ORDER BY id'),
    db.query('SELECT * FROM settings ORDER BY key'),
    db.query('SELECT * FROM questionnaire_responses ORDER BY id'),
    db.query('SELECT * FROM intake_versions ORDER BY id').catch(() => ({ rows: [] })),
  ]);

  const backup = {
    created_at: new Date().toISOString(),
    patients: patients.rows,
    sessions: sessions.rows,
    clinical_notes: notes.rows,
    billing_records: billing.rows,
    settings: settings.rows,
    questionnaire_responses: questionnaire_responses.rows,
    intake_versions: intake_versions.rows,
  };

  const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;
  const filepath = path.join(BACKUP_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf8');

  // Keep only last 30 backups
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
    .sort();
  if (files.length > 30) {
    files.slice(0, files.length - 30).forEach(f => {
      try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch (_) {}
    });
  }

  return { filename, patients: patients.rows.length, sessions: sessions.rows.length };
}

// Manual trigger — GET /api/backup/run
router.get('/run', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const result = await runBackup(db);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download latest backup — GET /api/backup/download
router.get('/download', async (req, res) => {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
      .sort();
    if (files.length === 0) {
      // Run one now
      const db = req.app.locals.db;
      await runBackup(db);
      const files2 = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json')).sort();
      const latest = files2[files2.length - 1];
      return res.download(path.join(BACKUP_DIR, latest), latest);
    }
    const latest = files[files.length - 1];
    res.download(path.join(BACKUP_DIR, latest), latest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List available backups — GET /api/backup/list
router.get('/list', (req, res) => {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, 10);
    const info = files.map(f => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return { filename: f, size_kb: Math.round(stat.size / 1024), modified: stat.mtime };
    });
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, runBackup };
