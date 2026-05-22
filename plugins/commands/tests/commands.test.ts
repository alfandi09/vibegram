import { describe, expect, it, vi } from 'vitest';

import {
    CommandRegistryError,
    commandRegistry,
    commands,
    type CommandsFlavor,
} from '../src/index';

describe('@vibegram/commands', () => {
    it('should register commands and include the generated help command by default', () => {
        const registry = commandRegistry({
            commands: [
                { command: 'start', description: 'Start the bot' },
                { command: 'profile', description: 'Show your profile', help: 'Show account data' },
            ],
        });

        expect(registry.toBotCommands()).toEqual([
            { command: 'start', description: 'Start the bot' },
            { command: 'profile', description: 'Show your profile' },
            { command: 'help', description: 'Show available commands' },
        ]);
        expect(registry.find('profile')?.help).toBe('Show account data');
    });

    it('should sync commands on launch when installed as a bot plugin', async () => {
        const bot = createBot();
        const plugin = commands({
            syncOnLaunch: true,
            commands: [{ command: 'start', description: 'Start the bot' }],
        });

        plugin.install(bot);
        await bot.launch({ polling: true });

        expect(bot.use).toHaveBeenCalledOnce();
        expect(bot.calls).toEqual([
            [
                'setMyCommands',
                {
                    commands: [
                        { command: 'start', description: 'Start the bot' },
                        { command: 'help', description: 'Show available commands' },
                    ],
                },
            ],
            ['launch', { polling: true }],
        ]);
    });

    it('should support scopes and language-specific command descriptions', async () => {
        const client = createClient();
        const registry = commandRegistry({
            commands: [
                {
                    command: 'start',
                    description: 'Start the bot',
                    descriptions: { id: 'Mulai bot' },
                },
                {
                    command: 'ban',
                    description: 'Ban a user',
                    scope: { type: 'all_chat_administrators' },
                    descriptions: { id: 'Blokir user' },
                },
            ],
        });

        await registry.sync(client);

        expect(client.calls).toEqual([
            [
                'setMyCommands',
                {
                    commands: [
                        { command: 'start', description: 'Start the bot' },
                        { command: 'help', description: 'Show available commands' },
                    ],
                },
            ],
            [
                'setMyCommands',
                {
                    language_code: 'id',
                    commands: [
                        { command: 'start', description: 'Mulai bot' },
                        { command: 'help', description: 'Tampilkan daftar perintah' },
                    ],
                },
            ],
            [
                'setMyCommands',
                {
                    scope: { type: 'all_chat_administrators' },
                    commands: [{ command: 'ban', description: 'Ban a user' }],
                },
            ],
            [
                'setMyCommands',
                {
                    scope: { type: 'all_chat_administrators' },
                    language_code: 'id',
                    commands: [{ command: 'ban', description: 'Blokir user' }],
                },
            ],
        ]);
    });

    it('should reject duplicate commands for the same scope and language', () => {
        expect(() =>
            commandRegistry({
                commands: [
                    { command: 'start', description: 'Start the bot' },
                    { command: 'start', description: 'Duplicate start' },
                ],
            })
        ).toThrow(CommandRegistryError);
    });

    it('should generate localized help output and handle /help middleware', async () => {
        const ctx = createContext('/help', 'id');
        const middleware = commands({
            commands: [
                {
                    command: 'start',
                    description: 'Start the bot',
                    help: 'Open the main menu',
                    descriptions: { id: 'Mulai bot' },
                    helpDescriptions: { id: 'Buka menu utama' },
                },
                { command: 'admin', description: 'Admin only', hidden: true },
            ],
        });

        await middleware(ctx, async () => {
            throw new Error('next() should not run for /help');
        });

        expect(ctx.replies).toEqual(['Available commands\n/start - Buka menu utama\n/help - Tampilkan daftar perintah']);
        expect(middleware.registry.helpText({ languageCode: 'id' })).toBe(
            'Available commands\n/start - Buka menu utama\n/help - Tampilkan daftar perintah'
        );
    });

    it('should work with typed context augmentation', () => {
        type BaseContext = {
            message?: { text?: string };
            from?: { language_code?: string };
            reply(text: string): Promise<unknown>;
        };

        function assertCommandTypes(ctx: CommandsFlavor<BaseContext>) {
            const listed = ctx.commands.toBotCommands();
            const help = ctx.commands.helpText({ languageCode: ctx.from?.language_code });
            void ctx.reply(`${listed.length}: ${help}`);
        }

        expect(typeof assertCommandTypes).toBe('function');
    });
});

function createClient() {
    const calls: Array<[string, Record<string, unknown> | undefined]> = [];

    return {
        calls,
        async callApi(method: string, data?: Record<string, unknown>) {
            calls.push([method, data]);
            return true;
        },
    };
}

function createBot() {
    const client = createClient();
    const calls = client.calls;

    return {
        calls,
        client,
        use: vi.fn(),
        async launch(options?: unknown) {
            calls.push(['launch', options as Record<string, unknown> | undefined]);
        },
    };
}

function createContext(text: string, languageCode?: string) {
    const replies: string[] = [];

    return {
        message: { text },
        from: { language_code: languageCode },
        replies,
        async reply(message: string) {
            replies.push(message);
        },
    } as CommandsFlavor<{
        message?: { text?: string };
        from?: { language_code?: string };
        replies: string[];
        reply(message: string): Promise<void>;
    }>;
}
