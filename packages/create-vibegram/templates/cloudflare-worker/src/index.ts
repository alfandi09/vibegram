import { createFetchHandler } from 'vibegram';
import { createBot } from './bot';

interface Env {
    BOT_TOKEN: string;
    WEBHOOK_SECRET: string;
}

let handler: ((request: Request) => Promise<Response>) | undefined;

export default {
    fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        // Secrets are only available per request, so build the bot lazily once.
        handler ??= createFetchHandler(createBot(env.BOT_TOKEN), {
            secretToken: env.WEBHOOK_SECRET,
            healthPath: '/healthz',
            // Answer Telegram immediately; finish the update in the background.
            waitUntil: promise => ctx.waitUntil(promise),
        });
        return handler(request);
    },
};
