const state = { campaigns: [], analytics: null };

const currency = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const number = new Intl.NumberFormat("de-DE");

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  if (response.status === 401) window.location.href = "/login.html";
  return response;
}

function animateValue(element, value, formatter) {
  const start = performance.now();
  const duration = 1500;
  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = formatter(value * eased);
    if (progress < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function renderMetrics() {
  const totals = state.analytics.totals;
  animateValue(document.querySelector("[data-count='budget']"), totals.budget, (value) => currency.format(value));
  animateValue(document.querySelector("[data-count='roas']"), totals.roas, (value) => `${value.toFixed(2)}x`);
  animateValue(document.querySelector("[data-count='cpc']"), totals.cpc, (value) => currency.format(value));
  animateValue(document.querySelector("[data-count='conversion_rate']"), totals.conversion_rate, (value) => `${value.toFixed(2)}%`);
}

function renderCampaigns() {
  document.querySelector("#campaignTable").innerHTML = state.campaigns.map((campaign) => `
    <tr>
      <td>${escapeHtml(campaign.name)}</td>
      <td><span class="platform-pill ${campaign.platform}">${campaign.platform}</span></td>
      <td>${currency.format(campaign.budget)}</td>
      <td>${number.format(campaign.clicks)}</td>
      <td>${number.format(campaign.conversions)}</td>
      <td>
        <button class="btn btn-secondary" data-edit="${campaign.id}">Bearbeiten</button>
        <button class="btn btn-secondary" data-delete="${campaign.id}">Löschen</button>
      </td>
    </tr>
  `).join("");

  const select = document.querySelector("#adCampaignSelect");
  select.innerHTML = state.campaigns.map((campaign) => `<option value="${campaign.id}">${campaign.name} (${campaign.platform})</option>`).join("");
}

function renderOptimization() {
  document.querySelector("#optimizationList").innerHTML = state.analytics.campaigns.map((campaign) => `
    <article class="optimization-card">
      <div>
        <h2>${escapeHtml(campaign.name)}</h2>
        <p>${campaign.platform} · ROAS ${campaign.roas.toFixed(2)}x · CPL ${currency.format(campaign.cpl)}</p>
      </div>
      <span class="status-pill ${campaign.recommendation.level}">${campaign.recommendation.label}</span>
      <strong>${campaign.conversion_rate.toFixed(2)}%</strong>
    </article>
  `).join("");
}

function renderCharts() {
  window.ChartTools.drawDonutChart(document.querySelector("#budgetChart"), state.analytics.campaigns);
  window.ChartTools.drawConversionBars(document.querySelector("#conversionChart"), state.analytics.campaigns);
}

async function loadData() {
  const [campaignResponse, analyticsResponse] = await Promise.all([
    api("/api/campaigns"),
    api("/api/analytics")
  ]);
  state.campaigns = await campaignResponse.json();
  state.analytics = await analyticsResponse.json();
  renderMetrics();
  renderCampaigns();
  renderOptimization();
  renderCharts();
}

function switchView(view) {
  document.querySelectorAll(".nav-link").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  document.querySelectorAll(".view").forEach((section) => section.classList.toggle("active", section.id === `view-${view}`));
}

async function saveCampaign(event) {
  event.preventDefault();
  const id = document.querySelector("#campaignId").value;
  const payload = {
    name: document.querySelector("#campaignName").value,
    platform: document.querySelector("#campaignPlatform").value,
    budget: document.querySelector("#campaignBudget").value,
    clicks: document.querySelector("#campaignClicks").value,
    conversions: document.querySelector("#campaignConversions").value
  };
  await api(id ? `/api/campaigns/${id}` : "/api/campaigns", {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(payload)
  });
  event.target.reset();
  document.querySelector("#campaignId").value = "";
  await loadData();
}

function editCampaign(id) {
  const campaign = state.campaigns.find((item) => item.id === Number(id));
  if (!campaign) return;
  document.querySelector("#campaignId").value = campaign.id;
  document.querySelector("#campaignName").value = campaign.name;
  document.querySelector("#campaignPlatform").value = campaign.platform;
  document.querySelector("#campaignBudget").value = campaign.budget;
  document.querySelector("#campaignClicks").value = campaign.clicks;
  document.querySelector("#campaignConversions").value = campaign.conversions;
  switchView("campaigns");
}

async function deleteCampaign(id) {
  await api(`/api/campaigns/${id}`, { method: "DELETE" });
  await loadData();
}

document.querySelectorAll(".nav-link").forEach((link) => link.addEventListener("click", () => switchView(link.dataset.view)));
document.querySelector("#refreshBtn").addEventListener("click", loadData);
document.querySelector("#campaignForm").addEventListener("submit", saveCampaign);
document.querySelector("#agentForm").addEventListener("submit", window.AdGenerator.saveAgent);
document.querySelector("#generateAdBtn").addEventListener("click", window.AdGenerator.generateAd);
document.querySelector("#logoutBtn").addEventListener("click", async () => {
  await api("/api/logout", { method: "POST" });
  window.location.href = "/login.html";
});

document.querySelector("#campaignTable").addEventListener("click", (event) => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;
  if (editId) editCampaign(editId);
  if (deleteId) deleteCampaign(deleteId);
});

window.AdGenerator.loadAgent();
loadData();
