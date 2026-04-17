import { describe, expect, it, vi } from 'vitest';
import { Scene, Stage } from '../src/scene';
import { createContext, createNext, makeMessageUpdate } from './helpers/mock';

describe('Scene and Stage', () => {
    it('throws if stage middleware runs without session', async () => {
        const stage = new Stage([new Scene('support')]);
        const { ctx } = createContext(makeMessageUpdate('hello'));

        await expect(stage.middleware()(ctx as any, async () => {})).rejects.toThrow(
            'Stage middleware requires session()'
        );
    });

    it('injects scene helpers and falls through when no active scene exists', async () => {
        const stage = new Stage([new Scene('support')]);
        const { ctx } = createContext(makeMessageUpdate('hello'));
        ctx.session = {};
        const { next, called } = createNext();

        await stage.middleware()(ctx as any, next);

        expect(called()).toBe(true);
        expect(ctx.scene?.current).toBeUndefined();
        ctx.scene?.enter('support', { topic: 'billing' });
        expect(ctx.session.__scene_id).toBe('support');
        expect(ctx.session.__scene_state).toEqual({ topic: 'billing' });
        ctx.scene?.leave();
        expect(ctx.session.__scene_id).toBeUndefined();
        expect(ctx.session.__scene_state).toBeUndefined();
    });

    it('routes updates to the active scene and stops global propagation when handled', async () => {
        const scene = new Scene('support');
        const handler = vi.fn(async () => {});
        scene.use(handler);
        const stage = new Stage([scene]);
        const { ctx } = createContext(makeMessageUpdate('hello'));
        ctx.session = { __scene_id: 'support', __scene_state: { step: 1 } };
        const globalNext = vi.fn(async () => {});

        await stage.middleware()(ctx as any, globalNext);

        expect(handler).toHaveBeenCalledWith(ctx, expect.any(Function));
        expect(globalNext).not.toHaveBeenCalled();
        expect(ctx.scene?.current).toBe('support');
        expect(ctx.scene?.state).toEqual({ step: 1 });
    });

    it('falls through when active scene calls next or scene id is missing from registry', async () => {
        const scene = new Scene('support');
        scene.use(async (_ctx, next) => {
            await next();
        });
        const stage = new Stage([scene]);

        const activeCtx = createContext(makeMessageUpdate('hello')).ctx;
        activeCtx.session = { __scene_id: 'support', __scene_state: {} };
        const activeNext = vi.fn(async () => {});
        await stage.middleware()(activeCtx as any, activeNext);
        expect(activeNext).toHaveBeenCalledTimes(1);

        const missingCtx = createContext(makeMessageUpdate('hello')).ctx;
        missingCtx.session = { __scene_id: 'missing' };
        const missingNext = vi.fn(async () => {});
        await stage.middleware()(missingCtx as any, missingNext);
        expect(missingNext).toHaveBeenCalledTimes(1);
    });
});
