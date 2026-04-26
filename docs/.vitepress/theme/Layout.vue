<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
import { computed } from 'vue';
import { useData } from 'vitepress';
import HomePage from './components/HomePage.vue';
import MotionController from './components/MotionController.vue';

const VPLayout = DefaultTheme.Layout;
const { frontmatter } = useData();

const isHome = computed(() => frontmatter.value.layout === 'home');
</script>

<template>
    <div class="vg-shell" :class="{ 'vg-shell--home': isHome }">
        <MotionController />

        <VPLayout>
            <template #layout-top>
                <div class="vg-topline" aria-hidden="true"></div>
            </template>

            <template #home-hero-before>
                <HomePage />
            </template>

            <template #doc-before>
                <div class="vg-doc-marker" aria-hidden="true"></div>
            </template>
        </VPLayout>
    </div>
</template>
