let analyticsData = null;
let campaignsData = [];

(async () => {
  try {
    const res = await fetch('/api/me');
    if (!res.ok) {
      window.location.href = '/';
      return;
    }
    const user = await res.json();
    document.getElementById('user-email').textContent = user.email;
    document.getElementById('user-avatar').textContent = user.email.charAt(0).toUpperCase();
  } catch (e) {
    window.location.href = '/';
    return;
  }

  await loadDashboard();
})();

function switchView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item[data-view]').forEach(n => n.classList.remove('active'));

  document.getElementById('view-' + view).classList.add('active');
  const navBtn = document.querySelector(`.nav-item[data-view="${view}"]`);
  if (navBtn) navBtn.classList.add('active');

  if (view === 'dashboard') loadDashboard();
  if (view === 'campaigns') loadCampaigns();
  if (view === 'adgen') loadAdGenerator();
  if (view === 'optimization') loadOptimization();
}

async function loadDashboard() {
  try {
    const res = await fetch('/api/analytics');
    if (!res.ok) return;
    analyticsData = await res.json();
    renderMetrics(analyticsData.totals);
    renderDashboardTable(analyticsData.campaigns);
    renderCharts(analyticsData);
  } catch (e) {
    console.error('Dashboard laden fehlgeschlagen:', e);
  }
}

function renderMetrics(totals) {
  const grid = document.getElementById('metrics-grid');
  const roasClass = totals.total_roas > 5 ? 'success' : totals.total_roas >= 2 ? 'warning' : 'danger';

  grid.innerHTML = `
    <div class="metric-card">
      <div class="metric-value" data-count="${totals.total_budget}">0</div>
      <div class="metric-label">Gesamtbudget (€)</div>
    </div>
    <div class="metric-card">
      <div class="metric-value" data-count="${totals.total_clicks}">0</div>
      <div class="metric-label">Gesamtklicks</div>
    </div>
    <div class="metric-card">
      <div class="metric-value" data-count="${totals.total_conversions}">0</div>
      <div class="metric-label">Conversions</div>
    </div>
    <div class="metric-card ${roasClass}">
      <div class="metric-value" data-count="${totals.total_roas}" data-decimals="2">0</div>
      <div class="metric-label">Gesamt-ROAS</div>
    </div>
    <div class="metric-card">
      <div class="metric-value" data-count="${totals.avg_cpc}" data-decimals="2" data-prefix="€">0</div>
      <div class="metric-label">Ø CPC</div>
    </div>
    <div class="metric-card">
      <div class="metric-value" data-count="${totals.avg_conversion_rate}" data-decimals="2" data-suffix="%">0</div>
      <div class="metric-label">Ø Conversion-Rate</div>
    </div>
  `;

  animateCounters();
}

function animateCounters() {
  const counters = document.querySelectorAll('[data-count]');
  counters.forEach(el => {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals) || 0;
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const duration = 1500;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;

      if (decimals > 0) {
        el.textContent = prefix + current.toFixed(decimals) + suffix;
      } else {
        el.textContent = prefix + Math.round(current).toLocaleString('de-DE') + suffix;
      }

      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  });
}

function renderDashboardTable(campaigns) {
  const tbody = document.getElementById('dashboard-table-body');
  tbody.innerHTML = campaigns.map(c => `
    <tr>
      <td><strong>${escapeHtml(c.name)}</strong></td>
      <td><span class="platform-badge ${c.platform.toLowerCase()}">${c.platform}</span></td>
      <td>${c.budget.toLocaleString('de-DE')} €</td>
      <td>${c.cpc.toFixed(2)} €</td>
      <td><strong>${c.roas.toFixed(2)}x</strong></td>
      <td><span class="status-badge ${c.optimization.status}">${c.optimization.text}</span></td>
    </tr>
  `).join('');
}

async function loadCampaigns() {
  try {
    const res = await fetch('/api/campaigns');
    if (!res.ok) return;
    campaignsData = await res.json();
    renderCampaignsTable(campaignsData);
  } catch (e) {
    console.error('Kampagnen laden fehlgeschlagen:', e);
  }
}

function renderCampaignsTable(campaigns) {
  const tbody = document.getElementById('campaigns-table-body');
  tbody.innerHTML = campaigns.map(c => `
    <tr>
      <td><strong>${escapeHtml(c.name)}</strong></td>
      <td><span class="platform-badge ${c.platform.toLowerCase()}">${c.platform}</span></td>
      <td>${c.budget.toLocaleString('de-DE')} €</td>
      <td>${c.clicks.toLocaleString('de-DE')}</td>
      <td>${c.conversions.toLocaleString('de-DE')}</td>
      <td>${new Date(c.created_at).toLocaleDateString('de-DE')}</td>
      <td>
        <div class="actions-cell">
          <button class="icon-btn" onclick="editCampaign(${c.id})" title="Bearbeiten">✏️</button>
          <button class="icon-btn delete" onclick="deleteCampaign(${c.id})" title="Löschen">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openCampaignModal(campaign) {
  const modal = document.getElementById('campaign-modal');
  const title = document.getElementById('modal-title');
  const submitBtn = document.getElementById('modal-submit-btn');

  if (campaign) {
    title.textContent = 'Kampagne bearbeiten';
    submitBtn.textContent = 'Speichern';
    document.getElementById('campaign-id').value = campaign.id;
    document.getElementById('campaign-name').value = campaign.name;
    document.getElementById('campaign-platform').value = campaign.platform;
    document.getElementById('campaign-budget').value = campaign.budget;
    document.getElementById('campaign-clicks').value = campaign.clicks;
    document.getElementById('campaign-conversions').value = campaign.conversions;
  } else {
    title.textContent = 'Neue Kampagne';
    submitBtn.textContent = 'Erstellen';
    document.getElementById('campaign-form').reset();
    document.getElementById('campaign-id').value = '';
  }

  modal.classList.add('active');
}

function closeCampaignModal() {
  document.getElementById('campaign-modal').classList.remove('active');
}

document.getElementById('campaign-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('campaign-id').value;
  const data = {
    name: document.getElementById('campaign-name').value,
    platform: document.getElementById('campaign-platform').value,
    budget: parseFloat(document.getElementById('campaign-budget').value),
    clicks: parseInt(document.getElementById('campaign-clicks').value) || 0,
    conversions: parseInt(document.getElementById('campaign-conversions').value) || 0
  };

  try {
    const url = id ? `/api/campaigns/${id}` : '/api/campaigns';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const err = await res.json();
      showToast(err.error || 'Fehler', 'error');
      return;
    }

    closeCampaignModal();
    showToast(id ? 'Kampagne aktualisiert' : 'Kampagne erstellt', 'success');
    await loadCampaigns();
  } catch (e) {
    showToast('Fehler beim Speichern', 'error');
  }
});

function editCampaign(id) {
  const campaign = campaignsData.find(c => c.id === id);
  if (campaign) openCampaignModal(campaign);
}

async function deleteCampaign(id) {
  if (!confirm('Kampagne wirklich löschen?')) return;

  try {
    const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      showToast('Fehler beim Löschen', 'error');
      return;
    }
    showToast('Kampagne gelöscht', 'success');
    await loadCampaigns();
  } catch (e) {
    showToast('Fehler beim Löschen', 'error');
  }
}

async function loadOptimization() {
  try {
    const res = await fetch('/api/analytics');
    if (!res.ok) return;
    const data = await res.json();
    renderOptimization(data.campaigns);
  } catch (e) {
    console.error('Optimierung laden fehlgeschlagen:', e);
  }
}

function renderOptimization(campaigns) {
  const container = document.getElementById('optimization-cards');
  if (campaigns.length === 0) {
    container.innerHTML = '<p style="color:var(--text-secondary);">Keine Kampagnen vorhanden.</p>';
    return;
  }

  const icons = { success: '🚀', warning: '🔬', danger: '⚠️' };
  container.innerHTML = campaigns.map(c => `
    <div class="optimization-card">
      <div class="opt-indicator ${c.optimization.status}">${icons[c.optimization.status]}</div>
      <div class="opt-content">
        <h4>${escapeHtml(c.name)}</h4>
        <p><span class="platform-badge ${c.platform.toLowerCase()}" style="font-size:11px;">${c.platform}</span> — ${c.optimization.text}</p>
      </div>
      <div class="opt-metrics">
        <div class="opt-metric">
          <div class="value">${c.roas.toFixed(2)}x</div>
          <div class="label">ROAS</div>
        </div>
        <div class="opt-metric">
          <div class="value">${c.cpc.toFixed(2)} €</div>
          <div class="label">CPC</div>
        </div>
        <div class="opt-metric">
          <div class="value">${c.conversion_rate.toFixed(1)}%</div>
          <div class="label">CR</div>
        </div>
      </div>
    </div>
  `).join('');
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
}

function showToast(message, type) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.getElementById('campaign-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeCampaignModal();
});
