const platformColors = {
  Meta: "#1877F2",
  Google: "#34A853",
  TikTok: "#FE2C55",
  LinkedIn: "#0A66C2"
};

function drawDonutChart(canvas, campaigns) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const totals = campaigns.reduce((acc, campaign) => {
    acc[campaign.platform] = (acc[campaign.platform] || 0) + campaign.budget;
    return acc;
  }, {});
  const sum = Object.values(totals).reduce((acc, value) => acc + value, 0);

  let start = -Math.PI / 2;
  Object.entries(totals).forEach(([platform, value]) => {
    const slice = (value / sum) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(135, 145, 90, start, start + slice);
    ctx.arc(135, 145, 52, start + slice, start, true);
    ctx.closePath();
    ctx.fillStyle = platformColors[platform];
    ctx.fill();
    start += slice;
  });

  ctx.fillStyle = "#FAFAFA";
  ctx.font = "700 24px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(sum ? `${Math.round(sum).toLocaleString("de-DE")} €` : "0 €", 135, 150);

  let legendY = 70;
  Object.entries(totals).forEach(([platform, value]) => {
    ctx.fillStyle = platformColors[platform];
    ctx.fillRect(285, legendY - 10, 12, 12);
    ctx.fillStyle = "#A1A1AA";
    ctx.font = "14px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(`${platform} ${Math.round(value).toLocaleString("de-DE")} €`, 306, legendY);
    legendY += 30;
  });
}

function drawConversionBars(canvas, campaigns) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const sorted = [...campaigns].sort((a, b) => b.conversion_rate - a.conversion_rate);
  const max = Math.max(1, ...sorted.map((campaign) => campaign.conversion_rate));

  sorted.forEach((campaign, index) => {
    const y = 42 + index * 58;
    const barWidth = ((campaign.conversion_rate / max) * (width - 180));
    ctx.fillStyle = "#A1A1AA";
    ctx.font = "13px system-ui";
    ctx.fillText(campaign.name, 20, y);
    ctx.fillStyle = platformColors[campaign.platform];
    ctx.fillRect(20, y + 10, barWidth, 18);
    ctx.fillStyle = "#FAFAFA";
    ctx.fillText(`${campaign.conversion_rate.toFixed(2)}%`, 32 + barWidth, y + 25);
  });
}

window.ChartTools = { drawDonutChart, drawConversionBars };
