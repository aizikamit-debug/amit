const router = require('express').Router();
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// ── Export sessions as PDF ──
router.get('/sessions/:patient_id/pdf', async (req, res) => {
  const db = req.app.locals.db;
  const { from_date, to_date } = req.query;

  try {
    // Get patient info
    const patientRes = await db.query('SELECT * FROM patients WHERE id = $1', [req.params.patient_id]);
    if (!patientRes.rows.length) return res.status(404).json({ error: 'מטופל לא נמצא' });
    const patient = patientRes.rows[0];

    // Get settings (therapist name)
    const settingsRes = await db.query("SELECT value FROM settings WHERE key = 'therapist_name'");
    const therapistName = settingsRes.rows[0]?.value || 'המטפל';

    // Get sessions with notes
    let query = `
      SELECT s.*, cn.content, cn.processed_text
      FROM sessions s
      LEFT JOIN clinical_notes cn ON cn.session_id = s.id
      WHERE s.patient_id = $1
    `;
    const params = [req.params.patient_id];
    if (from_date) { params.push(from_date); query += ` AND s.session_date >= $${params.length}`; }
    if (to_date)   { params.push(to_date);   query += ` AND s.session_date <= $${params.length}`; }
    query += ' ORDER BY s.session_date ASC, s.session_time ASC';

    const sessionsRes = await db.query(query, params);
    const sessions = sessionsRes.rows;

    // Build PDF
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 60, right: 60 },
      info: { Title: `סיכום פגישות — ${patient.first_name} ${patient.last_name}` }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="sessions_${patient.first_name}_${patient.last_name}.pdf"`);
    doc.pipe(res);

    // Since pdfkit doesn't natively support RTL/Hebrew well,
    // we'll structure the content clearly in English-compatible format
    // but write Hebrew text
    const fullName = `${patient.first_name} ${patient.last_name}`;

    // Header
    doc.fontSize(20).font('Helvetica-Bold')
      .text(`${fullName} — סיכום פגישות`, { align: 'right' });

    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica')
      .text(`מטפל: ${therapistName}`, { align: 'right' });

    if (from_date || to_date) {
      const period = [from_date, to_date].filter(Boolean).join(' — ');
      doc.text(`תקופה: ${period}`, { align: 'right' });
    }

    doc.text(`סה"כ פגישות: ${sessions.length}`, { align: 'right' });

    doc.moveDown(0.5);
    doc.moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke();
    doc.moveDown(0.5);

    if (sessions.length === 0) {
      doc.fontSize(13).text('לא נמצאו פגישות בטווח זה', { align: 'right' });
    }

    sessions.forEach((s, i) => {
      const dateStr = s.session_date
        ? new Date(s.session_date).toLocaleDateString('he-IL')
        : 'תאריך לא ידוע';
      const timeStr = s.session_time ? s.session_time.slice(0, 5) : '';
      const duration = s.duration_minutes ? `${s.duration_minutes} דקות` : '50 דקות';
      const statusMap = { completed: 'הושלם', cancelled: 'בוטל', no_show: 'לא הגיע', scheduled: 'מתוכנן' };
      const statusStr = statusMap[s.status] || s.status;
      const noteText = s.processed_text || s.content || '';

      // Session header
      doc.fontSize(13).font('Helvetica-Bold')
        .text(`פגישה ${i + 1} — ${dateStr}${timeStr ? ' | ' + timeStr : ''} | ${duration} | ${statusStr}`, { align: 'right' });

      if (s.fee) {
        doc.fontSize(11).font('Helvetica')
          .text(`תשלום: ₪${s.fee}`, { align: 'right' });
      }

      if (noteText) {
        doc.moveDown(0.3);
        doc.fontSize(11).font('Helvetica')
          .text(noteText, { align: 'right', lineGap: 3 });
      } else {
        doc.moveDown(0.2);
        doc.fontSize(10).font('Helvetica').fillColor('#888')
          .text('אין תיעוד לפגישה זו', { align: 'right' });
        doc.fillColor('#000');
      }

      doc.moveDown(0.5);
      // Separator between sessions (not after last)
      if (i < sessions.length - 1) {
        doc.moveTo(doc.page.margins.left + 40, doc.y)
          .lineTo(doc.page.width - doc.page.margins.right - 40, doc.y)
          .dash(3, { space: 3 }).stroke();
        doc.undash();
        doc.moveDown(0.5);
      }
    });

    // Footer
    doc.moveDown(1);
    doc.fontSize(9).fillColor('#aaa')
      .text(`הופק ב-${new Date().toLocaleDateString('he-IL')} | תיעודרך`, { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('Export error:', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

module.exports = router;
