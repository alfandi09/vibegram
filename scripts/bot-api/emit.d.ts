import type { BotApiSpec, TypeExpr } from './parse';

export function emitTypes(spec: BotApiSpec): string;
export function emitMethods(spec: BotApiSpec): string;
export function renderType(expr: TypeExpr | null, knownTypes: Set<string>): string;
