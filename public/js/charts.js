const PLATFORM_COLORS = {
  Meta: '#1877F2',
  Google: '#34A853',
  TikTok: '#FE2C55',
  LinkedIn: '#0A66C2'
};

function renderCharts(data) {
  renderDonutChart(data.campaigns);
  renderBarChart(data.campaigns);
}

function renderDonutChart(campaigns) {
  const canvas = document.getElementById('chart-donut');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);

  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;
  ctx.clearRect(0, 0, w, h);

  const platformBudgets = {};
  campaigns.forEach(c => {
    platformBudgets[c.platform] = (platformBudgets[c.platform] || 0) + c.budget;
  });

  const entries = Object.entries(platformBudgets);
  if (entries.length === 0) return;

  const total = entries.reduce((s, [, v]) => s + v, 0);
  const cx = w * 0.4;
  const cy = h / 2;
  const outerR = Math.min(cx, cy) - 20;
  const innerR = outerR * 0.6;

  let startAngle = -Math.PI / 2;

  entries.forEach(([platform, budget]) => {
    const slice = (budget / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, startAngle, startAngle + slice);
    ctx.arc(cx, cy, innerR, startAngle + slice, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = PLATFORM_COLORS[platform] || '#666';
    ctx.fill();
    startAngle += slice;
  });

  ctx.fillStyle = '#FAFAFA';
  ctx.font = '700 22px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(total.toLocaleString('de-DE') + ' €', cx, cy - 8);
  ctx.font = '12px system-ui';
  ctx.fillStyle = '#A1A1AA';
  ctx.fillText('Gesamtbudget', cx, cy + 14);

  const legendX = w * 0.72;
  let legendY = h * 0.25;

  entries.forEach(([platform, budget]) => {
    const pct = ((budget / total) * 100).toFixed(1);
    ctx.fillStyle = PLATFORM_COLORS[platform] || '#666';
    ctx.beginPath();
    ctx.roundRect(legendX - 4, legendY - 6, 12, 12, 3);
    ctx.fill();

    ctx.fillStyle = '#FAFAFA';
    ctx.font = '600 13px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(platform, legendX + 16, legendY);

    ctx.fillStyle = '#A1A1AA';
    ctx.font = '12px system-ui';
    ctx.fillText(`${budget.toLocaleString('de-DE')} € (${pct}%)`, legendX + 16, legendY + 16);

    legendY += 42;
  });
}

function renderBarChart(campaigns) {
  const canvas = document.getElementById('chart-bar');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);

  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;
  ctx.clearRect(0, 0, w, h);

  const sorted = [...campaigns].sort((a, b) => b.conversion_rate - a.conversion_rate);
  if (sorted.length === 0) return;

  const maxRate = Math.max(...sorted.map(c => c.conversion_rate), 1);
  const padding = { top: 10, right: 50, bottom: 10, left: 120 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;
  const barH = Math.min(36, (chartH / sorted.length) - 8);
  const gap = (chartH - barH * sorted.length) / (sorted.length + 1);

  sorted.forEach((c, i) => {
    const y = padding.top + gap + i * (barH + gap);
    const barW = (c.conversion_rate / maxRate) * chartW;

    ctx.fillStyle = '#A1A1AA';
    ctx.font = '13px system-ui';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(c.name.length > 14 ? c.name.substring(0, 14) + '…' : c.name, padding.left - 12, y + barH / 2);

    const gradient = ctx.createLinearGradient(padding.left, 0, padding.left + barW, 0);
    gradient.addColorStop(0, PLATFORM_COLORS[c.platform] || '#3B82F6');
    gradient.addColorStop(1, PLATFORM_COLORS[c.platform] + 'AA' || '#3B82F6AA');

    ctx.beginPath();
    ctx.roundRect(padding.left, y, Math.max(barW, 4), barH, 4);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.fillStyle = '#FAFAFA';
    ctx.font = '600 12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(c.conversion_rate.toFixed(2) + '%', padding.left + barW + 8, y + barH / 2);
  });
}
