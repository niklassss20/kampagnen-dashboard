const express = require('express');
const bcrypt = require('bcrypt');
const { db, seedDemoData } = require('../database');
const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-Mail und Passwort erforderlich' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen lang sein' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'E-Mail bereits registriert' });
  }

  const hash = await bcrypt.hash(password, 10);
  const result = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, hash);

  seedDemoData(result.lastInsertRowid);

  req.session.userId = result.lastInsertRowid;
  req.session.email = email;
  res.status(201).json({ message: 'Registrierung erfolgreich', email });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-Mail und Passwort erforderlich' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
  }

  req.session.userId = user.id;
  req.session.email = user.email;
  res.json({ message: 'Login erfolgreich', email: user.email });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logout erfolgreich' });
  });
});

module.exports = router;
