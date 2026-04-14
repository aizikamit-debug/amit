import React, { useState, useEffect, useCallback } from 'react';
import { dashboardAPI, patientsAPI, sessionsAPI, notesAPI, questionnairesAPI, billingAPI, settingsAPI, calendarAPI, intakeAPI } from './api';
import './App.css';

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Icon = {
  dashboard: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" fill="currentColor" fillOpacity="0.2"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1" fill="currentColor" fillOpacity="0.2"/>
    </svg>
  ),
  patients: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="4" fill="currentColor" fillOpacity="0.2"/>
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.85"/>
    </svg>
  ),
  billing: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" fill="currentColor" fillOpacity="0.2"/>
      <line x1="2" y1="10" x2="22" y2="10"/>
      <line x1="7" y1="15" x2="7.01" y2="15" strokeWidth="3"/>
    </svg>
  ),
  settings: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.2"/>
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  ),
  notes: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="currentColor" fillOpacity="0.2"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  mic: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" fillOpacity="0.2"/>
      <path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="17" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>
    </svg>
  ),
  ai: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" fillOpacity="0.2"/>
      <path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
    </svg>
  ),
  plus: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  x: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  check: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20,6 9,17 4,12"/>
    </svg>
  ),
  search: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" fill="currentColor" fillOpacity="0.15"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  calendar: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" fill="currentColor" fillOpacity="0.15"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  back: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15,18 9,12 15,6"/>
    </svg>
  ),
  alert: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="currentColor" fillOpacity="0.18"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5"/>
    </svg>
  ),
  questionnaire: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" fill="currentColor" fillOpacity="0.15"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 12 2 2 4-4"/>
    </svg>
  ),
  trash: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  ),
  whatsapp: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  ),
  gcal: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" fill="currentColor" fillOpacity="0.1"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
    </svg>
  ),
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const GRADIENTS = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#0ea5e9,#6366f1)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#10b981,#0ea5e9)',
  'linear-gradient(135deg,#ec4899,#8b5cf6)',
  'linear-gradient(135deg,#14b8a6,#6366f1)',
  'linear-gradient(135deg,#f97316,#ec4899)',
];
function getGradient(name) {
  let code = 0;
  for (let i = 0; i < (name || '').length; i++) code += (name || '').charCodeAt(i);
  return GRADIENTS[code % GRADIENTS.length];
}

const fmt = (n) => '₪' + Number(n || 0).toLocaleString('he-IL');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('he-IL') : '—';
const fmtDateShort = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}`;
};
const treatmentLabel = { individual:'פרטני', couples:'זוגי', child:'ילד', adolescent:'מתבגר' };
const statusBadgeClass = { active:'badge-active', inactive:'badge-inactive', waitlist:'badge-waitlist', ended:'badge-ended' };
const statusLabel = { active:'פעיל', inactive:'לא פעיל', waitlist:'המתנה', ended:'סיים' };
const months = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

function toWhatsAppUrl(phone, message) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  const num = digits.startsWith('972') ? digits : digits.startsWith('0') ? '972' + digits.slice(1) : '972' + digits;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

function buildGCalUrl(session, patientName) {
  if (!session.session_date) return null;
  const d = new Date(session.session_date);
  const time = (session.session_time || '09:00').slice(0, 5);
  const [h, m] = time.split(':').map(Number);
  const start = new Date(d); start.setHours(h, m, 0, 0);
  const end = new Date(start); end.setMinutes(end.getMinutes() + (session.duration_minutes || 50));
  const p2 = n => String(n).padStart(2, '0');
  const fmtDt = dt => `${dt.getFullYear()}${p2(dt.getMonth()+1)}${p2(dt.getDate())}T${p2(dt.getHours())}${p2(dt.getMinutes())}00`;
  const title = encodeURIComponent(`פגישה — ${patientName}`);
  return `https://calendar.google.com/calendar/r/eventedit?text=${title}&dates=${fmtDt(start)}/${fmtDt(end)}`;
}

// ─── BASE COMPONENTS ─────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={wide ? { maxWidth: 740 } : {}}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>{Icon.x(15)}</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="input-wrap">
      {label && <label className="input-label">{label}</label>}
      {children}
    </div>
  );
}

function EmptyState({ icon, title, sub, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-title">{title}</div>
      {sub && <div className="empty-state-sub">{sub}</div>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

function Avatar({ name, size = 38 }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2);
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.36, background: getGradient(name || '') }}>
      {initials}
    </div>
  );
}

// ─── BILLING PANEL (Dashboard) ───────────────────────────────────────────────
function BillingPanel() {
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    billingAPI.bulkPending().then(r => { setPatients(r.data); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const toggleAll = () => {
    if (selected.size === patients.length) setSelected(new Set());
    else setSelected(new Set(patients.map(p => p.id)));
  };

  const doSend = async () => {
    if (!selected.size) return;
    setSending(true); setResults(null);
    try {
      const r = await billingAPI.bulkSend(Array.from(selected));
      setResults(r.data.results);
      load();
    } catch (e) { alert('שגיאה בשליחה'); }
    setSending(false);
  };

  const doCheck = async () => {
    setChecking(true);
    try {
      const r = await billingAPI.checkPayments();
      if (r.data.updated > 0) { alert(`✅ ${r.data.updated} תשלומים עודכנו!`); load(); }
      else alert('אין עדכונים חדשים');
    } catch (e) {}
    setChecking(false);
  };

  const statusColor = (s) => s === 'paid' ? '#10b981' : s === 'sent' ? '#f59e0b' : '#94a3b8';
  const statusLbl = (s) => s === 'paid' ? '✓ שולם' : s === 'sent' ? 'נשלח' : 'ממתין';

  const [whatsappSending, setWhatsappSending] = useState(false);
  const [whatsappResults, setWhatsappResults] = useState(null);

  const sendWhatsApp = async (p) => {
    if (!p.phone) { alert('אין מספר טלפון למטופל זה'); return; }
    try {
      const msg = `שלום ${p.first_name},\nאנא שלם/י עבור ${p.sessions_count} פגישות טיפוליות בסך ${fmt(p.total_amount)}.\nתודה רבה 🙏`;
      await billingAPI.whatsappSend(p.id, msg);
      alert(`✅ הודעה נשלחה ל${p.first_name} בוואטסאפ!`);
    } catch (e) {
      alert(`שגיאה: ${e.response?.data?.error || e.message}`);
    }
  };

  const sendAllWhatsApp = async () => {
    if (!selected.size) return;
    setWhatsappSending(true); setWhatsappResults(null);
    try {
      const r = await billingAPI.whatsappBulk(Array.from(selected));
      setWhatsappResults(r.data.results);
    } catch (e) { alert('שגיאה בשליחה'); }
    setWhatsappSending(false);
  };

  return (
    <div className="card card-sm" style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>שליחת בקשת תשלום</div>
        <div style={{ display: 'flex', gap: 7 }}>
          <button className="btn btn-ghost btn-xs" onClick={doCheck} disabled={checking}>
            {checking ? '...' : '↻ רענן סטטוס'}
          </button>
          <button className="btn btn-xs" onClick={sendAllWhatsApp} disabled={whatsappSending || !selected.size}
            style={{ background: '#25D366', color: 'white', border: 'none' }}>
            {Icon.whatsapp(13)} {whatsappSending ? 'שולח...' : `וואטסאפ (${selected.size})`}
          </button>
          <button className="btn btn-primary btn-xs" onClick={doSend} disabled={sending || !selected.size}>
            {sending ? 'שולח...' : `חשבונית (${selected.size})`}
          </button>
        </div>
      </div>

      {loading ? <div className="text-muted">טוען...</div> :
       patients.length === 0 ? <div className="text-muted" style={{ textAlign: 'center', padding: '16px 0' }}>אין חיובים פתוחים 🎉</div> :
       <>
         <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
           <input type="checkbox" checked={selected.size === patients.length && patients.length > 0} onChange={toggleAll} style={{ width: 'auto' }}/>
           <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>בחר הכל ({patients.length})</span>
         </div>
         {patients.map(p => (
           <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
             <input type="checkbox" checked={selected.has(p.id)} onChange={() => {
               const s = new Set(selected);
               s.has(p.id) ? s.delete(p.id) : s.add(p.id);
               setSelected(s);
             }} style={{ width: 'auto' }}/>
             <Avatar name={`${p.first_name} ${p.last_name}`} size={32}/>
             <div style={{ flex: 1 }}>
               <div style={{ fontSize: 14, fontWeight: 500 }}>{p.first_name} {p.last_name}</div>
               <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.sessions_count} פגישות · {p.phone || 'ללא טלפון'}</div>
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
               <div style={{ textAlign: 'left' }}>
                 <div style={{ fontSize: 15, fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{fmt(p.total_amount)}</div>
                 {p.billing_status && <div style={{ fontSize: 11, color: statusColor(p.billing_status) }}>{statusLbl(p.billing_status)}</div>}
               </div>
               <button
                 onClick={() => sendWhatsApp(p)}
                 title="שלח בוואטסאפ אוטומטית"
                 style={{ background: '#25D366', color: 'white', border: 'none', borderRadius: 8, padding: '6px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                 {Icon.whatsapp(15)}
               </button>
             </div>
           </div>
         ))}
       </>
      }

      {results && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--page-bg)', borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>תוצאות חשבונית ירוקה:</div>
          {results.map((r, i) => (
            <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>
              {r.success ? '✅' : '❌'} {r.name} {r.success ? `— ${fmt(r.amount)}` : `— ${r.error}`}
            </div>
          ))}
        </div>
      )}

      {whatsappResults && (
        <div style={{ marginTop: 8, padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: 12, color: '#166534', marginBottom: 6, fontWeight: 500 }}>תוצאות וואטסאפ:</div>
          {whatsappResults.map((r, i) => (
            <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>
              {r.success ? '✅' : '❌'} {r.name || `מטופל ${r.patient_id}`} {r.success ? `— ${fmt(r.amount)}` : `— ${r.error}`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── WEEKLY TRANSCRIPTION (Dashboard) ────────────────────────────────────────
const DAY_NAMES_HE = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];

function WeeklyTranscription() {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [previews, setPreviews] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [weekSessions, setWeekSessions] = useState([]);

  // Load this week's sessions on mount
  useEffect(() => {
    const now = new Date();
    const dow = now.getDay(); // 0=Sun
    const sun = new Date(now); sun.setDate(now.getDate() - dow);
    const sat = new Date(sun); sat.setDate(sun.getDate() + 6);
    const fmt2 = d => d.toISOString().split('T')[0];
    sessionsAPI.getWeek(fmt2(sun), fmt2(sat))
      .then(r => {
        const sorted = (r.data || [])
          .filter(s => s.status !== 'cancelled')
          .sort((a, b) => {
            const da = a.session_date || '';
            const db = b.session_date || '';
            if (da !== db) return da < db ? -1 : 1;
            return (a.session_time || '') < (b.session_time || '') ? -1 : 1;
          });
        setWeekSessions(sorted);
      })
      .catch(() => {});
  }, []);

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ['audio/webm;codecs=opus','audio/webm','audio/ogg','audio/mp4'].find(t => { try { return MediaRecorder.isTypeSupported(t); } catch(e) { return false; } }) || 'audio/webm';
      const mr = new MediaRecorder(stream, { mimeType });
      const chunks = [];
      mr.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (chunks.length === 0) return;
        setTranscribing(true);
        const blob = new Blob(chunks, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result.split(',')[1];
          try {
            const r = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/transcribe`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: base64, mimeType })
            });
            const d = await r.json();
            setTranscribing(false);
            if (d.text) {
              const newText = text ? text + ' ' + d.text : d.text;
              setText(newText);
              // Auto-split by patient name (raw), user can then choose save or save+AI
              doSplitWith(newText);
            } else if (d.message) alert(d.message);
          } catch(e) { setTranscribing(false); alert('שגיאה בתמלול'); }
        };
        reader.readAsDataURL(blob);
      };
      mr.start(1000);
      setRecognition(mr); setIsRecording(true);
    } catch(e) { alert('אין גישה למיקרופון: ' + e.message); }
  };

  const stopRec = () => {
    if (recognition && recognition.state === 'recording') recognition.stop();
    setRecognition(null); setIsRecording(false);
  };

  const [mode, setMode] = useState(null); // 'process' | 'raw'

  const processTranscription = async (txt) => {
    if (!txt?.trim()) return;
    setProcessing(true); setPreviews(null); setMode('process');
    try {
      const r = await notesAPI.parseWeekly(txt);
      setPreviews(r.data.previews);
    } catch (e) { alert('שגיאה בעיבוד AI'); setMode(null); }
    setProcessing(false);
  };

  const doProcess = async () => processTranscription(text);

  const doSplitWith = async (txt) => {
    if (!txt?.trim()) return;
    setProcessing(true); setPreviews(null); setMode('raw');
    try {
      const r = await notesAPI.splitWeekly(txt); // split by name only, no AI
      setPreviews(r.data.previews);
    } catch (e) { alert('שגיאה בארגון'); setMode(null); }
    setProcessing(false);
  };

  const doSplit = async () => doSplitWith(text);

  const saveSegments = async (segments) => {
    setSaving(true);
    try {
      await notesAPI.saveWeekly(segments.map(p => ({
        patient_id: p.patient_id,
        content: p.content,
        session_id: p.session_id || null
      })));
      setSaved(true); setPreviews(null); setText(''); setMode(null);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { alert('שגיאה בשמירה'); }
    setSaving(false);
  };

  const toggleMatch = (i) => {
    setPreviews(prev => prev.map((p, idx) => idx === i ? { ...p, matched: !p.matched } : p));
  };

  const doSave = async () => {
    const toSave = previews.filter(p => p.patient_id && p.matched);
    if (!toSave.length) return;
    await saveSegments(toSave);
  };

  const doSaveWithAI = async () => {
    const toSave = previews.filter(p => p.patient_id && p.matched);
    if (!toSave.length) return;
    setProcessing(true);
    try {
      // Re-process with AI then save
      const r = await notesAPI.parseWeekly(text);
      const aiPreviews = r.data.previews.filter(p => p.patient_id && p.matched);
      await saveSegments(aiPreviews);
    } catch (e) { alert('שגיאה בעיבוד AI'); }
    setProcessing(false);
  };

  return (
    <div className="card card-sm" style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>🎙 תמלול שבועי</div>
        {saved && <span style={{ fontSize: 12, color: 'var(--success)' }}>✅ נשמר!</span>}
      </div>

      {!previews ? (
        <>
          {/* Week sessions reference panel */}
          {weekSessions.length > 0 && (
            <div style={{ marginBottom: 12, background: 'var(--page-bg)', borderRadius: 10, padding: '10px 14px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 0.3 }}>📅 פגישות השבוע</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {weekSessions.map((s, i) => {
                  const [sy, sm, sd] = s.session_date.slice(0, 10).split('-').map(Number);
                  const d = new Date(sy, sm - 1, sd);
                  const dayHe = DAY_NAMES_HE[d.getDay()];
                  const dateStr = d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
                  const timeStr = s.session_time ? s.session_time.slice(0, 5) : '';
                  const name = `${s.first_name} ${s.last_name}`;
                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                      <span style={{ minWidth: 22, textAlign: 'center', fontWeight: 700, fontSize: 11,
                        background: 'var(--primary-light, #ede9fe)', color: 'var(--primary)',
                        borderRadius: 5, padding: '1px 5px' }}>{i + 1}</span>
                      <span style={{ fontWeight: 600, minWidth: 90 }}>{name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>
                        יום {dayHe} · {dateStr}{timeStr ? ` · ${timeStr}` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 7, marginBottom: 10 }}>
            <button
              className={`btn btn-xs ${isRecording ? 'btn-danger' : 'btn-ghost'}`}
              onClick={isRecording ? stopRec : startRec}
              disabled={transcribing || processing}
            >
              {Icon.mic(13)} {isRecording ? 'עצור הקלטה' : 'הקלט'}
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
              {isRecording ? '🔴 מקליט...'
                : transcribing ? '⏳ ממלל...'
                : processing ? '🤖 מזהה מטופלים לפי יומן...'
                : 'או הדבק טקסט ידנית'}
            </span>
          </div>
          <textarea
            rows={6}
            placeholder={'הדבק כאן תמלול של פגישות השבוע...\nלדוגמה:\nישראל: דיבר על...\nשרה: סיפרה ש...'}
            value={text}
            onChange={e => setText(e.target.value)}
            style={{ marginBottom: 10, fontSize: 13 }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={doSplit}
                disabled={processing || !text.trim()}
                title="מחלק את התמלול לפי שמות מטופלים ושומר את הטקסט הגולמי ללא עריכה"
              >
                {processing && mode === 'raw' ? '⏳ מחלק...' : '📂 שמור וארגן עם AI'}
              </button>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={doProcess}
              disabled={processing || !text.trim()}
              title="AI מעבד ועורך את הטקסט לתיעוד קליני מסודר"
            >
              {Icon.ai(13)} {processing && mode === 'process' ? 'מעבד...' : 'שמור ועבד עם AI'}
            </button>
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 16, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>📂 שמור וארגן — שומר טקסט גולמי לכל מטופל</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{Icon.ai(11)} שמור ועבד — AI עורך לתיעוד קליני</span>
          </div>
        </>
      ) : (
        <>
          <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--text-muted)', padding: '4px 0' }}>
            {mode === 'raw' ? '📂 תצוגה מקדימה — טקסט גולמי לפי מטופל' : '🗓 תיעוד מעובד לפי סדר פגישות השבוע'}
          </div>
          <div style={{ marginBottom: 12 }}>
            {previews.length === 0
              ? <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>לא זוהו שמות מטופלים בטקסט</div>
              : previews.map((p, i) => (
              <div key={i} style={{
                padding: '10px 14px', borderRadius: 10, marginBottom: 8,
                background: !p.matched ? '#fff1f2' : p.patient_id ? 'var(--page-bg)' : '#fffbeb',
                border: `1px solid ${!p.matched ? '#fecaca' : p.patient_id ? 'var(--border)' : '#fde68a'}`,
                opacity: p.patient_id && !p.matched ? 0.6 : 1
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 13.5 }}>{p.patient_name}</span>
                    {p.day_name && p.matched && (
                      <span style={{
                        fontSize: 11, color: 'var(--primary)',
                        background: 'var(--primary-light, #ede9fe)', borderRadius: 6,
                        padding: '1px 7px', fontWeight: 500
                      }}>
                        {p.session_date ? fmtDate(p.session_date) + ' · ' : ''}יום {p.day_name}
                        {p.session_time ? ` · ${p.session_time.slice(0,5)}` : ''}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {!p.patient_id
                      ? <span style={{ fontSize: 11, color: 'var(--danger)' }}>לא זוהה במערכת</span>
                      : p.matched
                        ? <span style={{ fontSize: 11, color: 'var(--success)' }}>
                            {p.day_name ? '✓ פגישה השבוע' : '✓ זוהה'}
                          </span>
                        : <span style={{ fontSize: 11, color: '#b45309' }}>⚬ מבוטל ידנית</span>
                    }
                    {p.patient_id && (
                      <button
                        onClick={() => toggleMatch(i)}
                        title={p.matched ? 'בטל זיהוי — לא יישמר' : 'שחזר זיהוי'}
                        style={{
                          border: 'none', cursor: 'pointer', borderRadius: 5, fontSize: 11, padding: '2px 7px',
                          background: p.matched ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.15)',
                          color: p.matched ? '#dc2626' : '#16a34a', fontWeight: 600
                        }}
                      >
                        {p.matched ? '✕ בטל' : '✓ שחזר'}
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{p.content}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-xs" onClick={() => { setPreviews(null); setMode(null); }}>חזור</button>
            <button className="btn btn-ghost btn-sm" onClick={doSave} disabled={saving || processing || previews.filter(p=>p.matched).length === 0}>
              {saving ? 'שומר...' : `💾 שמור (${previews.filter(p => p.matched).length})`}
            </button>
            <button className="btn btn-primary btn-sm" onClick={doSaveWithAI} disabled={saving || processing || previews.filter(p=>p.matched).length === 0}>
              {processing ? '🤖 מעבד...' : `✨ שמור ועבד עם AI (${previews.filter(p => p.matched).length})`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── GENERAL TRANSCRIPTION PAGE ──────────────────────────────────────────────
function GeneralTranscriptionPage() {
  const [patients, setPatients] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processedText, setProcessedText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    patientsAPI.getAll({ status: 'active' }).then(r => setPatients(r.data)).catch(() => {});
  }, []);

  const filtered = patients.filter(p =>
    !search || `${p.first_name} ${p.last_name}`.includes(search)
  );

  const togglePatient = (id) => {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(p => p.id)));
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ['audio/webm;codecs=opus','audio/webm','audio/ogg','audio/mp4'].find(t => { try { return MediaRecorder.isTypeSupported(t); } catch(e) { return false; } }) || 'audio/webm';
      const mr = new MediaRecorder(stream, { mimeType });
      const chunks = [];
      mr.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (chunks.length === 0) return;
        const blob = new Blob(chunks, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result.split(',')[1];
          try {
            const r = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/transcribe`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: base64, mimeType })
            });
            const d = await r.json();
            if (d.text) setText(prev => prev ? prev + ' ' + d.text : d.text);
            else if (d.message) alert(d.message);
          } catch(e) { alert('שגיאה בתמלול'); }
        };
        reader.readAsDataURL(blob);
      };
      mr.start(1000);
      setRecognition(mr); setIsRecording(true);
    } catch(e) { alert('אין גישה למיקרופון: ' + e.message); }
  };

  const stopRec = () => {
    if (recognition && recognition.state === 'recording') recognition.stop();
    setRecognition(null); setIsRecording(false);
  };

  const doProcess = async () => {
    if (!text.trim() || !selectedIds.size) { alert('יש לבחור לפחות מטופל אחד ולהכניס טקסט'); return; }
    setProcessing(true); setProcessedText('');
    try {
      const firstId = Array.from(selectedIds)[0];
      const noteRes = await notesAPI.create(firstId, { raw_text: text, note_type: 'session' });
      const procRes = await notesAPI.processWithAI(noteRes.data.id);
      setProcessedText(procRes.data.processed_text);
      // delete the temp note — we'll recreate on save for each patient
      // (keep it for display; user can edit)
    } catch (e) { alert('שגיאה בעיבוד AI'); }
    setProcessing(false);
  };

  const doSave = async () => {
    if (!selectedIds.size || !text.trim()) { alert('יש לבחור מטופלים'); return; }
    setSaving(true);
    try {
      for (const pid of selectedIds) {
        await notesAPI.create(pid, {
          raw_text: text,
          processed_text: processedText || undefined,
          note_type: 'session'
        });
      }
      setSaved(true); setText(''); setProcessedText(''); setSelectedIds(new Set());
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { alert('שגיאה בשמירה'); }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="card">
        <div className="card-title" style={{ marginBottom: 20 }}>{Icon.mic(18)} תמלול כללי</div>

        {/* Patient multi-select */}
        <div style={{ marginBottom: 18 }}>
          <label className="input-label">מטופלים ({selectedIds.size} נבחרו)</label>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            {/* Search + select-all row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #f1f5f9', background: '#f9fafb' }}>
              <input
                type="checkbox"
                checked={selectedIds.size === filtered.length && filtered.length > 0}
                onChange={toggleAll}
                style={{ width: 'auto', margin: 0 }}
              />
              <input
                type="text"
                placeholder="חיפוש מטופל..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, border: 'none', background: 'transparent', padding: '2px 0', fontSize: 14, outline: 'none', boxShadow: 'none' }}
              />
            </div>
            {/* Patient list */}
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {filtered.length === 0
                ? <div style={{ padding: '14px', color: 'var(--text-muted)', textAlign: 'center' }}>לא נמצאו מטופלים</div>
                : filtered.map(p => (
                  <div
                    key={p.id}
                    onClick={() => togglePatient(p.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                      cursor: 'pointer', borderBottom: '1px solid #f8fafc',
                      background: selectedIds.has(p.id) ? 'var(--accent-light)' : 'white',
                      transition: 'background 0.1s'
                    }}
                  >
                    <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => {}} style={{ width: 'auto', margin: 0, pointerEvents: 'none' }} />
                    <Avatar name={`${p.first_name} ${p.last_name}`} size={30} />
                    <span style={{ fontSize: 15, fontWeight: selectedIds.has(p.id) ? 500 : 400 }}>{p.first_name} {p.last_name}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        {/* Recording */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button className={`btn btn-sm ${isRecording ? 'btn-danger' : 'btn-ghost'}`} onClick={isRecording ? stopRec : startRec}>
            {Icon.mic(14)} {isRecording ? 'עצור הקלטה' : 'הקלט'}
          </button>
          {isRecording && <span style={{ fontSize: 14, color: 'var(--danger)', alignSelf: 'center' }}>🔴 מקליט...</span>}
        </div>

        <Field label="טקסט תמלול">
          <textarea rows={8} placeholder="הקלט או הדבק כאן את תמלול הפגישה..." value={text} onChange={e => setText(e.target.value)} />
        </Field>

        {processedText && (
          <Field label="תיעוד מעובד (AI)">
            <textarea rows={8} value={processedText} onChange={e => setProcessedText(e.target.value)} />
          </Field>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
          {saved && <span style={{ color: 'var(--success)', alignSelf: 'center', fontWeight: 500 }}>✅ נשמר לכל המטופלים הנבחרים!</span>}
          <button className="btn btn-ghost btn-sm" onClick={doProcess} disabled={processing || !text.trim() || !selectedIds.size}>
            {Icon.ai(14)} {processing ? 'מעבד...' : 'עבד עם AI'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={doSave} disabled={saving || !selectedIds.size || !text.trim()}>
            {saving ? 'שומר...' : `שמור ל־${selectedIds.size} מטופלים`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BULK BILLING PAGE ────────────────────────────────────────────────────────
function BulkBillingPage() {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <BillingPanel />
    </div>
  );
}

// ─── WEEKLY TRANSCRIPTION FULL PAGE ──────────────────────────────────────────
function WeeklyTranscriptionPage() {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <WeeklyTranscription />
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function Dashboard({ month: initMonth, year: initYear, onPatientClick }) {
  const [unpaid, setUnpaid] = useState([]);
  const [weekSessions, setWeekSessions] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [summary, setSummary] = useState(null);
  const [weekCancelled, setWeekCancelled] = useState([]);
  const [weekRescheduled, setWeekRescheduled] = useState([]);
  const now = new Date();
  const [summaryMonth, setSummaryMonth] = useState(initMonth || now.getMonth() + 1);
  const [summaryYear, setSummaryYear] = useState(initYear || now.getFullYear());

  const monthNames = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

  const changeMonth = (delta) => {
    setSummaryMonth(m => {
      let nm = m + delta;
      if (nm > 12) { nm = 1; setSummaryYear(y => y + 1); }
      else if (nm < 1) { nm = 12; setSummaryYear(y => y - 1); }
      return nm;
    });
  };

  // Compute week dates (Sun–Sat) based on offset
  const getWeekDates = (offset = 0) => {
    const today = new Date();
    const day = today.getDay(); // 0=Sun
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - day + offset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return d;
    });
  };

  // Use local date string (not UTC) to avoid timezone shift
  const localDateStr = (d) => {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  };

  const weekDays = getWeekDates(weekOffset);
  const fromDate = localDateStr(weekDays[0]);
  const toDate = localDateStr(weekDays[6]);

  const loadWeek = useCallback(() => {
    sessionsAPI.getWeek(fromDate, toDate)
      .then(r => setWeekSessions(r.data || []))
      .catch(() => {});
  }, [fromDate, toDate]);

  const loadSummary = useCallback(() => {
    dashboardAPI.get({ month: summaryMonth, year: summaryYear })
      .then(r => {
        setSummary(r.data);
        setWeekCancelled(r.data?.week_cancelled || []);
        setWeekRescheduled(r.data?.week_rescheduled || []);
        setUnpaid((r.data?.unpaid_billing || []).map(b => ({
          patient_name: `${b.first_name} ${b.last_name}`,
          amount: b.amount
        })));
      })
      .catch(() => {});
  }, [summaryMonth, summaryYear]);

  useEffect(() => { loadWeek(); }, [loadWeek]);
  useEffect(() => { loadSummary(); }, [loadSummary]);

  const handleSync = async () => {
    setSyncing(true); setSyncMsg('');
    try {
      const r = await calendarAPI.sync();
      const count = r.data.imported || 0;
      setSyncMsg(count > 0 ? `✅ יובאו ${count} פגישות חדשות` : '✅ הכל מעודכן');
      loadWeek(); loadSummary();
    } catch (e) { setSyncMsg('❌ שגיאה בסנכרון'); }
    finally { setSyncing(false); setTimeout(() => setSyncMsg(''), 4000); }
  };

  const dayLabels = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const today = localDateStr(new Date());

  const statusColor = { scheduled: '#6366f1', completed: '#10b981', cancelled: '#94a3b8', no_show: '#ef4444' };
  const statusBg   = { scheduled: 'rgba(99,102,241,0.08)', completed: 'rgba(16,185,129,0.08)', cancelled: 'rgba(148,163,184,0.08)', no_show: 'rgba(239,68,68,0.08)' };

  const weekLabel = () => {
    const startMonth = weekDays[0].getMonth();
    const endMonth   = weekDays[6].getMonth();
    const startYear  = weekDays[0].getFullYear();
    const endYear    = weekDays[6].getFullYear();
    const monthStr = startMonth === endMonth
      ? `${monthNames[startMonth]} ${startYear}`
      : `${monthNames[startMonth]}–${monthNames[endMonth]} ${endYear}`;
    if (weekOffset === 0) return `השבוע · ${monthStr}`;
    if (weekOffset === -1) return `שבוע שעבר · ${monthStr}`;
    if (weekOffset === 1)  return `שבוע הבא · ${monthStr}`;
    return monthStr;
  };


  return (
    <div>
      {/* ── Top bar: Sync + Week nav ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <button onClick={handleSync} disabled={syncing} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px',
          background: syncing ? '#e2e8f0' : '#fff', border: '1.5px solid #e2e8f0',
          borderRadius: 10, cursor: syncing ? 'not-allowed' : 'pointer',
          fontSize: 14, fontWeight: 600, color: '#374151', fontFamily: 'inherit',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}
          onMouseEnter={e => { if (!syncing) e.currentTarget.style.borderColor = '#6366f1'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={syncing ? '#94a3b8' : '#6366f1'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }}>
            <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
            <path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
          </svg>
          {syncing ? 'מסנכרן...' : 'רענן יומן גוגל'}
        </button>
        {syncMsg && <span style={{ fontSize: 13.5, color: syncMsg.startsWith('✅') ? '#10b981' : '#ef4444', fontWeight: 500 }}>{syncMsg}</span>}
      </div>

      {/* ── WEEKLY CALENDAR ── */}
      <div className="card card-sm" style={{ marginBottom: 20, padding: '20px 22px' }}>
        {/* Calendar header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 16 }}>
            {Icon.calendar(16)}&nbsp; לוח שבועי — {weekLabel()}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setWeekOffset(w => w - 1)} className="btn btn-ghost btn-xs">‹ שבוע קודם</button>
            {weekOffset !== 0 && <button onClick={() => setWeekOffset(0)} className="btn btn-ghost btn-xs">היום</button>}
            <button onClick={() => setWeekOffset(w => w + 1)} className="btn btn-ghost btn-xs">שבוע הבא ›</button>
          </div>
        </div>

        {/* 7-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {weekDays.map((d, i) => {
            const dateStr = localDateStr(d);
            const isToday = dateStr === today;
            // Compare date strings directly to avoid timezone shifts
            const daySessions = weekSessions.filter(s => {
              if (!s.session_date) return false;
              return s.session_date.slice(0, 10) === dateStr;
            });
            return (
              <div key={i} style={{
                borderRadius: 10,
                border: isToday ? '2px solid #6366f1' : '1px solid var(--border)',
                background: isToday ? 'rgba(99,102,241,0.04)' : 'var(--page-bg)',
                minHeight: 110, overflow: 'hidden'
              }}>
                {/* Day header */}
                <div style={{
                  padding: '7px 8px 5px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center'
                }}>
                  <div style={{ fontSize: 11, color: isToday ? '#6366f1' : 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    {dayLabels[i]}
                  </div>
                  <div style={{
                    fontSize: 18, fontFamily: 'var(--font-heading)', fontWeight: 700,
                    color: isToday ? '#6366f1' : 'var(--text-primary)',
                    width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '50%', background: isToday ? 'rgba(99,102,241,0.12)' : 'transparent'
                  }}>
                    {d.getDate()}
                  </div>
                  {d.getDate() === 1 && (
                    <div style={{ fontSize: 9.5, color: '#6366f1', fontWeight: 700, marginTop: 1, letterSpacing: 0.3 }}>
                      {monthNames[d.getMonth()]}
                    </div>
                  )}
                </div>

                {/* Sessions in this day */}
                <div style={{ padding: '5px 5px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {daySessions.map((s, si) => (
                    <div key={si}
                      onClick={() => onPatientClick && onPatientClick(s.patient_id)}
                      style={{
                        borderRadius: 6, padding: '4px 6px',
                        background: statusBg[s.status] || 'rgba(99,102,241,0.08)',
                        borderRight: `3px solid ${statusColor[s.status] || '#6366f1'}`,
                        cursor: onPatientClick ? 'pointer' : 'default',
                      }}
                      onMouseEnter={e => { if (onPatientClick) e.currentTarget.style.opacity = '0.75'; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 600, color: statusColor[s.status] || '#6366f1', marginBottom: 1 }}>
                        {s.session_time ? s.session_time.slice(0,5) : ''}
                      </div>
                      <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                        {s.first_name} {s.last_name}
                      </div>
                    </div>
                  ))}
                  {daySessions.length === 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0', opacity: 0.5 }}>—</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          {[['scheduled','מתוכנן'],['completed','הושלם'],['cancelled','בוטל'],['no_show','לא הגיע']].map(([s,l]) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--text-muted)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: statusColor[s] }}/>
              {l}
            </div>
          ))}
        </div>
      </div>

      {/* ── MONTHLY SUMMARY ── */}
      <div className="card card-sm" style={{ padding: '20px 22px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 16 }}>
            {Icon.billing(16)}&nbsp; סיכום חודשי
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => changeMonth(-1)} className="btn btn-ghost btn-xs">‹</button>
            <span style={{ fontSize: 14, fontWeight: 600, minWidth: 90, textAlign: 'center' }}>
              {monthNames[summaryMonth - 1]} {summaryYear}
            </span>
            <button onClick={() => changeMonth(1)} className="btn btn-ghost btn-xs">›</button>
          </div>
        </div>

        {/* Big KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div style={{ background: 'var(--page-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#6366f1' }}>
              {fmt(Number(summary?.income?.expected || 0))}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>הכנסות צפויות</div>
          </div>
          <div style={{ background: 'var(--page-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#6366f1' }}>
              {Number(summary?.sessions?.total || 0)}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>פגישות</div>
          </div>
        </div>

        {/* Small stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            { label: 'עבור פגישות', value: fmt(Number(summary?.income?.pending || 0)), color: '#ef4444' },
            { label: 'תשלומים שהתקבלו', value: fmt(Number(summary?.income?.collected || 0)), color: '#10b981' },
            { label: 'ביטולים', value: Number(summary?.sessions?.cancelled || 0), color: '#94a3b8' },
            { label: 'התקיימו', value: Number(summary?.sessions?.completed || 0), color: '#10b981' },
          ].map((item, i) => (
            <div key={i} style={{ background: 'var(--page-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontFamily: 'var(--font-heading)', fontWeight: 700, color: item.color }}>{item.value}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── WEEK CHANGES: CANCELLED ── */}
      {weekCancelled.length > 0 && (
        <div className="card card-sm" style={{ marginBottom: 12, borderRight: '3px solid #ef4444' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: '#dc2626' }}>
            ❌ ביטולים השבוע ({weekCancelled.length})
          </div>
          {weekCancelled.map(s => {
            const dateStr = s.session_date ? new Date(s.session_date).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' }) : '';
            const timeStr = s.session_time ? s.session_time.slice(0, 5) : '';
            const statusMap = { cancelled: 'בוטל', no_show: 'לא הגיע' };
            return (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>{s.first_name} {s.last_name}</span>
                <span style={{ color: 'var(--text-muted)' }}>{dateStr}{timeStr ? ` · ${timeStr}` : ''}</span>
                <span style={{
                  background: s.status === 'no_show' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                  color: s.status === 'no_show' ? '#b45309' : '#dc2626',
                  borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600
                }}>{statusMap[s.status] || s.status}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── WEEK CHANGES: RESCHEDULED ── */}
      {weekRescheduled.length > 0 && (
        <div className="card card-sm" style={{ marginBottom: 12, borderRight: '3px solid #f59e0b' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: '#b45309' }}>
            🔄 הזזות השבוע ({weekRescheduled.length})
          </div>
          {weekRescheduled.map(s => {
            const origDateStr = s.original_session_date ? new Date(s.original_session_date).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' }) : '';
            const origTimeStr = s.original_session_time ? s.original_session_time.slice(0, 5) : '';
            const newDateStr = s.session_date ? new Date(s.session_date).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' }) : '';
            const newTimeStr = s.session_time ? s.session_time.slice(0, 5) : '';
            return (
              <div key={s.id} style={{ padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <div style={{ fontWeight: 600, marginBottom: 3 }}>{s.first_name} {s.last_name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  <span style={{ textDecoration: 'line-through', marginLeft: 6 }}>{origDateStr}{origTimeStr ? ` ${origTimeStr}` : ''}</span>
                  <span style={{ color: '#2563eb' }}>← {newDateStr}{newTimeStr ? ` ${newTimeStr}` : ''}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── OPEN DEBT ── */}
      {(() => {
        // Group by patient, sum amounts, filter out zero-debt
        const grouped = Object.values(
          unpaid.reduce((acc, u) => {
            const key = u.patient_name;
            if (!acc[key]) acc[key] = { patient_name: key, amount: 0 };
            acc[key].amount += Number(u.amount || 0);
            return acc;
          }, {})
        ).filter(u => u.amount > 0);
        const totalDebtGrouped = grouped.reduce((s, u) => s + u.amount, 0);
        if (grouped.length === 0) return null;
        return (
          <div className="card card-sm" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 16 }}>
                {Icon.billing(16)}&nbsp; חוב פתוח
              </div>
              <div style={{ fontSize: 15, fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#ef4444' }}>
                סה"כ {fmt(totalDebtGrouped)}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {grouped.map((u, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 10,
                  background: 'var(--page-bg)', border: '1px solid var(--border)'
                }}>
                  <Avatar name={u.patient_name} size={34}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{u.patient_name}</div>
                    <div style={{ fontSize: 13, color: '#ef4444', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{fmt(u.amount)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── PATIENTS LIST ────────────────────────────────────────────────────────────
function PatientsList({ onSelect }) {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', email: '', date_of_birth: '',
    gender: '', id_number: '', address: '', referral_source: '',
    treatment_type: 'individual', presenting_problem: '', diagnosis: '',
    status: 'active', session_fee: 450
  });

  const load = useCallback(() => {
    patientsAPI.getAll({ status: statusFilter || undefined, search: search || undefined })
      .then(r => setPatients(r.data)).catch(() => {});
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try {
      await patientsAPI.create(form);
      setShowForm(false);
      load();
    } catch (e) { alert('שגיאה בשמירה'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>{Icon.plus(14)} מטופל חדש</button>
      </div>

      <div className="card card-sm" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="search-bar">
            <span className="search-bar-icon">{Icon.search(14)}</span>
            <input placeholder="חפש מטופל..." value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 'auto', padding: '9px 13px' }}>
            <option value="">כל הסטטוסים</option>
            <option value="active">פעיל</option>
            <option value="inactive">לא פעיל</option>
            <option value="waitlist">המתנה</option>
            <option value="ended">סיים</option>
          </select>
        </div>
      </div>

      {patients.length === 0
        ? <EmptyState icon={Icon.patients(22)} title="אין מטופלים" sub="הוסף מטופל חדש כדי להתחיל" action={<button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>{Icon.plus(14)} מטופל חדש</button>}/>
        : patients.map(p => {
          const fullName = `${p.first_name} ${p.last_name}`;
          return (
            <div key={p.id} className="patient-row" onClick={() => onSelect(p.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                <Avatar name={fullName} size={42}/>
                <div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 14.5 }}>{fullName}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                    {p.phone}{p.treatment_type ? ` · ${treatmentLabel[p.treatment_type] || p.treatment_type}` : ''}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {p.session_fee && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmt(p.session_fee)}</span>}
                <span className={`badge ${statusBadgeClass[p.status] || 'badge-inactive'}`}>{statusLabel[p.status] || p.status}</span>
              </div>
            </div>
          );
        })
      }

      {showForm && (
        <Modal title="מטופל חדש" onClose={() => setShowForm(false)} wide>
          <div className="grid-2">
            <Field label="שם פרטי"><input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })}/></Field>
            <Field label="שם משפחה"><input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })}/></Field>
            <Field label="טלפון"><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/></Field>
            <Field label="אימייל"><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/></Field>
            <Field label="תאריך לידה"><input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })}/></Field>
            <Field label="מין">
              <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                <option value="">בחר</option><option value="male">זכר</option><option value="female">נקבה</option><option value="other">אחר</option>
              </select>
            </Field>
            <Field label="ת.ז."><input value={form.id_number} onChange={e => setForm({ ...form, id_number: e.target.value })}/></Field>
            <Field label="סוג טיפול">
              <select value={form.treatment_type} onChange={e => setForm({ ...form, treatment_type: e.target.value })}>
                <option value="individual">פרטני</option><option value="couples">זוגי</option><option value="child">ילד</option><option value="adolescent">מתבגר</option>
              </select>
            </Field>
            <Field label="תשלום לפגישה (₪)"><input type="number" value={form.session_fee} onChange={e => setForm({ ...form, session_fee: e.target.value })}/></Field>
            <Field label="סטטוס">
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="active">פעיל</option><option value="inactive">לא פעיל</option><option value="waitlist">המתנה</option><option value="ended">סיים</option>
              </select>
            </Field>
          </div>
          <Field label="בעיה מציגה"><textarea rows={3} value={form.presenting_problem} onChange={e => setForm({ ...form, presenting_problem: e.target.value })}/></Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>ביטול</button>
            <button className="btn btn-primary btn-sm" onClick={save}>{Icon.check(14)} שמור</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── PATIENT DETAIL ───────────────────────────────────────────────────────────
// ─── BILLING TAB (patient card) ───────────────────────────────────────────────
function BillingTab({ billing, patientId, onNewPayment, generateBilling, onReload }) {
  const [expanded, setExpanded] = useState(null); // billing record id
  const [checking, setChecking] = useState(null);
  const [checkResult, setCheckResult] = useState({});

  const checkMorning = async (b) => {
    setChecking(b.id);
    try {
      const r = await billingAPI.morningStatus(b.id);
      setCheckResult(prev => ({ ...prev, [b.id]: r.data }));
      if (r.data.autoMarked) onReload();
    } catch (e) {
      setCheckResult(prev => ({ ...prev, [b.id]: { error: e.response?.data?.error || 'שגיאה' } }));
    }
    setChecking(null);
  };

  if (billing.length === 0) return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button className="btn btn-primary btn-sm" onClick={() => onNewPayment ? onNewPayment(patientId) : generateBilling()}>{Icon.plus(13)} צור חיוב חודשי</button>
      </div>
      <EmptyState icon={Icon.billing(22)} title="אין חיובים" sub="צור חיוב חודשי ראשון"/>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button className="btn btn-primary btn-sm" onClick={() => onNewPayment ? onNewPayment(patientId) : generateBilling()}>{Icon.plus(13)} צור חיוב חודשי</button>
      </div>
      <div className="card card-sm" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '110px 90px 60px 90px 70px 32px',
          padding: '9px 16px', background: 'var(--page-bg)',
          borderBottom: '1px solid var(--border)',
          fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', gap: 8
        }}>
          <div>תאריך חיוב</div>
          <div>תקופה</div>
          <div style={{ textAlign: 'center' }}>פגישות</div>
          <div style={{ textAlign: 'center' }}>סכום</div>
          <div style={{ textAlign: 'center' }}>סטטוס</div>
          <div/>
        </div>

        {billing.map((b, i) => {
          const createdDate = b.created_at ? new Date(b.created_at) : null;
          const periodDate = b.period_start ? new Date(b.period_start) : null;
          const periodLabel = periodDate ? `${months[periodDate.getMonth()]} ${periodDate.getFullYear()}` : '—';
          const createdLabel = createdDate ? createdDate.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';
          const isPaid = b.status === 'paid';
          const isSent = b.status === 'sent';
          const isOpen = expanded === b.id;
          const result = checkResult[b.id];

          return (
            <div key={b.id} style={{ borderBottom: i < billing.length - 1 ? '1px solid var(--border)' : 'none' }}>
              {/* Main row */}
              <div style={{
                display: 'grid', gridTemplateColumns: '110px 90px 60px 90px 70px 32px',
                padding: '12px 16px', alignItems: 'center', gap: 8,
                background: i % 2 === 0 ? 'var(--card-bg)' : 'var(--page-bg)'
              }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{createdLabel}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{periodLabel}</div>
                <div style={{ textAlign: 'center', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15 }}>{b.total_sessions || 0}</div>
                <div style={{ textAlign: 'center', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15 }}>{fmt(b.total_amount)}</div>
                {/* Status badge */}
                <div style={{ textAlign: 'center' }}>
                  {isPaid
                    ? <span style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>✓ שולם</span>
                    : isSent
                    ? <span style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.1)', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>📤 נשלח</span>
                    : <span style={{ color: '#94a3b8', background: 'rgba(148,163,184,0.1)', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>⏳ ממתין</span>
                  }
                </div>
                {/* Expand toggle */}
                <button
                  onClick={() => setExpanded(isOpen ? null : b.id)}
                  style={{
                    width: 24, height: 24, borderRadius: '50%', border: '1.5px solid var(--border)',
                    background: isOpen ? '#6366f1' : 'transparent', color: isOpen ? '#fff' : 'var(--text-muted)',
                    cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, lineHeight: 1
                  }}
                >{isOpen ? '−' : '+'}</button>
              </div>

              {/* Expanded details */}
              {isOpen && (
                <div style={{
                  padding: '14px 20px', background: 'rgba(99,102,241,0.03)',
                  borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10
                }}>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13 }}>
                    {b.sent_at && (
                      <div><span style={{ color: 'var(--text-muted)' }}>נשלח: </span>
                        <strong>{new Date(b.sent_at).toLocaleDateString('he-IL')}</strong>
                      </div>
                    )}
                    {b.sent_count > 0 && (
                      <div><span style={{ color: 'var(--text-muted)' }}>מספר שליחות: </span>
                        <strong>{b.sent_count}</strong>
                      </div>
                    )}
                    {b.payment_link && (
                      <a href={b.payment_link} target="_blank" rel="noopener noreferrer"
                        style={{ color: '#6366f1', fontSize: 13 }}>🔗 לינק תשלום</a>
                    )}
                    {b.invoice_number && (
                      <div><span style={{ color: 'var(--text-muted)' }}>חשבונית: </span><strong>#{b.invoice_number}</strong></div>
                    )}
                    {b.paid_at && (
                      <div><span style={{ color: 'var(--text-muted)' }}>שולם: </span>
                        <strong style={{ color: '#10b981' }}>{new Date(b.paid_at).toLocaleDateString('he-IL')}</strong>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {!isPaid && (
                      <>
                        <button className="btn btn-ghost btn-xs" disabled={checking === b.id}
                          onClick={() => checkMorning(b)}
                          style={{ fontSize: 12 }}>
                          {checking === b.id ? '⏳ בודק...' : '🔍 בדוק כנגד מורנינג'}
                        </button>
                        <button className="btn btn-success btn-xs" onClick={async () => {
                          await billingAPI.markPaid(b.id); onReload();
                        }} style={{ fontSize: 12 }}>{Icon.check(11)} סמן שולם ידנית</button>
                      </>
                    )}
                  </div>

                  {/* Morning check result */}
                  {result && (
                    <div style={{
                      padding: '10px 14px', borderRadius: 8, fontSize: 13,
                      background: result.error ? 'rgba(239,68,68,0.07)' : result.paid ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.08)',
                      border: `1px solid ${result.error ? '#fca5a5' : result.paid ? '#6ee7b7' : '#fde68a'}`
                    }}>
                      {result.error
                        ? <span style={{ color: '#ef4444' }}>❌ {result.error}</span>
                        : result.paid
                        ? <span style={{ color: '#10b981' }}>✅ שולם במורנינג! הסטטוס עודכן אוטומטית{result.paidAmount ? ` — ${fmt(result.paidAmount)}` : ''}</span>
                        : <span style={{ color: '#92400e' }}>⏳ טרם שולם במורנינג{result.info ? ` — ${result.info}` : ''}</span>
                      }
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PatientDetail({ patientId, onBack, onLoad, onNewPayment }) {
  const [patient, setPatient] = useState(null);
  const [summary, setSummary] = useState(null);
  const [tab, setTab] = useState('info');
  const [notes, setNotes] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [questionnaires, setQuestionnaires] = useState([]);
  const [billing, setBilling] = useState([]);
  const [qTypes, setQTypes] = useState([]);

  // Treatment summary state
  const [treatmentSummary, setTreatmentSummary] = useState('');
  const [summaryInstructions, setSummaryInstructions] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryGenerated, setSummaryGenerated] = useState(false);

  // Intake state
  const [intake, setIntake] = useState(null);
  const [intakeVersions, setIntakeVersions] = useState([]);
  const [intakeMode, setIntakeMode] = useState('view'); // 'view' | 'form' | 'freetext' | 'ai-edit'
  const [intakeForm, setIntakeForm] = useState({
    presenting_problem: '', psychiatric_history: '', medical_history: '',
    family_history: '', developmental_history: '', substance_use: '',
    risk_assessment: '', mse: '', clinical_formulation: ''
  });
  const [intakeFreeText, setIntakeFreeText] = useState('');
  const [intakeAIInstructions, setIntakeAIInstructions] = useState('');
  const [intakeAIResult, setIntakeAIResult] = useState(null);
  const [intakeLoading, setIntakeLoading] = useState(false);

  const [showNoteForm, setShowNoteForm] = useState(false);
  const DRAFT_KEY = `note_draft_${patientId}`;
  const [noteText, setNoteText] = useState(() => localStorage.getItem(DRAFT_KEY) || '');
  const [noteDraftSavedAt, setNoteDraftSavedAt] = useState(null);
  const [noteType, setNoteType] = useState('session');
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const [showQForm, setShowQForm] = useState(false);
  const [selectedQCode, setSelectedQCode] = useState('');
  const [selectedQFull, setSelectedQFull] = useState(null);
  const [qAnswers, setQAnswers] = useState({});

  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionForm, setSessionForm] = useState({ date: '', time: '09:00', status: 'scheduled', fee: '' });
  const [expandedSession, setExpandedSession] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editingSession, setEditingSession] = useState(null);
  const [editSessionForm, setEditSessionForm] = useState({});

  useEffect(() => {
    patientsAPI.getById(patientId).then(r => {
      setPatient(r.data);
      if (onLoad) onLoad(`${r.data.first_name} ${r.data.last_name}`);
    }).catch(() => {});
    patientsAPI.getSummary(patientId).then(r => setSummary(r.data)).catch(() => {});
    questionnairesAPI.getTypes().then(r => setQTypes(r.data)).catch(() => {});
  }, [patientId, onLoad]);

  useEffect(() => {
    if (tab === 'notes') notesAPI.getAll(patientId).then(r => setNotes(r.data)).catch(() => {});
    if (tab === 'sessions') sessionsAPI.getAll(patientId).then(r => setSessions(r.data)).catch(() => {});
    if (tab === 'questionnaires') questionnairesAPI.getAll(patientId).then(r => setQuestionnaires(r.data)).catch(() => {});
    if (tab === 'billing') billingAPI.getPatient(patientId).then(r => setBilling(r.data)).catch(() => {});
    if (tab === 'intake') {
      intakeAPI.get(patientId).then(r => {
        setIntake(r.data);
        if (r.data?.content) setIntakeForm(r.data.content);
        setIntakeMode('view');
      }).catch(() => {});
      intakeAPI.getVersions(patientId).then(r => setIntakeVersions(r.data)).catch(() => {});
    }
  }, [tab, patientId]);

  // Auto-save note draft to localStorage every 5 seconds while typing
  useEffect(() => {
    if (!noteText) return;
    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, noteText);
      setNoteDraftSavedAt(new Date());
    }, 5000);
    return () => clearTimeout(timer);
  }, [noteText, DRAFT_KEY]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ['audio/webm;codecs=opus','audio/webm','audio/ogg','audio/mp4'].find(t => { try { return MediaRecorder.isTypeSupported(t); } catch(e) { return false; } }) || 'audio/webm';
      const mr = new MediaRecorder(stream, { mimeType });
      const chunks = [];
      mr.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (chunks.length === 0) return;
        const blob = new Blob(chunks, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result.split(',')[1];
          try {
            const r = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/transcribe`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: base64, mimeType })
            });
            const d = await r.json();
            if (d.text) setNoteText(prev => prev ? prev + ' ' + d.text : d.text);
            else if (d.message) alert(d.message);
          } catch(e) { alert('שגיאה בתמלול'); }
        };
        reader.readAsDataURL(blob);
      };
      mr.start(1000);
      setRecognition(mr); setIsRecording(true);
    } catch(e) { alert('אין גישה למיקרופון: ' + e.message); }
  };

  const stopRecording = () => {
    if (recognition) { recognition.stop(); setRecognition(null); }
    setIsRecording(false);
  };

  const saveNote = async (withAI) => {
    if (!noteText.trim()) return;
    try {
      const res = await notesAPI.create(patientId, { content: noteText, note_type: noteType });
      if (withAI) {
        setProcessingId(res.data.id);
        await notesAPI.processWithAI(res.data.id);
        setProcessingId(null);
      }
      localStorage.removeItem(DRAFT_KEY);
      setNoteText(''); setNoteDraftSavedAt(null); setShowNoteForm(false);
      notesAPI.getAll(patientId).then(r => setNotes(r.data));
    } catch (e) { alert('שגיאה בשמירה'); }
  };

  const processNote = async (id) => {
    setProcessingId(id);
    try {
      await notesAPI.processWithAI(id);
      notesAPI.getAll(patientId).then(r => setNotes(r.data));
    } catch (e) { alert('שגיאה בעיבוד AI'); }
    setProcessingId(null);
  };

  const [editingNote, setEditingNote] = useState(null); // { id, text }

  const startEditNote = (n) => {
    setEditingNote({ id: n.id, text: n.processed_text || n.content || '' });
  };

  const saveEditNote = async () => {
    if (!editingNote) return;
    try {
      await notesAPI.update(editingNote.id, { raw_text: editingNote.text, processed_text: editingNote.text });
      setNotes(prev => prev.map(n => n.id === editingNote.id
        ? { ...n, content: editingNote.text, processed_text: editingNote.text }
        : n));
      setEditingNote(null);
    } catch (e) { alert('שגיאה בשמירה'); }
  };

  const addSession = async () => {
    try {
      await sessionsAPI.create(patientId, { ...sessionForm, fee: sessionForm.fee || patient?.session_fee });
      setShowSessionForm(false);
      setSessionForm({ date: '', time: '09:00', status: 'scheduled', fee: '' });
      sessionsAPI.getAll(patientId).then(r => setSessions(r.data));
      patientsAPI.getSummary(patientId).then(r => setSummary(r.data));
    } catch (e) { alert('שגיאה בהוספת פגישה'); }
  };

  const startEditSession = (s) => {
    setEditingSession(s.id);
    setEditSessionForm({
      session_date: s.session_date?.split('T')[0] || s.session_date || '',
      session_time: s.session_time?.slice(0, 5) || '',
      status: s.status || 'scheduled',
      fee: s.fee || '',
      duration_minutes: s.duration_minutes || 50,
    });
  };

  const saveEditSession = async () => {
    try {
      await sessionsAPI.update(editingSession, editSessionForm);
      setEditingSession(null);
      sessionsAPI.getAll(patientId).then(r => setSessions(r.data));
      patientsAPI.getSummary(patientId).then(r => setSummary(r.data));
    } catch (e) { alert('שגיאה בעריכת פגישה'); }
  };

  const deleteSession = async (sessionId) => {
    if (!window.confirm('למחוק את הפגישה?')) return;
    try {
      await sessionsAPI.delete(sessionId);
      sessionsAPI.getAll(patientId).then(r => setSessions(r.data));
      patientsAPI.getSummary(patientId).then(r => setSummary(r.data));
    } catch (e) {
      const msg = e.response?.data?.error || 'שגיאה במחיקת פגישה';
      alert(msg);
    }
  };

  // ── Intake functions ──
  const INTAKE_SECTIONS = [
    { key: 'presenting_problem', label: 'סיבת פנייה', placeholder: 'תיאור הבעיה בלשון המטופל, מתי החלה...' },
    { key: 'psychiatric_history', label: 'היסטוריה פסיכיאטרית ופסיכולוגית', placeholder: 'טיפולים קודמים, אשפוזים, תרופות, אבחנות...' },
    { key: 'medical_history', label: 'היסטוריה רפואית', placeholder: 'מחלות כרוניות, תרופות נוכחיות, שינה/תיאבון/אנרגיה...' },
    { key: 'family_history', label: 'היסטוריה משפחתית', placeholder: 'הורים, אחים, ילדות, טראומות...' },
    { key: 'developmental_history', label: 'היסטוריה התפתחותית וחברתית', placeholder: 'לימודים, עבודה, מערכות יחסים, תמיכה חברתית...' },
    { key: 'substance_use', label: 'שימוש בחומרים', placeholder: 'אלכוהול, סמים, קנאביס, עישון — תדירות וכמות...' },
    { key: 'risk_assessment', label: 'הערכת סיכון', placeholder: 'מחשבות אובדניות, פגיעה עצמית, פגיעה באחרים...' },
    { key: 'mse', label: 'בדיקת מצב נפשי (MSE)', placeholder: 'מראה, מצב רוח, חשיבה, תפיסה, קוגניציה, תובנה...' },
    { key: 'clinical_formulation', label: 'ניסוח קליני ורשמים ראשוניים', placeholder: 'השערות אבחנתיות, נקודות חוזק, כיוון טיפולי...' },
  ];

  const saveIntake = async (content, editType = 'manual', aiInstructions = null) => {
    try {
      const r = await intakeAPI.save(patientId, content, editType, aiInstructions);
      setIntake(r.data);
      setIntakeForm(content);
      setIntakeMode('view');
      setIntakeAIResult(null);
      intakeAPI.getVersions(patientId).then(r2 => setIntakeVersions(r2.data)).catch(() => {});
    } catch (e) { alert('שגיאה בשמירת אינטייק'); }
  };

  const organizeIntakeWithAI = async () => {
    if (!intakeFreeText.trim()) return;
    setIntakeLoading(true);
    try {
      const r = await intakeAPI.organize(intakeFreeText);
      setIntakeForm(r.data.organized);
      setIntakeMode('form');
    } catch (e) { alert('שגיאה בארגון AI: ' + (e.response?.data?.error || e.message)); }
    finally { setIntakeLoading(false); }
  };

  const editIntakeWithAI = async () => {
    setIntakeLoading(true);
    try {
      const r = await intakeAPI.editAI(intakeForm, intakeAIInstructions);
      setIntakeAIResult(r.data.edited);
    } catch (e) { alert('שגיאה בעריכת AI: ' + (e.response?.data?.error || e.message)); }
    finally { setIntakeLoading(false); }
  };

  const submitQ = async () => {
    if (!selectedQCode) return;
    try {
      await questionnairesAPI.submit(patientId, { questionnaire_code: selectedQCode, answers: qAnswers });
      setShowQForm(false); setSelectedQCode(''); setSelectedQFull(null); setQAnswers({});
      questionnairesAPI.getAll(patientId).then(r => setQuestionnaires(r.data));
    } catch (e) { alert('שגיאה בשמירת שאלון'); }
  };

  const deletePatient = async () => {
    try {
      await patientsAPI.delete(patientId);
      onBack();
    } catch (e) { alert('שגיאה במחיקה'); }
  };

  const startEdit = () => {
    setEditForm({
      first_name: patient.first_name || '',
      last_name: patient.last_name || '',
      phone: patient.phone || '',
      email: patient.email || '',
      date_of_birth: patient.date_of_birth ? patient.date_of_birth.split('T')[0] : '',
      address: patient.address || '',
      id_number: patient.id_number || '',
      gender: patient.gender || '',
      treatment_type: patient.treatment_type || 'individual',
      session_fee: patient.session_fee || 450,
      diagnosis: patient.diagnosis || '',
      presenting_problem: patient.presenting_problem || '',
      referral_source: patient.referral_source || '',
      status: patient.status || 'active',
    });
    setEditMode(true);
  };

  const saveEdit = async () => {
    try {
      // Convert empty strings to null for optional fields
      const payload = { ...editForm };
      ['date_of_birth','email','address','id_number','gender','diagnosis',
       'presenting_problem','referral_source','phone'].forEach(f => {
        if (payload[f] === '') payload[f] = null;
      });
      await patientsAPI.update(patientId, payload);
      const r = await patientsAPI.getById(patientId);
      setPatient(r.data);
      if (onLoad) onLoad(`${r.data.first_name} ${r.data.last_name}`);
      setEditMode(false);
    } catch (e) {
      alert('שגיאה בשמירה: ' + (e.response?.data?.error || e.message));
    }
  };

  const deactivatePatient = async () => {
    try {
      await patientsAPI.update(patientId, { status: 'inactive' });
      setShowDeleteConfirm(false);
      patientsAPI.getById(patientId).then(r => setPatient(r.data));
    } catch (e) { alert('שגיאה בעדכון'); }
  };

  const generateBilling = async () => {
    const now = new Date();
    try {
      await billingAPI.generate(patientId, { month: now.getMonth() + 1, year: now.getFullYear() });
      const r = await billingAPI.getPatient(patientId);
      setBilling(r.data);
      alert('✅ חיוב חודשי נוצר בהצלחה!');
    } catch (e) {
      const msg = e.response?.data?.error || e.message || 'שגיאה לא ידועה';
      alert('שגיאה ביצירת חיוב: ' + msg);
    }
  };

  if (!patient) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>טוען...</div>;

  const fullName = `${patient.first_name} ${patient.last_name}`;
  const age = patient.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth)) / (365.25 * 24 * 3600 * 1000))
    : null;

  const tabs = [
    { id: 'info', label: 'פרטים' },
    { id: 'sessions', label: 'פגישות' },
    { id: 'notes', label: 'תיעוד' },
    { id: 'intake', label: 'אינטייק' },
    { id: 'summary', label: 'סיכום טיפול' },
    { id: 'questionnaires', label: 'שאלונים' },
    { id: 'billing', label: 'חיוב' },
  ];

  const noteTypeLabel = { session: 'פגישה', assessment: 'הערכה', supervision: 'סופרוויז׳ן', other: 'תיעוד' };

  return (
    <div>
      <button className="back-btn" onClick={onBack}>{Icon.back(13)} מטופלים</button>

      {/* Dark Hero */}
      <div className="patient-hero">
        <div className="hero-top">
          <div className="hero-avatar" style={{ background: getGradient(fullName) }}>
            {fullName.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
          <div style={{ flex: 1 }}>
            <div className="hero-name">{fullName}</div>
            <div className="hero-sub">
              {treatmentLabel[patient.treatment_type] || patient.treatment_type}
              {age ? ` · בן/בת ${age}` : ''}
              {patient.phone ? ` · ${patient.phone}` : ''}
              {patient.email ? ` · ${patient.email}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, background: patient.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)', color: patient.status === 'active' ? '#34d399' : '#94a3b8', padding: '3px 12px', borderRadius: 20 }}>
              {statusLabel[patient.status] || patient.status}
            </span>
            <button
              className="btn btn-xs"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
              onClick={() => setShowDeleteConfirm(true)}
              title="מחק מטופל"
            >
              {Icon.trash(13)} מחק
            </button>
          </div>
        </div>
        {summary && (
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-val">{summary.total_sessions || 0}</div>
              <div className="hero-stat-lbl">פגישות</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-val">{fmt(patient.session_fee)}</div>
              <div className="hero-stat-lbl">לפגישה</div>
            </div>
            <div className="hero-stat">
              <div className={`hero-stat-val${Number(summary.total_debt || 0) > 0 ? ' red' : ''}`}>{fmt(summary.total_debt)}</div>
              <div className="hero-stat-lbl">חוב פתוח</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-val" style={{ fontSize: 13 }}>{summary.last_session ? fmtDateShort(summary.last_session) : '—'}</div>
              <div className="hero-stat-lbl">פגישה אחרונה</div>
            </div>
          </div>
        )}
      </div>

      {/* Pill Tabs */}
      <div className="tab-row">
        {tabs.map(t => (
          <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ── INFO ── */}
      {tab === 'info' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>פרטים אישיים</div>
            {!editMode
              ? <button className="btn btn-ghost btn-sm" onClick={startEdit}>✏️ עריכה</button>
              : <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(false)}>ביטול</button>
                  <button className="btn btn-primary btn-sm" onClick={saveEdit}>💾 שמור</button>
                </div>
            }
          </div>

          {editMode ? (
            <>
              <div className="grid-2" style={{ gap: 16 }}>
                <Field label="שם פרטי *">
                  <input value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} />
                </Field>
                <Field label="שם משפחה *">
                  <input value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} />
                </Field>
                <Field label="טלפון">
                  <input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} placeholder="05X-XXXXXXX" />
                </Field>
                <Field label="אימייל">
                  <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                </Field>
                <Field label="תאריך לידה">
                  <input type="date" value={editForm.date_of_birth} onChange={e => setEditForm({ ...editForm, date_of_birth: e.target.value })} />
                </Field>
                <Field label="מין">
                  <select value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value })}>
                    <option value="">— בחר —</option>
                    <option value="male">זכר</option>
                    <option value="female">נקבה</option>
                    <option value="other">אחר</option>
                  </select>
                </Field>
                <Field label="כתובת">
                  <input value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
                </Field>
                <Field label="ת.ז.">
                  <input value={editForm.id_number} onChange={e => setEditForm({ ...editForm, id_number: e.target.value })} />
                </Field>
                <Field label="סוג טיפול">
                  <select value={editForm.treatment_type} onChange={e => setEditForm({ ...editForm, treatment_type: e.target.value })}>
                    <option value="individual">פרטני</option>
                    <option value="couples">זוגי</option>
                    <option value="child">ילד</option>
                    <option value="adolescent">מתבגר</option>
                  </select>
                </Field>
                <Field label="עלות לפגישה (₪)">
                  <input type="number" value={editForm.session_fee} onChange={e => setEditForm({ ...editForm, session_fee: e.target.value })} />
                </Field>
                <Field label="מקור הפניה">
                  <input value={editForm.referral_source} onChange={e => setEditForm({ ...editForm, referral_source: e.target.value })} />
                </Field>
                <Field label="סטטוס">
                  <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                    <option value="active">פעיל</option>
                    <option value="inactive">לא פעיל</option>
                    <option value="waitlist">המתנה</option>
                    <option value="ended">סיים</option>
                  </select>
                </Field>
              </div>
              <Field label="אבחנה">
                <input value={editForm.diagnosis} onChange={e => setEditForm({ ...editForm, diagnosis: e.target.value })} />
              </Field>
              <Field label="בעיה מציגה">
                <textarea rows={3} value={editForm.presenting_problem} onChange={e => setEditForm({ ...editForm, presenting_problem: e.target.value })} />
              </Field>
            </>
          ) : (
            <>
              <div className="grid-2" style={{ gap: 20 }}>
                {[
                  ['שם פרטי', patient.first_name],
                  ['שם משפחה', patient.last_name],
                  ['טלפון', patient.phone],
                  ['אימייל', patient.email],
                  ['תאריך לידה', patient.date_of_birth ? fmtDate(patient.date_of_birth) : null],
                  ['מין', patient.gender === 'male' ? 'זכר' : patient.gender === 'female' ? 'נקבה' : patient.gender],
                  ['כתובת', patient.address],
                  ['ת.ז.', patient.id_number],
                  ['סוג טיפול', treatmentLabel[patient.treatment_type]],
                  ['עלות לפגישה', patient.session_fee ? fmt(patient.session_fee) : null],
                  ['מקור הפניה', patient.referral_source],
                  ['סטטוס', statusLabel[patient.status]],
                ].map(([l, v]) => (
                  <div key={l} style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{l}</div>
                    <div style={{ fontSize: 16, fontWeight: v ? 400 : 300, color: v ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {v || '—'}
                    </div>
                  </div>
                ))}
              </div>
              {patient.diagnosis && (
                <div style={{ marginTop: 16, padding: '14px 0', borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>אבחנה</div>
                  <div style={{ fontSize: 16 }}>{patient.diagnosis}</div>
                </div>
              )}
              {patient.presenting_problem && (
                <div style={{ marginTop: 12, padding: '14px 0', borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>בעיה מציגה</div>
                  <div style={{ fontSize: 16, lineHeight: 1.7 }}>{patient.presenting_problem}</div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── SESSIONS ── */}
      {tab === 'sessions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <button
              className="btn btn-ghost btn-sm"
              title="ייצא את כל הפגישות כ-PDF"
              onClick={() => {
                const url = `${process.env.REACT_APP_API_URL || '/api'}/export/sessions/${patientId}/pdf`;
                window.open(url, '_blank');
              }}
            >📄 ייצא PDF</button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowSessionForm(true)}>{Icon.plus(13)} פגישה חדשה</button>
          </div>
          {sessions.length === 0
            ? <EmptyState icon={Icon.calendar(22)} title="אין פגישות" sub="הוסף פגישה ראשונה"/>
            : sessions.map(s => {
              const sessionNotes = notes.filter(n => n.session_id === s.id || (
                !n.session_id && n.note_date === (s.session_date?.split('T')[0] || s.session_date)
              ));
              const isExpanded = expandedSession === s.id;
              const isEditingThisSession = editingSession === s.id;
              const hasNotes = sessionNotes.length > 0;
              return (
                <div key={s.id} style={{ marginBottom: 8, borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
                  {isEditingThisSession ? (
                    <div style={{ padding: '12px 14px', background: 'var(--card-bg)' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: 'var(--primary)' }}>עריכת פגישה</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                        <Field label="תאריך">
                          <input type="date" value={editSessionForm.session_date}
                            onChange={e => setEditSessionForm({ ...editSessionForm, session_date: e.target.value })} />
                        </Field>
                        <Field label="שעה">
                          <input type="time" value={editSessionForm.session_time}
                            onChange={e => setEditSessionForm({ ...editSessionForm, session_time: e.target.value })} />
                        </Field>
                        <Field label="סטטוס">
                          <select value={editSessionForm.status}
                            onChange={e => setEditSessionForm({ ...editSessionForm, status: e.target.value })}>
                            <option value="scheduled">מתוכנן</option>
                            <option value="completed">הושלם</option>
                            <option value="cancelled">בוטל</option>
                            <option value="no_show">לא הגיע</option>
                          </select>
                        </Field>
                        <Field label="תשלום (₪)">
                          <input type="number" value={editSessionForm.fee}
                            onChange={e => setEditSessionForm({ ...editSessionForm, fee: e.target.value })} />
                        </Field>
                      </div>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-xs" onClick={() => setEditingSession(null)}>ביטול</button>
                        <button className="btn btn-primary btn-xs" onClick={saveEditSession}>שמור</button>
                      </div>
                    </div>
                  ) : (
                  <div className="session-item" style={{ borderRadius: 0, border: 'none', marginBottom: 0 }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13.5 }}>{fmtDate(s.session_date)}{s.session_time ? ` · ${s.session_time.slice(0, 5)}` : ''}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.duration_minutes ? `${s.duration_minutes} דקות` : '50 דקות'}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`badge ${s.status === 'completed' ? 'badge-active' : s.status === 'cancelled' ? 'badge-ended' : 'badge-waitlist'}`}>
                        {s.status === 'completed' ? 'הושלם' : s.status === 'cancelled' ? 'בוטל' : s.status === 'no_show' ? 'לא הגיע' : 'מתוכנן'}
                      </span>
                      {s.fee && <span style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: s.status === 'completed' ? 'var(--success)' : 'var(--danger)' }}>{fmt(s.fee)}</span>}
                      {buildGCalUrl(s, fullName) && (
                        <a href={buildGCalUrl(s, fullName)} target="_blank" rel="noopener noreferrer"
                          className="btn btn-ghost btn-xs"
                          style={{ display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', color: 'var(--text-muted)' }}
                          title="הוסף ליומן Google">
                          {Icon.gcal(13)} יומן
                        </a>
                      )}
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => startEditSession(s)}
                        title="ערוך פגישה"
                        style={{ fontSize: 12, padding: '3px 8px', opacity: 0.7 }}
                      >✏️</button>
                      {!hasNotes && (
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => deleteSession(s.id)}
                          title="מחק פגישה"
                          style={{ fontSize: 12, padding: '3px 8px', opacity: 0.6, color: 'var(--danger)' }}
                        >🗑️</button>
                      )}
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => setExpandedSession(isExpanded ? null : s.id)}
                        title={isExpanded ? 'סגור תיעוד' : 'הצג תיעוד'}
                        style={{ fontSize: 13, padding: '3px 8px' }}
                      >
                        {isExpanded ? '▲' : '▼'} {hasNotes ? `תיעוד (${sessionNotes.length})` : 'תיעוד'}
                      </button>
                    </div>
                  </div>
                  )}
                  {isExpanded && (
                    <div style={{ padding: '10px 14px', background: 'var(--page-bg)', borderTop: '1px solid var(--border)' }}>
                      {sessionNotes.length === 0
                        ? <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>אין תיעוד לפגישה זו</div>
                        : sessionNotes.map(n => {
                          const isEditingHere = editingNote?.id === n.id;
                          return (
                            <div key={n.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                                <span style={{
                                  background: 'var(--primary-light, #ede9fe)', color: 'var(--primary)',
                                  borderRadius: 6, padding: '2px 9px', fontSize: 12, fontWeight: 700
                                }}>
                                  📅 פגישה: {fmtDate(n.session_date || n.note_date || s.session_date)}
                                </span>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{noteTypeLabel[n.note_type] || 'תיעוד'}</span>
                                {n.processed_text && <span className="ai-pill" style={{ margin: 0 }}>✓ AI</span>}
                                <button
                                  onClick={() => isEditingHere ? setEditingNote(null) : startEditNote(n)}
                                  style={{ marginRight: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, opacity: 0.6, color: 'var(--primary)' }}
                                  title={isEditingHere ? 'ביטול' : 'ערוך'}
                                >✏️</button>
                              </div>
                              {isEditingHere ? (
                                <div>
                                  <textarea rows={4} value={editingNote.text}
                                    onChange={e => setEditingNote({ ...editingNote, text: e.target.value })}
                                    style={{ marginBottom: 6, fontSize: 13, width: '100%' }} autoFocus/>
                                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                    <button className="btn btn-secondary btn-xs" onClick={() => setEditingNote(null)}>ביטול</button>
                                    <button className="btn btn-primary btn-xs" onClick={saveEditNote}>שמור</button>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ fontSize: 12.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
                                  {n.processed_text || n.content}
                                </div>
                              )}
                            </div>
                          );
                        })
                      }
                    </div>
                  )}
                </div>
              );
            })
          }
          {showSessionForm && (
            <Modal title="פגישה חדשה" onClose={() => setShowSessionForm(false)}>
              <Field label="תאריך"><input type="date" value={sessionForm.date} onChange={e => setSessionForm({ ...sessionForm, date: e.target.value })}/></Field>
              <Field label="שעה"><input type="time" value={sessionForm.time} onChange={e => setSessionForm({ ...sessionForm, time: e.target.value })}/></Field>
              <Field label="סטטוס">
                <select value={sessionForm.status} onChange={e => setSessionForm({ ...sessionForm, status: e.target.value })}>
                  <option value="scheduled">מתוכנן</option><option value="completed">הושלם</option>
                  <option value="cancelled">בוטל</option><option value="no_show">לא הגיע</option>
                </select>
              </Field>
              <Field label={`תשלום (₪) — ברירת מחדל ${fmt(patient.session_fee)}`}>
                <input type="number" value={sessionForm.fee} placeholder={patient.session_fee} onChange={e => setSessionForm({ ...sessionForm, fee: e.target.value })}/>
              </Field>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowSessionForm(false)}>ביטול</button>
                <button className="btn btn-primary btn-sm" onClick={addSession}>{Icon.check(14)} שמור</button>
              </div>
            </Modal>
          )}
        </div>
      )}

      {/* ── NOTES ── */}
      {tab === 'notes' && (
        <div>
          {!showNoteForm && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowNoteForm(true)}>{Icon.mic(13)} הקלט</button>
              <button className="btn btn-info btn-sm" onClick={() => setShowNoteForm(true)}>{Icon.ai(13)} שמור + AI</button>
            </div>
          )}
          {showNoteForm && (
            <div className="card card-sm" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
                <select value={noteType} onChange={e => setNoteType(e.target.value)} style={{ width: 'auto', padding: '7px 12px' }}>
                  <option value="session">פגישה</option><option value="assessment">הערכה</option>
                  <option value="supervision">סופרוויז׳ן</option><option value="other">אחר</option>
                </select>
                <button className={`btn ${isRecording ? 'btn-danger' : 'btn-ghost'} btn-sm`} onClick={isRecording ? stopRecording : startRecording}>
                  {Icon.mic(13)} {isRecording ? 'עצור הקלטה' : 'הקלט'}
                </button>
              </div>
              {isRecording && <div className="recording-indicator"><span className="rec-dot"/> מקליט... דבר עכשיו</div>}
              <textarea rows={5} placeholder="כתוב או הקלט תיעוד כאן..." value={noteText} onChange={e => setNoteText(e.target.value)} style={{ marginBottom: 6 }}/>
              {noteDraftSavedAt && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'left', marginBottom: 8 }}>
                  💾 טיוטה נשמרה אוטומטית ב-{noteDraftSavedAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              )}
              {!noteDraftSavedAt && localStorage.getItem(DRAFT_KEY) && noteText && (
                <div style={{ fontSize: 11, color: '#f59e0b', marginBottom: 8 }}>⏳ שומר טיוטה...</div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary btn-xs" onClick={() => { setShowNoteForm(false); setNoteText(''); }}>ביטול</button>
                <button className="btn btn-ghost btn-xs" onClick={() => saveNote(false)} disabled={!noteText.trim()}>{Icon.check(13)} שמור</button>
                <button className="btn btn-primary btn-xs" onClick={() => saveNote(true)} disabled={!noteText.trim()}>{Icon.ai(13)} שמור + AI</button>
              </div>
            </div>
          )}
          {notes.length === 0 && !showNoteForm
            ? <EmptyState icon={Icon.notes(22)} title="אין תיעוד" sub="הוסף תיעוד ראשון"/>
            : notes.map((n, i) => {
              const sessionDate = n.session_date || n.note_date;
              const isEditing = editingNote?.id === n.id;
              return (
                <div key={n.id} className="tl-item">
                  <div className="tl-left">
                    <div className={`tl-dot${n.processed_text ? '' : ' gray'}`}/>
                    {i < notes.length - 1 && <div className="tl-line"/>}
                  </div>
                  <div className="tl-body">
                    {/* Header: session date + type */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        background: 'var(--primary-light, #ede9fe)', color: 'var(--primary)',
                        borderRadius: 6, padding: '2px 9px', fontSize: 12.5, fontWeight: 700
                      }}>
                        📅 פגישה: {sessionDate ? fmtDate(sessionDate) : 'תאריך לא ידוע'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>{noteTypeLabel[n.note_type] || 'תיעוד'}</span>
                      {n.processed_text && <span className="ai-pill" style={{ margin: 0 }}>✓ AI</span>}
                        {/* Actions */}
                      <div style={{ marginRight: 'auto', display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => isEditing ? setEditingNote(null) : startEditNote(n)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '0 4px', opacity: 0.6, color: 'var(--primary)' }}
                          title={isEditing ? 'ביטול עריכה' : 'ערוך'}
                        >✏️</button>
                      </div>
                    </div>

                    {/* Edit mode */}
                    {isEditing ? (
                      <div>
                        <textarea
                          rows={5}
                          value={editingNote.text}
                          onChange={e => setEditingNote({ ...editingNote, text: e.target.value })}
                          style={{ marginBottom: 8, fontSize: 13, width: '100%' }}
                          autoFocus
                        />
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn btn-secondary btn-xs" onClick={() => setEditingNote(null)}>ביטול</button>
                          <button className="btn btn-primary btn-xs" onClick={saveEditNote}>שמור</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="tl-text">{n.processed_text || n.content}</div>
                        {!n.processed_text && (
                          <button className="btn btn-ghost btn-xs" style={{ marginTop: 6 }} disabled={processingId === n.id} onClick={() => processNote(n.id)}>
                            {processingId === n.id ? 'מעבד...' : <>{Icon.ai(12)} עבד עם AI</>}
                          </button>
                        )}
                        {n.processed_text && n.content && n.content !== n.processed_text && (
                          <details style={{ marginTop: 5 }}>
                            <summary style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer' }}>טקסט מקורי</summary>
                            <div className="tl-text" style={{ marginTop: 4, color: 'var(--text-muted)' }}>{n.content}</div>
                          </details>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          }
        </div>
      )}

      {/* ── INTAKE ── */}
      {tab === 'intake' && (
        <div>
          {/* View mode */}
          {intakeMode === 'view' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <button className="btn btn-primary btn-sm" onClick={() => { setIntakeMode('form'); }}>
                  {intake ? '✏️ ערוך אינטייק' : '+ מלא אינטייק'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setIntakeMode('freetext')} title="הדבק טקסט חופשי וה-AI יארגן אותו">
                  📋 הזן טקסט חופשי + AI
                </button>
                {intake && intakeVersions.length > 1 && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>
                    גרסה {intake.version_number} מתוך {intakeVersions.length}
                  </span>
                )}
              </div>
              {!intake ? (
                <EmptyState icon="📋" title="אין אינטייק" sub="מלא טופס אינטייק ראשוני למטופל"/>
              ) : (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                    עודכן: {new Date(intake.created_at).toLocaleDateString('he-IL')}
                    {intake.edit_type === 'ai' && <span className="ai-pill" style={{ margin: '0 8px' }}>AI</span>}
                  </div>
                  {INTAKE_SECTIONS.map(s => (
                    intake.content?.[s.key] ? (
                      <div key={s.key} style={{ marginBottom: 18 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)', marginBottom: 4 }}>{s.label}</div>
                        <div style={{ fontSize: 13.5, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', background: 'var(--page-bg)', borderRadius: 8, padding: '10px 14px' }}>
                          {intake.content[s.key]}
                        </div>
                      </div>
                    ) : null
                  ))}
                  {/* Version history */}
                  {intakeVersions.length > 1 && (
                    <details style={{ marginTop: 16 }}>
                      <summary style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', marginBottom: 8 }}>
                        היסטוריית גרסאות ({intakeVersions.length})
                      </summary>
                      {intakeVersions.map(v => (
                        <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 6, marginBottom: 4, background: 'var(--page-bg)' }}>
                          <span style={{ fontSize: 12 }}>
                            גרסה {v.version_number} · {new Date(v.created_at).toLocaleDateString('he-IL')}
                            {v.edit_type === 'ai' && <span className="ai-pill" style={{ margin: '0 6px', fontSize: 10 }}>AI</span>}
                          </span>
                          <button className="btn btn-ghost btn-xs" onClick={async () => {
                            const r = await intakeAPI.getVersion(v.id);
                            setIntake(r.data); setIntakeForm(r.data.content || {});
                          }}>צפה</button>
                        </div>
                      ))}
                    </details>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Structured form mode */}
          {intakeMode === 'form' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setIntakeMode('view')}>← חזרה</button>
                <h3 style={{ margin: 0, fontSize: 15 }}>טופס אינטייק פסיכולוגי</h3>
              </div>
              {INTAKE_SECTIONS.map(s => (
                <div key={s.key} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5, color: 'var(--text-primary)' }}>{s.label}</label>
                  <textarea
                    rows={3}
                    placeholder={s.placeholder}
                    value={intakeForm[s.key] || ''}
                    onChange={e => setIntakeForm({ ...intakeForm, [s.key]: e.target.value })}
                    style={{ fontSize: 13 }}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setIntakeMode('view')}>ביטול</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setIntakeAIResult(null); setIntakeMode('ai-edit'); }}>
                  ✨ שמור עם עריכת AI
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => saveIntake(intakeForm, 'manual')}>
                  💾 שמור כמות שהוא
                </button>
              </div>
            </div>
          )}

          {/* Free text mode */}
          {intakeMode === 'freetext' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setIntakeMode('view')}>← חזרה</button>
                <h3 style={{ margin: 0, fontSize: 15 }}>הזנת טקסט חופשי</h3>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 10 }}>
                הדבק טקסט חופשי מהפגישה — ה-AI יארגן אותו אוטומטית לסעיפי האינטייק
              </div>
              <textarea
                rows={12}
                placeholder="הדבק כאן את הסיכום החופשי מפגישת האינטייק..."
                value={intakeFreeText}
                onChange={e => setIntakeFreeText(e.target.value)}
                style={{ fontSize: 13, marginBottom: 12 }}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setIntakeMode('view')}>ביטול</button>
                <button className="btn btn-primary btn-sm" onClick={organizeIntakeWithAI} disabled={intakeLoading || !intakeFreeText.trim()}>
                  {intakeLoading ? 'מארגן...' : '🤖 ארגן עם AI'}
                </button>
              </div>
            </div>
          )}

          {/* AI edit mode */}
          {intakeMode === 'ai-edit' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setIntakeMode('form')}>← חזרה לטופס</button>
                <h3 style={{ margin: 0, fontSize: 15 }}>עריכה קלינית עם AI</h3>
              </div>
              {!intakeAIResult ? (
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>הוראות לעריכה (אופציונלי)</label>
                  <textarea
                    rows={3}
                    placeholder="לדוגמה: התמקד בהיבט הטראומטי, הוסף ניסוח קליני לסעיף 10..."
                    value={intakeAIInstructions}
                    onChange={e => setIntakeAIInstructions(e.target.value)}
                    style={{ fontSize: 13, marginBottom: 12 }}
                  />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setIntakeMode('form')}>ביטול</button>
                    <button className="btn btn-primary btn-sm" onClick={editIntakeWithAI} disabled={intakeLoading}>
                      {intakeLoading ? 'עורך...' : '✨ צור עריכה'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--text-muted)' }}>מקורי</div>
                      {INTAKE_SECTIONS.map(s => intakeForm[s.key] ? (
                        <div key={s.key} style={{ marginBottom: 10 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-muted)', marginBottom: 3 }}>{s.label}</div>
                          <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-secondary)', background: 'var(--page-bg)', borderRadius: 6, padding: '8px 10px' }}>{intakeForm[s.key]}</div>
                        </div>
                      ) : null)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--primary)' }}>גרסת AI ✨</div>
                      {INTAKE_SECTIONS.map(s => intakeAIResult[s.key] ? (
                        <div key={s.key} style={{ marginBottom: 10 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--primary)', marginBottom: 3 }}>{s.label}</div>
                          <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-secondary)', background: 'rgba(99,102,241,0.05)', borderRadius: 6, padding: '8px 10px', border: '1px solid rgba(99,102,241,0.15)' }}>
                            <textarea
                              value={intakeAIResult[s.key]}
                              onChange={e => setIntakeAIResult({ ...intakeAIResult, [s.key]: e.target.value })}
                              rows={3}
                              style={{ fontSize: 12, padding: 0, background: 'transparent', border: 'none', boxShadow: 'none', resize: 'vertical' }}
                            />
                          </div>
                        </div>
                      ) : null)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setIntakeAIResult(null); editIntakeWithAI(); }} disabled={intakeLoading}>
                      {intakeLoading ? '...' : '🔄 גרסה חלופית'}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => saveIntake(intakeForm, 'manual')}>שמור מקורי</button>
                    <button className="btn btn-primary btn-sm" onClick={() => saveIntake(intakeAIResult, 'ai', intakeAIInstructions)}>
                      ✨ שמור גרסת AI
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TREATMENT SUMMARY ── */}
      {tab === 'summary' && (
        <div>
          {!summaryGenerated ? (
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>סיכום טיפול עם AI</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
                ה-AI ישלב את האינטייק, כל סיכומי הפגישות ותוצאות השאלונים ויכתוב סיכום טיפול רשמי.
              </div>
              <Field label="הוראות לסיכום (אופציונלי)">
                <textarea
                  rows={3}
                  placeholder="לדוגמה: הדגש את עבודת הטראומה, התמקד בשינוי הדפוסים הרלציוניים..."
                  value={summaryInstructions}
                  onChange={e => setSummaryInstructions(e.target.value)}
                  style={{ fontSize: 13 }}
                />
              </Field>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={summaryLoading}
                  onClick={async () => {
                    setSummaryLoading(true);
                    try {
                      const API_URL = process.env.REACT_APP_API_URL || '/api';
                      const r = await fetch(`${API_URL}/summary/patient/${patientId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ instructions: summaryInstructions })
                      });
                      const data = await r.json();
                      if (data.error) throw new Error(data.error);
                      setTreatmentSummary(data.summary);
                      setSummaryGenerated(true);
                    } catch (e) { alert('שגיאה ביצירת סיכום: ' + e.message); }
                    finally { setSummaryLoading(false); }
                  }}
                >
                  {summaryLoading ? '⏳ יוצר סיכום...' : '✨ צור סיכום טיפול'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>סיכום טיפול</div>
                <div style={{ marginRight: 'auto', display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setSummaryGenerated(false); setTreatmentSummary(''); }} disabled={summaryLoading}>
                    🔄 גרסה חלופית
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      const blob = new Blob([treatmentSummary], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = `סיכום_טיפול_${patient.first_name}_${patient.last_name}.txt`;
                      a.click(); URL.revokeObjectURL(url);
                    }}
                  >📥 הורד</button>
                </div>
              </div>
              <textarea
                value={treatmentSummary}
                onChange={e => setTreatmentSummary(e.target.value)}
                rows={20}
                style={{ fontSize: 13.5, lineHeight: 1.8, fontFamily: 'var(--font-body)' }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── QUESTIONNAIRES ── */}
      {tab === 'questionnaires' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowQForm(true)}>{Icon.plus(13)} מלא שאלון</button>
          </div>
          {questionnaires.length === 0
            ? <EmptyState icon={Icon.questionnaire(22)} title="אין שאלונים" sub="מלא שאלון ראשון"/>
            : questionnaires.map(q => (
              <div key={q.id} className="card card-sm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13.5 }}>{q.name_he || q.questionnaire_name || q.code || q.questionnaire_code}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(q.completed_at)}</div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 400 }}>{q.total_score}</div>
                  {q.interpretation && <div style={{ fontSize: 11, color: 'var(--warning)' }}>{q.interpretation}</div>}
                </div>
              </div>
            ))
          }
          {showQForm && (
            <Modal title="שאלון חדש" onClose={() => { setShowQForm(false); setSelectedQCode(''); setSelectedQFull(null); }}>
              <Field label="בחר שאלון">
                <select value={selectedQCode} onChange={async e => {
                  setSelectedQCode(e.target.value);
                  if (e.target.value) {
                    try { const r = await questionnairesAPI.getType(e.target.value); setSelectedQFull(r.data); setQAnswers({}); } catch (err) {}
                  } else { setSelectedQFull(null); }
                }}>
                  <option value="">בחר...</option>
                  {qTypes.map(qt => <option key={qt.code} value={qt.code}>{qt.name_he || qt.name || qt.code}</option>)}
                </select>
              </Field>
              {selectedQFull && <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: 'var(--primary)' }}>{selectedQFull.name_he || selectedQFull.name}</div>}
              {selectedQFull && (selectedQFull.questions || []).map((q, qi) => (
                <div key={qi} className="q-question-box">
                  <div style={{ fontSize: 13, marginBottom: 8 }}>{q.text}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(q.options || []).map((opt, oi) => (
                      <button key={oi} className={`q-option${qAnswers[qi] === oi ? ' selected' : ''}`} onClick={() => setQAnswers({ ...qAnswers, [qi]: oi })}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowQForm(false); setSelectedQCode(''); setSelectedQFull(null); }}>ביטול</button>
                <button className="btn btn-primary btn-sm" onClick={submitQ} disabled={!selectedQCode}>{Icon.check(14)} שמור</button>
              </div>
            </Modal>
          )}
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {showDeleteConfirm && (
        <Modal title="ניהול מטופל" onClose={() => setShowDeleteConfirm(false)}>
          <div style={{ padding: '8px 0 4px', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>{fullName}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 22 }}>בחר פעולה:</div>
          </div>
          {/* Option 1 - Deactivate */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', marginBottom: 10, cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'center' }}
            onClick={deactivatePatient}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {Icon.patients(18)}
            </div>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 3 }}>הפוך ללא פעיל</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>המטופל יסומן כ"לא פעיל" — כל הנתונים נשמרים, ניתן לשחזר בכל עת</div>
            </div>
          </div>
          {/* Option 2 - Delete */}
          <div style={{ border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '16px 18px', marginBottom: 20, cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'center' }}
            onClick={deletePatient}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#ef4444' }}>
              {Icon.trash(18)}
            </div>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 3, color: '#ef4444' }}>מחק לצמיתות</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>מוחק את המטופל, הפגישות, התיעוד והחיובים — לא ניתן לשחזר</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowDeleteConfirm(false)}>ביטול</button>
          </div>
        </Modal>
      )}

      {/* ── BILLING ── */}
      {tab === 'billing' && (
        <BillingTab
          billing={billing}
          patientId={patientId}
          onNewPayment={onNewPayment}
          generateBilling={generateBilling}
          onReload={async () => { const r = await billingAPI.getPatient(patientId); setBilling(r.data); }}
        />
      )}
    </div>
  );
}

// ─── NEW PAYMENT PAGE ────────────────────────────────────────────────────────
function NewPaymentPage({ onBack, onSaved, initialPatientId }) {
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState(initialPatientId || '');
  const [patientSessions, setPatientSessions] = useState([]);
  const [selectedSessions, setSelectedSessions] = useState(new Set());
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [description, setDescription] = useState('');
  const [invoiceAction, setInvoiceAction] = useState('create');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [vatType, setVatType] = useState(2); // 0=פטור, 1=לא כולל מע"מ, 2=כולל מע"מ
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingWa, setSendingWa] = useState(false);
  const [waLink, setWaLink] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    patientsAPI.getAll({ status: 'active' }).then(r => setPatients(r.data || [])).catch(() => {});
  }, []);

  // When patient changes — load their pending sessions
  useEffect(() => {
    if (!patientId) { setPatientSessions([]); setSelectedSessions(new Set()); setAmount(''); return; }
    setLoadingSessions(true);
    sessionsAPI.getAll(patientId).then(r => {
      const pending = (r.data || []).filter(s => s.status === 'completed' && s.payment_status === 'pending');
      setPatientSessions(pending);
      const allIds = new Set(pending.map(s => s.id));
      setSelectedSessions(allIds);
      const total = pending.reduce((sum, s) => sum + (s.fee || 450), 0);
      setAmount(total > 0 ? String(total) : '');
    }).catch(() => {}).finally(() => setLoadingSessions(false));
  }, [patientId]);

  // Recalculate amount when sessions checked/unchecked
  const toggleSession = (id, fee) => {
    const next = new Set(selectedSessions);
    if (next.has(id)) { next.delete(id); } else { next.add(id); }
    setSelectedSessions(next);
    const total = patientSessions
      .filter(s => next.has(s.id))
      .reduce((sum, s) => sum + (s.fee || 450), 0);
    setAmount(total > 0 ? String(total) : amount);
  };

  const selectedPatient = patients.find(p => String(p.id) === String(patientId));
  const filteredPatients = patients.filter(p =>
    `${p.first_name} ${p.last_name}`.includes(patientSearch) || !patientSearch
  );

  const handlePreview = () => {
    if (!patientId || !amount) { setError('בחר מטופל וסכום תחילה'); return; }
    setError('');
    setShowPreviewModal(true);
  };

  const handleSendWa = async () => {
    if (!selectedPatient) { setError('בחר מטופל תחילה'); return; }
    if (!selectedPatient.phone) { setError('אין מספר טלפון למטופל זה'); return; }
    setSendingWa(true); setError(''); setWaLink(null);
    try {
      const r = await billingAPI.whatsappSend(patientId, null);
      setWaLink(r.data.payment_link);
      setSuccess('✅ בקשת תשלום נשלחה בוואטסאפ!');
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSendingWa(false);
      setTimeout(() => setSuccess(''), 4000);
    }
  };

  const handleSave = async () => {
    if (!patientId) { setError('בחר מטופל'); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setError('הזן סכום תקין'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      await billingAPI.manualCreate({
        patient_id: patientId,
        session_ids: Array.from(selectedSessions),
        amount: Number(amount),
        date,
        description,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        invoice_action: invoiceAction,
        invoice_number: invoiceNumber,
        vat_type: vatType,
        document_date: documentDate,
        due_date: dueDate || undefined,
      });
      setSuccess('✅ חיוב נשמר בהצלחה!');
      setTimeout(() => { if (onSaved) onSaved(); if (onBack) onBack(); }, 1500);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const payMethods = [
    { value: 'bank_transfer', label: 'העברה בנקאית' },
    { value: 'cash', label: 'מזומן' },
    { value: 'credit_card', label: 'כרטיס אשראי' },
    { value: 'bit', label: 'ביט' },
    { value: 'paybox', label: 'PayBox' },
    { value: 'other', label: 'אחר' },
  ];

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          {Icon.back(15)} חזרה
        </button>
        <h2 style={{ margin: 0, fontSize: 18, fontFamily: 'var(--font-heading)', fontWeight: 600 }}>תשלום חדש</h2>
      </div>

      <div className="card card-sm" style={{ padding: '24px 28px' }}>

        {/* Patient selector */}
        <Field label="מטופל">
          <div style={{ position: 'relative' }}>
            <input
              value={selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : patientSearch}
              onChange={e => { setPatientSearch(e.target.value); setPatientId(''); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 180)}
              placeholder="חפש מטופל..."
              autoComplete="off"
            />
            {showDropdown && filteredPatients.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, left: 0, zIndex: 99,
                background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto'
              }}>
                {filteredPatients.map(p => (
                  <div key={p.id}
                    onMouseDown={() => { setPatientId(p.id); setPatientSearch(''); setShowDropdown(false); }}
                    style={{
                      padding: '10px 16px', cursor: 'pointer', fontSize: 14,
                      borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--page-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <Avatar name={`${p.first_name} ${p.last_name}`} size={28}/>
                    <div>
                      <div style={{ fontWeight: 500 }}>{p.first_name} {p.last_name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{p.phone || 'ללא טלפון'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Field>

        {/* Date */}
        <Field label="תאריך">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ maxWidth: 200 }}/>
        </Field>

        {/* Sessions */}
        {patientId && (
          <div className="input-wrap">
            <label className="input-label">פגישות</label>
            {loadingSessions
              ? <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>טוען פגישות...</div>
              : patientSessions.length === 0
                ? <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0', fontStyle: 'italic' }}>אין פגישות פתוחות — ניתן להזין סכום ידנית</div>
                : (
                  <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                    {patientSessions.map((s, i) => {
                      const checked = selectedSessions.has(s.id);
                      return (
                        <label key={s.id} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 14px', cursor: 'pointer',
                          borderBottom: i < patientSessions.length - 1 ? '1px solid var(--border)' : 'none',
                          background: checked ? 'rgba(99,102,241,0.04)' : ''
                        }}>
                          <input
                            type="checkbox" checked={checked} style={{ width: 'auto', accentColor: '#6366f1' }}
                            onChange={() => toggleSession(s.id, s.fee)}
                          />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 13.5, fontWeight: 500 }}>{fmtDate(s.session_date)}</span>
                            {s.session_time && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 8 }}>{s.session_time.slice(0,5)}</span>}
                          </div>
                          <span style={{ fontSize: 14, fontFamily: 'var(--font-heading)', color: '#6366f1' }}>₪{s.fee || 450}</span>
                        </label>
                      );
                    })}
                  </div>
                )
            }
          </div>
        )}

        {/* Amount */}
        <Field label="סכום (₪)">
          <input
            type="number" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="0" min="0" style={{ maxWidth: 160 }}
          />
        </Field>

        {/* Payment status */}
        <Field label="מצב תשלום">
          <div style={{ display: 'flex', gap: 10 }}>
            {[['paid','שולם'],['pending','ממתין לתשלום']].map(([v,l]) => (
              <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="radio" name="payStatus" value={v} checked={paymentStatus===v}
                  onChange={() => setPaymentStatus(v)} style={{ width: 'auto', accentColor: '#6366f1' }}/>
                <span style={{ fontSize: 14 }}>{l}</span>
              </label>
            ))}
          </div>
        </Field>

        {/* Payment method */}
        <Field label="אמצעי תשלום">
          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={{ maxWidth: 240 }}>
            {payMethods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </Field>

        {/* Description */}
        <Field label="תיאור נוסף (אופציונלי)">
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="לדוגמה: טיפול פסיכולוגי ינואר 2026"/>
        </Field>

        {/* Invoice section */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, marginTop: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>חשבונית (חשבונית ירוקה)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginBottom: 14 }}>
            {[['create','יצירת חשבונית'],['existing','הזנת מספר חשבונית'],['none','ללא חשבונית']].map(([v,l]) => (
              <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13.5 }}>
                <input type="radio" name="invAction" value={v} checked={invoiceAction===v}
                  onChange={() => setInvoiceAction(v)} style={{ width: 'auto', accentColor: '#6366f1' }}/>
                {l}
              </label>
            ))}
          </div>

          {invoiceAction === 'create' && (
            <>
              {/* Document date + Due date */}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
                <div className="input-wrap" style={{ flex: 1, minWidth: 160, marginBottom: 0 }}>
                  <label className="input-label">תאריך המסמך</label>
                  <input type="date" value={documentDate} onChange={e => setDocumentDate(e.target.value)} style={{ maxWidth: 180 }}/>
                </div>
                <div className="input-wrap" style={{ flex: 1, minWidth: 160, marginBottom: 0 }}>
                  <label className="input-label">תאריך ביצוע התשלום <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(אופציונלי)</span></label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ maxWidth: 180 }}/>
                </div>
              </div>

              {/* VAT option */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500 }}>מע"מ</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  {[
                    [2, 'כולל מע"מ (18%)', `הסכום שהזנת כולל מע"מ — ₪${amount || 0} סה"כ`],
                    [1, 'לא כולל מע"מ', `מע"מ יתווסף: סה"כ ₪${amount ? Math.round(Number(amount) * 1.18) : 0}`],
                    [0, 'פטור ממע"מ', 'ללא מע"מ'],
                  ].map(([v, l, hint]) => (
                    <label key={v} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, cursor: 'pointer' }}>
                      <input type="radio" name="vatType" value={v} checked={vatType === v}
                        onChange={() => setVatType(v)} style={{ width: 'auto', accentColor: '#6366f1', marginTop: 2 }}/>
                      <div>
                        <div style={{ fontSize: 13.5 }}>{l}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{hint}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Local preview button — no GI document created */}
              <div style={{ marginBottom: 14 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handlePreview}
                  disabled={!patientId || !amount}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  👁 תצוגה מקדימה
                </button>
              </div>

              {/* Local preview modal */}
              {showPreviewModal && (() => {
                const pat = selectedPatient;
                const vatLabels = ['כולל מע"מ 18%', 'לא כולל מע"מ', 'פטור ממע"מ'];
                const numAmount = Number(amount);
                const vatAmount = vatType === 0 ? Math.round(numAmount * 18 / 118 * 100) / 100 : 0;
                const baseAmount = vatType === 0 ? Math.round((numAmount - vatAmount) * 100) / 100 : numAmount;
                const selSessions = patientSessions.filter(s => selectedSessions.has(s.id));
                return (
                  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setShowPreviewModal(false)}>
                    <div style={{ background: '#fff', borderRadius: 12, padding: 32, maxWidth: 480, width: '90%', direction: 'rtl', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
                      onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ margin: 0, fontSize: 18, color: '#1e293b' }}>תצוגה מקדימה — חשבונית מס/קבלה</h3>
                        <button onClick={() => setShowPreviewModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}>✕</button>
                      </div>
                      <div style={{ borderTop: '2px solid #6366f1', paddingTop: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ color: '#64748b', fontSize: 13 }}>לכבוד</span>
                          <span style={{ fontWeight: 600 }}>{pat ? `${pat.first_name} ${pat.last_name}` : ''}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ color: '#64748b', fontSize: 13 }}>תאריך מסמך</span>
                          <span>{documentDate || '—'}</span>
                        </div>
                        {dueDate && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ color: '#64748b', fontSize: 13 }}>תאריך ביצוע תשלום</span>
                          <span>{dueDate}</span>
                        </div>}
                        <div style={{ borderTop: '1px solid #e2e8f0', margin: '12px 0', paddingTop: 12 }}>
                          {selSessions.length > 0 ? selSessions.map(s => (
                            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                              <span>{description || 'טיפול פסיכולוגי'} — {s.session_date?.slice(0,10)}</span>
                              <span>₪{s.fee || amount}</span>
                            </div>
                          )) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                              <span>{description || 'טיפול פסיכולוגי'}</span>
                              <span>₪{baseAmount}</span>
                            </div>
                          )}
                        </div>
                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                          {vatType === 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#64748b' }}>
                            <span>מע"מ 18%</span><span>₪{vatAmount}</span>
                          </div>}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
                            <span>סה"כ לתשלום</span><span style={{ color: '#6366f1' }}>₪{numAmount}</span>
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{vatLabels[vatType]}</div>
                        </div>
                      </div>
                      <div style={{ marginTop: 20, background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: '#16a34a' }}>
                        ✓ המסמך יווצר בחשבונית ירוקה כאשר תלחץ על "שמור תשלום"
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div style={{ fontSize: 12.5, color: '#6366f1', background: 'rgba(99,102,241,0.06)', borderRadius: 8, padding: '10px 14px', border: '1px solid rgba(99,102,241,0.15)' }}>
                💡 תיווצר חשבונית בחשבונית ירוקה (Morning) ודף תשלום יישלח בעת השמירה
              </div>
            </>
          )}
          {invoiceAction === 'existing' && (
            <Field label="מספר חשבונית קיימת">
              <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)}
                placeholder="הזן מספר חשבונית" style={{ maxWidth: 260 }}/>
            </Field>
          )}
        </div>

        {/* WhatsApp request */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, marginTop: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>וואטסאפ</div>

          {/* Manual WhatsApp — opens personal WA with pre-filled message */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
            padding: '12px 14px', background: 'var(--page-bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>שליחה ידנית מהוואטסאפ שלי</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>פותח וואטסאפ עם פירוט הפגישות — אתה שולח</div>
            </div>
            <a
              href={(() => {
                if (!selectedPatient?.phone) return null;
                const sessionDates = patientSessions
                  .filter(s => selectedSessions.has(s.id))
                  .map(s => fmtDateShort(s.session_date))
                  .join(', ');
                const count = selectedSessions.size || 1;
                const total = amount || 0;
                const msg = `היי ${selectedPatient?.first_name || ''},\nאלו הפגישות שהתקיימו${sessionDates ? `, תאריכים: ${sessionDates}` : ''}.\nסה"כ ${count} פגישות על סך ₪${total}.`;
                return toWhatsAppUrl(selectedPatient.phone, msg);
              })()}
              target="_blank" rel="noreferrer"
              onClick={e => !selectedPatient?.phone && e.preventDefault()}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none',
                background: selectedPatient?.phone ? '#25D366' : '#94a3b8',
                color: 'white', border: 'none', borderRadius: 9,
                padding: '9px 16px', fontSize: 13.5, fontWeight: 600,
                cursor: selectedPatient?.phone ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                pointerEvents: selectedPatient?.phone ? 'auto' : 'none', opacity: selectedPatient?.phone ? 1 : 0.5
              }}
            >
              {Icon.whatsapp(15)} פתח בוואטסאפ
            </a>
          </div>

          {/* Automatic — creates Green Invoice payment link and sends via API */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', background: 'var(--page-bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>שליחת דף תשלום אוטומטית</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>יוצר דף תשלום בחשבונית ירוקה ושולח ישירות למטופל</div>
            </div>
            <button
              onClick={handleSendWa}
              disabled={sendingWa || !patientId}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: '#25D366', color: 'white', border: 'none', borderRadius: 9,
                padding: '9px 16px', fontSize: 13.5, fontWeight: 600,
                cursor: patientId ? 'pointer' : 'not-allowed',
                opacity: patientId ? 1 : 0.5, fontFamily: 'inherit'
              }}
            >
              {Icon.whatsapp(15)} {sendingWa ? 'שולח...' : 'שלח אוטומטית'}
            </button>
          </div>

          {waLink && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', wordBreak: 'break-all', marginTop: 10 }}>
              🔗 <a href={waLink} target="_blank" rel="noreferrer" style={{ color: '#6366f1' }}>{waLink}</a>
            </div>
          )}
        </div>

        {/* Errors / success */}
        {error && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13.5, color: '#dc2626' }}>
            ❌ {error}
          </div>
        )}
        {success && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13.5, color: '#15803d' }}>
            {success}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-ghost btn-sm" onClick={onBack}>ביטול</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? 'שומר...' : 'שמור תשלום'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BILLING PAGE ─────────────────────────────────────────────────────────────
function BillingPage({ onNew }) {
  const [patients, setPatients] = useState([]);
  const load = () => billingAPI.getPatientSummary().then(r => setPatients(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const totalPaid = patients.reduce((s, p) => s + Number(p.total_paid || 0), 0);
  const totalUnpaid = patients.reduce((s, p) => s + Number(p.unpaid_total || 0), 0);

  return (
    <div>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            סה"כ שולם: <strong style={{ color: '#10b981' }}>{fmt(totalPaid)}</strong>
          </div>
          {totalUnpaid > 0 && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              יתרה לתשלום: <strong style={{ color: '#ef4444' }}>{fmt(totalUnpaid)}</strong>
            </div>
          )}
        </div>
        <button className="btn btn-primary btn-sm" onClick={onNew}>
          {Icon.plus(14)} תשלום חדש
        </button>
      </div>

      {patients.length === 0
        ? <EmptyState icon={Icon.billing(22)} title="אין נתוני חיוב" sub="הפגישות יופיעו כאן לאחר סנכרון יומן גוגל"
            action={<button className="btn btn-primary btn-sm" onClick={onNew}>{Icon.plus(14)} תשלום חדש</button>}/>
        : (
          <div className="card card-sm" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 120px 120px 120px 100px',
              padding: '10px 20px', background: 'var(--page-bg)',
              borderBottom: '1px solid var(--border)',
              fontSize: 12, fontWeight: 600, color: 'var(--text-muted)'
            }}>
              <div>מטופל</div>
              <div style={{ textAlign: 'center' }}>פגישות שהתקיימו</div>
              <div style={{ textAlign: 'center' }}>צפוי לתשלום</div>
              <div style={{ textAlign: 'center' }}>שולם</div>
              <div style={{ textAlign: 'center' }}>יתרה</div>
            </div>
            {patients.map((p, i) => {
              const unpaid = Number(p.unpaid_total || 0);
              const paid = Number(p.total_paid || 0);
              const scheduled = Number(p.scheduled_total || 0);
              const expected = Number(p.completed_total || 0) + scheduled;
              return (
                <div key={p.patient_id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 120px 120px 120px 100px',
                  padding: '14px 20px', alignItems: 'center',
                  borderBottom: i < patients.length - 1 ? '1px solid var(--border)' : 'none',
                  background: i % 2 === 0 ? 'var(--card-bg)' : 'var(--page-bg)'
                }}>
                  {/* Patient */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={`${p.first_name} ${p.last_name}`} size={36}/>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.first_name} {p.last_name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        {Number(p.completed_count || 0)} הושלמו
                        {Number(p.scheduled_count || 0) > 0 && ` · ${p.scheduled_count} מתוכננות`}
                      </div>
                    </div>
                  </div>
                  {/* Completed */}
                  <div style={{ textAlign: 'center', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 14 }}>
                    {Number(p.completed_count || 0)}
                  </div>
                  {/* Expected */}
                  <div style={{ textAlign: 'center', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 14, color: '#6366f1' }}>
                    {fmt(expected)}
                  </div>
                  {/* Paid */}
                  <div style={{ textAlign: 'center', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 14, color: '#10b981' }}>
                    {fmt(paid)}
                  </div>
                  {/* Balance */}
                  <div style={{ textAlign: 'center' }}>
                    {unpaid > 0
                      ? <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 14, color: '#ef4444' }}>{fmt(unpaid)}</span>
                      : <span style={{ fontSize: 12, color: '#10b981' }}>✓ מסולק</span>
                    }
                  </div>
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
function Settings() {
  const [settings, setSettings] = useState({
    therapist_name: '', clinic_name: '', default_session_fee: 450,
    green_invoice_api_id: '', green_invoice_api_secret: '',
    auto_billing_enabled: false, auto_billing_day: 1, google_calendar_id: 'primary'
  });
  const [saved, setSaved] = useState(false);

  // Google Calendar state
  const [gcal, setGcal] = useState({ connected: false, last_sync: null, total_synced: 0, calendar_id: 'primary' });
  const [gcalLoading, setGcalLoading] = useState(false);
  const [gcalCalendars, setGcalCalendars] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [webhookInfo, setWebhookInfo] = useState({ active: false });
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookLoading, setWebhookLoading] = useState(false);

  const loadStatus = () => {
    calendarAPI.status().then(r => {
      setGcal(r.data);
      if (r.data.connected) {
        calendarAPI.calendars().then(c => setGcalCalendars(c.data)).catch(() => {});
        calendarAPI.webhookStatus().then(w => setWebhookInfo(w.data)).catch(() => {});
      }
    }).catch(() => {});
  };

  const registerWebhook = async () => {
    if (!webhookUrl.trim()) return;
    setWebhookLoading(true);
    try {
      const r = await calendarAPI.webhookRegister(webhookUrl.trim());
      setWebhookInfo({ active: true, ...r.data });
      setSyncMsg('✅ Webhook נרשם בהצלחה! סנכרון בזמן אמת פעיל');
    } catch (e) {
      setSyncMsg('❌ ' + (e.response?.data?.error || 'שגיאה ברישום Webhook'));
    } finally {
      setWebhookLoading(false);
      setTimeout(() => setSyncMsg(''), 5000);
    }
  };

  useEffect(() => {
    settingsAPI.get().then(r => {
      if (r.data) setSettings(s => ({
        ...s,
        therapist_name: r.data.therapist_name || '',
        clinic_name: r.data.clinic_name || '',
        default_session_fee: r.data.default_session_fee || 450,
        green_invoice_api_id: r.data.green_invoice_api_id || '',
        auto_billing_enabled: r.data.auto_billing_enabled === 'true',
        auto_billing_day: r.data.auto_billing_day || 1,
        google_calendar_id: r.data.google_calendar_id || 'primary',
      }));
    }).catch(() => {});
    loadStatus();

    // Check if returning from Google OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get('gcal_connected')) {
      setSyncMsg('✅ Google Calendar חובר בהצלחה!');
      window.history.replaceState({}, '', window.location.pathname);
      loadStatus();
    }
    if (params.get('gcal_error')) {
      setSyncMsg('❌ שגיאה בחיבור Google Calendar');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const save = async () => {
    try {
      await settingsAPI.update({
        therapist_name: settings.therapist_name,
        clinic_name: settings.clinic_name,
        default_session_fee: settings.default_session_fee,
        green_invoice_api_id: settings.green_invoice_api_id,
        auto_billing_enabled: settings.auto_billing_enabled,
        auto_billing_day: settings.auto_billing_day,
        google_calendar_id: settings.google_calendar_id,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { alert('שגיאה בשמירה'); }
  };

  const doSync = async () => {
    setSyncing(true); setSyncMsg('');
    try {
      const r = await calendarAPI.sync();
      setSyncMsg(r.data.imported > 0
        ? `✅ יובאו ${r.data.imported} פגישות חדשות`
        : '✅ סנכרון הושלם — אין פגישות חדשות');
      loadStatus();
    } catch (e) { setSyncMsg('❌ שגיאה בסנכרון'); }
    setSyncing(false);
  };

  const doDisconnect = async () => {
    if (!window.confirm('לנתק את Google Calendar?')) return;
    try {
      await calendarAPI.disconnect();
      setGcal({ connected: false, last_sync: null, total_synced: 0 });
      setGcalCalendars([]);
      setSyncMsg('');
    } catch (e) {}
  };

  const fmtSync = (d) => {
    if (!d) return null;
    return new Date(d).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button className="btn btn-primary btn-sm" onClick={save}>{saved ? <>{Icon.check(14)} נשמר</> : 'שמור הגדרות'}</button>
      </div>
      <div className="grid-2">
        {/* Clinic details */}
        <div className="card card-sm">
          <div className="card-title">פרטי קליניקה</div>
          <Field label="שם המטפל"><input value={settings.therapist_name} onChange={e => setSettings({ ...settings, therapist_name: e.target.value })}/></Field>
          <Field label="שם הקליניקה"><input value={settings.clinic_name} onChange={e => setSettings({ ...settings, clinic_name: e.target.value })}/></Field>
          <Field label="תשלום ברירת מחדל (₪)"><input type="number" value={settings.default_session_fee} onChange={e => setSettings({ ...settings, default_session_fee: e.target.value })}/></Field>
        </div>

        {/* Green Invoice */}
        <div className="card card-sm">
          <div className="card-title">חשבונית ירוקה</div>
          <div className="info-banner">מלא פרטי API לשליחת חשבוניות אוטומטית</div>
          <Field label="API ID"><input value={settings.green_invoice_api_id} onChange={e => setSettings({ ...settings, green_invoice_api_id: e.target.value })}/></Field>
          <Field label="API Secret"><input type="password" value={settings.green_invoice_api_secret || ''} onChange={e => setSettings({ ...settings, green_invoice_api_secret: e.target.value })}/></Field>
        </div>

        {/* Auto billing */}
        <div className="card card-sm">
          <div className="card-title">חיוב אוטומטי</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <input type="checkbox" id="auto_b" checked={!!settings.auto_billing_enabled} onChange={e => setSettings({ ...settings, auto_billing_enabled: e.target.checked })} style={{ width: 'auto' }}/>
            <label htmlFor="auto_b" style={{ fontSize: 13.5 }}>הפעל חיוב אוטומטי חודשי</label>
          </div>
          {settings.auto_billing_enabled && <Field label="יום בחודש"><input type="number" min="1" max="28" value={settings.auto_billing_day} onChange={e => setSettings({ ...settings, auto_billing_day: e.target.value })}/></Field>}
        </div>

        {/* Google Calendar */}
        <div className="card card-sm" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>
              {Icon.gcal(16)}&nbsp; סנכרון Google Calendar
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500,
                background: gcal.connected ? 'rgba(16,185,129,0.12)' : 'rgba(148,163,184,0.15)',
                color: gcal.connected ? '#10b981' : '#94a3b8'
              }}>
                {gcal.connected ? '● מחובר' : '○ לא מחובר'}
              </span>
              {gcal.connected && (
                <button className="btn btn-ghost btn-xs" onClick={doDisconnect} style={{ color: '#f87171' }}>נתק</button>
              )}
            </div>
          </div>

          {!gcal.connected ? (
            <div style={{ textAlign: 'center', padding: '18px 0' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.7 }}>
                חבר את Google Calendar שלך כדי שכל פגישה שתוסיף ביומן תופיע אוטומטית במערכת.<br/>
                <span style={{ fontSize: 12 }}>המערכת מזהה מטופלים לפי שם — ודא שאירועי הפגישה כוללים את שם המטופל.</span>
              </div>
              <a
                href={calendarAPI.oauthStartUrl}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, textDecoration: 'none' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                חבר עם Google
              </a>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
                נדרשים GOOGLE_CLIENT_ID ו-GOOGLE_CLIENT_SECRET ב-backend/.env
              </div>
            </div>
          ) : (
            <div>
              {/* Calendar selector */}
              <div style={{ marginBottom: 16 }}>
                <Field label="יומן לסנכרון">
                  <select
                    value={settings.google_calendar_id}
                    onChange={e => setSettings({ ...settings, google_calendar_id: e.target.value })}
                  >
                    <option value="primary">יומן ראשי (primary)</option>
                    {gcalCalendars.map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.primary ? ' (ראשי)' : ''}</option>
                    ))}
                  </select>
                </Field>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                  בחר יומן שפגישות הטיפול שלך נמצאות בו
                </div>
              </div>

              {/* Sync stats */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div className="card card-sm" style={{ flex: 1, textAlign: 'center', padding: '12px 16px' }}>
                  <div style={{ fontSize: 22, fontFamily: 'var(--font-heading)', fontWeight: 400 }}>{gcal.total_synced}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>פגישות יובאו</div>
                </div>
                <div className="card card-sm" style={{ flex: 2, padding: '12px 16px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>סנכרון אחרון</div>
                  <div style={{ fontSize: 13.5 }}>{fmtSync(gcal.last_sync) || 'טרם בוצע'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>סנכרון אוטומטי כל 5 דקות</div>
                </div>
              </div>

              {/* How it works */}
              <div className="info-banner" style={{ marginBottom: 14, lineHeight: 1.7 }}>
                <strong>איך זה עובד?</strong><br/>
                כל אירוע ביומן שמכיל את שם המטופל (שם פרטי + שם משפחה) יתווסף אוטומטית כפגישה במערכת.
                לדוגמה: "פגישה — ישראל ישראלי" או "ישראל ישראלי 10:00".
              </div>

              {/* Manual sync */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
                <button className="btn btn-primary btn-sm" onClick={doSync} disabled={syncing}>
                  {Icon.gcal(14)} {syncing ? 'מסנכרן...' : 'סנכרן עכשיו'}
                </button>
                {syncMsg && (
                  <span style={{ fontSize: 13, color: syncMsg.startsWith('✅') ? 'var(--success)' : 'var(--danger)' }}>
                    {syncMsg}
                  </span>
                )}
              </div>

              {/* Webhook — real-time sync */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>סנכרון בזמן אמת (Webhook)</div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                    background: webhookInfo.active ? 'rgba(16,185,129,0.12)' : 'rgba(148,163,184,0.15)',
                    color: webhookInfo.active ? '#10b981' : '#94a3b8'
                  }}>
                    {webhookInfo.active ? '● פעיל' : '○ לא פעיל'}
                  </span>
                </div>
                {webhookInfo.active ? (
                  <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                    ✅ כל פגישה חדשה ביומן גוגל תתווסף אוטומטית למערכת.<br/>
                    <span style={{ color: '#94a3b8', fontSize: 12 }}>
                      פג תוקף: {webhookInfo.expiration ? new Date(Number(webhookInfo.expiration)).toLocaleDateString('he-IL') : '—'}
                    </span>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 13, color: '#64748b', marginBottom: 10, lineHeight: 1.6 }}>
                      כדי לקבל עדכונים אוטומטיים, דרוש URL ציבורי (ngrok).<br/>
                      הפעל <code style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>ngrok http 3001</code> וכנס את ה-URL:
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        placeholder="https://xxxx.ngrok.io"
                        value={webhookUrl}
                        onChange={e => setWebhookUrl(e.target.value)}
                        style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit' }}
                      />
                      <button
                        onClick={registerWebhook}
                        disabled={webhookLoading || !webhookUrl.trim()}
                        className="btn btn-primary btn-sm"
                      >
                        {webhookLoading ? 'רושם...' : 'הפעל'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── BACKUP SECTION ── */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, marginTop: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>גיבוי נתונים</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>
            גיבוי אוטומטי יומי מתבצע ב-02:00. ניתן להוריד גיבוי ידני בכל עת.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <a
              href={`${process.env.REACT_APP_API_URL || '/api'}/backup/download`}
              download
              className="btn btn-primary btn-sm"
              style={{ textDecoration: 'none' }}
            >
              💾 הורד גיבוי עכשיו
            </a>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => fetch(`${process.env.REACT_APP_API_URL || '/api'}/backup/run`)
                .then(r => r.json())
                .then(d => alert(`✅ גיבוי בוצע: ${d.filename || 'הצלחה'}\n${d.patients} מטופלים · ${d.sessions} פגישות`))
                .catch(() => alert('שגיאה בגיבוי'))}
            >
              🔄 הפעל גיבוי ידני
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        onLogin();
      } else {
        setError(data.error || 'שגיאה בכניסה');
      }
    } catch {
      setError('שגיאה בחיבור לשרת');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      fontFamily: 'var(--font-body)', direction: 'rtl'
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '48px 40px',
        width: 380, boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', margin: 0 }}>תיעודרך</h1>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: '6px 0 0' }}>ניהול קליניקה</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>שם משתמש</label>
            <input
              type="text" value={username} onChange={e => setUsername(e.target.value)}
              required autoFocus
              style={{
                width: '100%', padding: '11px 14px', fontSize: 15, border: '1.5px solid #e2e8f0',
                borderRadius: 10, outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s', fontFamily: 'inherit'
              }}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>סיסמא</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%', padding: '11px 14px', fontSize: 15, border: '1.5px solid #e2e8f0',
                borderRadius: 10, outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s', fontFamily: 'inherit'
              }}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
              borderRadius: 8, padding: '10px 14px', fontSize: 14, marginBottom: 16, textAlign: 'center'
            }}>{error}</div>
          )}
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '13px', fontSize: 16, fontWeight: 600,
            background: loading ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
            color: '#fff', border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', transition: 'opacity 0.2s'
          }}>
            {loading ? 'מתחבר...' : 'כניסה'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('auth_token'));
  const [page, setPage] = useState('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patientName, setPatientName] = useState('מטופל');
  const [newPaymentPatientId, setNewPaymentPatientId] = useState(null);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const pageTitles = {
    dashboard: 'דשבורד', patients: 'מטופלים', patient: patientName,
    billing: 'חיוב', 'new-payment': 'תשלום חדש', 'bulk-billing': 'שליחת בקשות תשלום',
    'weekly-transcription': 'תמלול שבועי', 'general-transcription': 'תמלול כללי',
    settings: 'הגדרות'
  };

  const navGroups = [
    {
      section: 'ראשי',
      items: [
        { id: 'dashboard', label: 'דשבורד', icon: Icon.dashboard },
        { id: 'patients', label: 'מטופלים', icon: Icon.patients },
      ]
    },
    {
      section: 'כספים',
      items: [
        { id: 'billing', label: 'חיוב', icon: Icon.billing },
        { id: 'bulk-billing', label: 'בקשות תשלום', icon: Icon.billing },
      ]
    },
    {
      section: 'תמלול',
      items: [
        { id: 'weekly-transcription', label: 'תמלול שבועי', icon: Icon.mic },
        { id: 'general-transcription', label: 'תמלול כללי', icon: Icon.notes },
      ]
    },
    {
      section: 'כלים',
      items: [
        { id: 'settings', label: 'הגדרות', icon: Icon.settings },
      ]
    },
  ];

  const handlePatientLoad = useCallback((name) => setPatientName(name), []);

  if (!isLoggedIn) {
    return <LoginPage onLogin={() => setIsLoggedIn(true)} />;
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setIsLoggedIn(false);
  };

  return (
    <div className="app-shell">
      {/* ── SIDEBAR ── */}
      <div className="sidebar">
        <div className="sidebar-top">
          <div className="logo-mark">
            <svg viewBox="0 0 24 24" fill="white" width="17" height="17">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H8v-2h4v2zm4-4H8v-2h8v2zm0-4H8V7h8v2z"/>
            </svg>
          </div>
          <div className="logo-name">תיעודרך</div>
          <div className="logo-sub">ניהול קליניקה</div>
        </div>

        <nav className="sidebar-nav">
          {navGroups.map(group => (
            <React.Fragment key={group.section}>
              <div className="nav-section">{group.section}</div>
              {group.items.map(item => (
                <div
                  key={item.id}
                  className={`nav-item${page === item.id || (page === 'patient' && item.id === 'patients') ? ' active' : ''}`}
                  onClick={() => setPage(item.id)}
                >
                  {item.icon(15)}
                  {item.label}
                </div>
              ))}
            </React.Fragment>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="therapist-row">
            <div className="therapist-avatar">עא</div>
            <div style={{ flex: 1 }}>
              <div className="therapist-name">עמית איזיק</div>
              <div className="therapist-role">פסיכולוג קליני</div>
            </div>
            <button onClick={handleLogout} title="יציאה" style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 6,
              color: '#94a3b8', borderRadius: 8, display: 'flex', alignItems: 'center',
              transition: 'color 0.2s'
            }}
              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="main">
        <div className="topbar">
          <div className="topbar-title">{pageTitles[page] || 'תיעודרך'}</div>
          <div className="topbar-right">
            {page === 'patients' && (
              <button className="btn btn-primary btn-sm" onClick={() => {}}>+ חדש</button>
            )}
            {page === 'billing' && (
              <button className="btn btn-primary btn-sm" onClick={() => setPage('new-payment')}>
                {Icon.plus(13)} תשלום חדש
              </button>
            )}
          </div>
        </div>

        <div className="content">
          {page === 'dashboard' && <Dashboard month={month} year={year} onPatientClick={id => { setSelectedPatientId(id); setPage('patient'); }}/>}
          {page === 'patients' && (
            <PatientsList onSelect={id => { setSelectedPatientId(id); setPage('patient'); }}/>
          )}
          {page === 'patient' && selectedPatientId && (
            <PatientDetail
              patientId={selectedPatientId}
              onBack={() => setPage('patients')}
              onLoad={handlePatientLoad}
              onNewPayment={(pid) => { setNewPaymentPatientId(pid); setPage('new-payment'); }}
            />
          )}
          {page === 'billing' && <BillingPage onNew={() => setPage('new-payment')}/>}
          {page === 'new-payment' && <NewPaymentPage
            initialPatientId={newPaymentPatientId}
            onBack={() => { setNewPaymentPatientId(null); setPage(newPaymentPatientId ? 'patient' : 'billing'); }}
            onSaved={() => { setNewPaymentPatientId(null); setPage(newPaymentPatientId ? 'patient' : 'billing'); }}
          />}
          {page === 'bulk-billing' && <BulkBillingPage/>}
          {page === 'weekly-transcription' && <WeeklyTranscriptionPage/>}
          {page === 'general-transcription' && <GeneralTranscriptionPage/>}
          {page === 'settings' && <Settings/>}
        </div>
      </div>
    </div>
  );
}
