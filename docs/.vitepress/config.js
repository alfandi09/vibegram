export default {
    title: 'VibeGram',
    description: 'Enterprise-Grade Telegram Bot Framework for Node.js — Bot API v9.6',
    base: '/vibegram/',

    head: [
        ['link', { rel: 'icon', href: '/logo.png' }],
        ['meta', { name: 'theme-color', content: '#7C3AED' }],
        ['meta', { property: 'og:type', content: 'website' }],
        ['meta', { property: 'og:title', content: 'VibeGram — Telegram Bot Framework' }],
        [
            'meta',
            {
                property: 'og:description',
                content:
                    'Modern, production-ready Telegram Bot Framework for Node.js. Full Bot API v9.6 coverage.',
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
                            { text: 'Instansi Bot & Polling', link: '/id/basics/instance' },
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
                            { text: 'Telegram Stars & Pembayaran', link: '/id/advanced/payments' },
                            { text: 'Pesan Draft (API 9.5)', link: '/id/advanced/draft' },
                            { text: 'Administrasi Grup', link: '/id/advanced/administration' },
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
                    { text: 'Bot Instance & Polling', link: '/basics/instance' },
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
                    { text: 'Draft Messages (API 9.5)', link: '/advanced/draft' },
                    { text: 'Group Administration', link: '/advanced/administration' },
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
