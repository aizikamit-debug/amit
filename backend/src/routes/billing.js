const router = require('express').Router();
const axios = require('axios');
const cron = require('node-cron');

// WhatsApp API sender
async function sendWhatsAppMessage(toPhone, message) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token   = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneId || !token) throw new Error('WhatsApp credentials חסרים ב-.env');

  // Normalize Israeli phone → 972XXXXXXXXX
  const digits = toPhone.replace(/\D/g, '');
  const normalized = digits.startsWith('972') ? digits : digits.startsWith('0') ? '972' + digits.slice(1) : '972' + digits;

  const res = await axios.post(
    `https://graph.facebook.com/v22.0/${phoneId}/messages`,
    {
      messaging_product: 'whatsapp',
      to: normalized,
      type: 'text',
      text: { body: message }
    },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
  return res.data;
}

// Green Invoice API helper
async function getGreenInvoiceToken(db) {
  const settingsRes = await db.query("SELECT key, value FROM settings WHERE key IN ('green_invoice_api_id', 'green_invoice_api_secret')");
  const settings = {};
  settingsRes.rows.forEach(r => settings[r.key] = r.value);
  
  if (!settings.green_invoice_api_id || !settings.green_invoice_api_secret) {
    throw new Error('חשבונית ירוקה לא מוגדר — הוסף API credentials בהגדרות');
  }

  const tokenRes = await axios.post('https://api.greeninvoice.co.il/api/v1/account/token', {
    id: settings.green_invoice_api_id,
    secret: settings.green_invoice_api_secret
  });
  return tokenRes.data.token;
}

// Create a Green Invoice payment page link (דף תשלום)
async function createPaymentLink(db, patientName, amount, description, vatType = 0, documentDate = null, dueDate = null) {
  const token = await getGreenInvoiceToken(db);

  // Get plugin ID from existing payment links (payment terminal)
  const linksRes = await axios.get('https://api.greeninvoice.co.il/api/v1/payments/links', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const existingLinks = linksRes.data || [];
  let pluginId = null;
  for (const link of existingLinks) {
    const plugins = link.data?.plugins || [];
    if (plugins.length > 0) { pluginId = plugins[0].id; break; }
  }
  if (!pluginId) throw new Error('לא נמצא מסוף סליקה — צור לינק תשלום אחד ידנית בחשבונית ירוקה תחילה');

  // Convert dates to Unix timestamps (seconds) if provided
  const toUnix = d => d ? Math.floor(new Date(d).getTime() / 1000) : undefined;

  const res = await axios.post('https://api.greeninvoice.co.il/api/v1/payments/links', {
    type: 0,
    description,
    content: patientName,
    price: amount,
    currency: 'ILS',
    lang: 'he',
    documentType: 320,
    documentVatType: vatType,
    ...(documentDate ? { date: toUnix(documentDate) } : {}),
    ...(dueDate ? { dueDate: toUnix(dueDate) } : {}),
    plugins: [
      { id: pluginId, type: 12200, maxPayments: 1, group: 120 },  // כרטיס אשראי — תשלום אחד
      { id: pluginId, type: 12200, maxPayments: 5, group: 150 },  // כרטיס אשראי — עד 5 תשלומים
      { id: pluginId, type: 12200, maxPayments: 5, group: 160 },  // Bit
      { id: pluginId, type: 12200, maxPayments: 5, group: 100 },  // Google Pay / Apple Pay
    ],
    notify: true,
    maxPayments: 5,
    maxQuantity: 1,
    themeId: 1000,
    openAmount: false
  }, { headers: { Authorization: `Bearer ${token}` } });

  return {
    link_id: res.data.id,
    payment_link: res.data.shortUrl || res.data.url
  };
}

// Send payment request via Green Invoice (document - fallback)
async function sendPaymentRequest(db, patient, amount, description) {
  const token = await getGreenInvoiceToken(db);

  // Ensure client exists in Green Invoice
  let clientId = patient.green_invoice_client_id;
  if (!clientId) {
    const clientRes = await axios.post('https://api.greeninvoice.co.il/api/v1/clients', {
      name: `${patient.first_name} ${patient.last_name}`,
      phone: patient.phone,
      emails: patient.email ? [{ email: patient.email }] : []
    }, { headers: { Authorization: `Bearer ${token}` } });
    clientId = clientRes.data.id;
    await db.query('UPDATE patients SET green_invoice_client_id = $1 WHERE id = $2', [clientId, patient.id]);
  }

  const docRes = await axios.post('https://api.greeninvoice.co.il/api/v1/documents', {
    description,
    type: 330,
    lang: 'he',
    client: { id: clientId },
    currency: 'ILS',
    vatType: 0,
    income: [{ description, price: amount, quantity: 1, vatType: 0 }]
  }, { headers: { Authorization: `Bearer ${token}` } });

  const urlObj = docRes.data.url;
  const payment_link = (urlObj && (urlObj.he || urlObj.origin)) || null;
  return { doc_id: docRes.data.id, payment_link };
}

// POST preview — create a real GI document and return its URL (don't save billing record yet)
router.post('/preview-document', async (req, res) => {
  const db = req.app.locals.db;
  const { patient_id, amount, description, vat_type, document_date, due_date, session_ids } = req.body;
  if (!patient_id || !amount) return res.status(400).json({ error: 'patient_id ו-amount חובה' });
  try {
    const token = await getGreenInvoiceToken(db);
    const patientRow = await db.query('SELECT * FROM patients WHERE id = $1', [patient_id]);
    if (!patientRow.rows.length) return res.status(404).json({ error: 'מטופל לא נמצא' });
    const patient = patientRow.rows[0];

    // Ensure client exists in Green Invoice
    let clientId = patient.green_invoice_client_id;
    if (!clientId) {
      const clientRes = await axios.post('https://api.greeninvoice.co.il/api/v1/clients', {
        name: `${patient.first_name} ${patient.last_name}`,
        ...(patient.phone ? { phone: patient.phone } : {}),
        ...(patient.email ? { emails: [patient.email] } : {}),
      }, { headers: { Authorization: `Bearer ${token}` } });
      clientId = clientRes.data.id;
      await db.query('UPDATE patients SET green_invoice_client_id = $1 WHERE id = $2', [clientId, patient.id]);
    }

    // GI expects dates as YYYY-MM-DD strings
    const toDateStr = d => {
      if (!d) return undefined;
      const dt = new Date(d);
      if (isNaN(dt)) return undefined;
      return dt.toISOString().split('T')[0];
    };

    const desc = description || `טיפול פסיכולוגי`;

    // vatType mapping: 0=כולל מע"מ (DEFAULT), 1=לא כולל מע"מ (NO_VAT), 2=פטור (EXEMPT)
    // GI income vatType: 0=DEFAULT, 1=EXEMPT, 2=MIXED
    const giVatType = vat_type === 2 ? 1 : 0; // פטור ממע"מ → 1 (EXEMPT), otherwise 0 (DEFAULT)

    // Build income items — one per session if session_ids provided, else one lump sum
    let incomeItems = [];
    if (session_ids && session_ids.length > 0) {
      const sessRes = await db.query(
        `SELECT s.*, p.first_name, p.last_name FROM sessions s JOIN patients p ON s.patient_id = p.id
         WHERE s.id = ANY($1::int[])`, [session_ids]
      );
      incomeItems = sessRes.rows.map(s => {
        const dateStr = s.session_date ? new Date(s.session_date).toISOString().slice(0, 10) : '';
        return {
          description: `${desc}${dateStr ? ' — ' + dateStr : ''}`,
          quantity: 1,
          price: Number(s.fee || amount),
          currency: 'ILS',
          vatType: giVatType,
        };
      });
    }
    if (incomeItems.length === 0) {
      incomeItems = [{
        description: desc,
        quantity: 1,
        price: Number(amount),
        currency: 'ILS',
        vatType: giVatType,
      }];
    }

    const today = new Date().toISOString().split('T')[0];
    const docPayload = {
      type: 305, // חשבונית מס/קבלה
      lang: 'he',
      currency: 'ILS',
      vatType: giVatType,
      client: { id: clientId },
      description: desc,
      income: incomeItems,
      payment: [{
        type: -1, // unpaid — placeholder לתצוגה מקדימה
        price: Number(amount),
        currency: 'ILS',
        date: toDateStr(document_date) || today,
      }],
    };
    if (document_date) { const d = toDateStr(document_date); if (d) docPayload.date = d; }
    if (due_date)      { const d = toDateStr(due_date);      if (d) docPayload.dueDate = d; }

    const docRes = await axios.post('https://api.greeninvoice.co.il/api/v1/documents', docPayload,
      { headers: { Authorization: `Bearer ${token}` } });

    const doc = docRes.data;
    const urlObj = doc.url || {};
    const previewUrl = urlObj.he || urlObj.origin || null;
    res.json({ doc_id: doc.id, url: previewUrl });
  } catch (err) {
    const giError = err.response?.data;
    console.error('GI preview error:', JSON.stringify(giError || err.message));
    res.status(500).json({ error: giError?.errorMessage || giError?.message || err.message, details: giError });
  }
});

// GET billing records
// Per-patient billing summary
router.get('/patient-summary', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const result = await db.query(`
      SELECT
        p.id            AS patient_id,
        p.first_name, p.last_name,
        p.session_fee,
        COALESCE(SUM(CASE WHEN s.status = 'completed' THEN s.fee ELSE 0 END), 0)                          AS completed_total,
        COALESCE(SUM(CASE WHEN s.status = 'completed' AND s.payment_status = 'pending' THEN s.fee ELSE 0 END), 0) AS unpaid_total,
        COALESCE(SUM(CASE WHEN s.status = 'scheduled' THEN s.fee ELSE 0 END), 0)                          AS scheduled_total,
        COUNT(CASE WHEN s.status = 'completed' THEN 1 END)                                                 AS completed_count,
        COUNT(CASE WHEN s.status = 'scheduled' THEN 1 END)                                                 AS scheduled_count,
        COALESCE((
          SELECT SUM(br.total_amount) FROM billing_records br
          WHERE br.patient_id = p.id AND br.status = 'paid'
        ), 0) AS total_paid
      FROM patients p
      LEFT JOIN sessions s ON s.patient_id = p.id
      WHERE p.status != 'ended'
      GROUP BY p.id, p.first_name, p.last_name, p.session_fee
      HAVING COUNT(s.id) > 0
      ORDER BY p.first_name, p.last_name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  const db = req.app.locals.db;
  const { patient_id, status } = req.query;
  try {
    let query = `SELECT b.*, p.first_name, p.last_name FROM billing_records b
                 JOIN patients p ON b.patient_id = p.id WHERE 1=1`;
    const params = [];
    if (patient_id) { params.push(patient_id); query += ` AND b.patient_id = $${params.length}`; }
    if (status) { params.push(status); query += ` AND b.status = $${params.length}`; }
    query += ' ORDER BY b.created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate monthly billing for a patient
router.post('/generate', async (req, res) => {
  const db = req.app.locals.db;
  const { patient_id, month, year } = req.body;
  try {
    const periodStart = `${year}-${String(month).padStart(2,'0')}-01`;
    const periodEnd = new Date(year, month, 0).toISOString().split('T')[0];

    const sessions = await db.query(
      `SELECT * FROM sessions WHERE patient_id = $1 AND status = 'completed'
       AND session_date BETWEEN $2 AND $3 AND payment_status = 'pending'`,
      [patient_id, periodStart, periodEnd]
    );

    if (!sessions.rows.length) return res.status(400).json({ error: 'אין פגישות שלא שולמו בחודש זה' });

    const totalAmount = sessions.rows.reduce((sum, s) => sum + (s.fee || 450), 0);
    const result = await db.query(
      `INSERT INTO billing_records (patient_id, period_start, period_end, total_sessions, total_amount)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [patient_id, periodStart, periodEnd, sessions.rows.length, totalAmount]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send payment request
router.post('/:id/send', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const billing = await db.query(
      `SELECT b.*, p.first_name, p.last_name, p.phone, p.email, p.green_invoice_client_id
       FROM billing_records b JOIN patients p ON b.patient_id = p.id WHERE b.id = $1`,
      [req.params.id]
    );
    if (!billing.rows.length) return res.status(404).json({ error: 'לא נמצא' });
    
    const record = billing.rows[0];
    const description = `טיפול פסיכולוגי — ${record.total_sessions} פגישות`;
    
    const { doc_id, payment_link } = await sendPaymentRequest(db, record, record.total_amount, description);
    
    await db.query(
      `UPDATE billing_records SET status='sent', green_invoice_doc_id=$1, payment_link=$2, sent_at=NOW(),
       sent_count = COALESCE(sent_count, 0) + 1 WHERE id=$3`,
      [doc_id, payment_link, req.params.id]
    );
    res.json({ success: true, payment_link });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark as paid
router.put('/:id/paid', async (req, res) => {
  const db = req.app.locals.db;
  const { paid_amount } = req.body;
  try {
    const billing = await db.query('SELECT * FROM billing_records WHERE id = $1', [req.params.id]);
    const record = billing.rows[0];
    const newStatus = paid_amount >= record.total_amount ? 'paid' : 'partial';
    
    await db.query(
      `UPDATE billing_records SET status=$1, paid_amount=$2, paid_at=NOW() WHERE id=$3`,
      [newStatus, paid_amount || record.total_amount, req.params.id]
    );
    if (newStatus === 'paid') {
      await db.query(
        `UPDATE sessions SET payment_status='paid' WHERE patient_id=$1 
         AND session_date BETWEEN $2 AND $3 AND payment_status='pending'`,
        [record.patient_id, record.period_start, record.period_end]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all patients with pending unpaid sessions for bulk billing
router.get('/bulk-pending', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const result = await db.query(`
      SELECT
        p.id, p.first_name, p.last_name, p.phone, p.email,
        COUNT(DISTINCT s.id)::int as sessions_count,
        SUM(s.fee)::int as total_amount,
        (SELECT br.status FROM billing_records br WHERE br.patient_id=p.id ORDER BY br.created_at DESC LIMIT 1) as billing_status,
        (SELECT br.payment_link FROM billing_records br WHERE br.patient_id=p.id ORDER BY br.created_at DESC LIMIT 1) as payment_link,
        (SELECT br.id FROM billing_records br WHERE br.patient_id=p.id ORDER BY br.created_at DESC LIMIT 1) as billing_id
      FROM patients p
      JOIN sessions s ON s.patient_id = p.id
      WHERE s.status = 'completed' AND s.payment_status = 'pending'
      GROUP BY p.id, p.first_name, p.last_name, p.phone, p.email
      HAVING COUNT(DISTINCT s.id) > 0
      ORDER BY SUM(s.fee) DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST send billing to multiple patients at once
router.post('/bulk-send', async (req, res) => {
  const db = req.app.locals.db;
  const { patient_ids } = req.body;
  const results = [];
  for (const patientId of (patient_ids || [])) {
    try {
      const sessions = await db.query(
        `SELECT * FROM sessions WHERE patient_id=$1 AND status='completed' AND payment_status='pending'`,
        [patientId]
      );
      if (!sessions.rows.length) continue;
      const totalAmount = sessions.rows.reduce((s, r) => s + (r.fee || 450), 0);
      const patientRow = await db.query('SELECT * FROM patients WHERE id=$1', [patientId]);
      const patient = patientRow.rows[0];
      const billingResult = await db.query(
        `INSERT INTO billing_records (patient_id, period_start, period_end, total_sessions, total_amount)
         VALUES ($1, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, $2, $3) RETURNING *`,
        [patientId, sessions.rows.length, totalAmount]
      );
      const billing = billingResult.rows[0];
      const description = `טיפול פסיכולוגי — ${sessions.rows.length} פגישות`;
      const { doc_id, payment_link } = await sendPaymentRequest(db, patient, totalAmount, description);
      await db.query(
        `UPDATE billing_records SET status='sent', green_invoice_doc_id=$1, payment_link=$2, sent_at=NOW() WHERE id=$3`,
        [doc_id, payment_link, billing.id]
      );
      results.push({ patient_id: patientId, name: `${patient.first_name} ${patient.last_name}`, success: true, amount: totalAmount, payment_link });
    } catch (err) {
      results.push({ patient_id: patientId, success: false, error: err.message });
    }
  }
  res.json({ results });
});

// POST manual billing creation (SmartClinic-style)
router.post('/manual-create', async (req, res) => {
  const db = req.app.locals.db;
  const {
    patient_id, session_ids, amount, date, description,
    payment_method, payment_status, invoice_action, invoice_number, vat_type,
    document_date, due_date, preview_doc_id
  } = req.body;

  if (!patient_id || !amount) return res.status(400).json({ error: 'patient_id ו-amount חובה' });

  try {
    const patientRow = await db.query('SELECT * FROM patients WHERE id = $1', [patient_id]);
    if (!patientRow.rows.length) return res.status(404).json({ error: 'מטופל לא נמצא' });
    const patient = patientRow.rows[0];

    const billingDate = date || new Date().toISOString().split('T')[0];
    const sessionCount = (session_ids || []).length;

    // Create billing record
    const billingResult = await db.query(
      `INSERT INTO billing_records
         (patient_id, period_start, period_end, total_sessions, total_amount, status, payment_method, notes)
       VALUES ($1, $2, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        patient_id, billingDate,
        sessionCount || 1, amount,
        payment_status === 'paid' ? 'paid' : 'pending',
        payment_method || null,
        description || null
      ]
    );
    const billing = billingResult.rows[0];

    // Mark sessions as paid if payment status is paid
    if ((session_ids || []).length > 0) {
      const placeholders = session_ids.map((_, i) => `$${i + 2}`).join(',');
      if (payment_status === 'paid') {
        await db.query(
          `UPDATE sessions SET payment_status='paid' WHERE id IN (${placeholders}) AND patient_id=$1`,
          [patient_id, ...session_ids]
        );
      }
    }

    let paymentLink = null;
    let invoiceDoc = null;

    // Handle invoice action
    if (preview_doc_id) {
      // A document was already created via preview — just link it
      await db.query(
        'UPDATE billing_records SET green_invoice_doc_id=$1 WHERE id=$2',
        [preview_doc_id, billing.id]
      );
      invoiceDoc = preview_doc_id;
    } else if (invoice_action === 'create') {
      try {
        const patientName = `${patient.first_name} ${patient.last_name}`;
        const desc = description || `טיפול פסיכולוגי — ${sessionCount || 1} פגישות`;
        const docVatType = vat_type !== undefined ? Number(vat_type) : 0;
        const { link_id, payment_link } = await createPaymentLink(db, patientName, amount, desc, docVatType, document_date, due_date);
        paymentLink = payment_link;
        await db.query(
          'UPDATE billing_records SET payment_link=$1, green_invoice_doc_id=$2 WHERE id=$3',
          [payment_link, link_id, billing.id]
        );
        invoiceDoc = link_id;
      } catch (e) {
        console.error('Invoice creation error:', e.message);
        return res.status(201).json({ ...billing, payment_link: null, invoice_error: e.message });
      }
    } else if (invoice_action === 'existing' && invoice_number) {
      await db.query(
        'UPDATE billing_records SET green_invoice_doc_id=$1 WHERE id=$2',
        [invoice_number, billing.id]
      );
      invoiceDoc = invoice_number;
    }

    res.status(201).json({ ...billing, payment_link: paymentLink, invoice_doc: invoiceDoc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST check payment status from Green Invoice
router.post('/check-payments', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const token = await getGreenInvoiceToken(db);
    const pending = await db.query(`SELECT * FROM billing_records WHERE status='sent' AND green_invoice_doc_id IS NOT NULL`);
    let updated = 0;
    for (const record of pending.rows) {
      try {
        const docRes = await axios.get(`https://api.greeninvoice.co.il/api/v1/documents/${record.green_invoice_doc_id}`,
          { headers: { Authorization: `Bearer ${token}` } });
        const s = docRes.data.status;
        if (s === 'paid' || s === 4 || docRes.data.paymentStatus === 'paid') {
          await db.query(
            `UPDATE billing_records SET status='paid', paid_amount=$1, paid_at=NOW() WHERE id=$2`,
            [record.total_amount, record.id]
          );
          await db.query(
            `UPDATE sessions SET payment_status='paid' WHERE patient_id=$1 AND payment_status='pending' AND status='completed'`,
            [record.patient_id]
          );
          updated++;
        }
      } catch(e) { /* skip */ }
    }
    res.json({ checked: pending.rows.length, updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST send WhatsApp message to one patient (with Green Invoice payment link)
router.post('/whatsapp-send', async (req, res) => {
  const { patient_id } = req.body;
  const db = req.app.locals.db;
  try {
    const p = await db.query('SELECT * FROM patients WHERE id = $1', [patient_id]);
    if (!p.rows.length) return res.status(404).json({ error: 'מטופל לא נמצא' });
    const patient = p.rows[0];
    if (!patient.phone) return res.status(400).json({ error: 'אין מספר טלפון למטופל' });

    // Get pending sessions
    const sessions = await db.query(
      `SELECT * FROM sessions WHERE patient_id=$1 AND status='completed' AND payment_status='pending'`,
      [patient_id]
    );
    const totalAmount = sessions.rows.reduce((s, r) => s + (r.fee || 450), 0);
    const sessionsCount = sessions.rows.length || 1;
    const amount = totalAmount || (patient.session_fee || 450);
    const description = `טיפול פסיכולוגי`;
    const patientName = `${patient.first_name} ${patient.last_name}`;

    // Create payment page link in Green Invoice
    const { link_id, payment_link } = await createPaymentLink(db, patientName, amount, description);

    // Save billing record
    await db.query(
      `INSERT INTO billing_records (patient_id, period_start, period_end, total_sessions, total_amount, status, green_invoice_doc_id, payment_link, sent_at)
       VALUES ($1, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, $2, $3, 'sent', $4, $5, NOW())
       ON CONFLICT DO NOTHING`,
      [patient_id, sessionsCount, amount, link_id, payment_link]
    );

    // Send WhatsApp with payment page link
    const msg = `שלום ${patient.first_name},\nאנא שלם/י עבור ${sessionsCount} פגישות טיפוליות בסך ₪${amount}.\n\nלתשלום: ${payment_link}\n\nתודה רבה 🙏`;
    const result = await sendWhatsAppMessage(patient.phone, msg);
    res.json({ success: true, payment_link, whatsapp_message_id: result.messages?.[0]?.id });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// POST bulk WhatsApp — send payment link (Green Invoice) to multiple patients
router.post('/whatsapp-bulk', async (req, res) => {
  const { patient_ids } = req.body;
  const db = req.app.locals.db;
  const results = [];
  for (const patientId of (patient_ids || [])) {
    try {
      const sessions = await db.query(
        `SELECT * FROM sessions WHERE patient_id=$1 AND status='completed' AND payment_status='pending'`,
        [patientId]
      );
      const p = await db.query('SELECT * FROM patients WHERE id=$1', [patientId]);
      const patient = p.rows[0];
      if (!patient.phone) { results.push({ patient_id: patientId, success: false, error: 'אין טלפון' }); continue; }

      const sessionsCount = sessions.rows.length || 1;
      const totalAmount = sessions.rows.reduce((s, r) => s + (r.fee || 450), 0) || (patient.session_fee || 450);
      const patientName = `${patient.first_name} ${patient.last_name}`;

      // Create payment page link in Green Invoice
      const { link_id, payment_link } = await createPaymentLink(db, patientName, totalAmount, 'טיפול פסיכולוגי');

      // Save billing record
      await db.query(
        `INSERT INTO billing_records (patient_id, period_start, period_end, total_sessions, total_amount, status, green_invoice_doc_id, payment_link, sent_at)
         VALUES ($1, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, $2, $3, 'sent', $4, $5, NOW())`,
        [patientId, sessionsCount, totalAmount, link_id, payment_link]
      );

      // Send WhatsApp with payment link
      const msg = `שלום ${patient.first_name},\nאנא שלם/י עבור ${sessionsCount} פגישות טיפוליות בסך ₪${totalAmount}.\n\nלתשלום מאובטח: ${payment_link}\n\nתודה רבה 🙏`;
      await sendWhatsAppMessage(patient.phone, msg);
      results.push({ patient_id: patientId, name: `${patient.first_name} ${patient.last_name}`, success: true, amount: totalAmount, payment_link });
    } catch (err) {
      results.push({ patient_id: patientId, success: false, error: err.response?.data?.error?.message || err.message });
    }
  }
  res.json({ results });
});

// Check payment status for a single billing record against Morning (Green Invoice)
router.get('/:id/morning-status', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const r = await db.query('SELECT * FROM billing_records WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'לא נמצא' });
    const record = r.rows[0];

    if (!record.green_invoice_doc_id) {
      return res.json({ paid: false, info: 'אין מזהה חשבונית ירוקה לרשומה זו' });
    }

    const token = await getGreenInvoiceToken(db);

    // Try payment link first (most billing records use payment links)
    try {
      const linkRes = await axios.get(
        `https://api.greeninvoice.co.il/api/v1/payments/links/${record.green_invoice_doc_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const link = linkRes.data;
      const paid = link.paidQuantity > 0 || link.status === 'paid' || link.paidAmount > 0;
      if (paid) {
        // Auto-mark as paid in DB
        await db.query(
          `UPDATE billing_records SET status='paid', paid_amount=$1, paid_at=NOW() WHERE id=$2`,
          [link.paidAmount || record.total_amount, record.id]
        );
        await db.query(
          `UPDATE sessions SET payment_status='paid' WHERE patient_id=$1 AND payment_status='pending' AND status='completed'`,
          [record.patient_id]
        );
      }
      return res.json({
        paid,
        paidAmount: link.paidAmount || 0,
        paidQuantity: link.paidQuantity || 0,
        status: link.status,
        linkUrl: link.shortUrl || link.url,
        autoMarked: paid
      });
    } catch (_) {
      // Fall back to document check
      const docRes = await axios.get(
        `https://api.greeninvoice.co.il/api/v1/documents/${record.green_invoice_doc_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const doc = docRes.data;
      const paid = doc.status === 'paid' || doc.status === 4 || doc.paymentStatus === 'paid';
      if (paid) {
        await db.query(
          `UPDATE billing_records SET status='paid', paid_amount=$1, paid_at=NOW() WHERE id=$2`,
          [record.total_amount, record.id]
        );
      }
      return res.json({ paid, status: doc.status, type: 'document', autoMarked: paid });
    }
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// Search GI documents by client name
router.get('/gi-search', async (req, res) => {
  const db = req.app.locals.db;
  const { name } = req.query;
  try {
    const token = await getGreenInvoiceToken(db);
    const r = await axios.post('https://api.greeninvoice.co.il/api/v1/documents/search', {
      pageSize: 20, sort: 'createdAt', order: 'desc'
    }, { headers: { Authorization: `Bearer ${token}` } });
    const docs = (r.data.items || r.data || []);
    const filtered = name ? docs.filter(d =>
      (d.client?.name || '').includes(name) || (d.description || '').includes(name)
    ) : docs;
    res.json(filtered.map(d => ({ id: d.id, type: d.type, client: d.client?.name, total: d.total, date: d.date, status: d.status })));
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Cancel a GI document by ID
router.post('/gi-cancel/:docId', async (req, res) => {
  const db = req.app.locals.db;
  const { docId } = req.params;
  try {
    const token = await getGreenInvoiceToken(db);
    // Try GI cancel endpoint
    const r = await axios.put(`https://api.greeninvoice.co.il/api/v1/documents/${docId}`,
      { cancelled: true },
      { headers: { Authorization: `Bearer ${token}` } });
    res.json({ success: true, data: r.data });
  } catch (err) {
    // Try alternative cancel endpoint
    try {
      const token2 = await getGreenInvoiceToken(db);
      const r2 = await axios.post(`https://api.greeninvoice.co.il/api/v1/documents/${docId}/cancel`,
        {}, { headers: { Authorization: `Bearer ${token2}` } });
      res.json({ success: true, data: r2.data });
    } catch (err2) {
      res.status(500).json({
        put_error: err.response?.data || err.message,
        post_error: err2.response?.data || err2.message
      });
    }
  }
});

module.exports = router;
