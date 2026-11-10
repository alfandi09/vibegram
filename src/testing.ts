import type { Bot } from './bot';
import type { TelegramClientRequest } from './client';
import type { Context } from './context';
import type { CallbackQuery, Chat, Message, MessageEntity, Update, User } from './types';

/**
 * Testing kit for vibegram bots (`vibegram/testing`).
 *
 * Intercepts every outgoing Bot API call, so tests run offline and can assert
 * what the bot sent:
 *
 * ```typescript
 * import { createTestBot } from 'vibegram/testing';
 *
 * const t = createTestBot(bot);
 * await t.sendText('/start');
 * expect(t.lastCall('sendMessage')?.payload.text).toBe('Welcome!');
 * ```
 */

/** One outgoing Bot API call recorded by the test kit. */
export interface RecordedApiCall {
    method: string;
    // Payloads are free-form Bot API parameter objects; `any` keeps test assertions terse.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: Record<string, any>;
}

/** Result for a stubbed method: a fixed value, or a function of the call. */
export type ApiStub = unknown | ((call: RecordedApiCall) => unknown | Promise<unknown>);

export interface TestBotOptions {
    /** Default user for generated updates. */
    user?: Partial<User>;
    /** Default chat for generated updates. Defaults to the user's private chat. */
    chat?: Partial<Chat>;
    /** Bot identity returned by getMe. */
    botInfo?: Partial<User>;
}

export interface TestMessageOptions {
    from?: Partial<User>;
    chat?: Partial<Chat>;
    /** Extra Message fields, e.g. `{ photo: [...] }` or `{ reply_to_message: ... }`. */
    message?: Partial<Message>;
    /** Deliver as edited_message / channel_post / ... instead of message. */
    updateType?:
        | 'message'
        | 'edited_message'
        | 'channel_post'
        | 'edited_channel_post'
        | 'business_message'
        | 'edited_business_message';
}

export interface TestCallbackOptions {
    from?: Partial<User>;
    chat?: Partial<Chat>;
    /** The message the pressed button belongs to. */
    message?: Partial<Message>;
}

export interface TestBot {
    /** Every outgoing Bot API call, in order. */
    readonly calls: RecordedApiCall[];
    /** Recorded calls for one method. */
    callsOf(method: string): RecordedApiCall[];
    /** Most recent call, optionally for one method. */
    lastCall(method?: string): RecordedApiCall | undefined;
    /** Clear recorded calls (stubs are kept). */
    clearCalls(): void;
    /** Stub a method with a function of the call; throw inside it to simulate an API error. */
    stub(method: string, result: (call: RecordedApiCall) => unknown | Promise<unknown>): TestBot;
    /** Stub a method with a fixed result. */
    stub(method: string, result: unknown): TestBot;
    /** Build and dispatch a text message update; resolves when middleware finishes. */
    sendText(text: string, options?: TestMessageOptions): Promise<Update>;
    /** Build and dispatch a message update with arbitrary fields (photo, document, ...). */
    sendMessage(message: Partial<Message>, options?: TestMessageOptions): Promise<Update>;
    /** Build and dispatch a command, e.g. `sendCommand('start', 'ref123')`. */
    sendCommand(name: string, args?: string, options?: TestMessageOptions): Promise<Update>;
    /** Build and dispatch a callback query (inline button press). */
    pressButton(data: string, options?: TestCallbackOptions): Promise<Update>;
    /** Dispatch a raw update; `update_id` is filled in when missing. */
    sendUpdate(update: Partial<Update>): Promise<Update>;
}

const DEFAULT_USER: User = {
    id: 1001,
    is_bot: false,
    first_name: 'Test',
    username: 'test_user',
    language_code: 'en',
};

const DEFAULT_BOT: User = {
    id: 9001,
    is_bot: true,
    first_name: 'Test Bot',
    username: 'test_bot',
};

const MESSAGE_RESULT_METHODS =
    /^(send(?!ChatAction|MessageDraft|RichMessageDraft|Gift|ChatJoinRequestWebApp)|copyMessage$|forwardMessage$|edit(?!Ephemeral))/;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPayload(data: unknown): Record<string, any> {
    return typeof data === 'object' && data !== null
        ? { ...(data as Record<string, unknown>) }
        : {};
}

/**
 * Wrap a bot for offline tests. Installs a request transformer on `bot.client`
 * that records calls and returns stubbed or generated results instead of
 * contacting Telegram.
 */
export function createTestBot<C extends Context>(
    bot: Bot<C>,
    options: TestBotOptions = {}
): TestBot {
    const user: User = { ...DEFAULT_USER, ...options.user };
    const defaultChat: Chat = {
        id: user.id,
        type: 'private',
        first_name: user.first_name,
        ...options.chat,
    } as Chat;
    const botInfo: User = { ...DEFAULT_BOT, ...options.botInfo };

    const calls: RecordedApiCall[] = [];
    const stubs = new Map<string, ApiStub>();
    let nextUpdateId = 1;
    let nextMessageId = 1;
    let nextCallbackId = 1;

    function generatedResult(call: RecordedApiCall): unknown {
        if (call.method === 'getMe') return botInfo;
        if (MESSAGE_RESULT_METHODS.test(call.method)) {
            const chatId = call.payload.chat_id;
            const chat: Chat =
                chatId === undefined || chatId === defaultChat.id
                    ? defaultChat
                    : ({ id: typeof chatId === 'number' ? chatId : 0, type: 'private' } as Chat);
            return {
                message_id: nextMessageId++,
                date: Math.floor(Date.now() / 1000),
                chat,
                from: botInfo,
                ...(typeof call.payload.text === 'string' ? { text: call.payload.text } : {}),
                ...(typeof call.payload.caption === 'string'
                    ? { caption: call.payload.caption }
                    : {}),
            } satisfies Message;
        }
        return true;
    }

    bot.client.use(() => async (request: TelegramClientRequest) => {
        const call: RecordedApiCall = { method: request.method, payload: toPayload(request.data) };
        calls.push(call);

        if (stubs.has(call.method)) {
            const stub = stubs.get(call.method);
            return typeof stub === 'function'
                ? (stub as (c: RecordedApiCall) => unknown)(call)
                : stub;
        }
        return generatedResult(call);
    });

    function buildMessage(fields: Partial<Message>, opts: TestMessageOptions = {}): Message {
        const from: User = { ...user, ...opts.from };
        const chat: Chat = { ...defaultChat, ...opts.chat } as Chat;
        return {
            message_id: nextMessageId++,
            date: Math.floor(Date.now() / 1000),
            chat,
            from,
            ...fields,
            ...opts.message,
        };
    }

    async function dispatch(update: Partial<Update>): Promise<Update> {
        const full = { update_id: nextUpdateId++, ...update } as Update;
        await bot.handleUpdate(full);
        return full;
    }

    const testBot: TestBot = {
        calls,
        callsOf: method => calls.filter(call => call.method === method),
        lastCall: method => {
            const list = method ? calls.filter(call => call.method === method) : calls;
            return list[list.length - 1];
        },
        clearCalls: () => {
            calls.length = 0;
        },
        stub(method, result) {
            stubs.set(method, result);
            return testBot;
        },
        sendText: (text, opts) => testBot.sendMessage({ text }, opts),
        sendMessage: (message, opts = {}) =>
            dispatch({ [opts.updateType ?? 'message']: buildMessage(message, opts) }),
        sendCommand(name, args, opts) {
            const command = `/${name}`;
            const text = args ? `${command} ${args}` : command;
            const entities: MessageEntity[] = [
                { type: 'bot_command', offset: 0, length: command.length },
            ];
            return testBot.sendMessage({ text, entities }, opts);
        },
        pressButton(data, opts = {}) {
            const from: User = { ...user, ...opts.from };
            const callbackQuery: CallbackQuery = {
                id: String(nextCallbackId++),
                from,
                chat_instance: 'test-chat-instance',
                data,
                message: buildMessage(
                    { from: botInfo, text: 'Buttons' },
                    {
                        chat: opts.chat,
                        message: opts.message,
                        from: botInfo,
                    }
                ),
            };
            return dispatch({ callback_query: callbackQuery });
        },
        sendUpdate: update => dispatch(update),
    };

    return testBot;
}
