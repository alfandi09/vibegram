export type TypeExpr =
    | { kind: 'ref'; name: string }
    | { kind: 'array'; of: TypeExpr }
    | { kind: 'union'; of: TypeExpr[] };

export interface SpecField {
    name: string;
    type: string;
    typeExpr: TypeExpr;
    required: boolean;
    description: string;
}

export interface SpecType {
    name: string;
    description: string;
    kind: 'object' | 'union';
    fields: SpecField[];
    oneOf?: string[];
}

export interface SpecMethod {
    name: string;
    description: string;
    params: SpecField[];
    returns: TypeExpr | null;
}

export interface BotApiSpec {
    version: string | null;
    date: string | null;
    types: Record<string, SpecType>;
    methods: Record<string, SpecMethod>;
}

export function parseSpec(html: string): BotApiSpec;
export function parseVersion(html: string): { version: string | null; date: string | null };
export function parseTypeExpression(typeText: string): TypeExpr;
export function parseReturnType(description: string, typeNames: string[]): TypeExpr | null;
export function stripTags(html: string): string;
