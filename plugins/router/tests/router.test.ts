import { describe, expect, it } from 'vitest';

import {
    chatTypeRouter,
    getUpdateType,
    router,
    sessionRouter,
    updateTypeRouter,
    type RouterRoutes,
} from '../src/index';

describe('@vibegram/router', () => {
    it('should dispatch by a custom route key', async () => {
        const calls: string[] = [];
        const middleware = router<TestContext, 'main' | 'checkout'>(ctx => ctx.session.flow, {
            main: async () => {
                calls.push('main');
            },
            checkout: async () => {
                calls.push('checkout');
            },
        });

        await middleware(createContext({ session: { flow: 'checkout' } }), async () => {
            calls.push('next');
        });

        expect(calls).toEqual(['checkout']);
    });

    it('should route by session state with a helper', async () => {
        const calls: string[] = [];
        const middleware = sessionRouter<TestContext, 'support' | 'main'>('flow', {
            main: async () => {
                calls.push('main');
            },
            support: async () => {
                calls.push('support');
            },
        });

        await middleware(createContext({ session: { flow: 'support' } }), async () => {
            calls.push('next');
        });

        expect(calls).toEqual(['support']);
    });

    it('should route by Telegram chat type and update type helpers', async () => {
        const calls: string[] = [];
        const byChat = chatTypeRouter<TestContext>({
            private: async () => {
                calls.push('private');
            },
            group: async () => {
                calls.push('group');
            },
        });
        const byUpdate = updateTypeRouter<TestContext>({
            callback_query: async () => {
                calls.push('callback');
            },
        });

        await byChat(createContext({ chat: { id: 1, type: 'private' } }), async () => {
            calls.push('chat-next');
        });
        await byUpdate(createContext({ update: { update_id: 2, callback_query: { id: 'cbq' } } }), async () => {
            calls.push('update-next');
        });

        expect(calls).toEqual(['private', 'callback']);
    });

    it('should call fallback when the route key is unknown', async () => {
        const calls: string[] = [];
        const middleware = router<TestContext, 'known'>(ctx => ctx.session.flow, {
            known: async () => {
                calls.push('known');
            },
            fallback: async (ctx, next) => {
                calls.push(`fallback:${String(ctx.session.flow)}`);
                await next();
            },
        });

        await middleware(createContext({ session: { flow: 'missing' } }), async () => {
            calls.push('next');
        });

        expect(calls).toEqual(['fallback:missing', 'next']);
    });

    it('should preserve middleware order when a route calls next', async () => {
        const calls: string[] = [];
        const middleware = router<TestContext, 'main'>(() => 'main', {
            main: async (_ctx, next) => {
                calls.push('route-before');
                await next();
                calls.push('route-after');
            },
        });

        calls.push('outer-before');
        await middleware(createContext(), async () => {
            calls.push('downstream');
        });
        calls.push('outer-after');

        expect(calls).toEqual(['outer-before', 'route-before', 'downstream', 'route-after', 'outer-after']);
    });

    it('should support async route resolvers and composer-like route handlers', async () => {
        const calls: string[] = [];
        const composerLike = {
            middleware() {
                return async (_ctx: TestContext, next: NextFunction) => {
                    calls.push('composer-like');
                    await next();
                };
            },
        };
        const middleware = router<TestContext, 'async'>(async () => 'async', {
            async: composerLike,
        });

        await middleware(createContext(), async () => {
            calls.push('next');
        });

        expect(calls).toEqual(['composer-like', 'next']);
    });

    it('should expose Telegram-style update type detection', () => {
        expect(getUpdateType({ update_id: 1, message: {} })).toBe('message');
        expect(getUpdateType({ update_id: 2, edited_channel_post: {} })).toBe('edited_channel_post');
        expect(getUpdateType({ update_id: 3 })).toBeUndefined();
    });

    it('should type route keys', () => {
        type RouteKey = 'main' | 'settings';
        const routes = {
            main: async () => {},
            settings: async () => {},
        } satisfies RouterRoutes<TestContext, RouteKey>;

        function assertRouterTypes(key: RouteKey) {
            const middleware = router<TestContext, RouteKey>(() => key, routes);
            void middleware;
        }

        expect(typeof assertRouterTypes).toBe('function');
    });
});

function createContext(overrides: Partial<TestContext> = {}): TestContext {
    return {
        update: { update_id: 1, message: {} },
        chat: { id: 1, type: 'private' },
        session: { flow: 'main' },
        ...overrides,
    };
}

type NextFunction = () => Promise<void>;

interface TestContext {
    update: Record<string, unknown>;
    chat?: {
        id: number;
        type: string;
    };
    session: Record<string, unknown>;
}
