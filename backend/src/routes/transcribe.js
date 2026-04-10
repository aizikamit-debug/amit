const router = require('express').Router();
const axios = require('axios');
const FormData = require('form-data');

router.post('/', async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'no_key', message: 'מפתח API לא מוגדר' });

    const { audio, mimeType = 'audio/webm' } = req.body;
    if (!audio) return res.status(400).json({ error: 'no_audio' });

    const buffer = Buffer.from(audio, 'base64');
    const ext = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm';

    const form = new FormData();
    form.append('file', buffer, { filename: `rec.${ext}`, contentType: mimeType });
    form.append('model', 'whisper-large-v3');
    form.append('language', 'he');
    form.append('response_format', 'json');

    const baseURL = process.env.GROQ_API_KEY
      ? 'https://api.groq.com/openai/v1/audio/transcriptions'
      : 'https://api.openai.com/v1/audio/transcriptions';

    const response = await axios.post(baseURL, form, {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${apiKey}` },
      maxBodyLength: Infinity,
      timeout: 30000
    });

    res.json({ text: response.data.text });
  } catch (err) {
    console.error('Transcribe error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

module.exports = router;
