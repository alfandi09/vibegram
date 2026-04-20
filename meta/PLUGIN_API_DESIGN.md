# Plugin API Technical Design

Status: Draft

Owner: Maintainers

Last updated: 2026-04-20

## 1. Overview

This document defines a technical design for a stable plugin API in `vibegram`.

The current plugin surface in [src/plugin.ts](/D:/NPM%20TELEGRAM/src/plugin.ts:1) is intentionally small and works well for simple middleware composition. However, it does not yet provide the guarantees required for a first-party or third-party plugin ecosystem.

This proposal introduces a registry-backed plugin model with explicit lifecycle, dependency resolution, service sharing, runtime safety, and backward compatibility for the existing helper APIs.

## 2. Problem Statement

The current plugin contract is:

- `name`
- `install(composer, options?)`
- `createPlugin()`
- `Preset`

This shape is easy to use, but it has several limitations:

- no dependency declaration between plugins
- no duplicate plugin detection
- no lifecycle after installation
- no teardown path for external resources
- no shared service registry
- no plugin metadata for compatibility checks
- no built-in installation diagnostics

As the framework grows, this creates risk for modules such as caching, queueing, observability, storage adapters, and future ecosystem packages.

## 3. Goals

- Preserve a lightweight authoring model for simple plugins.
- Provide deterministic install and teardown semantics.
- Allow plugins to depend on other plugins without manual ordering in application code.
- Provide a stable service-sharing mechanism between plugins.
- Support future first-party packages such as storage adapters and observability integrations.
- Preserve compatibility with the current `plugin()` helpers during migration.

## 4. Non-Goals

- Remote plugin download or marketplace support
- Running untrusted plugins in a sandbox
- Hot reload of plugins at runtime
- MTProto support as part of the core plugin API
- Full automatic type composition for arbitrary `Context` mutation in the first version

## 5. Design Principles

### 5.1 Keep the simple path simple

A middleware-style plugin should remain easy to write.

### 5.2 Make lifecycle explicit

Plugins that allocate resources must have a matching cleanup path.

### 5.3 Prefer composition over hidden coupling

Plugins should interact through declared dependencies and provided services rather than reaching into private internals.

### 5.4 Fail early on invalid topology

Duplicate plugins, missing dependencies, and dependency cycles should fail at registration time whenever possible.

### 5.5 Preserve compatibility where reasonable

Existing users of `createPlugin()` and `Preset` should not be forced into a breaking migration immediately.

## 6. Proposed Architecture

The plugin system will introduce three core concepts:

- `PluginDefinition`: the plugin's public contract
- `PluginRegistry`: the internal runtime that tracks plugins and dependencies
- `PluginContext`: the controlled interface exposed to a plugin during installation and lifecycle

### 6.1 High-level flow

1. User registers a plugin with `bot.plugin(...)`.
2. The bot forwards registration to `PluginRegistry`.
3. The registry validates name uniqueness, dependencies, and compatibility.
4. The registry resolves installation order.
5. The plugin receives a `PluginContext`.
6. The plugin runs `install()`.
7. The plugin optionally runs `setup()`.
8. On shutdown, the registry calls `teardown()` in reverse dependency order.

## 7. Public API Proposal

### 7.1 PluginDefinition

```ts
export interface PluginDefinition<
    C extends Context = Context,
    O extends object = {}
> {
    name: string;
    version?: string;
    compatibility?: PluginCompatibility;
    defaults?: Partial<O>;
    dependencies?: readonly PluginDependency[];
    install(context: PluginContext<C, O>): void | Promise<void>;
    setup?(context: PluginContext<C, O>): void | Promise<void>;
    teardown?(context: PluginContext<C, O>): void | Promise<void>;
}
```

### 7.2 PluginDependency

```ts
export interface PluginDependency {
    name: string;
    optional?: boolean;
}
```

### 7.3 PluginCompatibility

```ts
export interface PluginCompatibility {
    vibegram?: string;
}
```

### 7.4 PluginInstance

```ts
export interface PluginInstance<
    C extends Context = Context,
    O extends object = {}
> {
    definition: PluginDefinition<C, O>;
    options?: Partial<O>;
}
```

### 7.5 PluginContext

```ts
export interface PluginContext<
    C extends Context = Context,
    O extends object = {}
> {
    bot: Bot<C>;
    composer: Composer<C>;
    options: Readonly<O>;
    services: PluginServiceRegistry;
    metadata: RegisteredPluginMetadata;
    provide<T>(key: string, value: T): void;
    require<T>(key: string): T;
    has(key: string): boolean;
}
```

### 7.6 Bot Surface

```ts
class Bot<C extends Context = Context> extends Composer<C> {
    plugin<O extends object>(plugin: PluginDefinition<C, O> | PluginInstance<C, O>): this;
    hasPlugin(name: string): boolean;
    getPlugin(name: string): RegisteredPluginMetadata | undefined;
    listPlugins(): RegisteredPluginMetadata[];
}
```

## 8. Lifecycle Semantics

### 8.1 Registration

Registration happens when `bot.plugin(...)` is called.

Responsibilities:

- normalize input into a `PluginInstance`
- validate uniqueness
- resolve defaults and options
- record metadata
- verify dependency graph

### 8.2 Install

`install()` is the synchronous or async phase where plugins wire themselves into the bot.

Allowed operations:

- add middleware
- add commands or action handlers
- subscribe to framework hooks
- expose services

`install()` should not be used for long-running network bootstrapping if that work can fail independently from registration.

### 8.3 Setup

`setup()` is optional and intended for async initialization.

Examples:

- connect to Redis
- initialize metrics exporters
- warm caches
- create queue workers

### 8.4 Teardown

`teardown()` is optional and runs in reverse install order.

Examples:

- close connections
- stop queue workers
- clear timers
- flush buffers

## 9. Dependency Resolution

Plugins may declare dependencies on other plugins by name.

Rules:

- plugin names must be unique
- required dependencies must exist before successful registration completes
- optional dependencies may be absent
- dependency cycles are rejected
- installation order follows topological dependency order
- teardown order is the reverse of resolved install order

Example:

```ts
const cachePlugin: PluginDefinition = {
    name: 'cache',
    install(ctx) {
        ctx.provide('cache', createCacheStore());
    }
};

const rateLimitPlugin: PluginDefinition = {
    name: 'rate-limit',
    dependencies: [{ name: 'cache' }],
    install(ctx) {
        const cache = ctx.require<CacheStore>('cache');
        ctx.bot.use(createRateLimitMiddleware(cache));
    }
};
```

## 10. Service Registry

The plugin system will include a service registry to support loose coupling between plugins.

### 10.1 Use cases

- session store
- cache store
- queue
- logger
- i18n loader
- metrics exporter

### 10.2 Rules

- services are keyed by string in v1
- duplicate service registration throws by default
- plugins can probe availability through `has()`
- `require()` throws a typed error when the service does not exist

### 10.3 Why a registry instead of direct imports

Direct imports couple plugins to each other's file layout and implementation details. A service registry creates a stable boundary that survives refactors and supports third-party packages more cleanly.

## 11. Option Resolution

The framework should centralize plugin option resolution.

Resolution order:

1. plugin defaults
2. user options
3. plugin-level normalization or validation

Recommended helper:

```ts
export function definePlugin<
    C extends Context = Context,
    O extends object = {}
>(definition: PluginDefinition<C, O>) {
    return (options?: Partial<O>): PluginInstance<C, O> => ({
        definition,
        options
    });
}
```

This keeps simple plugins ergonomic while giving the registry a consistent input shape.

## 12. Error Model

The plugin runtime should expose dedicated error types:

- `PluginDuplicateError`
- `PluginDependencyError`
- `PluginCycleError`
- `PluginCompatibilityError`
- `PluginServiceError`
- `PluginInstallError`

Error handling policy:

- invalid topology errors should fail registration immediately
- install and setup failures should include the plugin name
- teardown failures should be isolated and surfaced, not silently ignored

## 13. Backward Compatibility

Backward compatibility is important for the current release line.

### 13.1 Legacy support

The following should remain supported during migration:

- `BotPlugin`
- `createPlugin()`
- `Preset`

### 13.2 Compatibility adapter

Internally, legacy plugins should be wrapped into the new registry model.

Equivalent mapping:

- legacy `name` -> new `name`
- legacy `install(composer)` -> new `install(context)` using `context.composer`
- no lifecycle -> no `setup()` or `teardown()`

### 13.3 Migration path

Migration should be additive:

- old plugin shape continues to work
- new plugin shape is documented as preferred
- first-party plugins gradually move to the new API

## 14. Context Augmentation Strategy

Plugins often want to add helpers to `ctx`.

This proposal intentionally separates runtime registration from compile-time augmentation:

- runtime plugin behavior remains flexible
- plugin authors document declaration merging for TypeScript consumers
- the core plugin API does not try to solve automatic type inference for arbitrary `ctx` mutation in v1

This keeps the runtime design stable without blocking future typing improvements.

## 15. Internal Implementation Sketch

### 15.1 New internal classes

- `PluginRegistry`
- `PluginServiceRegistry`
- `RegisteredPlugin`

### 15.2 Bot integration

`Bot` gains a private registry instance:

```ts
class Bot<C extends Context = Context> extends Composer<C> {
    private readonly plugins = new PluginRegistry<C>(this);
}
```

### 15.3 Shutdown integration

`Bot.stop()` should call into the registry teardown flow after update processing is drained and before final shutdown hooks complete, or in a clearly documented equivalent order.

## 16. Testing Plan

Minimum test coverage before release:

- installs a simple plugin
- rejects duplicate plugin names
- resolves dependency ordering correctly
- rejects missing required dependencies
- rejects dependency cycles
- exposes and consumes services
- runs teardown in reverse order
- preserves legacy `createPlugin()` behavior
- preserves legacy `Preset` behavior

## 17. Rollout Plan

### Phase 1

- add internal registry
- normalize plugin input
- enforce duplicate detection
- support dependency ordering
- keep legacy API working through adaptation

### Phase 2

- add service registry
- add lifecycle `setup()` and `teardown()`
- add plugin inspection methods on `Bot`
- add typed plugin errors

### Phase 3

- migrate selected first-party modules
- add plugin authoring documentation
- add examples and test helpers

## 18. Open Questions

- Should `setup()` run immediately at registration or lazily during `launch()`?
- Should compatibility checks support semver ranges in v1 or only major-version checks?
- Should service override ever be allowed intentionally, or always remain an error?
- Should teardown be exposed as a dedicated public disposal method in addition to `bot.stop()`?

## 19. Recommendation

Implement a conservative `Plugin API v1` centered on dependency ordering, lifecycle safety, and service sharing.

This gives `vibegram` a strong ecosystem foundation while keeping the current authoring model approachable and avoiding premature expansion into unrelated concerns such as MTProto or remote plugin distribution.
