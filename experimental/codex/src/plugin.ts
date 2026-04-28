/**
 * Codex Plugin — core middleware factory.
 *
 * Attaches ctx.codex to every update and registers bot commands:
 *   /codex help | status | reset | models | ask <text> | personality <text>
 */

import { Context } from 'vibegram';
import { Middleware } from 'vibegram';
import {
    CodexPluginOptions,
    CodexContext,
    CodexMessage,
    CodexAuditEvent,
} from './types.js';
import { MemoryCodexStore } from './memory.js';

// ---------------------------------------------------------------------------
// Session usage tracker
// ---------------------------------------------------------------------------

interface SessionUsage {
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    perUser: Map<number, { requests: number; tokens: number }>;
}

// ---------------------------------------------------------------------------
// Conversation key helpers
// ---------------------------------------------------------------------------

function resolveConversationKey(ctx: Context): string {
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;
    const threadId = ctx.message?.message_thread_id;

    if (!chatId) return `user:${userId ?? 'unknown'}`;

    const isGroup = chatId < 0; // Telegram group/supergroup chat IDs are negative

    if (isGroup && threadId) return `chat:${chatId}:thread:${threadId}`;
    if (isGroup) return `chat:${chatId}:user:${userId ?? 'all'}`;
    return `user:${userId ?? chatId}`;
}

// ---------------------------------------------------------------------------
// Safety helpers
// ---------------------------------------------------------------------------

function isAllowedUser(ctx: Context, allowedIds: number[]): boolean {
    if (allowedIds.length === 0) return true;
    const userId = ctx.from?.id;
    return userId !== undefined && allowedIds.includes(userId);
}

function isAllowedChat(ctx: Context, allowedIds: (number | string)[]): boolean {
    if (allowedIds.length === 0) return true;
    const chatId = ctx.chat?.id;
    return chatId !== undefined && allowedIds.includes(chatId);
}

function isGroupChat(ctx: Context): boolean {
    const chatId = ctx.chat?.id;
    return chatId !== undefined && chatId < 0;
}

function isBotMentioned(ctx: Context, botUsername?: string): boolean {
    if (!botUsername) return false;

    const expected = `@${botUsername.replace(/^@/, '').toLowerCase()}`;
    const text = ctx.message?.text ?? '';
    const entities = ctx.message?.entities ?? [];

    return entities.some(entity => {
        if (entity.type !== 'mention') return false;

        const offset = entity.offset ?? 0;
        const length = entity.length ?? 0;
        const mention = text.slice(offset, offset + length).toLowerCase();
        return mention === expected;
    });
}

// ---------------------------------------------------------------------------
// Command parser helper
// ---------------------------------------------------------------------------

function parseCommand(
    text: string,
    prefix: string
): { sub: string; args: string[] } | null {
    const lower = text.trim().toLowerCase();
    const cmdPattern = `/${prefix}`;

    if (!lower.startsWith(cmdPattern)) return null;

    const rest = text.slice(cmdPattern.length).trim();
    const parts = rest.split(/\s+/).filter(Boolean);
    const sub = (parts[0] ?? 'ask').toLowerCase();
    const args = parts.slice(1);

    return { sub, args };
}

// ---------------------------------------------------------------------------
// Main plugin middleware factory
// ---------------------------------------------------------------------------

export function codex<C extends Context = Context>(
    options: CodexPluginOptions
): Middleware<C> {
    const {
        provider,
        systemPrompt = 'You are a helpful assistant.',
        maxPromptLength = 4000,
        maxResponseLength = 4096,
        maxHistory = 20,
        timeoutMs = 30_000,
        allowedUserIds = [],
        allowedChatIds = [],
        commandPrefix = 'codex',
        autoReply = true,
        groupMentionOnly = true,
        botUsername,
        onAudit,
    } = options;

    const memoryStore = options.memoryStore ?? new MemoryCodexStore(maxHistory);

    // Session-wide usage tracker
    const sessionUsage: SessionUsage = {
        totalRequests: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        perUser: new Map(),
    };

    // -------------------------------------------------------------------------
    // Build ctx.codex for the current update
    // -------------------------------------------------------------------------

    function buildCodexContext(ctx: C): CodexContext {
        const conversationKey = resolveConversationKey(ctx);
        const userId = ctx.from?.id ?? 0;
        const chatId = ctx.chat?.id ?? 0;

        return {
            conversationKey,

            async ask(text, askOpts = {}) {
                // Safety guards
                if (!isAllowedUser(ctx, allowedUserIds)) {
                    throw new Error('Codex: Unauthorized user.');
                }
                if (!isAllowedChat(ctx, allowedChatIds)) {
                    throw new Error('Codex: Unauthorized chat.');
                }
                if (text.length > maxPromptLength) {
                    throw new Error(
                        `Codex: Message too long (${text.length}/${maxPromptLength} chars).`
                    );
                }

                // Build the request messages first. Persist them only after the
                // provider succeeds, so failed/timeout calls do not poison memory.
                const history = await memoryStore.list(conversationKey);
                const requestMessages: CodexMessage[] = [...history];
                const activeSystemPrompt = askOpts.systemPrompt ?? systemPrompt;

                // Inject per-user personality as additional system context
                const personality = await this.getPersonality();
                let effectiveSystemPrompt = activeSystemPrompt;
                if (personality) {
                    effectiveSystemPrompt = effectiveSystemPrompt
                        ? `${effectiveSystemPrompt}\n\nUser custom instructions: ${personality}`
                        : personality;
                }

                if (requestMessages.length === 0 && effectiveSystemPrompt) {
                    requestMessages.push({
                        role: 'system',
                        content: effectiveSystemPrompt,
                    });
                }

                const userMsg: CodexMessage = { role: 'user', content: text };
                requestMessages.push(userMsg);

                const start = Date.now();
                let result;
                const timeoutError = new Error(`Codex: Request timed out after ${timeoutMs}ms.`);
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(timeoutError), timeoutMs);

                try {
                    result = await provider.ask({
                        text,
                        userId,
                        chatId,
                        conversationKey,
                        model: askOpts.model,
                        systemPrompt: effectiveSystemPrompt,
                        messages: requestMessages,
                        signal: controller.signal,
                    });
                } catch (err) {
                    const error = controller.signal.aborted ? timeoutError : (err as Error);
                    onAudit?.({
                        timestamp: new Date().toISOString(),
                        userId,
                        chatId,
                        provider: provider.name,
                        success: false,
                        durationMs: Date.now() - start,
                        error: error.message,
                    });
                    throw error;
                } finally {
                    clearTimeout(timeout);
                }

                if (history.length === 0 && activeSystemPrompt) {
                    await memoryStore.append(conversationKey, {
                        role: 'system',
                        content: activeSystemPrompt,
                    });
                }
                await memoryStore.append(conversationKey, userMsg);
                await memoryStore.append(conversationKey, {
                    role: 'assistant',
                    content: result.text,
                });

                // Track usage
                sessionUsage.totalRequests++;
                if (result.usage) {
                    sessionUsage.totalInputTokens += result.usage.inputTokens ?? 0;
                    sessionUsage.totalOutputTokens += result.usage.outputTokens ?? 0;
                    sessionUsage.totalTokens += result.usage.totalTokens ?? 0;
                }
                const userUsage = sessionUsage.perUser.get(userId) ?? { requests: 0, tokens: 0 };
                userUsage.requests++;
                userUsage.tokens += result.usage?.totalTokens ?? 0;
                sessionUsage.perUser.set(userId, userUsage);

                onAudit?.({
                    timestamp: new Date().toISOString(),
                    userId,
                    chatId,
                    provider: provider.name,
                    model: result.model,
                    success: true,
                    durationMs: Date.now() - start,
                });

                // Truncate if response is too long
                if (result.text.length > maxResponseLength) {
                    return {
                        ...result,
                        text:
                            result.text.slice(0, maxResponseLength - 30) +
                            '\n\n[Response truncated]',
                    };
                }

                return result;
            },

            async status() {
                if (provider.status) {
                    return provider.status({ userId, chatId });
                }
                return { connected: true, provider: provider.name };
            },

            async reset() {
                await memoryStore.clear(conversationKey);
            },

            async listModels() {
                if (provider.listModels) {
                    return provider.listModels();
                }
                return [];
            },

            async setPersonality(text: string) {
                const personalityKey = `personality:${userId}`;
                await memoryStore.clear(personalityKey);
                await memoryStore.append(personalityKey, {
                    role: 'system',
                    content: text,
                });
            },

            async getPersonality(): Promise<string | null> {
                const personalityKey = `personality:${userId}`;
                const messages = await memoryStore.list(personalityKey);
                return messages.length > 0 ? messages[0].content : null;
            },

            async clearPersonality() {
                const personalityKey = `personality:${userId}`;
                await memoryStore.clear(personalityKey);
            },
        };
    }

    // -------------------------------------------------------------------------
    // Command handlers
    // -------------------------------------------------------------------------

    async function handleCommand(
        ctx: C,
        sub: string,
        args: string[]
    ): Promise<boolean> {
        switch (sub) {
            case 'help': {
                await ctx.reply(
                    `🤖 *Codex Bot Commands*\n\n` +
                    `\`/${commandPrefix} help\` — Show this help\n` +
                    `\`/${commandPrefix} status\` — Provider, session & usage info\n` +
                    `\`/${commandPrefix} reset\` — Clear conversation memory\n` +
                    `\`/${commandPrefix} models\` — List available models\n` +
                    `\`/${commandPrefix} ask <text>\` — Ask explicitly\n` +
                    `\`/${commandPrefix} personality <text>\` — Set custom instructions\n` +
                    `\`/${commandPrefix} personality reset\` — Reset to default\n\n` +
                    `💬 Or just send any message${isGroupChat(ctx) ? ' (mention the bot)' : ''}!`,
                    { parse_mode: 'Markdown' }
                );
                return true;
            }

            case 'status': {
                await ctx.sendChatAction('typing');
                const status = await ctx.codex!.status();
                const icon = status.connected ? '✅' : '❌';
                let msg = `${icon} *Codex Status*\n\n`;
                msg += `Provider: \`${status.provider}\`\n`;
                if (status.model) msg += `Model: \`${status.model}\`\n`;
                if (status.extra) {
                    const extra = status.extra;
                    if (extra.planType) msg += `Plan: \`${extra.planType}\`\n`;
                    if (extra.expired !== undefined)
                        msg += `Token: ${extra.expired ? '⚠️ Expired' : '🟢 Valid'}\n`;
                    if (extra.expiresAt) msg += `Expires: \`${extra.expiresAt}\`\n`;
                    if (extra.autoRefresh !== undefined)
                        msg += `Auto-refresh: ${extra.autoRefresh ? '🔄 On' : '⏸️ Off'}\n`;
                }

                // Usage stats
                msg += `\n📊 *Session Usage*\n`;
                msg += `Requests: ${sessionUsage.totalRequests}\n`;
                msg += `Input tokens: ${sessionUsage.totalInputTokens.toLocaleString()}\n`;
                msg += `Output tokens: ${sessionUsage.totalOutputTokens.toLocaleString()}\n`;
                msg += `Total tokens: ${sessionUsage.totalTokens.toLocaleString()}\n`;

                // Per-user personality
                const personality = await ctx.codex!.getPersonality();
                if (personality) {
                    const preview = personality.length > 60
                        ? personality.slice(0, 60) + '...'
                        : personality;
                    msg += `\n🎭 *Personality*\n\`${preview}\`\n`;
                }

                await ctx.reply(msg, { parse_mode: 'Markdown' });
                return true;
            }

            case 'reset': {
                await ctx.codex!.reset();
                await ctx.reply('🧹 Conversation memory cleared.');
                return true;
            }

            case 'models': {
                await ctx.sendChatAction('typing');
                const models = await ctx.codex!.listModels();
                if (!models.length) {
                    await ctx.reply('No models available.');
                    return true;
                }
                const list = models
                    .map(m => `• \`${m.id}\`${m.displayName ? ` — ${m.displayName}` : ''}`)
                    .join('\n');
                await ctx.reply(`📋 *Available Models*\n\n${list}`, {
                    parse_mode: 'Markdown',
                });
                return true;
            }

            case 'ask': {
                if (!args.length) {
                    await ctx.reply('Usage: /' + commandPrefix + ' ask <your question>');
                    return true;
                }
                // Fall through to ask logic (handled outside)
                return false;
            }

            case 'personality': {
                if (!args.length) {
                    const current = await ctx.codex!.getPersonality();
                    if (current) {
                        await ctx.reply(
                            `🎭 *Current Personality*\n\n${current}\n\n` +
                            `Use \`/${commandPrefix} personality reset\` to clear.`,
                            { parse_mode: 'Markdown' }
                        );
                    } else {
                        await ctx.reply(
                            `🎭 No custom personality set.\n\n` +
                            `Use \`/${commandPrefix} personality <instructions>\` to set one.\n\n` +
                            `Examples:\n` +
                            `• \`/${commandPrefix} personality Jawab selalu dalam bahasa Indonesia dan gaya formal\`\n` +
                            `• \`/${commandPrefix} personality You are a coding expert. Always provide code examples.\`\n` +
                            `• \`/${commandPrefix} personality Kamu adalah chef profesional. Berikan resep dan tips memasak.\``,
                            { parse_mode: 'Markdown' }
                        );
                    }
                    return true;
                }

                if (args[0] === 'reset') {
                    await ctx.codex!.clearPersonality();
                    await ctx.reply('🎭 Personality reset to default.');
                    return true;
                }

                const personalityText = args.join(' ');
                if (personalityText.length > 2000) {
                    await ctx.reply('⚠️ Personality text too long. Maximum 2000 characters.');
                    return true;
                }
                await ctx.codex!.setPersonality(personalityText);
                await ctx.reply(
                    `🎭 Personality updated!\n\n` +
                    `\`${personalityText.length > 100 ? personalityText.slice(0, 100) + '...' : personalityText}\`\n\n` +
                    `This will apply to all your future messages.`,
                    { parse_mode: 'Markdown' }
                );
                return true;
            }

            default:
                return false;
        }
    }

    // -------------------------------------------------------------------------
    // Middleware
    // -------------------------------------------------------------------------

    return async (ctx: C, next) => {
        // Attach ctx.codex for this update
        const codexCtx = buildCodexContext(ctx);
        Object.defineProperty(ctx, 'codex', {
            value: codexCtx,
            writable: false,
            configurable: true,
        });

        const text = ctx.message?.text;
        if (!text) return next();

        // ---- Command routing (/codex ...) ----
        if (text.startsWith(`/${commandPrefix}`)) {
            const parsed = parseCommand(text, commandPrefix);
            if (!parsed) return next();

            const handled = await handleCommand(ctx, parsed.sub, parsed.args);
            if (handled) return; // command fully handled

            // /codex ask <text> — fall through to ask
            const askText =
                parsed.sub === 'ask' ? parsed.args.join(' ') : text;
            if (!askText.trim()) return next();

            await _askAndReply(ctx, askText);
            return;
        }

        // ---- Auto-reply mode ----
        if (!autoReply) return next();

        // In groups, only respond if bot is mentioned
        if (isGroupChat(ctx) && groupMentionOnly && !isBotMentioned(ctx, botUsername)) {
            return next();
        }

        // Safety check before doing anything
        if (!isAllowedUser(ctx, allowedUserIds)) return next();
        if (!isAllowedChat(ctx, allowedChatIds)) return next();

        await _askAndReply(ctx, text);
    };

    // -------------------------------------------------------------------------
    // Internal: send typing action, ask, reply
    // -------------------------------------------------------------------------

    async function _askAndReply(ctx: C, text: string): Promise<void> {
        try {
            await ctx.sendChatAction('typing');
        } catch {
            // ignore — not fatal
        }

        try {
            const result = await ctx.codex!.ask(text);
            await ctx.reply(result.text);
        } catch (err) {
            const msg = (err as Error).message.replace('[vibegram/codex] ', '');
            await ctx.reply(`⚠️ ${msg}`).catch(() => {});
        }
    }
}

// ---------------------------------------------------------------------------
// TypeScript module augmentation — ctx.codex
// ---------------------------------------------------------------------------

declare module 'vibegram' {
    interface Context {
        codex?: CodexContext;
    }
}
