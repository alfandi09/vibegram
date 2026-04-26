<script setup lang="ts">
import { computed } from 'vue';

interface PackageStat {
    label: string;
    value: string;
    description?: string;
}

const DEFAULT_STATS: PackageStat[] = [
    { label: 'Runtime', value: 'Node.js 18+', description: 'Modern baseline' },
    { label: 'Output', value: 'CJS + ESM', description: 'Dual package' },
    { label: 'Types', value: 'Strict TS', description: 'Declarations included' },
];

const props = defineProps<{
    stats?: PackageStat[];
}>();

const statItems = computed(() => (props.stats?.length ? props.stats : DEFAULT_STATS));
</script>

<template>
    <dl class="not-prose grid gap-3 sm:grid-cols-3">
        <div
            v-for="stat in statItems"
            :key="stat.label"
            class="min-w-0 rounded-lg border border-border bg-card p-4"
        >
            <dt class="text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">
                {{ stat.label }}
            </dt>
            <dd class="mt-2 text-lg font-bold text-card-foreground">{{ stat.value }}</dd>
            <p v-if="stat.description" class="mt-1 text-sm leading-6 text-muted-foreground">
                {{ stat.description }}
            </p>
        </div>
    </dl>
</template>
