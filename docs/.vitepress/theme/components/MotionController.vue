<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue';
import { useRoute } from 'vitepress';

const route = useRoute();
const revealSelector = [
    '.vg-home-section',
    '.vp-doc .not-prose',
    '.vp-doc h2',
    '.vp-doc h3',
    '.vp-doc div[class*="language-"]',
    '.vp-doc table',
    '.vp-doc .custom-block',
].join(',');

let observer: IntersectionObserver | undefined;
let observedElements: HTMLElement[] = [];
let setupTimer: ReturnType<typeof setTimeout> | undefined;

const prefersReducedMotion = (): boolean =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const resetRevealState = () => {
    observer?.disconnect();
    observer = undefined;

    for (const element of observedElements) {
        element.removeAttribute('data-vg-reveal');
        element.classList.remove('is-visible');
        element.style.removeProperty('--vg-reveal-index');
    }

    observedElements = [];
    document.documentElement.classList.remove('vg-motion-ready');
};

const setupRevealState = async () => {
    resetRevealState();
    await nextTick();

    if (prefersReducedMotion()) {
        return;
    }

    observer = new IntersectionObserver(
        entries => {
            for (const entry of entries) {
                if (!entry.isIntersecting) {
                    continue;
                }

                entry.target.classList.add('is-visible');
                observer?.unobserve(entry.target);
            }
        },
        {
            rootMargin: '0px 0px -12% 0px',
            threshold: 0.12,
        }
    );

    observedElements = Array.from(document.querySelectorAll<HTMLElement>(revealSelector));
    observedElements.forEach((element, index) => {
        element.setAttribute('data-vg-reveal', '');
        element.style.setProperty('--vg-reveal-index', String(Math.min(index % 6, 5)));
        observer?.observe(element);
    });

    document.documentElement.classList.add('vg-motion-ready');
};

const scheduleSetup = () => {
    if (setupTimer) {
        clearTimeout(setupTimer);
    }

    setupTimer = setTimeout(() => {
        void setupRevealState();
    }, 40);
};

onMounted(() => {
    scheduleSetup();
});

watch(
    () => route.path,
    () => {
        scheduleSetup();
    }
);

onBeforeUnmount(() => {
    if (setupTimer) {
        clearTimeout(setupTimer);
    }

    resetRevealState();
});
</script>

<template>
    <span class="vg-motion-controller" aria-hidden="true"></span>
</template>
