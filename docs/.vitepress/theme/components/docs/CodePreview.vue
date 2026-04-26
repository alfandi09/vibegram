<script setup lang="ts">
import { computed } from 'vue';
import { Check, ClipboardCopy } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { useCopyText } from '@/composables/useCopyText';

const props = withDefaults(
    defineProps<{
        title?: string;
        filename?: string;
        language?: string;
        code?: string;
        copyable?: boolean;
        copyLabel?: string;
        copiedLabel?: string;
    }>(),
    {
        title: 'Code preview',
        language: 'ts',
        code: '',
        copyable: true,
        copyLabel: 'Copy',
        copiedLabel: 'Copied',
    }
);

const { copiedId, copyText } = useCopyText();
const canCopy = computed(() => props.copyable && props.code.trim().length > 0);
const codeLabel = computed(() => props.filename || props.language.toUpperCase());
</script>

<template>
    <figure class="not-prose overflow-hidden rounded-lg border border-border bg-card">
        <figcaption
            class="flex items-center justify-between gap-3 border-b border-border px-4 py-3"
        >
            <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-card-foreground">{{ title }}</p>
                <p class="mt-1 truncate font-mono text-xs text-muted-foreground">
                    {{ codeLabel }}
                </p>
            </div>
            <Button
                v-if="canCopy"
                type="button"
                variant="ghost"
                size="sm"
                :aria-label="copyLabel"
                @click="copyText(code, codeLabel)"
            >
                <Check v-if="copiedId === codeLabel" data-icon="inline-start" />
                <ClipboardCopy v-else data-icon="inline-start" />
                {{ copiedId === codeLabel ? copiedLabel : copyLabel }}
            </Button>
        </figcaption>

        <pre
            class="m-0 overflow-x-auto bg-background p-4 text-sm leading-7"
        ><code><slot>{{ code }}</slot></code></pre>
    </figure>
</template>
