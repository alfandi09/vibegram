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
    CopyCheck,
    FlaskConical,
    Gauge,
    Github,
    Globe,
    Layers,
    LockKeyhole,
    MessageCircle,
    Route,
    Server,
    ShieldCheck,
    Sparkles,
    Terminal,
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
    /** Visible link text that names its destination (no repeated "Learn more"). */
    link: string;
}

interface StepItem {
    label: string;
    title: string;
    description: string;
    command: string;
    href?: string;
    link?: string;
}

const route = useRoute();
const { lang, site } = useData();
const copiedCommandId = ref<string | null>(null);
let copyTimer: ReturnType<typeof setTimeout> | undefined;

// The version comes from package.json through themeConfig.version (see config.js).
const versionBadge = computed(
    () => (site.value as { themeConfig?: { version?: string } }).themeConfig?.version
);

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
                  'Framework TypeScript untuk bot Telegram. Handler bertipe, session, conversation, dan webhook yang berjalan di Node.js, Bun, Deno, dan Cloudflare Workers. Mendukung Bot API 10.3.',
              primary: { label: 'Mulai dari Quickstart', href: '/id/basics/quickstart' },
              secondary: { label: 'Referensi API', href: '/id/api/context' },
              github: 'Lihat GitHub',
              installTitle: 'Instal paket',
              copied: 'Tersalin',
              copyAction: 'Salin',
              copyLabel: 'Salin command',
              consoleCaption: 'Bot pertama Anda',
              consoleCards: [
                  { title: 'Filter bertipe', text: 'ctx.message.text sudah string' },
                  { title: 'Jalan di edge', text: 'Workers, Deno, Bun' },
              ],
              proofIntro: 'Sudah termasuk',
              proofDescription:
                  'Webhook dengan secret token, dedupe update, rate limit, session, dan testing kit.',
              featuresTitle: 'Yang dibutuhkan bot Telegram, sudah tersedia',
              featuresDescription:
                  'Setiap kartu membuka panduan berisi contoh yang bisa langsung dijalankan.',
              readinessTitle: 'Default yang aman untuk production',
              readinessDescription:
                  'Bagian yang sering bikin bot down sudah ditangani: tipe yang ketat, webhook yang terlindungi, batas laju, dan update ganda.',
              quickPathTitle: 'Dari install sampai bot jalan dalam empat langkah',
              quickPathDescription:
                  'Langkah yang sama dengan Quickstart: install, buat bot, tambah handler, lalu jalankan dengan polling atau webhook.',
              footerTitle: 'Mulai dari mana?',
              footerDescription:
                  'Baru mencoba? Ikuti Quickstart. Sudah punya bot? Buka referensi API atau panduan upgrade ke 3.0.',
              footerPrimary: { label: 'Buka Quickstart', href: '/id/basics/quickstart' },
              footerSecondary: { label: 'Lihat referensi API', href: '/id/api/context' },
          }
        : {
              eyebrow: 'TypeScript Telegram Bot Framework',
              title: 'VibeGram',
              subtitle: 'Telegram Bot Framework',
              description:
                  'A TypeScript framework for Telegram bots. Typed handlers, sessions, conversations, and webhooks that run on Node.js, Bun, Deno, and Cloudflare Workers. Covers Bot API 10.3.',
              primary: { label: 'Get Started', href: '/basics/quickstart' },
              secondary: { label: 'API Reference', href: '/api/context' },
              github: 'View GitHub',
              installTitle: 'Install package',
              copied: 'Copied',
              copyAction: 'Copy',
              copyLabel: 'Copy command',
              consoleCaption: 'Your first bot',
              consoleCards: [
                  { title: 'Typed filters', text: 'ctx.message.text is a string' },
                  { title: 'Runs on the edge', text: 'Workers, Deno, Bun' },
              ],
              proofIntro: 'Included',
              proofDescription:
                  'Webhooks with secret tokens, update dedupe, rate limits, sessions, and a testing kit.',
              featuresTitle: 'What a Telegram bot needs, already built',
              featuresDescription: 'Each card opens a guide with examples you can run as they are.',
              readinessTitle: 'Safe defaults for production',
              readinessDescription:
                  'The parts that usually take a bot down are handled: strict types, protected webhooks, rate limits, and duplicate updates.',
              quickPathTitle: 'From install to a running bot in four steps',
              quickPathDescription:
                  'The same steps as the Quickstart: install, create the bot, add handlers, then start it with polling or a webhook.',
              footerTitle: 'Where to start',
              footerDescription:
                  'New here? Follow the Quickstart. Already running a bot? Open the API reference or the 3.0 upgrade guide.',
              footerPrimary: { label: 'Read the Quickstart', href: '/basics/quickstart' },
              footerSecondary: { label: 'Browse the API reference', href: '/api/context' },
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
              { value: 'Bot API 10.3', label: 'versi terbaru' },
              { value: 'Node.js 20+', label: 'juga Bun & Deno' },
              { value: '0 dependency', label: 'di paket inti' },
              { value: 'CJS + ESM', label: 'dengan tipe' },
          ]
        : [
              { value: 'Bot API 10.3', label: 'latest version' },
              { value: 'Node.js 20+', label: 'also Bun & Deno' },
              { value: '0 dependencies', label: 'in the core' },
              { value: 'CJS + ESM', label: 'with types' },
          ]
);

const featureItems = computed<FeatureItem[]>(() =>
    isIndonesian.value
        ? [
              {
                  icon: Layers,
                  title: 'Routing bertipe',
                  description:
                      "bot.on('message:photo') langsung memberi ctx.message.photo bertipe. Ditambah filter, branch, route, dan error boundary.",
                  href: '/id/core/handling',
                  link: 'Panduan routing',
              },
              {
                  icon: Globe,
                  title: 'Webhook di mana saja',
                  description:
                      'Express, Fastify, Hono, HTTP native, atau Fetch API untuk Cloudflare Workers, Deno, Bun, dan Next.js.',
                  href: '/id/adapters/fetch',
                  link: 'Panduan webhook & edge',
              },
              {
                  icon: MessageCircle,
                  title: 'Conversation',
                  description:
                      'Tanya, tunggu jawaban, lanjut. Versi durable tetap berjalan setelah restart atau deploy.',
                  href: '/id/state/durable-conversations',
                  link: 'Panduan conversation',
              },
              {
                  icon: Boxes,
                  title: 'Session',
                  description:
                      'State per user dan per chat dengan tipe sendiri, disimpan di memory atau Redis.',
                  href: '/id/state/session',
                  link: 'Panduan session',
              },
              {
                  icon: FlaskConical,
                  title: 'Testing kit',
                  description:
                      'Jalankan bot di test tanpa token dan tanpa jaringan, lalu cek pesan yang dikirim.',
                  href: '/id/advanced/testing',
                  link: 'Panduan testing',
              },
              {
                  icon: Sparkles,
                  title: 'AI streaming',
                  description:
                      'Jawaban model tampil langsung di draft dengan tombol stop, lalu dikirim sebagai pesan.',
                  href: '/id/advanced/streaming',
                  link: 'Panduan AI streaming',
              },
          ]
        : [
              {
                  icon: Layers,
                  title: 'Typed routing',
                  description:
                      "bot.on('message:photo') hands you a typed ctx.message.photo. Plus filter, branch, route, and error boundaries.",
                  href: '/core/handling',
                  link: 'Routing guide',
              },
              {
                  icon: Globe,
                  title: 'Webhooks anywhere',
                  description:
                      'Express, Fastify, Hono, native HTTP, or the Fetch API for Cloudflare Workers, Deno, Bun, and Next.js.',
                  href: '/adapters/fetch',
                  link: 'Webhook & edge guide',
              },
              {
                  icon: MessageCircle,
                  title: 'Conversations',
                  description:
                      'Ask, wait for the answer, continue. The durable version keeps going after a restart or deploy.',
                  href: '/state/durable-conversations',
                  link: 'Conversations guide',
              },
              {
                  icon: Boxes,
                  title: 'Sessions',
                  description:
                      'Per-user and per-chat state with your own types, stored in memory or Redis.',
                  href: '/state/session',
                  link: 'Sessions guide',
              },
              {
                  icon: FlaskConical,
                  title: 'Testing kit',
                  description:
                      'Run your bot in tests with no token and no network, then check what it sent.',
                  href: '/advanced/testing',
                  link: 'Testing guide',
              },
              {
                  icon: Sparkles,
                  title: 'AI streaming',
                  description:
                      'Model output appears live in a draft with a stop button, then arrives as a message.',
                  href: '/advanced/streaming',
                  link: 'AI streaming guide',
              },
          ]
);

const readinessItems = computed(() =>
    isIndonesian.value
        ? [
              { icon: ShieldCheck, title: 'TypeScript strict', text: 'Salah ketik API ketahuan saat compile.' },
              { icon: LockKeyhole, title: 'Webhook aman', text: 'Secret token dicek, body dibatasi.' },
              { icon: CopyCheck, title: 'Anti update ganda', text: 'Retry Telegram tidak menjalankan handler dua kali.' },
              { icon: Gauge, title: 'Rate limit', text: 'Batasi user yang spam dengan satu middleware.' },
              { icon: Route, title: 'Observability', text: 'Hook untuk log, metrik, dan error.' },
              { icon: Server, title: 'CJS + ESM', text: 'Bisa di-import dari setup Node mana pun.' },
          ]
        : [
              { icon: ShieldCheck, title: 'Strict TypeScript', text: 'API typos fail at compile time.' },
              { icon: LockKeyhole, title: 'Secure webhooks', text: 'Secret token checked, body size capped.' },
              { icon: CopyCheck, title: 'No duplicate updates', text: 'Telegram retries never run a handler twice.' },
              { icon: Gauge, title: 'Rate limits', text: 'Slow down spamming users with one middleware.' },
              { icon: Route, title: 'Observability', text: 'Hooks for logs, metrics, and errors.' },
              { icon: Server, title: 'CJS + ESM', text: 'Imports cleanly from any Node setup.' },
          ]
);

const quickPath = computed<StepItem[]>(() =>
    isIndonesian.value
        ? [
              {
                  label: '01',
                  title: 'Install',
                  description: 'Butuh Node.js 20+, Bun, atau Deno.',
                  command: 'npm install vibegram',
                  href: '/id/basics/installation',
                  link: 'Panduan instalasi',
              },
              {
                  label: '02',
                  title: 'Buat bot',
                  description: 'Ambil token dari @BotFather dan simpan di env.',
                  command: 'const bot = new Bot(process.env.BOT_TOKEN!)',
                  href: '/id/basics/quickstart',
                  link: 'Quickstart',
              },
              {
                  label: '03',
                  title: 'Tambah handler',
                  description: 'Balas command, teks, foto, atau tombol.',
                  command: "bot.command('start', ctx => ctx.reply('Halo'))",
                  href: '/id/core/handling',
                  link: 'Panduan routing',
              },
              {
                  label: '04',
                  title: 'Jalankan',
                  description: 'Polling untuk lokal, webhook untuk production.',
                  command: 'await bot.launch()',
                  href: '/id/basics/instance',
                  link: 'Polling vs webhook',
              },
          ]
        : [
              {
                  label: '01',
                  title: 'Install',
                  description: 'Needs Node.js 20+, Bun, or Deno.',
                  command: 'npm install vibegram',
                  href: '/basics/installation',
                  link: 'Installation guide',
              },
              {
                  label: '02',
                  title: 'Create the bot',
                  description: 'Get a token from @BotFather and keep it in an env var.',
                  command: 'const bot = new Bot(process.env.BOT_TOKEN!)',
                  href: '/basics/quickstart',
                  link: 'Quickstart',
              },
              {
                  label: '03',
                  title: 'Add handlers',
                  description: 'Answer commands, text, photos, or button presses.',
                  command: "bot.command('start', ctx => ctx.reply('Hi'))",
                  href: '/core/handling',
                  link: 'Routing guide',
              },
              {
                  label: '04',
                  title: 'Start it',
                  description: 'Polling while developing, a webhook in production.',
                  command: 'await bot.launch()',
                  href: '/basics/instance',
                  link: 'Polling vs webhook',
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
                <div class="flex flex-col gap-6">
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
                            class="max-w-3xl text-5xl leading-none font-bold text-foreground lg:text-6xl"
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
                                <code class="min-w-0 font-mono text-sm break-all text-card-foreground">
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
                                <p class="text-xs text-muted-foreground">{{ copy.consoleCaption }}</p>
                            </div>
                        </div>
                        <Badge v-if="versionBadge" variant="outline">v{{ versionBadge }}</Badge>
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

// ctx.message.text: string
bot.on('message:text', ctx =&gt;
  ctx.reply('Got it'))

await bot.launch()</code></pre>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div
                                v-for="(card, index) in copy.consoleCards"
                                :key="card.title"
                                class="rounded-lg border border-border bg-background p-3"
                            >
                                <component
                                    :is="index === 0 ? Layers : Globe"
                                    class="mb-3 size-4 text-primary"
                                    aria-hidden="true"
                                />
                                <p class="text-sm font-semibold text-card-foreground">{{ card.title }}</p>
                                <p class="mt-1 text-xs leading-5 text-muted-foreground">
                                    {{ card.text }}
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

                <div class="grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                                {{ item.link }}
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
                        <code
                            class="block font-mono text-xs leading-5 break-all whitespace-pre-wrap text-muted-foreground"
                            >{{ step.command }}</code
                        >
                        <Button
                            v-if="step.href"
                            as="a"
                            :href="localHref(step.href)"
                            variant="link"
                            class="mt-3 h-auto px-0 py-0 text-xs"
                        >
                            {{ step.link }}
                            <ArrowRight data-icon="inline-end" class="size-3" />
                        </Button>
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
