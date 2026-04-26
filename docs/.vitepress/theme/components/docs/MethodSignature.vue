<script setup lang="ts">
import { computed } from 'vue';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MethodParam {
    name: string;
    type: string;
    description?: string;
    required?: boolean;
}

const props = withDefaults(
    defineProps<{
        name?: string;
        signature?: string;
        returns?: string;
        params?: MethodParam[];
    }>(),
    {
        name: 'Method signature',
        signature: '',
    }
);

const hasParams = computed(() => Boolean(props.params?.length));
</script>

<template>
    <Card class="not-prose overflow-hidden">
        <CardHeader class="border-b border-border">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>{{ name }}</CardTitle>
                <Badge v-if="returns" variant="outline" class="font-mono"
                    >returns {{ returns }}</Badge
                >
            </div>
        </CardHeader>
        <CardContent class="flex flex-col gap-5 pt-6">
            <pre
                v-if="signature || $slots.signature"
                class="overflow-x-auto rounded-lg border border-border bg-background p-4 font-mono text-sm leading-7 text-card-foreground"
            ><code><slot name="signature">{{ signature }}</slot></code></pre>

            <div v-if="hasParams" class="overflow-x-auto">
                <table class="w-full min-w-[560px] text-left text-sm">
                    <thead>
                        <tr class="border-b border-border text-muted-foreground">
                            <th class="py-2 pr-4 font-semibold">Parameter</th>
                            <th class="py-2 pr-4 font-semibold">Type</th>
                            <th class="py-2 pr-4 font-semibold">Required</th>
                            <th class="py-2 font-semibold">Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="param in params"
                            :key="param.name"
                            class="border-b border-border"
                        >
                            <td class="py-3 pr-4 font-mono text-card-foreground">
                                {{ param.name }}
                            </td>
                            <td class="py-3 pr-4 font-mono text-muted-foreground">
                                {{ param.type }}
                            </td>
                            <td class="py-3 pr-4">
                                <Badge :variant="param.required ? 'default' : 'outline'">
                                    {{ param.required ? 'yes' : 'no' }}
                                </Badge>
                            </td>
                            <td class="py-3 text-muted-foreground">
                                {{ param.description || '-' }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </CardContent>
    </Card>
</template>
