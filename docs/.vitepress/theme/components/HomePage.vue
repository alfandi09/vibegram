<script setup lang="ts">
import type { Component } from 'vue';
import { computed, onBeforeUnmount, ref } from 'vue';
import { useData, useRoute, withBase } from 'vitepress';
import {
    ArrowRight,
    Bot,
    Boxes,
    Check,
    Code2,
    Copy,
    Gauge,
    Github,
    Layers,
    LockKeyhole,
    MessageCircle,
    RadioTower,
    Route,
    Server,
    ShieldCheck,
    Terminal,
    Workflow,
} from 'lucide-vue-next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { resolveDocsHref } from '@/lib/links';

interface FeatureItem {
    icon: Component;
    title: string;
    description: string;
    href: string;
}

interface StepItem {
    label: string;
    title: string;
    description: string;
    command: string;
}

const route = useRoute();
const { lang } = useData();
const copiedCommandId = ref<string | null>(null);
let copyTimer: ReturnType<typeof setTimeout> | undefined;

const isIndonesian = computed(
    () => lang.value === 'id' || route.path === '/id/' || route.path.startsWith('/id/')
);
const logoSrc = computed(() => withBase('/logo.svg'));

const copy = computed(() =>
    isIndonesian.value
        ? {
              eyebrow: 'TypeScript Telegram Bot Framework',
              title: 'VibeGram',
              subtitle: 'Framework Bot Telegram',
              description:
                  'Bangun bot Telegram siap produksi dengan middleware, webhook, conversation, session, adapter framework, dan cakupan Bot API v9.6 yang kuat.',
              primary: { label: 'Mulai dari Quickstart', href: '/id/basics/quickstart' },
              secondary: { label: 'Referensi API', href: '/id/api/context' },
              github: 'Lihat GitHub',
              installTitle: 'Instal paket',
              copied: 'Tersalin',
              copyAction: 'Salin',
              copyLabel: 'Salin command',
              proofIntro: 'Dasar produksi yang sudah tersedia',
              proofDescription:
                  'Type safety, secret token, rate limit, session, dan adapter framework.',
              featuresTitle: 'Semua alur bot inti dalam satu framework',
              featuresDescription:
                  'Homepage ini mengutamakan jalur belajar cepat: pahami pipeline, pilih adapter, lalu lanjut ke API yang paling sering dipakai.',
              readinessTitle: 'Siap untuk runtime production',
              readinessDescription:
                  'VibeGram membuat bagian yang penting tetap eksplisit: API bertipe, launch mode yang jelas, batas adapter, dan error yang mudah ditangani.',
              quickPathTitle: 'Jalur cepat dari install ke launch',
              quickPathDescription:
                  'Empat langkah yang sama dengan struktur docs: install, buat bot, tambah handler, lalu pilih polling atau webhook.',
              learnMore: 'Pelajari',
              footerTitle: 'Lanjutkan ke guide yang paling relevan',
              footerDescription:
                  'Mulai dari quickstart jika baru mencoba, atau langsung ke API reference jika sedang migrasi dari bot yang sudah ada.',
              footerPrimary: { label: 'Buka Quickstart', href: '/id/basics/quickstart' },
              footerSecondary: { label: 'Buka API Context', href: '/id/api/context' },
          }
        : {
              eyebrow: 'TypeScript Telegram Bot Framework',
              title: 'VibeGram',
              subtitle: 'Telegram Bot Framework',
              description:
                  'Build production-ready Telegram bots with middleware, webhooks, conversations, sessions, framework adapters, and broad Bot API v9.6 coverage.',
              primary: { label: 'Get Started', href: '/basics/quickstart' },
              secondary: { label: 'API Reference', href: '/api/context' },
              github: 'View GitHub',
              installTitle: 'Install package',
              copied: 'Copied',
              copyAction: 'Copy',
              copyLabel: 'Copy command',
              proofIntro: 'Production foundations included',
              proofDescription:
                  'Type safety, secret tokens, rate limits, sessions, and framework adapters.',
              featuresTitle: 'The core bot workflow in one framework',
              featuresDescription:
                  'The homepage now points developers to the practical path: understand the pipeline, choose an adapter, then reach for the API surfaces they need.',
              readinessTitle: 'Built for production runtime',
              readinessDescription:
                  'VibeGram keeps the important pieces explicit: typed APIs, predictable launch modes, adapter boundaries, and errors you can reason about.',
              quickPathTitle: 'From install to launch without ceremony',
              quickPathDescription:
                  'A short path that mirrors the docs structure: install, create a bot, add handlers, then choose polling or webhook mode.',
              learnMore: 'Learn more',
              footerTitle: 'Keep moving through the docs',
              footerDescription:
                  'Start with the quickstart when you are exploring, or jump into API reference when you are integrating an existing bot.',
              footerPrimary: { label: 'Read Quickstart', href: '/basics/quickstart' },
              footerSecondary: { label: 'Open API Context', href: '/api/context' },
          }
);

const managerCommands = [
    { id: 'npm', label: 'npm', command: 'npm install vibegram' },
    { id: 'pnpm', label: 'pnpm', command: 'pnpm add vibegram' },
    { id: 'yarn', label: 'yarn', command: 'yarn add vibegram' },
    { id: 'bun', label: 'bun', command: 'bun add vibegram' },
];

const proofItems = computed(() =>
    isIndonesian.value
        ? [
              { value: 'Node.js 18+', label: 'runtime modern' },
              { value: 'CJS + ESM', label: 'dual output' },
              { value: 'Bot API 9.6', label: 'cakupan luas' },
              { value: 'Strict TS', label: 'DX bertipe' },
          ]
        : [
              { value: 'Node.js 18+', label: 'modern runtime' },
              { value: 'CJS + ESM', label: 'dual output' },
              { value: 'Bot API 9.6', label: 'broad coverage' },
              { value: 'Strict TS', label: 'typed DX' },
          ]
);

const featureItems = computed<FeatureItem[]>(() =>
    isIndonesian.value
        ? [
              {
                  icon: Layers,
                  title: 'Middleware',
                  description:
                      'Pipeline async model onion untuk command, filter, plugin, dan flow multi-step.',
                  href: '/id/core/middleware',
              },
              {
                  icon: RadioTower,
                  title: 'Webhook adapters',
                  description:
                      'Express, Fastify, Hono, Koa, dan native HTTP dengan validasi secret token.',
                  href: '/id/adapters/express',
              },
              {
                  icon: MessageCircle,
                  title: 'Conversations',
                  description:
                      'Wait-state async untuk dialog bot yang terasa natural dan mudah dites.',
                  href: '/id/state/conversations',
              },
              {
                  icon: Boxes,
                  title: 'Sessions',
                  description:
                      'State per user/chat dengan storage adapter dan typing yang mudah dikembangkan.',
                  href: '/id/state/session',
              },
              {
                  icon: Code2,
                  title: 'Bot API coverage',
                  description:
                      'Metode context dan tipe modern untuk pesan, media, admin, bisnis, dan flows baru.',
                  href: '/id/api/context',
              },
          ]
        : [
              {
                  icon: Layers,
                  title: 'Middleware',
                  description:
                      'Async onion-model pipeline for commands, filters, plugins, and multi-step flows.',
                  href: '/core/middleware',
              },
              {
                  icon: RadioTower,
                  title: 'Webhook adapters',
                  description:
                      'Express, Fastify, Hono, Koa, and native HTTP with secret token validation.',
                  href: '/adapters/express',
              },
              {
                  icon: MessageCircle,
                  title: 'Conversations',
                  description:
                      'Async wait-state conversations for natural bot dialogs that stay testable.',
                  href: '/state/conversations',
              },
              {
                  icon: Boxes,
                  title: 'Sessions',
                  description:
                      'Per-user and per-chat state with storage adapters and approachable typing.',
                  href: '/state/session',
              },
              {
                  icon: Code2,
                  title: 'Bot API coverage',
                  description:
                      'Modern context methods and types for messages, media, admin, business, and new flows.',
                  href: '/api/context',
              },
          ]
);

const readinessItems = computed(() =>
    isIndonesian.value
        ? [
              { icon: ShieldCheck, title: 'TypeScript strict', text: 'Kontrak API lebih jelas.' },
              { icon: Server, title: 'CJS + ESM', text: 'Aman untuk setup Node modern.' },
              { icon: LockKeyhole, title: 'Webhook security', text: 'Secret token dan validasi.' },
              { icon: Gauge, title: 'Rate limit', text: 'Throttle middleware bawaan.' },
              { icon: Route, title: 'Observability', text: 'Hook lifecycle dan logger.' },
          ]
        : [
              { icon: ShieldCheck, title: 'TypeScript strict', text: 'Clearer API contracts.' },
              { icon: Server, title: 'CJS + ESM', text: 'Safe for modern Node setups.' },
              { icon: LockKeyhole, title: 'Webhook security', text: 'Secret token validation.' },
              { icon: Gauge, title: 'Rate limit', text: 'Built-in throttle middleware.' },
              { icon: Route, title: 'Observability', text: 'Lifecycle hooks and logger.' },
          ]
);

const quickPath = computed<StepItem[]>(() =>
    isIndonesian.value
        ? [
              {
                  label: '01',
                  title: 'Install',
                  description: 'Tambahkan package ke project Node.js.',
                  command: 'npm install vibegram',
              },
              {
                  label: '02',
                  title: 'Create bot',
                  description: 'Buat instance Bot dengan token dari env.',
                  command: 'const bot = new Bot(process.env.BOT_TOKEN!)',
              },
              {
                  label: '03',
                  title: 'Add handlers',
                  description: 'Susun command, filter, middleware, dan scene.',
                  command: "bot.command('start', ctx => ctx.reply('Ready'))",
              },
              {
                  label: '04',
                  title: 'Launch',
                  description: 'Pilih polling lokal atau webhook production.',
                  command: 'await bot.launch()',
              },
          ]
        : [
              {
                  label: '01',
                  title: 'Install',
                  description: 'Add the package to a Node.js project.',
                  command: 'npm install vibegram',
              },
              {
                  label: '02',
                  title: 'Create bot',
                  description: 'Create a Bot instance with a token from env.',
                  command: 'const bot = new Bot(process.env.BOT_TOKEN!)',
              },
              {
                  label: '03',
                  title: 'Add handlers',
                  description: 'Compose commands, filters, middleware, and scenes.',
                  command: "bot.command('start', ctx => ctx.reply('Ready'))",
              },
              {
                  label: '04',
                  title: 'Launch',
                  description: 'Choose local polling or production webhooks.',
                  command: 'await bot.launch()',
              },
          ]
);

const localHref = (href: string): string => resolveDocsHref(href);

const writeClipboard = async (command: string): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
        try {
            await navigator.clipboard.writeText(command);
            return true;
        } catch {
            // Fall through to the textarea fallback for restricted browser contexts.
        }
    }

    if (typeof document === 'undefined') {
        return false;
    }

    const textarea = document.createElement('textarea');
    textarea.value = command;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const didCopy = document.execCommand('copy');
    document.body.removeChild(textarea);

    return didCopy;
};

const copyCommand = async (command: string, id: string): Promise<void> => {
    const didCopy = await writeClipboard(command);
    if (!didCopy) {
        return;
    }

    copiedCommandId.value = id;
    if (copyTimer) {
        clearTimeout(copyTimer);
    }
    copyTimer = setTimeout(() => {
        copiedCommandId.value = null;
    }, 1800);
};

onBeforeUnmount(() => {
    if (copyTimer) {
        clearTimeout(copyTimer);
    }
});
</script>

<template>
    <div class="vg-home" aria-labelledby="vg-home-title">
        <section class="vg-home-section vg-home-hero">
            <div class="vg-home-grid">
                <div class="flex flex-col gap-7">
                    <Badge
                        variant="secondary"
                        class="w-fit border-border bg-accent text-accent-foreground"
                    >
                        <Bot />
                        {{ copy.eyebrow }}
                    </Badge>

                    <div class="flex flex-col gap-5">
                        <h1
                            id="vg-home-title"
                            class="max-w-3xl text-5xl leading-none font-bold text-foreground md:text-6xl lg:text-7xl"
                        >
                            {{ copy.title }}
                            <span class="block text-primary">{{ copy.subtitle }}</span>
                        </h1>
                        <p class="max-w-2xl text-lg leading-8 text-muted-foreground">
                            {{ copy.description }}
                        </p>
                    </div>

                    <div class="flex flex-col gap-3 sm:flex-row">
                        <Button as="a" :href="localHref(copy.primary.href)" size="lg">
                            {{ copy.primary.label }}
                            <ArrowRight data-icon="inline-end" />
                        </Button>
                        <Button
                            as="a"
                            :href="localHref(copy.secondary.href)"
                            variant="outline"
                            size="lg"
                        >
                            {{ copy.secondary.label }}
                        </Button>
                        <Button
                            as="a"
                            href="https://github.com/alfandi09/vibegram"
                            variant="ghost"
                            size="lg"
                        >
                            <Github data-icon="inline-start" />
                            {{ copy.github }}
                        </Button>
                    </div>

                    <Tabs
                        default-value="npm"
                        class="vg-install-card min-w-0 max-w-2xl overflow-hidden rounded-lg border border-border bg-card"
                    >
                        <div
                            class="flex items-center justify-between gap-4 border-b border-border px-4 py-3"
                        >
                            <span class="text-sm font-semibold text-card-foreground">
                                {{ copy.installTitle }}
                            </span>
                            <Terminal class="size-4 text-muted-foreground" aria-hidden="true" />
                        </div>
                        <TabsList class="mx-4 mt-4 grid grid-cols-4">
                            <TabsTrigger
                                v-for="manager in managerCommands"
                                :key="manager.id"
                                :value="manager.id"
                            >
                                {{ manager.label }}
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent
                            v-for="manager in managerCommands"
                            :key="manager.id"
                            :value="manager.id"
                            class="m-0"
                        >
                            <div class="flex items-center justify-between gap-4 px-4 py-5">
                                <code class="truncate font-mono text-sm text-card-foreground">
                                    {{ manager.command }}
                                </code>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    data-vg-copy-button
                                    :data-copied="
                                        copiedCommandId === manager.id ? 'true' : undefined
                                    "
                                    :aria-label="
                                        copiedCommandId === manager.id
                                            ? copy.copied
                                            : copy.copyLabel
                                    "
                                    aria-live="polite"
                                    @click="copyCommand(manager.command, manager.id)"
                                >
                                    <Check
                                        v-if="copiedCommandId === manager.id"
                                        data-icon="inline-start"
                                    />
                                    <Copy v-else data-icon="inline-start" />
                                    {{
                                        copiedCommandId === manager.id
                                            ? copy.copied
                                            : copy.copyAction
                                    }}
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <div class="grid max-w-2xl grid-cols-2 gap-3 md:grid-cols-4">
                        <div
                            v-for="item in proofItems"
                            :key="item.value"
                            class="min-w-0 rounded-lg border border-border bg-card px-4 py-3"
                        >
                            <strong class="block text-sm text-card-foreground">
                                {{ item.value }}
                            </strong>
                            <span class="mt-1 block text-xs text-muted-foreground">
                                {{ item.label }}
                            </span>
                        </div>
                    </div>
                </div>

                <aside class="vg-console min-w-0" aria-label="VibeGram workflow preview">
                    <div class="flex items-center justify-between border-b border-border px-4 py-3">
                        <div class="flex items-center gap-3">
                            <img :src="logoSrc" alt="" class="size-8 rounded-md" />
                            <div>
                                <p class="text-sm font-semibold text-card-foreground">VibeGram</p>
                                <p class="text-xs text-muted-foreground">bot runtime surface</p>
                            </div>
                        </div>
                        <Badge variant="outline">v1.2.x</Badge>
                    </div>

                    <div class="flex flex-col gap-4 p-4">
                        <div class="rounded-lg border border-border bg-background p-4">
                            <div class="mb-4 flex items-center justify-between">
                                <span class="font-mono text-xs text-muted-foreground">
                                    src/index.ts
                                </span>
                                <Code2 class="size-4 text-muted-foreground" aria-hidden="true" />
                            </div>
                            <pre
                                class="overflow-x-auto font-mono text-sm leading-7 text-card-foreground"
                            ><code>import { Bot } from 'vibegram'

const bot = new Bot(token)

bot.command('start', ctx =&gt; {
  return ctx.reply('Ready')
})

await bot.launch()</code></pre>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div class="rounded-lg border border-border bg-background p-3">
                                <Workflow class="mb-3 size-4 text-primary" aria-hidden="true" />
                                <p class="text-sm font-semibold text-card-foreground">Composer</p>
                                <p class="mt-1 text-xs leading-5 text-muted-foreground">
                                    cached middleware chain
                                </p>
                            </div>
                            <div class="rounded-lg border border-border bg-background p-3">
                                <RadioTower class="mb-3 size-4 text-primary" aria-hidden="true" />
                                <p class="text-sm font-semibold text-card-foreground">Webhook</p>
                                <p class="mt-1 text-xs leading-5 text-muted-foreground">
                                    adapter-ready delivery
                                </p>
                            </div>
                        </div>

                        <Alert class="border-primary/30 bg-accent">
                            <ShieldCheck class="size-4" />
                            <AlertTitle>{{ copy.proofIntro }}</AlertTitle>
                            <AlertDescription>
                                {{ copy.proofDescription }}
                            </AlertDescription>
                        </Alert>
                    </div>
                </aside>
            </div>
        </section>

        <section class="vg-home-section">
            <div class="mx-auto flex max-w-6xl flex-col gap-8 px-6">
                <div class="flex max-w-3xl flex-col gap-3">
                    <h2 class="text-3xl leading-tight font-bold text-foreground md:text-4xl">
                        {{ copy.featuresTitle }}
                    </h2>
                    <p class="text-base leading-7 text-muted-foreground">
                        {{ copy.featuresDescription }}
                    </p>
                </div>

                <div class="grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <Card
                        v-for="item in featureItems"
                        :key="item.title"
                        class="vg-feature-card min-w-0"
                    >
                        <CardHeader>
                            <div
                                class="mb-4 flex size-10 items-center justify-center rounded-lg bg-accent"
                            >
                                <component
                                    :is="item.icon"
                                    class="size-5 text-primary"
                                    aria-hidden="true"
                                />
                            </div>
                            <CardTitle>{{ item.title }}</CardTitle>
                            <CardDescription>{{ item.description }}</CardDescription>
                        </CardHeader>
                        <CardFooter>
                            <Button as="a" :href="localHref(item.href)" variant="link" class="px-0">
                                {{ copy.learnMore }}
                                <ArrowRight data-icon="inline-end" />
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </section>

        <section class="vg-home-section">
            <div class="mx-auto grid max-w-6xl gap-6 px-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div class="flex flex-col justify-center gap-4">
                    <Badge variant="outline" class="w-fit">Production</Badge>
                    <h2 class="text-3xl leading-tight font-bold text-foreground md:text-4xl">
                        {{ copy.readinessTitle }}
                    </h2>
                    <p class="text-base leading-7 text-muted-foreground">
                        {{ copy.readinessDescription }}
                    </p>
                </div>

                <div class="grid gap-3 sm:grid-cols-2">
                    <div
                        v-for="item in readinessItems"
                        :key="item.title"
                        class="flex gap-4 rounded-lg border border-border bg-card p-4"
                    >
                        <component
                            :is="item.icon"
                            class="mt-1 size-5 text-primary"
                            aria-hidden="true"
                        />
                        <div>
                            <h3 class="font-semibold text-card-foreground">{{ item.title }}</h3>
                            <p class="mt-1 text-sm leading-6 text-muted-foreground">
                                {{ item.text }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section class="vg-home-section">
            <div class="mx-auto flex max-w-6xl flex-col gap-8 px-6">
                <div class="flex flex-col gap-3 md:max-w-3xl">
                    <h2 class="text-3xl leading-tight font-bold text-foreground md:text-4xl">
                        {{ copy.quickPathTitle }}
                    </h2>
                    <p class="text-base leading-7 text-muted-foreground">
                        {{ copy.quickPathDescription }}
                    </p>
                </div>

                <div class="grid min-w-0 gap-4 lg:grid-cols-4">
                    <div
                        v-for="step in quickPath"
                        :key="step.label"
                        class="min-w-0 rounded-lg border border-border bg-card p-5"
                    >
                        <Badge variant="secondary">{{ step.label }}</Badge>
                        <h3 class="mt-5 text-lg font-semibold text-card-foreground">
                            {{ step.title }}
                        </h3>
                        <p class="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">
                            {{ step.description }}
                        </p>
                        <Separator class="my-4" />
                        <code class="block truncate font-mono text-xs text-muted-foreground">
                            {{ step.command }}
                        </code>
                    </div>
                </div>
            </div>
        </section>

        <section class="vg-home-section vg-home-cta">
            <div
                class="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 md:flex-row md:items-center"
            >
                <div class="max-w-2xl">
                    <h2 class="text-3xl leading-tight font-bold text-foreground">
                        {{ copy.footerTitle }}
                    </h2>
                    <p class="mt-3 text-base leading-7 text-muted-foreground">
                        {{ copy.footerDescription }}
                    </p>
                </div>
                <div class="flex flex-col gap-3 sm:flex-row">
                    <Button as="a" :href="localHref(copy.footerPrimary.href)" size="lg">
                        {{ copy.footerPrimary.label }}
                    </Button>
                    <Button
                        as="a"
                        :href="localHref(copy.footerSecondary.href)"
                        variant="outline"
                        size="lg"
                    >
                        {{ copy.footerSecondary.label }}
                    </Button>
                </div>
            </div>
        </section>
    </div>
</template>
