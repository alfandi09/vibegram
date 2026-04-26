<script setup lang="ts">
import { computed } from 'vue';
import { ArrowRight } from 'lucide-vue-next';
import { withBase } from 'vitepress';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const props = withDefaults(
    defineProps<{
        title: string;
        description?: string;
        href?: string;
        cta?: string;
        kicker?: string;
    }>(),
    {
        cta: 'Learn more',
    }
);

const resolvedHref = computed(() => {
    if (!props.href) {
        return '';
    }

    return props.href.startsWith('http') || props.href.startsWith('#')
        ? props.href
        : withBase(props.href);
});
</script>

<template>
    <Card class="min-w-0">
        <CardHeader>
            <div v-if="$slots.icon || kicker" class="mb-2 flex items-center gap-2">
                <slot name="icon" />
                <Badge v-if="kicker" variant="secondary">{{ kicker }}</Badge>
            </div>
            <CardTitle>{{ title }}</CardTitle>
            <CardDescription v-if="description">{{ description }}</CardDescription>
        </CardHeader>
        <CardContent v-if="$slots.default">
            <div class="text-sm leading-7 text-muted-foreground">
                <slot />
            </div>
        </CardContent>
        <CardFooter v-if="href">
            <Button as="a" :href="resolvedHref" variant="link" class="px-0">
                {{ cta }}
                <ArrowRight data-icon="inline-end" />
            </Button>
        </CardFooter>
    </Card>
</template>
