export type MaybePromise<T> = T | Promise<T>;
export type RouteKey = string;
export type NextFunction = () => Promise<void>;

export interface RouterContext {
    update?: Record<string, unknown>;
    chat?: {
        type?: string;
        [key: string]: unknown;
    };
    session?: Record<string, unknown>;
    [key: string]: unknown;
}

export type RouterMiddleware<C extends RouterContext = RouterContext> = (
    ctx: C,
    next: NextFunction
) => MaybePromise<void>;

export interface MiddlewareProvider<C extends RouterContext = RouterContext> {
    middleware(): RouterMiddleware<C>;
}

export type RouteHandler<C extends RouterContext = RouterContext> =
    | RouterMiddleware<C>
    | MiddlewareProvider<C>;

export type RouterResolver<C extends RouterContext, K extends RouteKey> = (
    ctx: C
) => MaybePromise<K | string | null | undefined>;

export type RouterRoutes<C extends RouterContext, K extends RouteKey> = Partial<
    Record<K, RouteHandler<C>>
> & {
    fallback?: RouteHandler<C>;
};

export interface RouterOptions<C extends RouterContext = RouterContext> {
    fallback?: RouteHandler<C>;
}

export type TelegramChatType = 'private' | 'group' | 'supergroup' | 'channel' | (string & {});

/**
 * Route updates to a middleware tree selected by a route-key resolver.
 * Unknown keys call the fallback handler when present, otherwise downstream `next()`.
 */
export function router<C extends RouterContext, K extends RouteKey>(
    resolver: RouterResolver<C, K>,
    routes: RouterRoutes<C, K>,
    options: RouterOptions<C> = {}
): RouterMiddleware<C> {
    return async (ctx, next) => {
        const key = await resolver(ctx);
        const handler = key === null || key === undefined ? undefined : routes[key as K];
        const fallback = routes.fallback ?? options.fallback;
        const selected = handler ?? fallback;

        if (!selected) {
            await next();
            return;
        }

        await toMiddleware(selected)(ctx, next);
    };
}

/** Route by `ctx.session[field]`, useful for state machines and multi-step flows. */
export function sessionRouter<C extends RouterContext, K extends RouteKey>(
    field: string | ((session: Record<string, unknown> | undefined, ctx: C) => MaybePromise<K | string | null | undefined>),
    routes: RouterRoutes<C, K>,
    options?: RouterOptions<C>
): RouterMiddleware<C> {
    return router(
        async ctx => {
            if (typeof field === 'function') {
                return field(ctx.session, ctx);
            }
            return normalizeRouteKey(ctx.session?.[field]);
        },
        routes,
        options
    );
}

/** Route by official Telegram chat types: private, group, supergroup, or channel. */
export function chatTypeRouter<C extends RouterContext>(
    routes: RouterRoutes<C, TelegramChatType>,
    options?: RouterOptions<C>
): RouterMiddleware<C> {
    return router(ctx => normalizeRouteKey(ctx.chat?.type), routes, options);
}

/** Route by the first root update key other than `update_id`, e.g. message or callback_query. */
export function updateTypeRouter<C extends RouterContext>(
    routes: RouterRoutes<C, string>,
    options?: RouterOptions<C>
): RouterMiddleware<C> {
    return router(ctx => getUpdateType(ctx.update), routes, options);
}

/** Detect the Telegram Bot API update type from an Update-like object. */
export function getUpdateType(update: Record<string, unknown> | undefined): string | undefined {
    if (!update) return undefined;
    return Object.keys(update).find(key => key !== 'update_id' && update[key] !== undefined);
}

function toMiddleware<C extends RouterContext>(handler: RouteHandler<C>): RouterMiddleware<C> {
    if (typeof handler === 'function') {
        return handler;
    }
    return handler.middleware();
}

function normalizeRouteKey(value: unknown): string | undefined {
    if (value === null || value === undefined) return undefined;
    return String(value);
}
