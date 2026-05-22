import type { Context, Middleware } from 'vibegram';

export interface TemplatePluginOptions {
    enabled?: boolean;
}

export function __PLUGIN_EXPORT__<C extends Context = Context>(
    options: TemplatePluginOptions = {}
): Middleware<C> {
    const enabled = options.enabled ?? true;

    return async (_ctx, next) => {
        if (!enabled) {
            return next();
        }

        return next();
    };
}
