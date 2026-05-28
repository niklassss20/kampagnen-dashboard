const express = require("express");
const { db } = require("../database");

const router = express.Router();
const platforms = new Set(["Meta", "Google", "TikTok", "LinkedIn"]);

function parseCampaign(body) {
  const name = String(body.name || "").trim();
  const platform = String(body.platform || "").trim();
  const budget = Number(body.budget);
  const clicks = Number.parseInt(body.clicks, 10);
  const conversions = Number.parseInt(body.conversions, 10);

  if (!name || !platforms.has(platform)) {
    return { error: "Name und gueltige Plattform sind erforderlich" };
  }
  if ([budget, clicks, conversions].some((value) => Number.isNaN(value) || value < 0)) {
    return { error: "Budget, Klicks und Conversions muessen positive Zahlen sein" };
  }
  return { data: { name, platform, budget, clicks, conversions } };
}

router.get("/", (req, res) => {
  const campaigns = db
    .prepare("SELECT * FROM campaigns WHERE user_id = ? ORDER BY created_at DESC, id DESC")
    .all(req.session.userId);
  res.json(campaigns);
});

router.post("/", (req, res) => {
  const parsed = parseCampaign(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const result = db
    .prepare(
      `INSERT INTO campaigns (user_id, name, platform, budget, clicks, conversions)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.session.userId,
      parsed.data.name,
      parsed.data.platform,
      parsed.data.budget,
      parsed.data.clicks,
      parsed.data.conversions
    );

  const campaign = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(result.lastInsertRowid);
  return res.status(201).json(campaign);
});

router.put("/:id", (req, res) => {
  const parsed = parseCampaign(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const result = db
    .prepare(
      `UPDATE campaigns
       SET name = ?, platform = ?, budget = ?, clicks = ?, conversions = ?
       WHERE id = ? AND user_id = ?`
    )
    .run(
      parsed.data.name,
      parsed.data.platform,
      parsed.data.budget,
      parsed.data.clicks,
      parsed.data.conversions,
      req.params.id,
      req.session.userId
    );

  if (result.changes === 0) return res.status(404).json({ error: "Kampagne nicht gefunden" });
  const campaign = db.prepare("SELECT * FROM campaigns WHERE id = ? AND user_id = ?").get(req.params.id, req.session.userId);
  return res.json(campaign);
});

router.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM campaigns WHERE id = ? AND user_id = ?").run(req.params.id, req.session.userId);
  if (result.changes === 0) return res.status(404).json({ error: "Kampagne nicht gefunden" });
  return res.json({ ok: true });
});

module.exports = router;
