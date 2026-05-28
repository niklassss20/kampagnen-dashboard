const express = require('express');
const { db } = require('../database');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res) => {
  const campaigns = db.prepare('SELECT * FROM campaigns WHERE user_id = ? ORDER BY created_at DESC').all(req.session.userId);
  res.json(campaigns);
});

router.post('/', (req, res) => {
  const { name, platform, budget, clicks, conversions } = req.body;
  if (!name || !platform || budget == null) {
    return res.status(400).json({ error: 'Name, Plattform und Budget erforderlich' });
  }

  const validPlatforms = ['Meta', 'Google', 'TikTok', 'LinkedIn'];
  if (!validPlatforms.includes(platform)) {
    return res.status(400).json({ error: 'Ungültige Plattform' });
  }

  const result = db.prepare(`
    INSERT INTO campaigns (user_id, name, platform, budget, clicks, conversions)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.session.userId, name, platform, budget, clicks || 0, conversions || 0);

  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(campaign);
});

router.put('/:id', (req, res) => {
  const { name, platform, budget, clicks, conversions } = req.body;
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
  if (!campaign) {
    return res.status(404).json({ error: 'Kampagne nicht gefunden' });
  }

  if (platform) {
    const validPlatforms = ['Meta', 'Google', 'TikTok', 'LinkedIn'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({ error: 'Ungültige Plattform' });
    }
  }

  db.prepare(`
    UPDATE campaigns SET
      name = COALESCE(?, name),
      platform = COALESCE(?, platform),
      budget = COALESCE(?, budget),
      clicks = COALESCE(?, clicks),
      conversions = COALESCE(?, conversions)
    WHERE id = ? AND user_id = ?
  `).run(
    name || null, platform || null, budget ?? null,
    clicks ?? null, conversions ?? null,
    req.params.id, req.session.userId
  );

  const updated = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
  if (!campaign) {
    return res.status(404).json({ error: 'Kampagne nicht gefunden' });
  }

  db.prepare('DELETE FROM campaigns WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  res.json({ message: 'Kampagne gelöscht' });
});

module.exports = router;
