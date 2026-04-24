import { Composer, Middleware } from './composer';
import { Context } from './context';

/**
 * A Scene is an isolated "room" (sandbox). Events dispatched by a user while
 * inside a Scene are handled exclusively by that Scene's middleware composer.
 */
export class Scene<C extends Context = Context> extends Composer<C> {
    constructor(public readonly id: string) {
        super();
    }
}

/**
 * Stage is the central orchestrator that manages scene registration
 * and routes incoming updates to the currently active Scene.
 */
export class Stage<C extends Context = Context> {
    private scenes = new Map<string, Scene<C>>();

    constructor(scenes: Scene<C>[]) {
        scenes.forEach(s => this.scenes.set(s.id, s));
    }

    /**
     * Returns a middleware that intercepts updates for users inside a Scene
     * and routes them to the appropriate Scene composer.
     * Must be registered after the session() middleware.
     */
    middleware(): Middleware<C> {
        return async (ctx, next) => {
            if (!ctx.session)
                throw new Error('Stage middleware requires session() to be registered before it.');

            // Inject scene control helpers into the context.
            ctx.scene = {
                state: ctx.session.__scene_state || {},
                current: ctx.session.__scene_id,
                enter: (sceneId: string, initialState?: any) => {
                    ctx.session.__scene_id = sceneId;
                    ctx.session.__scene_state = initialState || {};
                    ctx.scene!.current = sceneId;
                    ctx.scene!.state = ctx.session.__scene_state;
                },
                reenter: (initialState?: any) => {
                    if (!ctx.session.__scene_id) return;
                    ctx.session.__scene_state = initialState || {};
                    ctx.scene!.state = ctx.session.__scene_state;
                },
                leave: () => {
                    delete ctx.session.__scene_id;
                    delete ctx.session.__scene_state;
                    ctx.scene!.current = undefined;
                    ctx.scene!.state = {};
                },
            };

            const currentSceneId = ctx.session.__scene_id;

            if (currentSceneId) {
                const activeScene = this.scenes.get(currentSceneId);
                if (activeScene) {
                    let handledLocally = true;

                    // Route the update into the active Scene's middleware.
                    // If the Scene calls next(), the update falls through to the global bot.
                    await activeScene.middleware()(ctx, async () => {
                        handledLocally = false;
                        await next();
                    });

                    // Stop propagation either way: the Scene already handled the
                    // update or explicitly delegated to the global chain above.
                    if (handledLocally) return;
                    return;
                }
            }

            // User is not in any Scene — pass through to the global bot middleware.
            return next();
        };
    }
}
