const express = require("express");
const bcrypt = require("bcrypt");
const { db, seedDemoCampaigns } = require("../database");

const router = express.Router();
const SALT_ROUNDS = 12;

function publicUser(user) {
  return { id: user.id, email: user.email };
}

router.post("/register", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: "E-Mail und Passwort mit mindestens 6 Zeichen erforderlich" });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = db
      .prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
      .run(email.toLowerCase().trim(), passwordHash);

    req.session.userId = result.lastInsertRowid;
    seedDemoCampaigns(result.lastInsertRowid);

    return res.status(201).json({ user: { id: result.lastInsertRowid, email: email.toLowerCase().trim() } });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "Diese E-Mail ist bereits registriert" });
    }
    return next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(String(email || "").toLowerCase().trim());
    if (!user) return res.status(401).json({ error: "Login fehlgeschlagen" });

    const valid = await bcrypt.compare(password || "", user.password_hash);
    if (!valid) return res.status(401).json({ error: "Login fehlgeschlagen" });

    req.session.userId = user.id;
    seedDemoCampaigns(user.id);
    return res.json({ user: publicUser(user) });
  } catch (err) {
    return next(err);
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("kampagnen.sid");
    res.json({ ok: true });
  });
});

router.get("/me", (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Nicht authentifiziert" });
  const user = db.prepare("SELECT id, email FROM users WHERE id = ?").get(req.session.userId);
  return res.json({ user });
});

module.exports = router;
