<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
import { computed } from 'vue';
import { useData, useRoute, withBase } from 'vitepress';

const VPLayout = DefaultTheme.Layout;
const { frontmatter } = useData();
const route = useRoute();

const isHome = computed(() => frontmatter.value.layout === 'home');
const isIndonesian = computed(() => route.path === '/id/' || route.path.startsWith('/id/'));

const quickstartLink = computed(() =>
    isIndonesian.value ? '/id/basics/quickstart' : '/basics/quickstart'
);
const apiLink = computed(() => (isIndonesian.value ? '/id/api/context' : '/api/context'));
const installLabel = computed(() => (isIndonesian.value ? 'Install package' : 'Install package'));
const quickstartLabel = computed(() =>
    isIndonesian.value ? 'Buka Quickstart' : 'Open Quickstart'
);
const apiLabel = computed(() => (isIndonesian.value ? 'Lihat API' : 'View API'));
const commandTabs = ['npm', 'pnpm', 'yarn', 'bun'];
</script>

<template>
    <div class="vg-shell" :class="{ 'vg-shell--home': isHome }">
        <VPLayout>
            <template #layout-top>
                <div class="vg-topline" aria-hidden="true"></div>
            </template>

            <template #home-hero-info-before>
                <p class="vg-hero-eyebrow">TypeScript Telegram Bot Framework</p>
            </template>

            <template #home-hero-actions-after>
                <section class="vg-install-panel" :aria-label="installLabel">
                    <div class="vg-install-tabs" aria-hidden="true">
                        <span
                            v-for="tab in commandTabs"
                            :key="tab"
                            :class="{ active: tab === 'npm' }"
                        >
                            {{ tab }}
                        </span>
                    </div>
                    <div class="vg-install-command">
                        <code>npm install vibegram</code>
                        <span class="vg-copy-hint">copy</span>
                    </div>
                </section>
                <nav class="vg-home-quicklinks" aria-label="Home quick links">
                    <a :href="withBase(quickstartLink)">{{ quickstartLabel }}</a>
                    <a :href="withBase(apiLink)">{{ apiLabel }}</a>
                </nav>
            </template>

            <template #home-features-before>
                <section class="vg-proof-strip" aria-label="VibeGram highlights">
                    <div>
                        <strong>Node.js 18+</strong>
                        <span>Modern runtime target</span>
                    </div>
                    <div>
                        <strong>CJS + ESM</strong>
                        <span>Dual package output</span>
                    </div>
                    <div>
                        <strong>Bot API 9.6</strong>
                        <span>Broad typed coverage</span>
                    </div>
                </section>
            </template>

            <template #doc-before>
                <div class="vg-doc-marker" aria-hidden="true"></div>
            </template>
        </VPLayout>
    </div>
</template>
