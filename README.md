# Kampagnen-ROI-Dashboard

Professionelles SaaS-Dashboard für Kampagnen-ROI, Analytics und KI-gestützte Ad-Varianten.

## Setup

```bash
npm install
cp .env.example .env
node server.js
```

Die App läuft danach auf `http://localhost:3002`.

## Tests

```bash
npm test
```

Ohne `OPENAI_API_KEY` nutzt der Ad-Generator automatisch Template-Fallbacks. Bilder werden über Pollinations.ai als URL generiert.
