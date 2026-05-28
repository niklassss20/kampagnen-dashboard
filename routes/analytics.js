const express = require("express");
const { db } = require("../database");

const router = express.Router();
const CONVERSION_VALUE = 50;

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(digits));
}

function recommendation(roas) {
  if (roas < 2) return { label: "Budget reduzieren", level: "danger" };
  if (roas <= 5) return { label: "A/B-Tests starten", level: "warning" };
  return { label: "Budget erhoehen", level: "success" };
}

function calculateMetrics(campaign) {
  const cpc = campaign.clicks > 0 ? campaign.budget / campaign.clicks : 0;
  const cpl = campaign.conversions > 0 ? campaign.budget / campaign.conversions : 0;
  const roas = campaign.budget > 0 ? (campaign.conversions * CONVERSION_VALUE) / campaign.budget : 0;
  const conversionRate = campaign.clicks > 0 ? (campaign.conversions / campaign.clicks) * 100 : 0;

  return {
    ...campaign,
    cpc: round(cpc),
    cpl: round(cpl),
    roas: round(roas),
    conversion_rate: round(conversionRate),
    recommendation: recommendation(roas)
  };
}

router.get("/", (req, res) => {
  const campaigns = db.prepare("SELECT * FROM campaigns WHERE user_id = ?").all(req.session.userId);
  const metrics = campaigns.map(calculateMetrics);

  const totals = campaigns.reduce(
    (sum, campaign) => {
      sum.budget += campaign.budget;
      sum.clicks += campaign.clicks;
      sum.conversions += campaign.conversions;
      return sum;
    },
    { budget: 0, clicks: 0, conversions: 0 }
  );

  const totalRoas = totals.budget > 0 ? (totals.conversions * CONVERSION_VALUE) / totals.budget : 0;
  const totalConversionRate = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0;

  res.json({
    campaigns: metrics,
    totals: {
      budget: round(totals.budget),
      clicks: totals.clicks,
      conversions: totals.conversions,
      cpc: round(totals.clicks > 0 ? totals.budget / totals.clicks : 0),
      cpl: round(totals.conversions > 0 ? totals.budget / totals.conversions : 0),
      roas: round(totalRoas),
      conversion_rate: round(totalConversionRate),
      revenue: round(totals.conversions * CONVERSION_VALUE)
    }
  });
});

module.exports = router;
module.exports.calculateMetrics = calculateMetrics;
