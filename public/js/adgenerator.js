async function loadAdGenerator() {
  await loadAgentConfig();
  await loadCampaignSelect();
}

async function loadAgentConfig() {
  try {
    const res = await fetch('/api/ad-agent');
    if (!res.ok) return;
    const agent = await res.json();
    if (!agent) return;

    document.getElementById('brand_name').value = agent.brand_name || '';
    document.getElementById('industry').value = agent.industry || '';
    document.getElementById('target_audience').value = agent.target_audience || '';
    document.getElementById('tone_of_voice').value = agent.tone_of_voice || 'Professionell';
    document.getElementById('language').value = agent.language || 'Deutsch';
  } catch (e) {}
}

async function loadCampaignSelect() {
  try {
    const res = await fetch('/api/campaigns');
    if (!res.ok) return;
    const campaigns = await res.json();
    const select = document.getElementById('gen-campaign');
    select.innerHTML = '<option value="">Kampagne wählen...</option>' +
      campaigns.map(c => `<option value="${c.id}">${c.name} (${c.platform})</option>`).join('');
  } catch (e) {}
}

document.getElementById('agent-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    brand_name: document.getElementById('brand_name').value,
    industry: document.getElementById('industry').value,
    target_audience: document.getElementById('target_audience').value,
    tone_of_voice: document.getElementById('tone_of_voice').value,
    language: document.getElementById('language').value
  };

  try {
    const res = await fetch('/api/ad-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      showToast('Agent-Konfiguration gespeichert', 'success');
    } else {
      const err = await res.json();
      showToast(err.error || 'Fehler', 'error');
    }
  } catch (e) {
    showToast('Fehler beim Speichern', 'error');
  }
});

async function generateAd() {
  const campaignId = document.getElementById('gen-campaign').value;
  if (!campaignId) {
    showToast('Bitte Kampagne auswählen', 'error');
    return;
  }

  const btn = document.getElementById('generate-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Generiert...';

  try {
    const res = await fetch('/api/generate-ad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id: parseInt(campaignId) })
    });

    if (!res.ok) {
      const err = await res.json();
      showToast(err.error || 'Fehler bei der Generierung', 'error');
      return;
    }

    const data = await res.json();
    renderAdResults(data);

    if (data.source === 'fallback') {
      showToast('Fallback-Modus (kein API-Key)', 'success');
    } else {
      showToast('Anzeigen generiert', 'success');
    }
  } catch (e) {
    showToast('Fehler bei der Generierung', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '✨ Ad generieren';
  }
}

function renderAdResults(data) {
  const container = document.getElementById('ad-results');
  const variants = document.getElementById('ad-variants');
  const imageSection = document.getElementById('ad-image-section');

  variants.innerHTML = data.texts.map((t, i) => `
    <div class="ad-variant-card">
      <div class="variant-label">Variante ${i + 1}</div>
      <div class="variant-headline">${escapeHtml(t.headline)}</div>
      <div class="variant-text">${escapeHtml(t.primary_text)}</div>
      <span class="variant-cta">${escapeHtml(t.cta)}</span>
    </div>
  `).join('');

  const firstAd = data.texts[0] || {};
  const brandName = document.getElementById('brand_name').value || 'Brand';

  imageSection.innerHTML = `
    <div class="ad-preview-card">
      <div class="ad-preview-header">
        <div class="ad-preview-avatar">${brandName.charAt(0)}</div>
        <div>
          <div class="ad-preview-name">${escapeHtml(brandName)}</div>
          <div class="ad-preview-sponsored">Gesponsert</div>
        </div>
      </div>
      <div class="ad-preview-text">${escapeHtml(firstAd.primary_text || '')}</div>
      <img class="ad-preview-image" src="${data.image_url}" alt="Generated Ad"
           onerror="this.style.display='none'">
      <div class="ad-preview-cta-bar">
        <span class="cta-headline">${escapeHtml(firstAd.headline || '')}</span>
        <span class="cta-btn">${escapeHtml(firstAd.cta || 'Mehr erfahren')}</span>
      </div>
    </div>
  `;

  container.classList.add('active');
}
