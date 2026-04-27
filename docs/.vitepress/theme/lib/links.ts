import { withBase } from 'vitepress';

const ABSOLUTE_URL_PATTERN = /^[a-z][a-z\d+.-]*:/i;

/**
 * Resolves internal docs links to static `.html` files so GitHub Pages direct refreshes
 * do not rely on SPA 404 fallback behavior.
 */
export const resolveDocsHref = (href: string): string => {
    if (!href || href.startsWith('#') || ABSOLUTE_URL_PATTERN.test(href)) {
        return href;
    }

    const [, rawPath = '', suffix = ''] = href.match(/^([^?#]*)([?#].*)?$/) ?? [];
    const path = rawPath || '/';

    if (path === '/' || path.endsWith('/')) {
        return withBase(`${path}${suffix}`);
    }

    const filename = path.slice(path.lastIndexOf('/') + 1);
    const normalizedPath = filename.includes('.') ? path : `${path}.html`;

    return withBase(`${normalizedPath}${suffix}`);
};
