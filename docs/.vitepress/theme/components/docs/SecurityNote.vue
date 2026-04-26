<script setup lang="ts">
import { computed } from 'vue';
import { Info, OctagonAlert, ShieldCheck, TriangleAlert } from 'lucide-vue-next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type NoteVariant = 'info' | 'tip' | 'warning' | 'danger';

const props = withDefaults(
    defineProps<{
        title?: string;
        variant?: NoteVariant;
    }>(),
    {
        title: 'Security note',
        variant: 'info',
    }
);

const icon = computed(() => {
    switch (props.variant) {
        case 'tip':
            return ShieldCheck;
        case 'warning':
            return TriangleAlert;
        case 'danger':
            return OctagonAlert;
        default:
            return Info;
    }
});

const alertClass = computed(() => {
    switch (props.variant) {
        case 'tip':
            return 'border-primary/30 bg-primary/10';
        case 'warning':
            return 'border-border bg-secondary text-secondary-foreground';
        case 'danger':
            return 'border-destructive/30 bg-destructive/10 text-destructive';
        default:
            return 'border-border bg-card';
    }
});
</script>

<template>
    <Alert
        class="not-prose"
        :class="alertClass"
        :variant="variant === 'danger' ? 'destructive' : 'default'"
    >
        <component :is="icon" aria-hidden="true" />
        <AlertTitle>{{ title }}</AlertTitle>
        <AlertDescription>
            <slot />
        </AlertDescription>
    </Alert>
</template>
