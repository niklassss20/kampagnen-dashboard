const { Database } = require('bun:sqlite');
const path = require('path');

const dbPath = path.join(__dirname, 'dashboard.db');
const db = new Database(dbPath, { create: true });

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    platform TEXT NOT NULL CHECK(platform IN ('Meta','Google','TikTok','LinkedIn')),
    budget REAL NOT NULL,
    clicks INTEGER NOT NULL DEFAULT 0,
    conversions INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ad_agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    brand_name TEXT NOT NULL,
    industry TEXT NOT NULL,
    target_audience TEXT NOT NULL,
    tone_of_voice TEXT NOT NULL CHECK(tone_of_voice IN ('Professionell','Locker','Provokant','Luxuriös')),
    language TEXT NOT NULL DEFAULT 'Deutsch',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

function seedDemoData(userId) {
  const count = db.prepare('SELECT COUNT(*) as c FROM campaigns WHERE user_id = ?').get(userId);
  if (count.c === 0) {
    const insert = db.prepare(
      'INSERT INTO campaigns (user_id, name, platform, budget, clicks, conversions) VALUES (?, ?, ?, ?, ?, ?)'
    );
    insert.run(userId, 'Summer Sale', 'Meta', 2500, 12000, 180);
    insert.run(userId, 'B2B Leads', 'LinkedIn', 4000, 3200, 95);
    insert.run(userId, 'App Install', 'TikTok', 1500, 25000, 420);
  }
}

module.exports = { db, seedDemoData };
