<script setup lang="ts">
import { computed } from 'vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import VersionBadge from './VersionBadge.vue';

const props = withDefaults(
    defineProps<{
        method?: string;
        endpoint?: string;
        title: string;
        description?: string;
        since?: string;
        returns?: string;
        stability?: 'stable' | 'latest' | 'deprecated';
    }>(),
    {
        method: 'POST',
        stability: 'stable',
    }
);

const methodLabel = computed(() => props.method.toUpperCase());
</script>

<template>
    <Card class="not-prose overflow-hidden">
        <CardHeader class="gap-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div class="min-w-0">
                    <div class="mb-3 flex flex-wrap items-center gap-2">
                        <span
                            class="rounded-md border border-border bg-background px-2 py-1 font-mono text-xs font-bold text-primary"
                        >
                            {{ methodLabel }}
                        </span>
                        <span
                            v-if="endpoint"
                            class="truncate font-mono text-xs text-muted-foreground"
                        >
                            {{ endpoint }}
                        </span>
                    </div>
                    <CardTitle>{{ title }}</CardTitle>
                    <CardDescription v-if="description">{{ description }}</CardDescription>
                </div>
                <div class="flex shrink-0 flex-wrap gap-2">
                    <VersionBadge v-if="since" label="Since" :version="since" tone="since" />
                    <VersionBadge v-if="returns" label="Returns" :version="returns" tone="stable" />
                    <VersionBadge
                        v-if="stability !== 'stable'"
                        :label="stability"
                        :tone="stability"
                    />
                </div>
            </div>
        </CardHeader>
        <CardContent v-if="$slots.default || $slots.signature" class="flex flex-col gap-4">
            <div
                v-if="$slots.signature"
                class="overflow-x-auto rounded-lg border border-border bg-background p-4 font-mono text-sm leading-7"
            >
                <slot name="signature" />
            </div>
            <div v-if="$slots.default" class="text-sm leading-7 text-muted-foreground">
                <slot />
            </div>
        </CardContent>
    </Card>
</template>
