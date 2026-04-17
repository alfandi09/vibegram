import { describe, expect, it, vi } from 'vitest';
import { Wizard } from '../src/wizard';
import { createContext, createNext, makeMessageUpdate } from './helpers/mock';

describe('Wizard', () => {
    it('throws when session middleware is missing', async () => {
        const wizard = new Wizard('signup', [async () => {}]);
        const { ctx } = createContext(makeMessageUpdate('start'));

        await expect(wizard.middleware()(ctx as any, async () => {})).rejects.toThrow(
            'Wizard requires session() middleware'
        );
        await expect(wizard.enter(ctx as any)).rejects.toThrow(
            'Wizard.enter() requires session() middleware'
        );
    });

    it('enter() initializes state and runs the first step immediately', async () => {
        const firstStep = vi.fn(async (ctx: any) => {
            ctx.wizard.state.name = 'Ada';
            ctx.wizard.next();
        });
        const wizard = new Wizard('signup', [firstStep]);
        const { ctx } = createContext(makeMessageUpdate('start'));
        ctx.session = {};

        await wizard.enter(ctx as any);

        expect(firstStep).toHaveBeenCalledWith(ctx);
        expect(ctx.session.__wizard_id).toBe('signup');
        expect(ctx.session.__wizard_cursor).toBe(1);
        expect(ctx.session.__wizard_state).toEqual({ name: 'Ada' });
    });

    it('middleware executes active steps and leaves automatically when exhausted', async () => {
        const stepOne = vi.fn(async (ctx: any) => {
            ctx.wizard.state.email = 'ada@example.com';
            ctx.wizard.next();
        });
        const stepTwo = vi.fn(async (ctx: any) => {
            ctx.wizard.leave();
        });
        const wizard = new Wizard('signup', [stepOne, stepTwo]);

        const activeCtx = createContext(makeMessageUpdate('continue')).ctx;
        activeCtx.session = { __wizard_id: 'signup', __wizard_cursor: 0, __wizard_state: {} };
        await wizard.middleware()(activeCtx as any, async () => {
            throw new Error('active wizard should not call next');
        });

        expect(stepOne).toHaveBeenCalledWith(activeCtx);
        expect(activeCtx.session.__wizard_cursor).toBe(1);
        expect(activeCtx.session.__wizard_state).toEqual({ email: 'ada@example.com' });

        await wizard.middleware()(activeCtx as any, async () => {
            throw new Error('active wizard should not call next');
        });
        expect(stepTwo).toHaveBeenCalledWith(activeCtx);
        expect(activeCtx.session.__wizard_id).toBeUndefined();

        const exhaustedCtx = createContext(makeMessageUpdate('continue')).ctx;
        exhaustedCtx.session = { __wizard_id: 'signup', __wizard_cursor: 99, __wizard_state: {} };
        const next = vi.fn(async () => {});
        await wizard.middleware()(exhaustedCtx as any, next);
        expect(next).toHaveBeenCalledTimes(1);
        expect(exhaustedCtx.session.__wizard_id).toBeUndefined();
    });

    it('falls through when the user is not in the wizard', async () => {
        const wizard = new Wizard('signup', [async () => {}]);
        const { ctx } = createContext(makeMessageUpdate('hello'));
        ctx.session = {};
        const { next, called } = createNext();

        await wizard.middleware()(ctx as any, next);

        expect(called()).toBe(true);
    });
});
