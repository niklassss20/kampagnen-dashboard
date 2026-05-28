const { describe, it, beforeAll, afterAll, expect } = require('bun:test');
const http = require('node:http');
const app = require('../server');

let server;
let port;
let cookie = '';

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        if (res.headers['set-cookie']) {
          cookie = res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
        }
        resolve({ status: res.statusCode, body: parsed, headers: res.headers });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('API Tests', () => {
  beforeAll((done) => {
    server = app.listen(0, () => {
      port = server.address().port;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  let testCampaignId;
  const testEmail = `test_${Date.now()}@example.com`;

  it('should register a new user', async () => {
    const res = await request('POST', '/api/register', {
      email: testEmail,
      password: 'testpass123'
    });
    expect(res.status).toBe(201);
    expect(res.body.email).toBeTruthy();
  });

  it('should create a campaign (POST /api/campaigns)', async () => {
    const res = await request('POST', '/api/campaigns', {
      name: 'Test Kampagne',
      platform: 'Meta',
      budget: 1000,
      clicks: 5000,
      conversions: 100
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.name).toBe('Test Kampagne');
    testCampaignId = res.body.id;
  });

  it('should fetch campaigns (GET /api/campaigns)', async () => {
    const res = await request('GET', '/api/campaigns');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('should return analytics with correct calculations', async () => {
    const res = await request('GET', '/api/analytics');
    expect(res.status).toBe(200);
    expect(res.body.campaigns).toBeTruthy();
    expect(res.body.totals).toBeTruthy();

    const testCampaign = res.body.campaigns.find(c => c.name === 'Test Kampagne');
    if (testCampaign) {
      expect(testCampaign.cpc).toBe(0.2);
      expect(testCampaign.cpl).toBe(10);
      expect(testCampaign.roas).toBe(5);
      expect(testCampaign.conversion_rate).toBe(2);
    }
  });

  it('should generate ad with fallback (no API key)', async () => {
    await request('POST', '/api/ad-agent', {
      brand_name: 'TestBrand',
      industry: 'Tech',
      target_audience: 'Developers',
      tone_of_voice: 'Professionell',
      language: 'Deutsch'
    });

    const res = await request('POST', '/api/generate-ad', {
      campaign_id: testCampaignId
    });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.texts)).toBe(true);
    expect(res.body.texts.length).toBe(3);
    expect(res.body.image_url).toBeTruthy();
    expect(res.body.source).toBe('fallback');
  });

  it('should delete a campaign (DELETE /api/campaigns/:id)', async () => {
    const res = await request('DELETE', `/api/campaigns/${testCampaignId}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBeTruthy();
  });

  it('should reject unauthenticated requests', async () => {
    const savedCookie = cookie;
    cookie = '';
    const res = await request('GET', '/api/campaigns');
    expect(res.status).toBe(401);
    cookie = savedCookie;
  });
});
