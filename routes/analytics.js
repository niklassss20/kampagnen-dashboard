const express = require('express');
const { db } = require('../database');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

function calcMetrics(campaign) {
  const cpc = campaign.clicks > 0 ? campaign.budget / campaign.clicks : 0;
  const cpl = campaign.conversions > 0 ? campaign.budget / campaign.conversions : 0;
  const conversionValue = campaign.conversions * 50;
  const roas = campaign.budget > 0 ? conversionValue / campaign.budget : 0;
  const conversionRate = campaign.clicks > 0 ? (campaign.conversions / campaign.clicks) * 100 : 0;

  let optimization;
  if (roas < 2) {
    optimization = { status: 'danger', text: 'Budget reduzieren' };
  } else if (roas <= 5) {
    optimization = { status: 'warning', text: 'A/B-Tests starten' };
  } else {
    optimization = { status: 'success', text: 'Budget erhöhen' };
  }

  return {
    ...campaign,
    cpc: Math.round(cpc * 100) / 100,
    cpl: Math.round(cpl * 100) / 100,
    roas: Math.round(roas * 100) / 100,
    conversion_rate: Math.round(conversionRate * 100) / 100,
    optimization
  };
}

router.get('/', (req, res) => {
  const campaigns = db.prepare('SELECT * FROM campaigns WHERE user_id = ? ORDER BY created_at DESC').all(req.session.userId);
  const analytics = campaigns.map(calcMetrics);

  const totals = {
    total_budget: campaigns.reduce((s, c) => s + c.budget, 0),
    total_clicks: campaigns.reduce((s, c) => s + c.clicks, 0),
    total_conversions: campaigns.reduce((s, c) => s + c.conversions, 0),
    campaign_count: campaigns.length
  };

  totals.avg_cpc = totals.total_clicks > 0 ? Math.round((totals.total_budget / totals.total_clicks) * 100) / 100 : 0;
  totals.avg_cpl = totals.total_conversions > 0 ? Math.round((totals.total_budget / totals.total_conversions) * 100) / 100 : 0;
  totals.total_roas = totals.total_budget > 0 ? Math.round(((totals.total_conversions * 50) / totals.total_budget) * 100) / 100 : 0;
  totals.avg_conversion_rate = totals.total_clicks > 0 ? Math.round(((totals.total_conversions / totals.total_clicks) * 100) * 100) / 100 : 0;

  res.json({ campaigns: analytics, totals });
});

module.exports = router;
