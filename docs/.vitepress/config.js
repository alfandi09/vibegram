import { fileURLToPath, URL } from 'node:url';

export default async () => {
    const { default: tailwindcss } = await import('@tailwindcss/vite');

    return {
        title: 'VibeGram',
        description:
            'Enterprise-Grade Telegram Bot Framework for Node.js with broad Bot API v9.6 support',
        base: '/vibegram/',

        vite: {
            plugins: [tailwindcss()],
            resolve: {
                alias: {
                    '@': fileURLToPath(new URL('./theme', import.meta.url)),
                },
            },
        },

        head: [
            ['link', { rel: 'icon', href: '/vibegram/logo.svg', type: 'image/svg+xml' }],
            ['meta', { name: 'theme-color', content: '#0D1422' }],
            ['meta', { property: 'og:type', content: 'website' }],
            ['meta', { property: 'og:title', content: 'VibeGram — Telegram Bot Framework' }],
            [
                'meta',
                {
                    property: 'og:description',
                    content:
                        'Modern, production-ready Telegram Bot Framework for Node.js with broad Bot API v9.6 support.',
                },
            ],
        ],

        // ─────────────────────────────────────────────────────────
        // INTERNATIONALIZATION
        // ─────────────────────────────────────────────────────────
        locales: {
            root: {
                label: 'English',
                lang: 'en',
                link: '/',
                title: 'VibeGram',
                description: 'Enterprise-Grade Telegram Bot Framework for Node.js',
            },
            id: {
                label: 'Bahasa Indonesia',
                lang: 'id',
                link: '/id/',
                title: 'VibeGram',
                description: 'Framework Bot Telegram Kelas Enterprise untuk Node.js',
                themeConfig: {
                    nav: [
                        { text: 'Beranda', link: '/id/' },
                        { text: 'Panduan', link: '/id/basics/introduction' },
                        { text: 'Referensi API', link: '/id/api/context' },
                    ],
                    sidebar: [
                        {
                            text: '🚀 Memulai',
                            collapsed: false,
                            items: [
                                { text: 'Pengenalan', link: '/id/basics/introduction' },
                                { text: 'Instalasi', link: '/id/basics/installation' },
                                { text: 'Quickstart', link: '/id/basics/quickstart' },
                                { text: 'Instansi Bot & Polling', link: '/id/basics/instance' },
                                { text: 'Migrasi', link: '/id/basics/migration' },
                            ],
                        },
                        {
                            text: '⚙️ Konsep Inti',
                            collapsed: false,
                            items: [
                                { text: 'Pipeline Middleware', link: '/id/core/middleware' },
                                { text: 'Routing & Listeners', link: '/id/core/handling' },
                                { text: 'Filter Combinator', link: '/id/core/filters' },
                                { text: 'Penanganan Error', link: '/id/core/error-handling' },
                                { text: 'Observability', link: '/id/core/observability' },
                            ],
                        },
                        {
                            text: '📨 Referensi API',
                            collapsed: false,
                            items: [
                                { text: 'Context (ctx)', link: '/id/api/context' },
                                { text: 'Metode Bot', link: '/id/api/bot-methods' },
                                { text: 'Builder Inline Query', link: '/id/api/inline-builder' },
                                { text: 'Tipe TypeScript', link: '/id/api/types' },
                            ],
                        },
                        {
                            text: '🧠 Manajemen State',
                            collapsed: false,
                            items: [
                                { text: 'Session', link: '/id/state/session' },
                                { text: 'Scene', link: '/id/state/scenes' },
                                { text: 'Wizard', link: '/id/state/wizards' },
                                { text: 'Conversation', link: '/id/state/conversations' },
                            ],
                        },
                        {
                            text: '🖥️ UI & Interaksi',
                            collapsed: false,
                            items: [
                                { text: 'Keyboard', link: '/id/ui/keyboards' },
                                { text: 'Menu Builder', link: '/id/ui/menu' },
                                { text: 'Paginasi', link: '/id/ui/pagination' },
                            ],
                        },
                        {
                            text: '🛡️ Keamanan & Utilitas',
                            collapsed: false,
                            items: [
                                { text: 'Rate Limiter', link: '/id/security/rate-limit' },
                                { text: 'Validasi WebApp', link: '/id/security/webapp' },
                                { text: 'Keamanan Webhook', link: '/id/security/webhook' },
                                { text: 'Caching API', link: '/id/security/caching' },
                                { text: 'Logger', link: '/id/security/logger' },
                            ],
                        },
                        {
                            text: '🌐 Fitur Lanjutan',
                            collapsed: false,
                            items: [
                                { text: 'Sistem Plugin', link: '/id/advanced/plugins' },
                                { text: 'Queue & Broadcasting', link: '/id/advanced/queue' },
                                { text: 'Internasionalisasi (I18n)', link: '/id/advanced/i18n' },
                                {
                                    text: 'Telegram Stars & Pembayaran',
                                    link: '/id/advanced/payments',
                                },
                                { text: 'Bisnis, Hadiah & Stories', link: '/id/advanced/business' },
                                { text: 'Pesan Draft (API 9.5)', link: '/id/advanced/draft' },
                                { text: 'Administrasi Grup', link: '/id/advanced/administration' },
                                { text: 'Deployment', link: '/id/advanced/deployment' },
                            ],
                        },
                        {
                            text: '🔌 Adapters',
                            collapsed: false,
                            items: [
                                { text: 'Express.js', link: '/id/adapters/express' },
                                { text: 'Fastify', link: '/id/adapters/fastify' },
                                { text: 'Hono', link: '/id/adapters/hono' },
                                { text: 'Native HTTP', link: '/id/adapters/native' },
                            ],
                        },
                    ],
                    outlineTitle: 'Di halaman ini',
                    docFooter: {
                        prev: 'Halaman Sebelumnya',
                        next: 'Halaman Berikutnya',
                    },
                    darkModeSwitchLabel: 'Tampilan',
                    sidebarMenuLabel: 'Menu',
                    returnToTopLabel: 'Kembali ke Atas',
                    langMenuLabel: 'Ubah Bahasa',
                },
            },
        },

        // ─────────────────────────────────────────────────────────
        // ENGLISH THEME CONFIG (root)
        // ─────────────────────────────────────────────────────────
        themeConfig: {
            nav: [
                { text: 'Home', link: '/' },
                { text: 'Guide', link: '/basics/introduction' },
                { text: 'API Reference', link: '/api/context' },
                {
                    text: 'Changelog',
                    link: 'https://github.com/alfandi09/vibegram/blob/main/CHANGELOG.md',
                },
            ],

            sidebar: [
                {
                    text: '🚀 Getting Started',
                    collapsed: false,
                    items: [
                        { text: 'Introduction', link: '/basics/introduction' },
                        { text: 'Installation', link: '/basics/installation' },
                        { text: 'Quickstart', link: '/basics/quickstart' },
                        { text: 'Bot Instance & Polling', link: '/basics/instance' },
                        { text: 'Migration', link: '/basics/migration' },
                    ],
                },
                {
                    text: '⚙️ Core Concepts',
                    collapsed: false,
                    items: [
                        { text: 'Middleware Pipeline', link: '/core/middleware' },
                        { text: 'Routing & Listeners', link: '/core/handling' },
                        { text: 'Filter Combinators', link: '/core/filters' },
                        { text: 'Error Handling', link: '/core/error-handling' },
                        { text: 'Observability', link: '/core/observability' },
                    ],
                },
                {
                    text: '📨 API Reference',
                    collapsed: false,
                    items: [
                        { text: 'Context (ctx)', link: '/api/context' },
                        { text: 'Bot Methods', link: '/api/bot-methods' },
                        { text: 'Inline Query Builder', link: '/api/inline-builder' },
                        { text: 'TypeScript Types', link: '/api/types' },
                    ],
                },
                {
                    text: '🧠 State Management',
                    collapsed: false,
                    items: [
                        { text: 'Sessions', link: '/state/session' },
                        { text: 'Scenes', link: '/state/scenes' },
                        { text: 'Wizards', link: '/state/wizards' },
                        { text: 'Conversations', link: '/state/conversations' },
                    ],
                },
                {
                    text: '🖥️ UI & Interactions',
                    collapsed: false,
                    items: [
                        { text: 'Keyboards', link: '/ui/keyboards' },
                        { text: 'Menu Builder', link: '/ui/menu' },
                        { text: 'Pagination', link: '/ui/pagination' },
                    ],
                },
                {
                    text: '🛡️ Security & Utilities',
                    collapsed: false,
                    items: [
                        { text: 'Rate Limiter', link: '/security/rate-limit' },
                        { text: 'WebApp Validation', link: '/security/webapp' },
                        { text: 'Webhook Security', link: '/security/webhook' },
                        { text: 'API Caching', link: '/security/caching' },
                        { text: 'Logger', link: '/security/logger' },
                    ],
                },
                {
                    text: '🌐 Advanced Features',
                    collapsed: false,
                    items: [
                        { text: 'Plugin System', link: '/advanced/plugins' },
                        { text: 'Job Queue & Broadcasting', link: '/advanced/queue' },
                        { text: 'Internationalization (I18n)', link: '/advanced/i18n' },
                        { text: 'Telegram Stars & Payments', link: '/advanced/payments' },
                        { text: 'Business, Gifts & Stories', link: '/advanced/business' },
                        { text: 'Draft Messages (API 9.5)', link: '/advanced/draft' },
                        { text: 'Group Administration', link: '/advanced/administration' },
                        { text: 'Deployment', link: '/advanced/deployment' },
                    ],
                },
                {
                    text: '🔌 Framework Adapters',
                    collapsed: false,
                    items: [
                        { text: 'Express.js', link: '/adapters/express' },
                        { text: 'Fastify', link: '/adapters/fastify' },
                        { text: 'Hono', link: '/adapters/hono' },
                        { text: 'Native HTTP', link: '/adapters/native' },
                    ],
                },
            ],

            socialLinks: [{ icon: 'github', link: 'https://github.com/alfandi09/vibegram' }],

            search: {
                provider: 'local',
            },

            footer: {
                message: 'Released under the ISC License.',
                copyright: 'Copyright © 2026 Alfa & VibeGram Contributors',
            },

            editLink: {
                pattern: 'https://github.com/alfandi09/vibegram/edit/main/docs/:path',
                text: 'Edit this page on GitHub',
            },
        },
    };
};
