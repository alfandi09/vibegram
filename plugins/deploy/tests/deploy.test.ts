import { afterEach, describe, expect, it } from 'vitest';

import {
    DeployConfigError,
    buildWebhookUrl,
    createWebhookPreset,
    deployWebhook,
    readWebhookEnv,
} from '../src/index';

const handles: Array<{ stop(): Promise<void> }> = [];

afterEach(async () => {
    while (handles.length > 0) {
        const handle = handles.pop();
        await handle?.stop();
    }
});

describe('@vibegram/deploy', () => {
    it('should validate required env and normalize webhook URL paths', () => {
        expect(() => readWebhookEnv({ PORT: '3000' })).toThrow(DeployConfigError);
        expect(() =>
            readWebhookEnv({
                WEBHOOK_URL: 'https://bot.example.com',
                PORT: 'not-a-port',
            })
        ).toThrow(DeployConfigError);

        expect(
            readWebhookEnv({
                WEBHOOK_URL: 'https://bot.example.com',
                PORT: '3000',
                TELEGRAM_WEBHOOK_SECRET: 'secret-token',
            })
        ).toEqual({
            webhookUrl: 'https://bot.example.com',
            port: 3000,
            secretToken: 'secret-token',
        });

        expect(buildWebhookUrl('https://bot.example.com', '/telegram/webhook')).toBe(
            'https://bot.example.com/telegram/webhook'
        );
        expect(buildWebhookUrl('https://bot.example.com/base', '/telegram')).toBe(
            'https://bot.example.com/base/telegram'
        );
    });

    it('should expose native health and readiness endpoints', async () => {
        const handle = await deployWebhook(createBot(), {
            adapter: 'native',
            webhookUrl: 'https://bot.example.com',
            port: 0,
            healthPath: '/healthz',
            readinessPath: '/readyz',
            registerWebhook: false,
        });
        handles.push(handle);

        await expect(fetchText(`${handle.localUrl}/healthz`)).resolves.toBe('OK');
        await expect(fetchText(`${handle.localUrl}/readyz`)).resolves.toBe('READY');
    });

    it('should register webhook on startup with secret token and extra webhook options', async () => {
        const bot = createBot();

        const handle = await deployWebhook(bot, {
            adapter: 'native',
            webhookUrl: 'https://bot.example.com/base',
            path: '/telegram',
            port: 0,
            secretToken: 'secret-token',
            webhookOptions: { allowed_updates: ['message'] },
        });
        handles.push(handle);

        expect(bot.webhookCalls).toEqual([
            [
                'https://bot.example.com/base/telegram',
                {
                    allowed_updates: ['message'],
                    secret_token: 'secret-token',
                },
            ],
        ]);
    });

    it('should route native webhook updates and reject invalid secret tokens', async () => {
        const bot = createBot();
        const handle = await deployWebhook(bot, {
            adapter: 'native',
            webhookUrl: 'https://bot.example.com',
            port: 0,
            path: '/webhook',
            secretToken: 'secret-token',
            registerWebhook: false,
        });
        handles.push(handle);

        const denied = await postUpdate(`${handle.localUrl}/webhook`, { update_id: 1 }, 'wrong-token');
        expect(denied.status).toBe(403);

        const accepted = await postUpdate(`${handle.localUrl}/webhook`, {
            update_id: 2,
            message: { text: 'hello' },
        }, 'secret-token');

        expect(accepted.status).toBe(200);
        expect(bot.updates).toEqual([{ update_id: 2, message: { text: 'hello' } }]);
    });

    it('should remove webhook on shutdown when configured and stop only once', async () => {
        const bot = createBot();
        const handle = await deployWebhook(bot, {
            adapter: 'native',
            webhookUrl: 'https://bot.example.com',
            port: 0,
            registerWebhook: false,
            deleteWebhookOnStop: true,
            dropPendingUpdatesOnStop: true,
        });

        await handle.stop();
        await handle.stop();

        expect(handle.status).toBe('stopped');
        expect(bot.deleteCalls).toEqual([true]);
    });

    it('should create framework presets without requiring framework runtimes', () => {
        const bot = createBot();

        const express = createWebhookPreset(bot, {
            adapter: 'express',
            webhookUrl: 'https://bot.example.com',
            healthPath: '/healthz',
            readinessPath: '/readyz',
        });
        const fastify = createWebhookPreset(bot, {
            adapter: 'fastify',
            webhookUrl: 'https://bot.example.com',
        });
        const hono = createWebhookPreset(bot, {
            adapter: 'hono',
            webhookUrl: 'https://bot.example.com',
        });

        expect(express.adapter).toBe('express');
        expect(express.healthHandler).toBeTypeOf('function');
        expect(express.webhookHandler).toBeTypeOf('function');
        expect(fastify.adapter).toBe('fastify');
        expect(fastify.register).toBeTypeOf('function');
        expect(hono.adapter).toBe('hono');
        expect(hono.handle).toBeTypeOf('function');
    });
});

function createBot() {
    return {
        updates: [] as Array<Record<string, unknown>>,
        webhookCalls: [] as Array<[string, Record<string, unknown> | undefined]>,
        deleteCalls: [] as boolean[],
        async handleUpdate(update: Record<string, unknown>) {
            this.updates.push(update);
        },
        async setWebhook(url: string, extra?: Record<string, unknown>) {
            this.webhookCalls.push([url, extra]);
        },
        async deleteWebhook(dropPendingUpdates?: boolean) {
            this.deleteCalls.push(Boolean(dropPendingUpdates));
        },
    };
}

async function fetchText(url: string): Promise<string> {
    const response = await fetch(url);
    expect(response.status).toBe(200);
    return response.text();
}

async function postUpdate(
    url: string,
    update: Record<string, unknown>,
    secretToken?: string
): Promise<Response> {
    return fetch(url, {
        method: 'POST',
        headers: compactHeaders({
            'content-type': 'application/json',
            'x-telegram-bot-api-secret-token': secretToken,
        }),
        body: JSON.stringify(update),
    });
}

function compactHeaders(headers: Record<string, string | undefined>): Record<string, string> {
    return Object.fromEntries(
        Object.entries(headers).filter((entry): entry is [string, string] => entry[1] !== undefined)
    );
}
