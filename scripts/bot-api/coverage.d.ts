import type { BotApiSpec } from './parse';

export interface DeclaredTypes {
    [name: string]: { fields: Record<string, { optional: boolean }> };
}

export interface CoverageReport {
    version: string | null;
    summary: Record<string, number>;
    missingTypes: string[];
    missingFields: string[];
    optionalityMismatches: string[];
}

export function readDeclaredTypes(typesFile: string): DeclaredTypes;
export function buildCoverage(spec: BotApiSpec, declared: DeclaredTypes): CoverageReport;
export function renderCoverageMarkdown(report: CoverageReport): string;
export const defaultTypesFile: string;
