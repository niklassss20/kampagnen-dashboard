const path = require("path");
const Database = require("better-sqlite3");

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, "dashboard.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      platform TEXT NOT NULL CHECK(platform IN ('Meta', 'Google', 'TikTok', 'LinkedIn')),
      budget REAL NOT NULL DEFAULT 0,
      clicks INTEGER NOT NULL DEFAULT 0,
      conversions INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ad_agents (
      id INTEGER PRIMARY KEY,
      user_id INTEGER UNIQUE NOT NULL,
      brand_name TEXT NOT NULL,
      industry TEXT NOT NULL,
      target_audience TEXT NOT NULL,
      tone_of_voice TEXT NOT NULL CHECK(tone_of_voice IN ('Professionell', 'Locker', 'Provokant', 'Luxuriös')),
      language TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

function seedDemoCampaigns(userId) {
  const count = db.prepare("SELECT COUNT(*) AS count FROM campaigns WHERE user_id = ?").get(userId).count;
  if (count > 0) return;

  const insert = db.prepare(`
    INSERT INTO campaigns (user_id, name, platform, budget, clicks, conversions)
    VALUES (@user_id, @name, @platform, @budget, @clicks, @conversions)
  `);

  [
    { name: "Summer Sale", platform: "Meta", budget: 2500, clicks: 12000, conversions: 180 },
    { name: "B2B Leads", platform: "LinkedIn", budget: 4000, clicks: 3200, conversions: 95 },
    { name: "App Install", platform: "TikTok", budget: 1500, clicks: 25000, conversions: 420 }
  ].forEach((campaign) => insert.run({ ...campaign, user_id: userId }));
}

initDatabase();

module.exports = {
  db,
  initDatabase,
  seedDemoCampaigns
};
