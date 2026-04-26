<script setup lang="ts">
import { computed } from 'vue';
import { Check, ClipboardCopy, Terminal } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCopyText } from '@/composables/useCopyText';

interface InstallCommand {
    id: string;
    label: string;
    command: string;
}

const DEFAULT_COMMANDS: InstallCommand[] = [
    { id: 'npm', label: 'npm', command: 'npm install vibegram' },
    { id: 'pnpm', label: 'pnpm', command: 'pnpm add vibegram' },
    { id: 'yarn', label: 'yarn', command: 'yarn add vibegram' },
    { id: 'bun', label: 'bun', command: 'bun add vibegram' },
];

const props = withDefaults(
    defineProps<{
        title?: string;
        commands?: InstallCommand[];
        defaultValue?: string;
        copyLabel?: string;
        copiedLabel?: string;
    }>(),
    {
        title: 'Install package',
        defaultValue: 'npm',
        copyLabel: 'Copy',
        copiedLabel: 'Copied',
    }
);

const { copiedId, copyText } = useCopyText();
const commands = computed(() => (props.commands?.length ? props.commands : DEFAULT_COMMANDS));
const initialValue = computed(
    () =>
        commands.value.find(command => command.id === props.defaultValue)?.id ??
        commands.value[0].id
);
</script>

<template>
    <Tabs
        :default-value="initialValue"
        class="not-prose overflow-hidden rounded-lg border border-border bg-card"
    >
        <div class="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
            <p class="text-sm font-semibold text-card-foreground">{{ title }}</p>
            <Terminal class="text-muted-foreground" aria-hidden="true" />
        </div>

        <TabsList
            class="mx-4 mt-4 grid"
            :style="{ gridTemplateColumns: `repeat(${commands.length}, minmax(0, 1fr))` }"
        >
            <TabsTrigger v-for="command in commands" :key="command.id" :value="command.id">
                {{ command.label }}
            </TabsTrigger>
        </TabsList>

        <TabsContent v-for="command in commands" :key="command.id" :value="command.id" class="m-0">
            <div
                class="flex min-w-0 flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between"
            >
                <code class="truncate font-mono text-sm text-card-foreground">
                    {{ command.command }}
                </code>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-vg-copy-button
                    :data-copied="copiedId === command.id ? 'true' : undefined"
                    :aria-label="copiedId === command.id ? copiedLabel : copyLabel"
                    aria-live="polite"
                    @click="copyText(command.command, command.id)"
                >
                    <Check v-if="copiedId === command.id" data-icon="inline-start" />
                    <ClipboardCopy v-else data-icon="inline-start" />
                    {{ copiedId === command.id ? copiedLabel : copyLabel }}
                </Button>
            </div>
        </TabsContent>
    </Tabs>
</template>
