import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { parseSpec, parseTypeExpression, parseReturnType } from '../scripts/bot-api/parse';
import { emitMethods, emitTypes } from '../scripts/bot-api/emit';
import { buildCoverage, renderCoverageMarkdown } from '../scripts/bot-api/coverage';

const html = readFileSync(join(__dirname, 'fixtures', 'bot-api-sample.html'), 'utf8');
const spec = parseSpec(html);

describe('Bot API generator: parsing', () => {
    it('reads the latest version from the changelog', () => {
        expect(spec.version).toBe('10.3');
        expect(spec.date).toBe('August 24, 2026');
    });

    it('parses type tables with optional/required fields', () => {
        const chat = spec.types.Chat;
        expect(chat.kind).toBe('object');
        expect(chat.fields.find(f => f.name === 'id')).toMatchObject({
            type: 'Integer',
            required: true,
        });
        expect(chat.fields.find(f => f.name === 'title')?.required).toBe(false);
        expect(spec.types.Message.fields[1].typeExpr).toEqual({
            kind: 'array',
            of: { kind: 'ref', name: 'PhotoSize' },
        });
    });

    it('parses "can be one of" union lists', () => {
        expect(spec.types.MaybeInaccessibleMessage).toMatchObject({
            kind: 'union',
            oneOf: ['Message', 'InaccessibleMessage'],
        });
    });

    it('parses method parameter tables and return types', () => {
        const edit = spec.methods.editMessageText;
        expect(edit.params.map(p => p.name)).toContain('text');
        expect(edit.params.every(p => p.required === false)).toBe(true);
        expect(edit.params.find(p => p.name === 'chat_id')).toMatchObject({
            type: 'Integer or String',
            required: false,
        });
        expect(edit.returns).toEqual({
            kind: 'union',
            of: [
                { kind: 'ref', name: 'Message' },
                { kind: 'ref', name: 'True' },
            ],
        });
        expect(spec.methods.getMe.params).toEqual([]);
        expect(spec.methods.getUpdates.params.map(p => p.name)).toContain('offset');
    });

    it('parses type expressions and return sentences', () => {
        expect(parseTypeExpression('Array of Array of PhotoSize')).toEqual({
            kind: 'array',
            of: { kind: 'array', of: { kind: 'ref', name: 'PhotoSize' } },
        });
        expect(parseTypeExpression('InputFile or String')).toEqual({
            kind: 'union',
            of: [
                { kind: 'ref', name: 'InputFile' },
                { kind: 'ref', name: 'String' },
            ],
        });
        expect(parseReturnType('Returns an Array of Update objects.', ['Update'])).toEqual({
            kind: 'array',
            of: { kind: 'ref', name: 'Update' },
        });
        expect(parseReturnType('Use this method. No info here', [])).toBeNull();
    });
});

describe('Bot API generator: emitting', () => {
    it('emits interfaces, unions and string literal enums', () => {
        const out = emitTypes(spec);
        expect(out).toContain('export interface Chat {');
        expect(out).toContain('type: "private" | "group" | "supergroup" | "channel";');
        expect(out).toContain('title?: string;');
        expect(out).toContain('export type MaybeInaccessibleMessage = Message | unknown;');
    });

    it('emits the ApiMethods map with params and results', () => {
        const out = emitMethods(spec);
        expect(out).toContain('export interface ApiMethods {');
        expect(out).toContain('result: BotApi.Message | true;');
        expect(out).toContain('chat_id?: number | string;');
        expect(out).toContain('params: Record<string, never>;');
    });
});

describe('Bot API generator: coverage', () => {
    it('reports missing types, missing fields and optionality mismatches', () => {
        const report = buildCoverage(spec, {
            Chat: { fields: { id: { optional: false }, type: { optional: true } } },
        });
        expect(report.missingTypes).toContain('Message');
        expect(report.missingFields).toContain('Chat.title');
        expect(report.optionalityMismatches).toEqual([
            'Chat.type (spec: required, local: optional)',
        ]);
        expect(renderCoverageMarkdown(report)).toContain('## Missing fields');
    });
});
