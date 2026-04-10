const router = require('express').Router();
const axios = require('axios');
const FormData = require('form-data');

// POST /api/transcribe — accepts base64 audio, returns Hebrew text via OpenAI Whisper
router.post('/', async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'OPENAI_API_KEY not configured' });

    const { audio, mimeType = 'audio/webm' } = req.body;
    if (!audio) return res.status(400).json({ error: 'No audio data' });

    const buffer = Buffer.from(audio, 'base64');
    const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';

    const form = new FormData();
    form.append('file', buffer, { filename: `audio.${ext}`, contentType: mimeType });
    form.append('model', 'whisper-1');
    form.append('language', 'he');

    const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${apiKey}` },
      maxBodyLength: Infinity
    });

    res.json({ text: response.data.text });
  } catch (err) {
    console.error('Transcribe error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

module.exports = router;
