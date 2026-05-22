export interface BotCommand {
    command: string;
    description: string;
}

export interface BotCommandScope {
    type:
        | 'default'
        | 'all_private_chats'
        | 'all_group_chats'
        | 'all_chat_administrators'
        | 'chat'
        | 'chat_administrators'
        | 'chat_member';
    chat_id?: number | string;
    user_id?: number;
}

export interface BotCommandOptions {
    scope?: BotCommandScope;
    language_code?: string;
}

export interface CommandsClient {
    callApi(method: string, data?: Record<string, unknown>): Promise<unknown>;
}

export interface CommandsBotLike<C extends CommandsContext = CommandsContext> {
    client: CommandsClient;
    use(middleware: CommandsMiddleware<C>): unknown;
    launch?(options?: unknown): Promise<void>;
}

export interface CommandsContext {
    message?: {
        text?: string;
    };
    from?: {
        language_code?: string;
    };
    reply?(text: string, extra?: Record<string, unknown>): Promise<unknown> | unknown;
    commands?: CommandRegistry;
}

export type CommandsMiddleware<C extends CommandsContext = CommandsContext> = (
    ctx: C,
    next: () => Promise<void>
) => Promise<void>;

export type CommandsFlavor<C> = C & {
    commands: CommandRegistry;
};

export interface CommandDefinition {
    command: string;
    description: string;
    descriptions?: Record<string, string>;
    help?: string;
    helpDescriptions?: Record<string, string>;
    scope?: BotCommandScope;
    hidden?: boolean;
}

export interface HelpCommandOptions {
    command?: string;
    description?: string;
    descriptions?: Record<string, string>;
    title?: string;
    titles?: Record<string, string>;
}

export interface CommandsOptions {
    commands: readonly CommandDefinition[];
    includeHelpCommand?: boolean;
    helpCommand?: false | HelpCommandOptions;
    syncOnLaunch?: boolean;
}

export interface HelpTextOptions {
    languageCode?: string;
    scope?: BotCommandScope;
}

export interface SyncOptions {
    dryRun?: boolean;
}

export interface CommandSet {
    scope?: BotCommandScope;
    language_code?: string;
    commands: BotCommand[];
}

export interface CommandRegistry {
    readonly definitions: readonly RegisteredCommand[];
    readonly helpCommand: RegisteredCommand | undefined;
    find(command: string): RegisteredCommand | undefined;
    toBotCommands(options?: HelpTextOptions): BotCommand[];
    commandSets(): CommandSet[];
    sync(client: CommandsClient, options?: SyncOptions): Promise<CommandSet[]>;
    helpText(options?: HelpTextOptions): string;
}

export interface CommandsPlugin<C extends CommandsContext = CommandsContext>
    extends CommandsMiddleware<C> {
    registry: CommandRegistry;
    sync(client: CommandsClient, options?: SyncOptions): Promise<CommandSet[]>;
    install(bot: CommandsBotLike<C>): void;
}

export interface RegisteredCommand extends CommandDefinition {
    command: string;
    description: string;
    descriptions: Record<string, string>;
    help: string;
    helpDescriptions: Record<string, string>;
    scope?: BotCommandScope;
    hidden: boolean;
}

const COMMAND_PATTERN = /^[a-z0-9_]{1,32}$/;
const MAX_COMMANDS_PER_SET = 100;
const HELP_COMMAND_NAME = 'help';
const DEFAULT_HELP_TITLE = 'Available commands';
const DEFAULT_HELP_DESCRIPTION = 'Show available commands';
const DEFAULT_HELP_COMMAND: HelpCommandOptions = {
    command: HELP_COMMAND_NAME,
    description: DEFAULT_HELP_DESCRIPTION,
    title: DEFAULT_HELP_TITLE,
};

/** Error thrown when command registry input violates Telegram Bot API constraints. */
export class CommandRegistryError extends Error {
    constructor(message: string) {
        super(`[vibegram/commands] ${message}`);
        this.name = 'CommandRegistryError';
    }
}

/** Create a reusable registry for Telegram command sync and help generation. */
export function commandRegistry(options: CommandsOptions): CommandRegistry {
    const normalized = normalizeDefinitions(options);

    return {
        definitions: normalized.commands,
        helpCommand: normalized.helpCommand,
        find(command: string) {
            return normalized.commands.find(entry => entry.command === normalizeCommandName(command));
        },
        toBotCommands(filter: HelpTextOptions = {}) {
            return toBotCommandsForSet(normalized, filter);
        },
        commandSets() {
            return buildCommandSets(normalized);
        },
        async sync(client: CommandsClient, syncOptions: SyncOptions = {}) {
            const sets = buildCommandSets(normalized);

            if (!syncOptions.dryRun) {
                for (const set of sets) {
                    await client.callApi('setMyCommands', compact({
                        commands: set.commands,
                        scope: set.scope,
                        language_code: set.language_code,
                    }));
                }
            }

            return sets;
        },
        helpText(helpOptions: HelpTextOptions = {}) {
            return buildHelpText(normalized, helpOptions);
        },
    };
}

/**
 * Create command middleware. The returned function is also a bot plugin:
 * use `bot.use(commands(...))` for help/context only, or `bot.plugin(commands(...))`
 * when `syncOnLaunch` should patch this bot instance's launch flow.
 */
export function commands<C extends CommandsContext = CommandsContext>(
    options: CommandsOptions
): CommandsPlugin<C> {
    const registry = commandRegistry(options);

    const middleware = (async (ctx: C, next: () => Promise<void>) => {
        const previousRegistry = ctx.commands;
        ctx.commands = registry;

        try {
            if (registry.helpCommand && isHelpRequest(ctx.message?.text, registry.helpCommand.command)) {
                if (!ctx.reply) {
                    throw new CommandRegistryError('Cannot handle /help: ctx.reply() is not available.');
                }

                await ctx.reply(registry.helpText({ languageCode: ctx.from?.language_code }));
                return;
            }

            await next();
        } finally {
            if (previousRegistry) {
                ctx.commands = previousRegistry;
            } else {
                delete ctx.commands;
            }
        }
    }) as CommandsPlugin<C>;

    middleware.registry = registry;
    middleware.sync = (client, syncOptions) => registry.sync(client, syncOptions);
    middleware.install = bot => {
        bot.use(middleware);

        if (options.syncOnLaunch && typeof bot.launch === 'function') {
            const originalLaunch = bot.launch.bind(bot);
            bot.launch = async (launchOptions?: unknown) => {
                await registry.sync(bot.client);
                return originalLaunch(launchOptions);
            };
        }
    };

    return middleware;
}

function normalizeDefinitions(options: CommandsOptions): {
    commands: RegisteredCommand[];
    helpCommand?: RegisteredCommand;
} {
    const includeHelpCommand = options.includeHelpCommand ?? options.helpCommand !== false;
    const helpCommand = includeHelpCommand ? normalizeHelpCommand(options.helpCommand) : undefined;
    const commands = options.commands.map(normalizeCommandDefinition);
    const allCommands = helpCommand ? [...commands, helpCommand] : commands;

    validateDefinitions(allCommands);

    return { commands: allCommands, helpCommand };
}

function normalizeHelpCommand(options: false | HelpCommandOptions | undefined): RegisteredCommand {
    const helpOptions = {
        ...DEFAULT_HELP_COMMAND,
        ...(options && typeof options === 'object' ? options : {}),
    };

    return normalizeCommandDefinition({
        command: helpOptions.command ?? HELP_COMMAND_NAME,
        description: helpOptions.description ?? DEFAULT_HELP_DESCRIPTION,
        descriptions: helpOptions.descriptions ?? DEFAULT_HELP_COMMAND.descriptions,
        help: helpOptions.description ?? DEFAULT_HELP_DESCRIPTION,
        helpDescriptions: helpOptions.descriptions ?? DEFAULT_HELP_COMMAND.descriptions,
    });
}

function normalizeCommandDefinition(definition: CommandDefinition): RegisteredCommand {
    const command = normalizeCommandName(definition.command);
    const description = String(definition.description ?? '').trim();
    const descriptions = normalizeDescriptionMap(definition.descriptions);
    const help = String(definition.help ?? description).trim();
    const helpDescriptions = normalizeDescriptionMap(definition.helpDescriptions);

    return {
        ...definition,
        command,
        description,
        descriptions,
        help,
        helpDescriptions,
        hidden: definition.hidden ?? false,
    };
}

function normalizeCommandName(command: string): string {
    return command.replace(/^\//, '').trim().toLowerCase();
}

function normalizeDescriptionMap(value: Record<string, string> | undefined): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [languageCode, description] of Object.entries(value ?? {})) {
        const normalizedLanguage = normalizeLanguageCode(languageCode);
        result[normalizedLanguage] = String(description).trim();
    }

    return result;
}

function validateDefinitions(commandsToValidate: readonly RegisteredCommand[]): void {
    if (commandsToValidate.length === 0) {
        throw new CommandRegistryError('At least one command is required.');
    }

    const keys = new Set<string>();
    const groups = new Map<string, RegisteredCommand[]>();

    for (const command of commandsToValidate) {
        validateCommand(command.command, 'command');
        validateDescription(command.description, `${command.command}.description`);
        validateDescription(command.help, `${command.command}.help`);

        for (const [languageCode, description] of Object.entries(command.descriptions)) {
            validateLanguageCode(languageCode);
            validateDescription(description, `${command.command}.descriptions.${languageCode}`);
        }

        for (const [languageCode, description] of Object.entries(command.helpDescriptions)) {
            validateLanguageCode(languageCode);
            validateDescription(description, `${command.command}.helpDescriptions.${languageCode}`);
        }

        validateScope(command.scope);

        for (const languageKey of commandLanguages(command)) {
            const key = `${scopeKey(command.scope)}:${languageKey}:${command.command}`;
            if (keys.has(key)) {
                throw new CommandRegistryError(
                    `Duplicate command "${command.command}" for the same scope and language.`
                );
            }
            keys.add(key);

            const groupKey = `${scopeKey(command.scope)}:${languageKey}`;
            const group = groups.get(groupKey) ?? [];
            group.push(command);
            groups.set(groupKey, group);
        }
    }

    for (const group of groups.values()) {
        if (group.length > MAX_COMMANDS_PER_SET) {
            throw new CommandRegistryError(
                `Telegram allows at most ${MAX_COMMANDS_PER_SET} commands per scope/language set.`
            );
        }
    }
}

function validateCommand(value: string, label: string): void {
    if (!COMMAND_PATTERN.test(value)) {
        throw new CommandRegistryError(
            `${label} must be 1-32 characters and contain only lowercase English letters, digits, and underscores.`
        );
    }
}

function validateDescription(value: string, label: string): void {
    if (value.length < 1 || value.length > 256) {
        throw new CommandRegistryError(`${label} must be 1-256 characters.`);
    }
}

function validateLanguageCode(value: string): void {
    if (!/^[a-z]{2}$/.test(value)) {
        throw new CommandRegistryError(
            `language_code "${value}" must be a two-letter ISO 639-1 code.`
        );
    }
}

function validateScope(scope: BotCommandScope | undefined): void {
    if (!scope) return;

    if (
        (scope.type === 'chat' ||
            scope.type === 'chat_administrators' ||
            scope.type === 'chat_member') &&
        (scope.chat_id === undefined || scope.chat_id === null)
    ) {
        throw new CommandRegistryError(`${scope.type} scope requires chat_id.`);
    }

    if (scope.type === 'chat_member' && typeof scope.user_id !== 'number') {
        throw new CommandRegistryError('chat_member scope requires user_id.');
    }
}

function buildCommandSets(registry: {
    commands: readonly RegisteredCommand[];
    helpCommand?: RegisteredCommand;
}): CommandSet[] {
    const scopeGroups = new Map<string, { scope?: BotCommandScope; commands: RegisteredCommand[]; languages: Set<string> }>();

    for (const command of registry.commands) {
        const key = scopeKey(command.scope);
        const group = scopeGroups.get(key) ?? {
            scope: command.scope,
            commands: [],
            languages: new Set(['']),
        };
        group.commands.push(command);

        for (const languageCode of commandLanguages(command)) {
            group.languages.add(languageCode);
        }

        scopeGroups.set(key, group);
    }

    const sets: CommandSet[] = [];

    for (const group of scopeGroups.values()) {
        for (const languageCode of group.languages) {
            sets.push({
                scope: group.scope,
                language_code: languageCode || undefined,
                commands: group.commands.map(command => toBotCommand(command, languageCode)),
            });
        }
    }

    return sets;
}

function toBotCommandsForSet(
    registry: { commands: readonly RegisteredCommand[] },
    options: HelpTextOptions
): BotCommand[] {
    return registry.commands
        .filter(command => sameScope(command.scope, options.scope))
        .map(command => toBotCommand(command, options.languageCode));
}

function toBotCommand(command: RegisteredCommand, languageCode?: string): BotCommand {
    const normalizedLanguage = languageCode ? normalizeLanguageCode(languageCode) : undefined;

    return {
        command: command.command,
        description: getCommandDescription(command, normalizedLanguage),
    };
}

function buildHelpText(
    registry: { commands: readonly RegisteredCommand[]; helpCommand?: RegisteredCommand },
    options: HelpTextOptions
): string {
    const languageCode = options.languageCode ? normalizeLanguageCode(options.languageCode) : undefined;
    const title = getHelpTitle(registry.helpCommand, languageCode);
    const lines = registry.commands
        .filter(command => !command.hidden && sameScope(command.scope, options.scope))
        .map(command => {
            const description = languageCode
                ? command.helpDescriptions[languageCode] ??
                  command.descriptions[languageCode] ??
                  getDefaultHelpDescription(command, languageCode) ??
                  command.help
                : command.help;
            return `/${command.command} - ${description}`;
        });

    return [title, ...lines].join('\n');
}

function getHelpTitle(helpCommand: RegisteredCommand | undefined, languageCode?: string): string {
    if (!languageCode) return DEFAULT_HELP_TITLE;
    if (languageCode === 'id') return 'Available commands';
    return helpCommand?.descriptions[languageCode] ?? DEFAULT_HELP_TITLE;
}

function getCommandDescription(command: RegisteredCommand, languageCode?: string): string {
    if (!languageCode) return command.description;
    return (
        command.descriptions[languageCode] ??
        getDefaultHelpDescription(command, languageCode) ??
        command.description
    );
}

function getDefaultHelpDescription(
    command: RegisteredCommand,
    languageCode: string
): string | undefined {
    if (command.command === HELP_COMMAND_NAME && languageCode === 'id') {
        return 'Tampilkan daftar perintah';
    }
    return undefined;
}

function isHelpRequest(text: string | undefined, commandName = HELP_COMMAND_NAME): boolean {
    if (!text) return false;

    const firstToken = text.trim().split(/\s+/, 1)[0] ?? '';
    const command = firstToken.replace(/^\//, '').split('@', 1)[0]?.toLowerCase();
    return command === commandName;
}

function commandLanguages(command: RegisteredCommand): string[] {
    return Array.from(
        new Set([
            '',
            ...Object.keys(command.descriptions),
            ...Object.keys(command.helpDescriptions),
        ])
    );
}

function normalizeLanguageCode(value: string): string {
    return value.trim().toLowerCase();
}

function scopeKey(scope: BotCommandScope | undefined): string {
    if (!scope) return 'default';
    return stableStringify(scope);
}

function sameScope(left: BotCommandScope | undefined, right: BotCommandScope | undefined): boolean {
    return scopeKey(left) === scopeKey(right);
}

function stableStringify(value: BotCommandScope): string {
    return JSON.stringify(Object.keys(value).sort().reduce<Record<string, unknown>>((result, key) => {
        result[key] = value[key as keyof BotCommandScope];
        return result;
    }, {}));
}

function compact(value: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
        if (entry !== undefined) {
            result[key] = entry;
        }
    }

    return result;
}
