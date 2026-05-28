const express = require("express");
const OpenAI = require("openai");
const { db } = require("../database");

const router = express.Router();
const tones = new Set(["Professionell", "Locker", "Provokant", "Luxuriös"]);

function getAgent(userId) {
  return db.prepare("SELECT * FROM ad_agents WHERE user_id = ?").get(userId);
}

function fallbackTexts(agent, campaign) {
  const brand = agent?.brand_name || "Deine Marke";
  const audience = agent?.target_audience || "deine Zielgruppe";
  const tone = agent?.tone_of_voice || "Professionell";
  const platform = campaign?.platform || "Meta";
  const variants = [
    ["Mehr ROI. Weniger Streuverlust.", `${brand} erreicht ${audience} mit klaren Botschaften und messbaren Ergebnissen auf ${platform}.`, "Jetzt testen"],
    ["Bereit für bessere Leads?", `${tone}e Kampagnen für ${audience}: präzise, schnell startklar und auf Wachstum optimiert.`, "Mehr erfahren"],
    ["Dein naechster Kampagnengewinn", `Nutze die Performance-Daten von ${campaign?.name || "deiner Kampagne"} fuer Anzeigen, die konvertieren.`, "Angebot sichern"]
  ];

  return variants.map(([headline, primaryText, cta]) => ({
    headline: headline.slice(0, 40),
    primary_text: primaryText.slice(0, 125),
    cta
  }));
}

function imageUrl(agent, campaign) {
  const prompt = [
    agent?.brand_name || "modern brand",
    agent?.industry || "digital marketing",
    campaign?.platform || "social media",
    "premium advertising creative",
    "clean studio lighting",
    "high conversion campaign visual"
  ].join(", ");
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1080&height=1080`;
}

function parseOpenAIJson(content) {
  try {
    const cleaned = content.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : null;
  } catch (err) {
    return null;
  }
}

router.get("/ad-agent", (req, res) => {
  const agent = getAgent(req.session.userId);
  res.json(agent || null);
});

router.post("/ad-agent", (req, res) => {
  const agent = {
    brand_name: String(req.body.brand_name || "").trim(),
    industry: String(req.body.industry || "").trim(),
    target_audience: String(req.body.target_audience || "").trim(),
    tone_of_voice: String(req.body.tone_of_voice || "").trim(),
    language: String(req.body.language || "Deutsch").trim()
  };

  if (!agent.brand_name || !agent.industry || !agent.target_audience || !tones.has(agent.tone_of_voice) || !agent.language) {
    return res.status(400).json({ error: "Alle Agent-Felder sind erforderlich" });
  }

  db.prepare(
    `INSERT INTO ad_agents (user_id, brand_name, industry, target_audience, tone_of_voice, language)
     VALUES (@user_id, @brand_name, @industry, @target_audience, @tone_of_voice, @language)
     ON CONFLICT(user_id) DO UPDATE SET
       brand_name = excluded.brand_name,
       industry = excluded.industry,
       target_audience = excluded.target_audience,
       tone_of_voice = excluded.tone_of_voice,
       language = excluded.language`
  ).run({ ...agent, user_id: req.session.userId });

  res.json(getAgent(req.session.userId));
});

router.post("/generate-ad", async (req, res, next) => {
  try {
    const agent = getAgent(req.session.userId);
    const campaign = db
      .prepare("SELECT * FROM campaigns WHERE id = ? AND user_id = ?")
      .get(req.body.campaign_id, req.session.userId);

    if (!campaign) return res.status(404).json({ error: "Kampagne nicht gefunden" });

    let texts = fallbackTexts(agent, campaign);
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey && apiKey !== "sk-dein-key") {
      const client = new OpenAI({ apiKey });
      const systemPrompt = `Du bist ein Ad-Copywriter. Erstelle 3 Varianten für eine ${campaign.platform}-Werbeanzeige. Marke: ${agent?.brand_name || "Marke"}. Branche: ${agent?.industry || "Branche"}. Zielgruppe: ${agent?.target_audience || "Zielgruppe"}. Tone of Voice: ${agent?.tone_of_voice || "Professionell"}. Sprache: ${agent?.language || "Deutsch"}. Jede Variante hat: Headline (max 40 Zeichen), Primary Text (max 125 Zeichen), CTA-Button-Text. Antworte als JSON-Array.`;
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Kampagnendaten: ${JSON.stringify(campaign)}` }
        ],
        temperature: 0.8
      });
      texts = parseOpenAIJson(completion.choices[0]?.message?.content || "") || texts;
    }

    res.json({ texts, image_url: imageUrl(agent, campaign) });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
module.exports.fallbackTexts = fallbackTexts;
