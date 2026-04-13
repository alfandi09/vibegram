import { Middleware } from './composer';
import { Context } from './context';

/**
 * Wizard state machine for managing sequential multi-step conversations.
 * Provides linear step control using session middleware as its backing store.
 */
export class Wizard {
    constructor(public readonly id: string, private steps: ((ctx: Context) => Promise<void> | void)[]) {}

    /**
     * Register this Wizard as bot middleware.
     */
    middleware(): Middleware<Context> {
        return async (ctx, next) => {
            if (!ctx.session) throw new Error('Wizard requires session() middleware to be registered before it.');

            // Check whether the current user is participating in this Wizard.
            if (ctx.session.__wizard_id === this.id) {
                const cursor = ctx.session.__wizard_cursor || 0;

                // Attach step navigation helpers to the context.
                ctx.wizard = {
                    state: ctx.session.__wizard_state || {},
                    next: () => {
                        ctx.session.__wizard_cursor = cursor + 1;
                        ctx.session.__wizard_state = ctx.wizard!.state;
                    },
                    leave: () => {
                        delete ctx.session.__wizard_id;
                        delete ctx.session.__wizard_cursor;
                        delete ctx.session.__wizard_state;
                    },
                    cursor: cursor
                };

                const currentStepExecutor = this.steps[cursor];

                // Execute the handler for the current step.
                if (currentStepExecutor) {
                    await currentStepExecutor(ctx);
                } else {
                    // All steps exhausted — terminate the Wizard automatically.
                    ctx.wizard.leave();
                    return next();
                }

                // Stop propagation so global handlers don't interfere with Wizard flow.
                return;
            }

            // User is not in this Wizard — pass through.
            return next();
        };
    }

    /**
     * Enter the Wizard and execute the first step immediately.
     */
    async enter(ctx: Context) {
        if (!ctx.session) throw new Error('Wizard.enter() requires session() middleware.');

        ctx.session.__wizard_id = this.id;
        ctx.session.__wizard_cursor = 0;
        ctx.session.__wizard_state = {};

        ctx.wizard = {
            state: ctx.session.__wizard_state,
            next: () => {
                ctx.session.__wizard_cursor = 1;
                ctx.session.__wizard_state = ctx.wizard!.state;
            },
            leave: () => {
                delete ctx.session.__wizard_id;
                delete ctx.session.__wizard_cursor;
                delete ctx.session.__wizard_state;
            },
            cursor: 0
        };

        // Run step 0 immediately.
        const firstStep = this.steps[0];
        if (firstStep) await firstStep(ctx);
    }
}
