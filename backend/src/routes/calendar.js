const router = require('express').Router();
const { google } = require('googleapis');

// ─── OAuth2 client factory ────────────────────────────────────────────────────
function makeOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/calendar/oauth/callback'
  );
}

async function getAuthorizedClient(db) {
  const row = await db.query("SELECT value FROM settings WHERE key = 'google_tokens'");
  if (!row.rows.length || !row.rows[0].value) return null;
  const tokens = JSON.parse(row.rows[0].value);
  const auth = makeOAuth2Client();
  auth.setCredentials(tokens);
  // Persist refreshed tokens automatically
  auth.on('tokens', async (newTokens) => {
    const merged = { ...tokens, ...newTokens };
    await db.query(
      "INSERT INTO settings (key,value) VALUES ('google_tokens',$1) ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=NOW()",
      [JSON.stringify(merged)]
    );
  });
  return auth;
}

// ─── OAuth start ──────────────────────────────────────────────────────────────
router.get('/oauth/start', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(400).send(
      '<h2 style="font-family:sans-serif;color:#ef4444">Google Client ID ו-Secret חסרים ב-.env</h2>' +
      '<p style="font-family:sans-serif">הוסף GOOGLE_CLIENT_ID ו-GOOGLE_CLIENT_SECRET לקובץ backend/.env</p>'
    );
  }
  const auth = makeOAuth2Client();
  const url = auth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.readonly'],
  });
  res.redirect(url);
});

// ─── OAuth callback ───────────────────────────────────────────────────────────
router.get('/oauth/callback', async (req, res) => {
  const db = req.app.locals.db;
  const { code, error } = req.query;
  if (error) return res.redirect((process.env.FRONTEND_URL || 'http://localhost:3002') + '?gcal_error=1');
  try {
    const auth = makeOAuth2Client();
    const { tokens } = await auth.getToken(code);
    await db.query(
      "INSERT INTO settings (key,value) VALUES ('google_tokens',$1) ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=NOW()",
      [JSON.stringify(tokens)]
    );
    // Do initial sync right after connecting
    await syncCalendar(db);
    res.redirect((process.env.FRONTEND_URL || 'http://localhost:3002') + '?gcal_connected=1');
  } catch (err) {
    console.error('Google OAuth error:', err.message);
    res.redirect((process.env.FRONTEND_URL || 'http://localhost:3002') + '?gcal_error=1');
  }
});

// ─── Status ───────────────────────────────────────────────────────────────────
router.get('/status', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const [tokRow, syncRow, countRow, calRow] = await Promise.all([
      db.query("SELECT value FROM settings WHERE key = 'google_tokens'"),
      db.query("SELECT value FROM settings WHERE key = 'google_last_sync'"),
      db.query("SELECT value FROM settings WHERE key = 'google_sync_total'"),
      db.query("SELECT value FROM settings WHERE key = 'google_calendar_id'"),
    ]);
    res.json({
      connected: !!(tokRow.rows[0]?.value),
      last_sync: syncRow.rows[0]?.value || null,
      total_synced: Number(countRow.rows[0]?.value || 0),
      calendar_id: calRow.rows[0]?.value || 'primary',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── List user's calendars ────────────────────────────────────────────────────
router.get('/calendars', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const auth = await getAuthorizedClient(db);
    if (!auth) return res.status(401).json({ error: 'לא מחובר' });
    const cal = google.calendar({ version: 'v3', auth });
    const list = await cal.calendarList.list();
    const items = (list.data.items || []).map(c => ({
      id: c.id,
      name: c.summary,
      primary: !!c.primary,
      color: c.backgroundColor,
    }));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Manual sync ─────────────────────────────────────────────────────────────
router.post('/sync', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const count = await syncCalendar(db);
    res.json({ success: true, imported: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Google Push Notification Webhook ────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  // Google sends a POST with headers — no body needed, just trigger a sync
  const channelId = req.headers['x-goog-channel-id'];
  const resourceState = req.headers['x-goog-resource-state'];
  res.status(200).send('OK'); // must respond quickly
  if (resourceState === 'sync') return; // initial handshake — ignore
  const db = req.app.locals.db;
  try {
    const count = await syncCalendar(db);
    if (count > 0) console.log(`📅 Webhook sync: ${count} פגישות חדשות (channel: ${channelId})`);
  } catch (err) {
    console.error('Webhook sync error:', err.message);
  }
});

// ─── Register webhook with Google ─────────────────────────────────────────────
router.post('/webhook/register', async (req, res) => {
  const db = req.app.locals.db;
  const { public_url } = req.body; // e.g. https://abc123.ngrok.io
  if (!public_url) return res.status(400).json({ error: 'public_url נדרש' });
  try {
    const auth = await getAuthorizedClient(db);
    if (!auth) return res.status(401).json({ error: 'לא מחובר ל-Google' });
    const calRow = await db.query("SELECT value FROM settings WHERE key = 'google_calendar_id'");
    const calendarId = calRow.rows[0]?.value?.trim() || 'primary';
    const cal = google.calendar({ version: 'v3', auth });
    const channelId = 'tiuderech-' + Date.now();
    const webhookUrl = public_url.replace(/\/$/, '') + '/api/calendar/webhook';
    const r = await cal.events.watch({
      calendarId,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }
    });
    // Save channel info for renewal
    await db.query(
      "INSERT INTO settings (key,value) VALUES ('google_webhook_channel',$1) ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=NOW()",
      [JSON.stringify({ channelId, resourceId: r.data.resourceId, expiration: r.data.expiration, webhookUrl })]
    );
    console.log(`✅ Google Calendar webhook registered: ${webhookUrl}`);
    res.json({ success: true, channelId, webhookUrl, expiration: r.data.expiration });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// ─── Webhook status ────────────────────────────────────────────────────────────
router.get('/webhook/status', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const r = await db.query("SELECT value FROM settings WHERE key = 'google_webhook_channel'");
    if (!r.rows.length || !r.rows[0].value) return res.json({ active: false });
    const info = JSON.parse(r.rows[0].value);
    const active = info.expiration && Number(info.expiration) > Date.now();
    res.json({ active, ...info });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Disconnect ───────────────────────────────────────────────────────────────
router.post('/disconnect', async (req, res) => {
  const db = req.app.locals.db;
  try {
    await db.query("DELETE FROM settings WHERE key IN ('google_tokens','google_last_sync','google_sync_total')");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Core sync logic ──────────────────────────────────────────────────────────
async function syncCalendar(db) {
  const auth = await getAuthorizedClient(db);
  if (!auth) return 0;

  const calRow = await db.query("SELECT value FROM settings WHERE key = 'google_calendar_id'");
  const calendarId = calRow.rows[0]?.value?.trim() || 'primary';

  const cal = google.calendar({ version: 'v3', auth });

  // Fetch events: 60 days back → 60 days forward
  const timeMin = new Date(); timeMin.setDate(timeMin.getDate() - 60);
  const timeMax = new Date(); timeMax.setDate(timeMax.getDate() + 60);

  const resp = await cal.events.list({
    calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 1000,
  });

  const events = resp.data.items || [];

  // ── Delete sessions that no longer exist in Google Calendar ──────────────────
  // Get all google_event_ids that were imported and fall within the sync window
  const activeIds = events.map(e => e.id);
  const toDelete = await db.query(
    `SELECT id, google_event_id FROM sessions
     WHERE google_event_id IS NOT NULL
       AND session_date BETWEEN $1 AND $2`,
    [timeMin.toISOString().split('T')[0], timeMax.toISOString().split('T')[0]]
  );
  let deleted = 0;
  for (const row of toDelete.rows) {
    if (!activeIds.includes(row.google_event_id)) {
      await db.query('DELETE FROM sessions WHERE id=$1', [row.id]);
      deleted++;
      console.log(`  ✗ מחק פגישה שנמחקה מגוגל (session id: ${row.id})`);
    }
  }
  if (deleted > 0) console.log(`🗑️ הוסרו ${deleted} פגישות שנמחקו מגוגל`);

  // Load all patients
  const { rows: patients } = await db.query(
    "SELECT id, first_name, last_name, session_fee FROM patients WHERE status != 'ended'"
  );

  let imported = 0;

  for (const ev of events) {
    const title = (ev.summary || '').trim();
    const startRaw = ev.start?.dateTime || ev.start?.date;
    if (!startRaw || !title) continue;

    // Check if already imported
    const dup = await db.query('SELECT id, session_date, session_time FROM sessions WHERE google_event_id = $1', [ev.id]);

    // Match patient — priority: full name → first name only
    const titleLow = title.toLowerCase();
    // 1) Try full name match first (most reliable)
    let matched = patients.find(p => {
      const first = p.first_name.toLowerCase();
      const last  = p.last_name.toLowerCase();
      return (
        titleLow.includes(`${first} ${last}`) ||
        titleLow.includes(`${last} ${first}`) ||
        (titleLow.includes(first) && titleLow.includes(last))
      );
    });
    // 2) Fall back to first name only (e.g. "ישראל 10:00")
    if (!matched) {
      const byFirst = patients.filter(p => titleLow.includes(p.first_name.toLowerCase()));
      // Only use first-name match if exactly ONE patient matches (avoid ambiguity)
      if (byFirst.length === 1) matched = byFirst[0];
    }

    if (!matched) continue;

    // Parse date/time — convert to Israel timezone (Asia/Jerusalem)
    const startDate = new Date(startRaw);
    const toIsrael = (date) => {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jerusalem',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false
      }).formatToParts(date);
      const p = {};
      parts.forEach(pt => { p[pt.type] = pt.value; });
      return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
    };
    const israel = toIsrael(startDate);
    const dateStr = israel.date;
    const timeStr = ev.start?.dateTime ? israel.time : null;

    // Duration
    let duration = 50;
    if (ev.end?.dateTime && ev.start?.dateTime) {
      duration = Math.round((new Date(ev.end.dateTime) - startDate) / 60000);
    }

    // Status: past events → completed, future → scheduled
    const status = startDate < new Date() ? 'completed' : 'scheduled';

    if (dup.rows.length > 0) {
      // Always update date/time from Google (fixes timezone issues in existing sessions)
      await db.query(
        `UPDATE sessions SET session_date=$1, session_time=$2, duration_minutes=$3, updated_at=NOW() WHERE id=$4`,
        [dateStr, timeStr, duration, dup.rows[0].id]
      );
      console.log(`  ↻ עדכן פגישה: ${matched.first_name} ${matched.last_name} — ${dateStr} ${timeStr}`);
      continue;
    }

    await db.query(
      `INSERT INTO sessions
         (patient_id, session_date, session_time, duration_minutes, status, fee, google_event_id, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [matched.id, dateStr, timeStr, duration, status, matched.session_fee || 450, ev.id, ev.description || null]
    );
    imported++;
    console.log(`  ✓ ייבא פגישה: ${matched.first_name} ${matched.last_name} — ${dateStr}`);
  }

  // Save sync stats
  const prevRow = await db.query("SELECT value FROM settings WHERE key = 'google_sync_total'");
  const prev = Number(prevRow.rows[0]?.value || 0);
  await db.query(
    "INSERT INTO settings (key,value) VALUES ('google_last_sync',$1) ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=NOW()",
    [new Date().toISOString()]
  );
  await db.query(
    "INSERT INTO settings (key,value) VALUES ('google_sync_total',$1) ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=NOW()",
    [String(prev + imported)]
  );

  if (imported > 0) console.log(`📅 סנכרון Google Calendar: ${imported} פגישות חדשות`);
  return imported;
}

module.exports = router;
module.exports.syncCalendar = syncCalendar;
