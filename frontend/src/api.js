import axios from 'axios';

const API = axios.create({ baseURL: process.env.REACT_APP_API_URL || '/api' });

export const patientsAPI = {
  getAll: (params) => API.get('/patients', { params }),
  getById: (id) => API.get(`/patients/${id}`),
  getSummary: (id) => API.get(`/patients/${id}/summary`),
  create: (data) => API.post('/patients', data),
  update: (id, data) => API.put(`/patients/${id}`, data),
  delete: (id) => API.delete(`/patients/${id}`),
};

export const sessionsAPI = {
  getAll: (patientId, params) => API.get('/sessions', { params: { patient_id: patientId, ...params } }),
  getWeek: (from_date, to_date) => API.get('/sessions', { params: { from_date, to_date } }),
  create: (patientId, data) => API.post('/sessions', { ...data, patient_id: patientId }),
  update: (id, data) => API.put(`/sessions/${id}`, data),
  delete: (id) => API.delete(`/sessions/${id}`),
};

export const notesAPI = {
  getAll: (patientId) => API.get(`/notes/patient/${patientId}`),
  create: (patientId, data) => API.post('/notes', { ...data, patient_id: patientId }),
  update: (id, data) => API.put(`/notes/${id}`, data),
  processWithAI: (id) => API.post(`/notes/${id}/process`),
  delete: (id) => API.delete(`/notes/${id}`),
  parseWeekly: (transcription) => API.post('/notes/parse-weekly', { transcription }),
  splitWeekly: (transcription) => API.post('/notes/split-weekly', { transcription }),
  saveWeekly: (segments) => API.post('/notes/save-weekly', { segments }),
};

export const questionnairesAPI = {
  getTypes: () => API.get('/questionnaires/types'),
  getType: (code) => API.get(`/questionnaires/types/${code}`),
  getAll: (patientId) => API.get(`/questionnaires/patient/${patientId}`),
  submit: (patientId, data) => API.post('/questionnaires/submit', { ...data, patient_id: patientId }),
};

export const billingAPI = {
  getAll: () => API.get('/billing'),
  getPatientSummary: () => API.get('/billing/patient-summary'),
  getPatient: (patientId) => API.get('/billing', { params: { patient_id: patientId } }),
  generate: (patientId, data) => API.post('/billing/generate', { ...data, patient_id: patientId }),
  send: (id) => API.post(`/billing/${id}/send`),
  markPaid: (id) => API.put(`/billing/${id}/paid`),
  morningStatus: (id) => API.get(`/billing/${id}/morning-status`),
  manualCreate: (data) => API.post('/billing/manual-create', data),
  previewDocument: (data) => API.post('/billing/preview-document', data),
  bulkPending: () => API.get('/billing/bulk-pending'),
  bulkSend: (patient_ids) => API.post('/billing/bulk-send', { patient_ids }),
  checkPayments: () => API.post('/billing/check-payments'),
  whatsappSend: (patient_id, message) => API.post('/billing/whatsapp-send', { patient_id, message }),
  whatsappBulk: (patient_ids) => API.post('/billing/whatsapp-bulk', { patient_ids }),
};

export const dashboardAPI = {
  get: (params) => API.get('/dashboard', { params }),
};

export const settingsAPI = {
  get: () => API.get('/settings'),
  update: (data) => API.put('/settings', data),
};

export const intakeAPI = {
  get: (patientId) => API.get(`/intake/patient/${patientId}`),
  getVersions: (patientId) => API.get(`/intake/patient/${patientId}/versions`),
  getVersion: (id) => API.get(`/intake/versions/${id}`),
  save: (patientId, content, editType, aiInstructions) =>
    API.post(`/intake/patient/${patientId}`, { content, edit_type: editType, ai_instructions: aiInstructions }),
  organize: (text) => API.post('/intake/organize', { text }),
  editAI: (content, instructions) => API.post('/intake/edit-ai', { content, instructions }),
};

export const calendarAPI = {
  status: () => API.get('/calendar/status'),
  calendars: () => API.get('/calendar/calendars'),
  sync: () => API.post('/calendar/sync'),
  disconnect: () => API.post('/calendar/disconnect'),
  webhookStatus: () => API.get('/calendar/webhook/status'),
  webhookRegister: (public_url) => API.post('/calendar/webhook/register', { public_url }),
  oauthStartUrl: `${process.env.REACT_APP_API_URL || '/api'}/calendar/oauth/start`,
};
