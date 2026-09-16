# AnnyTrade

Paper-only multi-market trading desk demo (Next.js). Educational signals, DEMO market data by default, Broker Live hard-blocked.

## Local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000 (redirects to `/annytrade`).

## Deploy (Vercel)

1. Import **this** GitHub repo: `Carlklient/AnnyTrade`
2. Framework: Next.js
3. Set env from `.env.production.example` (at minimum `ANNYTRADE_STANDALONE=1` and `NEXT_PUBLIC_APP_URL`)
4. Deploy → `https://annytrade.vercel.app`

Portfolio case study lives on [omotundeaanu.com](https://github.com/Carlklient/omotundeaanu.com).
