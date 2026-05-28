const express = require('express');
const { db } = require('../database');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

router.post('/ad-agent', (req, res) => {
  const { brand_name, industry, target_audience, tone_of_voice, language } = req.body;
  if (!brand_name || !industry || !target_audience || !tone_of_voice) {
    return res.status(400).json({ error: 'Alle Felder erforderlich' });
  }

  const validTones = ['Professionell', 'Locker', 'Provokant', 'Luxuriös'];
  if (!validTones.includes(tone_of_voice)) {
    return res.status(400).json({ error: 'Ungültiger Tone of Voice' });
  }

  const existing = db.prepare('SELECT id FROM ad_agents WHERE user_id = ?').get(req.session.userId);
  if (existing) {
    db.prepare(`
      UPDATE ad_agents SET brand_name = ?, industry = ?, target_audience = ?, tone_of_voice = ?, language = ?
      WHERE user_id = ?
    `).run(brand_name, industry, target_audience, tone_of_voice, language || 'Deutsch', req.session.userId);
  } else {
    db.prepare(`
      INSERT INTO ad_agents (user_id, brand_name, industry, target_audience, tone_of_voice, language)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.session.userId, brand_name, industry, target_audience, tone_of_voice, language || 'Deutsch');
  }

  const agent = db.prepare('SELECT * FROM ad_agents WHERE user_id = ?').get(req.session.userId);
  res.json(agent);
});

router.get('/ad-agent', (req, res) => {
  const agent = db.prepare('SELECT * FROM ad_agents WHERE user_id = ?').get(req.session.userId);
  res.json(agent || null);
});

function generateFallbackAds(agent, campaign) {
  const templates = [
    {
      headline: `${agent.brand_name} — Jetzt entdecken`,
      primary_text: `${agent.target_audience}: ${campaign.name} läuft auf ${campaign.platform}. Jetzt zugreifen und profitieren!`,
      cta: 'Mehr erfahren'
    },
    {
      headline: `Neu: ${campaign.name}`,
      primary_text: `${agent.industry}-Innovation von ${agent.brand_name}. Für ${agent.target_audience} gemacht.`,
      cta: 'Jetzt starten'
    },
    {
      headline: `${agent.brand_name} für dich`,
      primary_text: `Entdecke ${campaign.name} — die smarte Lösung aus der ${agent.industry}-Branche.`,
      cta: 'Jetzt testen'
    }
  ];

  return templates.map(t => ({
    headline: t.headline.substring(0, 40),
    primary_text: t.primary_text.substring(0, 125),
    cta: t.cta
  }));
}

router.post('/generate-ad', async (req, res) => {
  const { campaign_id } = req.body;
  if (!campaign_id) {
    return res.status(400).json({ error: 'Kampagnen-ID erforderlich' });
  }

  const agent = db.prepare('SELECT * FROM ad_agents WHERE user_id = ?').get(req.session.userId);
  if (!agent) {
    return res.status(400).json({ error: 'Bitte zuerst Agent-Konfiguration speichern' });
  }

  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND user_id = ?').get(campaign_id, req.session.userId);
  if (!campaign) {
    return res.status(404).json({ error: 'Kampagne nicht gefunden' });
  }

  const imagePrompt = encodeURIComponent(
    `Professional ${campaign.platform} ad creative for ${agent.brand_name}, ${agent.industry}, modern clean design, marketing visual`
  );
  const imageUrl = `https://image.pollinations.ai/prompt/${imagePrompt}?width=1080&height=1080`;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'sk-dein-key' || apiKey.length < 10) {
    const texts = generateFallbackAds(agent, campaign);
    return res.json({ texts, image_url: imageUrl, source: 'fallback' });
  }

  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey });

    const systemPrompt = `Du bist ein Ad-Copywriter. Erstelle 3 Varianten für eine ${campaign.platform}-Werbeanzeige. Marke: ${agent.brand_name}. Branche: ${agent.industry}. Zielgruppe: ${agent.target_audience}. Tone of Voice: ${agent.tone_of_voice}. Sprache: ${agent.language}. Jede Variante hat: Headline (max 40 Zeichen), Primary Text (max 125 Zeichen), CTA-Button-Text. Antworte als JSON-Array.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Erstelle Ads für die Kampagne "${campaign.name}" mit einem Budget von ${campaign.budget}€.` }
      ],
      temperature: 0.8
    });

    let texts;
    const content = completion.choices[0].message.content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      texts = JSON.parse(jsonMatch[0]);
    } else {
      texts = generateFallbackAds(agent, campaign);
    }

    res.json({ texts, image_url: imageUrl, source: 'openai' });
  } catch (err) {
    const texts = generateFallbackAds(agent, campaign);
    res.json({ texts, image_url: imageUrl, source: 'fallback', note: 'OpenAI-Fehler, Fallback verwendet' });
  }
});

module.exports = router;
