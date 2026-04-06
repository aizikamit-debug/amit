const router = require('express').Router();
const jwt = require('jsonwebtoken');

const USERNAME = process.env.APP_USERNAME || 'aizikamit';
const PASSWORD = process.env.APP_PASSWORD || 'Kevaanker87!';
const JWT_SECRET = process.env.JWT_SECRET || 'tiuderech_secret_2026';

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === USERNAME && password === PASSWORD) {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token });
  } else {
    res.status(401).json({ error: 'שם משתמש או סיסמא שגויים' });
  }
});

router.post('/verify', (req, res) => {
  const { token } = req.body;
  try {
    jwt.verify(token, JWT_SECRET);
    res.json({ valid: true });
  } catch {
    res.status(401).json({ valid: false });
  }
});

module.exports = router;
module.exports.JWT_SECRET = JWT_SECRET;
