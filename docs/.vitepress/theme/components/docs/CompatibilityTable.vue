<script setup lang="ts">
import { computed } from 'vue';
import { Badge } from '@/components/ui/badge';

interface CompatibilityRow {
    feature: string;
    support: string;
    cjs?: string;
    esm?: string;
    node?: string;
    notes?: string;
}

const DEFAULT_ROWS: CompatibilityRow[] = [
    {
        feature: 'Runtime',
        support: 'Node.js 18+',
        cjs: 'yes',
        esm: 'yes',
        node: '18, 20, 22',
        notes: 'Matches package engines.',
    },
    {
        feature: 'Module output',
        support: 'Dual package',
        cjs: 'dist/cjs',
        esm: 'dist/esm',
        node: '18+',
        notes: 'Types are emitted under dist/types.',
    },
    {
        feature: 'Docs deployment',
        support: 'Static',
        cjs: '-',
        esm: '-',
        node: '18+',
        notes: 'Safe for GitHub Pages.',
    },
];

const props = defineProps<{
    rows?: CompatibilityRow[];
}>();

const tableRows = computed(() => (props.rows?.length ? props.rows : DEFAULT_ROWS));
</script>

<template>
    <div class="not-prose overflow-hidden rounded-lg border border-border bg-card">
        <div class="overflow-x-auto">
            <table class="w-full min-w-[720px] text-left text-sm">
                <thead class="bg-muted/50 text-muted-foreground">
                    <tr>
                        <th class="px-4 py-3 font-semibold">Feature</th>
                        <th class="px-4 py-3 font-semibold">Support</th>
                        <th class="px-4 py-3 font-semibold">CJS</th>
                        <th class="px-4 py-3 font-semibold">ESM</th>
                        <th class="px-4 py-3 font-semibold">Node</th>
                        <th class="px-4 py-3 font-semibold">Notes</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="row in tableRows" :key="row.feature" class="border-t border-border">
                        <td class="px-4 py-3 font-semibold text-card-foreground">
                            {{ row.feature }}
                        </td>
                        <td class="px-4 py-3">
                            <Badge variant="secondary">{{ row.support }}</Badge>
                        </td>
                        <td class="px-4 py-3 font-mono text-muted-foreground">
                            {{ row.cjs || '-' }}
                        </td>
                        <td class="px-4 py-3 font-mono text-muted-foreground">
                            {{ row.esm || '-' }}
                        </td>
                        <td class="px-4 py-3 font-mono text-muted-foreground">
                            {{ row.node || '-' }}
                        </td>
                        <td class="px-4 py-3 text-muted-foreground">{{ row.notes || '-' }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>
