const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const request = require("supertest");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kampagnen-dashboard-"));
process.env.DATABASE_PATH = path.join(tmpDir, "test.db");
process.env.SESSION_SECRET = "test-secret";
delete process.env.OPENAI_API_KEY;

const app = require("../server");
const { db } = require("../database");

async function loggedInAgent(email = `user-${Date.now()}@example.com`) {
  const agent = request.agent(app);
  await agent.post("/api/register").send({ email, password: "secret123" }).expect(201);
  return agent;
}

test.after(() => {
  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("Kampagne erstellen liefert Status 201", async () => {
  const agent = await loggedInAgent("create@example.com");
  const response = await agent.post("/api/campaigns").send({
    name: "Test Campaign",
    platform: "Google",
    budget: 1000,
    clicks: 2000,
    conversions: 100
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.name, "Test Campaign");
});

test("Kampagnen abrufen liefert Status 200 und Array", async () => {
  const agent = await loggedInAgent("list@example.com");
  const response = await agent.get("/api/campaigns");

  assert.equal(response.status, 200);
  assert.equal(Array.isArray(response.body), true);
  assert.equal(response.body.length >= 3, true);
});

test("Kampagne loeschen liefert Status 200", async () => {
  const agent = await loggedInAgent("delete@example.com");
  const created = await agent.post("/api/campaigns").send({
    name: "Delete Me",
    platform: "Meta",
    budget: 200,
    clicks: 500,
    conversions: 20
  });

  const response = await agent.delete(`/api/campaigns/${created.body.id}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
});

test("Ad generieren ohne API-Key liefert Fallback-Texte", async () => {
  const agent = await loggedInAgent("ad@example.com");
  await agent.post("/api/ad-agent").send({
    brand_name: "ScaleBrand",
    industry: "SaaS",
    target_audience: "CMOs",
    tone_of_voice: "Professionell",
    language: "Deutsch"
  });
  const campaigns = await agent.get("/api/campaigns");

  const response = await agent.post("/api/generate-ad").send({ campaign_id: campaigns.body[0].id });

  assert.equal(response.status, 200);
  assert.equal(response.body.texts.length, 3);
  assert.match(response.body.image_url, /^https:\/\/image\.pollinations\.ai\/prompt\//);
});

test("Analytics-Endpunkt berechnet CPC, CPL und ROAS korrekt", async () => {
  const agent = await loggedInAgent("analytics@example.com");
  const created = await agent.post("/api/campaigns").send({
    name: "Math Check",
    platform: "LinkedIn",
    budget: 1000,
    clicks: 500,
    conversions: 25
  });

  const response = await agent.get("/api/analytics");
  const campaign = response.body.campaigns.find((item) => item.id === created.body.id);

  assert.equal(response.status, 200);
  assert.equal(campaign.cpc, 2);
  assert.equal(campaign.cpl, 40);
  assert.equal(campaign.roas, 1.25);
  assert.equal(campaign.conversion_rate, 5);
  assert.equal(campaign.recommendation.label, "Budget reduzieren");
});
