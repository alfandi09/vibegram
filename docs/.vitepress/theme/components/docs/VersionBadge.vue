<script setup lang="ts">
import { computed } from 'vue';
import { Badge } from '@/components/ui/badge';

type Tone = 'default' | 'latest' | 'since' | 'deprecated' | 'stable';

const props = withDefaults(
    defineProps<{
        label?: string;
        version?: string;
        tone?: Tone;
    }>(),
    {
        label: 'Version',
        tone: 'default',
    }
);

const badgeClass = computed(() => {
    switch (props.tone) {
        case 'latest':
            return 'border-primary/30 bg-primary/10 text-primary';
        case 'since':
            return 'border-border bg-secondary text-secondary-foreground';
        case 'deprecated':
            return 'border-destructive/30 bg-destructive/10 text-destructive';
        case 'stable':
            return 'border-border bg-card text-card-foreground';
        default:
            return 'border-border bg-background text-muted-foreground';
    }
});
</script>

<template>
    <Badge variant="outline" :class="badgeClass">
        <span>{{ label }}</span>
        <span v-if="version" class="font-mono">{{ version }}</span>
    </Badge>
</template>
