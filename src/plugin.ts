import { Context } from './context';
import { Composer } from './composer';
import type { Bot } from './bot';

/**
 * Plugin interface for extending VibeGram bots with modular features.
 *
 * Usage:
 * ```typescript
 * class AnalyticsPlugin implements BotPlugin {
 *     name = 'analytics';
 *     install(bot) {
 *         bot.use(async (ctx, next) => {
 *             track(ctx.update);
 *             await next();
 *         });
 *     }
 * }
 *
 * bot.plugin(new AnalyticsPlugin());
 * ```
 */
export interface BotPlugin<C extends Context = Context> {
    /** Unique plugin identifier */
    name: string;
    /** Called when the plugin is registered on a bot */
    install(composer: Composer<C>, options?: any): void;
}

export interface PluginDependency {
    name: string;
    optional?: boolean;
}

export interface RegisteredPluginMetadata {
    name: string;
    version?: string;
    dependencies: readonly PluginDependency[];
    kind: 'legacy' | 'definition';
}

export interface PluginContext<
    C extends Context = Context,
    O extends object = Record<string, never>
> {
    bot: Bot<C>;
    composer: Composer<C>;
    options: Readonly<O>;
    metadata: RegisteredPluginMetadata;
    services: PluginServiceRegistry;
    provide<T>(key: string, value: T): void;
    require<T>(key: string): T;
    has(key: string): boolean;
}

export interface PluginDefinition<
    C extends Context = Context,
    O extends object = Record<string, never>
> {
    name: string;
    version?: string;
    defaults?: Partial<O>;
    dependencies?: readonly PluginDependency[];
    install(context: PluginContext<C, O>): void;
    setup?(context: PluginContext<C, O>): void | Promise<void>;
    teardown?(context: PluginContext<C, O>): void | Promise<void>;
}

export interface PluginInstance<
    C extends Context = Context,
    O extends object = Record<string, never>
> {
    definition: PluginDefinition<C, O>;
    options?: Partial<O>;
}

export type PluginRegistration<C extends Context = Context> =
    | BotPlugin<C>
    | PluginInstance<C, any>;

export class PluginDuplicateError extends Error {
    constructor(name: string) {
        super(`Plugin "${name}" is already registered.`);
        this.name = 'PluginDuplicateError';
    }
}

export class PluginDependencyError extends Error {
    constructor(pluginName: string, dependencyName: string) {
        super(`Plugin "${pluginName}" requires missing dependency "${dependencyName}".`);
        this.name = 'PluginDependencyError';
    }
}

export class PluginCycleError extends Error {
    constructor(path: string[]) {
        super(`Plugin dependency cycle detected: ${path.join(' -> ')}.`);
        this.name = 'PluginCycleError';
    }
}

export class PluginServiceError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PluginServiceError';
    }
}

export class PluginSetupError extends Error {
    constructor(pluginName: string, cause: unknown) {
        super(`Plugin "${pluginName}" failed during setup.`);
        this.name = 'PluginSetupError';
        (this as Error & { cause?: unknown }).cause = cause;
    }
}

export class PluginTeardownError extends Error {
    constructor(pluginName: string, cause: unknown) {
        super(`Plugin "${pluginName}" failed during teardown.`);
        this.name = 'PluginTeardownError';
        (this as Error & { cause?: unknown }).cause = cause;
    }
}

/**
 * Create a functional plugin from a middleware factory.
 *
 * Usage:
 * ```typescript
 * const myPlugin = createPlugin('greeting', (bot, opts) => {
 *     bot.command('hello', ctx => ctx.reply(opts.message));
 * });
 *
 * bot.plugin(myPlugin({ message: 'Hi!' }));
 * ```
 */
export function createPlugin<O = any, C extends Context = Context>(
    name: string,
    installer: (composer: Composer<C>, options: O) => void
): (options: O) => BotPlugin<C> {
    return (options: O) => ({
        name,
        install(composer: Composer<C>) {
            installer(composer, options);
        }
    });
}

export function definePlugin<
    C extends Context = Context,
    O extends object = Record<string, never>
>(
    definition: PluginDefinition<C, O>
): (options?: Partial<O>) => PluginInstance<C, O> {
    return (options?: Partial<O>) => ({
        definition,
        options,
    });
}

/**
 * Preset combines multiple plugins into a single installable unit.
 *
 * Usage:
 * ```typescript
 * const productionPreset = new Preset('production', [
 *     new LoggerPlugin(),
 *     new RateLimitPlugin({ limit: 30 }),
 *     new SessionPlugin()
 * ]);
 *
 * bot.plugin(productionPreset);
 * ```
 */
export class Preset<C extends Context = Context> implements BotPlugin<C> {
    constructor(
        public readonly name: string,
        private readonly plugins: PluginRegistration<C>[]
    ) {}

    install(composer: Composer<C>): void {
        const ordered = orderPluginRegistrations(this.plugins);
        const pluginHost = composer as Composer<C> & {
            plugin?: (plugin: PluginRegistration<C>) => unknown;
        };

        for (const plugin of ordered) {
            if (isPluginInstance(plugin)) {
                if (!pluginHost.plugin) {
                    throw new Error(
                        `Preset "${this.name}" contains definition-based plugins and must be installed on a Bot instance.`
                    );
                }
                pluginHost.plugin(plugin);
                continue;
            }

            plugin.install(composer);
        }
    }
}

interface NormalizedPlugin<C extends Context = Context> {
    metadata: RegisteredPluginMetadata;
    install: (context: PluginContext<C, any>) => void;
    setup?: (context: PluginContext<C, any>) => void | Promise<void>;
    teardown?: (context: PluginContext<C, any>) => void | Promise<void>;
}

interface RegisteredPlugin<C extends Context = Context> extends NormalizedPlugin<C> {
    context: PluginContext<C, any>;
    state: 'registered' | 'setup';
}

function isPluginInstance<C extends Context = Context>(
    plugin: PluginRegistration<C>
): plugin is PluginInstance<C, any> {
    return typeof plugin === 'object' && plugin !== null && 'definition' in plugin;
}

function normalizePlugin<C extends Context = Context>(
    plugin: PluginRegistration<C>
): NormalizedPlugin<C> {
    if (!isPluginInstance(plugin)) {
        return {
            metadata: {
                name: plugin.name,
                dependencies: [],
                kind: 'legacy',
            },
            install: (context: PluginContext<C, any>) => {
                plugin.install(context.composer);
            },
        };
    }

    const definition = plugin.definition;
    const options = Object.freeze({
        ...(definition.defaults ?? {}),
        ...(plugin.options ?? {}),
    });
    const metadata: RegisteredPluginMetadata = {
        name: definition.name,
        version: definition.version,
        dependencies: definition.dependencies ?? [],
        kind: 'definition',
    };

    return {
        metadata,
        install: (context: PluginContext<C, any>) => {
            definition.install({
                ...context,
                options,
            });
        },
        setup: definition.setup
            ? (context: PluginContext<C, any>) =>
                  definition.setup!({
                      ...context,
                      options,
                  })
            : undefined,
        teardown: definition.teardown
            ? (context: PluginContext<C, any>) =>
                  definition.teardown!({
                      ...context,
                      options,
                  })
            : undefined,
    };
}

export class PluginServiceRegistry {
    private readonly services = new Map<string, { owner: string; value: unknown }>();

    provide<T>(owner: string, key: string, value: T): void {
        const current = this.services.get(key);
        if (current) {
            throw new PluginServiceError(
                `Plugin "${owner}" cannot provide service "${key}" because it is already provided by "${current.owner}".`
            );
        }

        this.services.set(key, { owner, value });
    }

    require<T>(requester: string, key: string): T {
        const service = this.services.get(key);
        if (!service) {
            throw new PluginServiceError(
                `Plugin "${requester}" requires missing service "${key}".`
            );
        }

        return service.value as T;
    }

    has(key: string): boolean {
        return this.services.has(key);
    }

    clearOwner(owner: string): void {
        for (const [key, service] of this.services.entries()) {
            if (service.owner === owner) {
                this.services.delete(key);
            }
        }
    }

    clear(): void {
        this.services.clear();
    }
}

function createPluginContext<C extends Context = Context>(
    bot: Bot<C>,
    metadata: RegisteredPluginMetadata,
    services: PluginServiceRegistry
): PluginContext<C, any> {
    return {
        bot,
        composer: bot,
        options: Object.freeze({}),
        metadata,
        services,
        provide: <T>(key: string, value: T) => {
            services.provide(metadata.name, key, value);
        },
        require: <T>(key: string) => services.require<T>(metadata.name, key),
        has: (key: string) => services.has(key),
    };
}

function visitPluginDependency(
    name: string,
    records: ReadonlyMap<string, RegisteredPlugin<any> | Pick<RegisteredPlugin<any>, 'metadata'>>,
    visiting: Set<string>,
    visited: Set<string>,
    ordered: string[],
    options?: { allowMissing?: boolean }
): void {
    if (visited.has(name)) return;
    if (visiting.has(name)) {
        throw new PluginCycleError([...visiting, name]);
    }

    const record = records.get(name);
    if (!record) return;

    visiting.add(name);
    for (const dependency of record.metadata.dependencies) {
        if ((dependency.optional || options?.allowMissing) && !records.has(dependency.name)) continue;
        if (!records.has(dependency.name)) {
            throw new PluginDependencyError(record.metadata.name, dependency.name);
        }
        visitPluginDependency(dependency.name, records, visiting, visited, ordered, options);
    }
    visiting.delete(name);
    visited.add(name);
    ordered.push(name);
}

function buildOrderedPluginNames<C extends Context = Context>(
    records: ReadonlyMap<string, RegisteredPlugin<C>>,
    options?: { allowMissing?: boolean }
): string[] {
    const orderedNames: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    for (const pluginName of records.keys()) {
        visitPluginDependency(pluginName, records, visiting, visited, orderedNames, options);
    }

    return orderedNames;
}

export function orderPluginRegistrations<C extends Context = Context>(
    plugins: readonly PluginRegistration<C>[]
): PluginRegistration<C>[] {
    const records = new Map<string, { plugin: PluginRegistration<C>; metadata: RegisteredPluginMetadata }>();

    for (const plugin of plugins) {
        const normalized = normalizePlugin(plugin);
        const { name } = normalized.metadata;
        if (records.has(name)) {
            throw new PluginDuplicateError(name);
        }
        records.set(name, { plugin, metadata: normalized.metadata });
    }

    const orderedNames: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const registered = new Map(
        [...records.entries()].map(([name, value]) => [name, { metadata: value.metadata }])
    );

    for (const name of records.keys()) {
        visitPluginDependency(name, registered, visiting, visited, orderedNames, {
            allowMissing: true,
        });
    }

    return orderedNames.map(name => records.get(name)!.plugin);
}

export class PluginRegistry<C extends Context = Context> {
    private readonly plugins = new Map<string, RegisteredPlugin<C>>();
    private readonly services = new PluginServiceRegistry();
    private setupComplete = false;

    constructor(private readonly bot: Bot<C>) {}

    register(plugin: PluginRegistration<C>): RegisteredPluginMetadata {
        const normalized = normalizePlugin(plugin);
        const { name } = normalized.metadata;

        if (this.plugins.has(name)) {
            throw new PluginDuplicateError(name);
        }

        for (const dependency of normalized.metadata.dependencies) {
            if (!dependency.optional && !this.plugins.has(dependency.name)) {
                throw new PluginDependencyError(name, dependency.name);
            }
        }

        const record: RegisteredPlugin<C> = {
            ...normalized,
            context: createPluginContext(this.bot, normalized.metadata, this.services),
            state: 'registered',
        };

        const nextPlugins = new Map(this.plugins);
        nextPlugins.set(name, record);
        buildOrderedPluginNames(nextPlugins);

        this.plugins.set(name, record);
        try {
            record.install(record.context);
        } catch (error) {
            this.plugins.delete(name);
            this.services.clearOwner(name);
            throw error;
        }

        if (this.setupComplete) {
            this.setupComplete = false;
        }

        return normalized.metadata;
    }

    has(name: string): boolean {
        return this.plugins.has(name);
    }

    get(name: string): RegisteredPluginMetadata | undefined {
        return this.plugins.get(name)?.metadata;
    }

    list(): RegisteredPluginMetadata[] {
        return [...this.plugins.values()].map(plugin => plugin.metadata);
    }

    async setupAll(): Promise<void> {
        if (this.setupComplete) return;

        const orderedNames = buildOrderedPluginNames(this.plugins);
        const completed: RegisteredPlugin<C>[] = [];

        try {
            for (const name of orderedNames) {
                const plugin = this.plugins.get(name);
                if (!plugin || !plugin.setup || plugin.state === 'setup') continue;

                await plugin.setup(plugin.context);
                plugin.state = 'setup';
                completed.push(plugin);
            }
            this.setupComplete = true;
        } catch (error) {
            for (const plugin of completed.reverse()) {
                try {
                    await plugin.teardown?.(plugin.context);
                } catch {
                    // Best-effort rollback; preserve the original setup failure.
                } finally {
                    plugin.state = 'registered';
                    this.services.clearOwner(plugin.metadata.name);
                }
            }

            const failedName = orderedNames[completed.length] ?? 'unknown';
            this.services.clearOwner(failedName);
            throw new PluginSetupError(failedName, error);
        }
    }

    async teardownAll(): Promise<void> {
        if (!this.setupComplete) return;

        const orderedNames = buildOrderedPluginNames(this.plugins);
        let firstError: PluginTeardownError | undefined;

        for (const name of [...orderedNames].reverse()) {
            const plugin = this.plugins.get(name);
            if (!plugin || plugin.state !== 'setup') continue;

            try {
                await plugin.teardown?.(plugin.context);
            } catch (error) {
                firstError ??= new PluginTeardownError(plugin.metadata.name, error);
            } finally {
                plugin.state = 'registered';
                this.services.clearOwner(plugin.metadata.name);
            }
        }

        this.setupComplete = false;
        this.services.clear();

        if (firstError) {
            throw firstError;
        }
    }

    isSetupComplete(): boolean {
        return this.setupComplete;
    }
}
