<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
    defineProps<{
        eyebrow?: string;
        title?: string;
        description?: string;
        columns?: 2 | 3 | 4;
    }>(),
    {
        columns: 3,
    }
);

const gridClass = computed(() => {
    switch (props.columns) {
        case 2:
            return 'md:grid-cols-2';
        case 4:
            return 'md:grid-cols-2 xl:grid-cols-4';
        default:
            return 'md:grid-cols-2 xl:grid-cols-3';
    }
});
</script>

<template>
    <section class="not-prose my-10 flex flex-col gap-5">
        <div v-if="eyebrow || title || description" class="max-w-3xl">
            <p v-if="eyebrow" class="text-xs font-bold tracking-[0.08em] text-primary uppercase">
                {{ eyebrow }}
            </p>
            <h2 v-if="title" class="mt-2 text-2xl leading-tight font-bold text-foreground">
                {{ title }}
            </h2>
            <p v-if="description" class="mt-3 text-sm leading-7 text-muted-foreground">
                {{ description }}
            </p>
        </div>
        <div class="grid min-w-0 gap-4" :class="gridClass">
            <slot />
        </div>
    </section>
</template>
