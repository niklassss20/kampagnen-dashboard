async function loadAgent() {
  const response = await fetch("/api/ad-agent");
  if (!response.ok) return;
  const agent = await response.json();
  if (!agent) return;
  document.querySelector("#brandName").value = agent.brand_name;
  document.querySelector("#industry").value = agent.industry;
  document.querySelector("#targetAudience").value = agent.target_audience;
  document.querySelector("#toneOfVoice").value = agent.tone_of_voice;
  document.querySelector("#language").value = agent.language;
  document.querySelector("#mockBrand").textContent = agent.brand_name;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

async function saveAgent(event) {
  event.preventDefault();
  const payload = {
    brand_name: document.querySelector("#brandName").value,
    industry: document.querySelector("#industry").value,
    target_audience: document.querySelector("#targetAudience").value,
    tone_of_voice: document.querySelector("#toneOfVoice").value,
    language: document.querySelector("#language").value
  };
  const response = await fetch("/api/ad-agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const agent = await response.json();
  if (response.ok) document.querySelector("#mockBrand").textContent = agent.brand_name;
}

function renderAdResult(result) {
  const variants = document.querySelector("#adVariants");
  variants.innerHTML = result.texts.map((ad, index) => `
    <article class="ad-card">
      <span class="status-pill success">Variante ${index + 1}</span>
      <h3>${escapeHtml(ad.headline || ad.Headline)}</h3>
      <p>${escapeHtml(ad.primary_text || ad.primaryText || ad["Primary Text"])}</p>
      <button class="btn btn-secondary">${escapeHtml(ad.cta || ad["CTA-Button-Text"] || "Mehr erfahren")}</button>
    </article>
  `).join("");

  const first = result.texts[0] || {};
  document.querySelector("#mockText").textContent = first.primary_text || first.primaryText || first["Primary Text"] || "";
  document.querySelector("#mockCta").textContent = first.cta || first["CTA-Button-Text"] || "Mehr erfahren";
  document.querySelector("#adImage").src = result.image_url;
}

async function generateAd() {
  const campaignId = document.querySelector("#adCampaignSelect").value;
  const response = await fetch("/api/generate-ad", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ campaign_id: campaignId })
  });
  const result = await response.json();
  if (response.ok) renderAdResult(result);
}

window.AdGenerator = { loadAgent, saveAgent, generateAd };
