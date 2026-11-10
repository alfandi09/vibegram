# {{PROJECT_NAME}}

An AI Telegram bot built with [vibegram](https://alfandi09.github.io/vibegram/). Replies
stream live into a draft with a stop button, then arrive as a normal message.

```bash
npm install
cp .env.example .env   # put your BOT_TOKEN from @BotFather here
npm run dev
```

Connect your model in `src/ai.ts`: return any `AsyncIterable<string>` of text chunks.
