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
import { Button } from '@/components/ui/button';

const props = withDefaults(
    defineProps<{
        title: string;
        description?: string;
        href?: string;
        cta?: string;
    }>(),
    {
        cta: 'Open page',
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
    <Card class="not-prose min-w-0">
        <CardHeader>
            <CardTitle>{{ title }}</CardTitle>
            <CardDescription v-if="description">{{ description }}</CardDescription>
        </CardHeader>
        <CardContent v-if="$slots.default">
            <div class="text-sm leading-7 text-muted-foreground">
                <slot />
            </div>
        </CardContent>
        <CardFooter v-if="href">
            <Button as="a" :href="resolvedHref" variant="outline" size="sm">
                {{ cta }}
                <ArrowRight data-icon="inline-end" />
            </Button>
        </CardFooter>
    </Card>
</template>
