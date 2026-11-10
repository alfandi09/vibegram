# {{PROJECT_NAME}}

A Telegram webhook bot for Cloudflare Workers, built with
[vibegram](https://alfandi09.github.io/vibegram/adapters/fetch).

```bash
npm install
npx wrangler secret put BOT_TOKEN
npx wrangler secret put WEBHOOK_SECRET
npm run deploy
cp .env.example .env    # fill in the same values plus WEBHOOK_URL
npm run set-webhook
```

`npm test` runs the bot offline with `vibegram/testing`.
