// scripts/bot-api/parse.js
// Parses the HTML of https://core.telegram.org/bots/api into a JSON snapshot.
// Pure functions only (no network, no fs) so it can be unit-tested on fixtures.

'use strict';

const ENTITIES = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
    '&laquo;': '«',
    '&raquo;': '»',
    '&mdash;': '—',
    '&ndash;': '–',
};

function decodeEntities(text) {
    return text
        .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
        .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
        .replace(/&[a-z]+;|&#39;/gi, entity => ENTITIES[entity] ?? entity);
}

function stripTags(html) {
    return decodeEntities(
        html
            .replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, '$1')
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/<[^>]+>/g, '')
    )
        .replace(/\s+/g, ' ')
        .trim();
}

/** Extracts the latest "Bot API X.Y" version and its release date from the changelog. */
function parseVersion(html) {
    const match = html.match(
        /<h4>(?:<a[^>]*>.*?<\/a>)?([^<]+)<\/h4>\s*<p><strong>Bot API ([0-9.]+)<\/strong><\/p>/
    );
    if (!match) return { version: null, date: null };
    return { version: match[2], date: match[1].trim() };
}

function parseTable(tableHtml) {
    const headers = [...tableHtml.matchAll(/<th>([\s\S]*?)<\/th>/g)].map(m => stripTags(m[1]));
    const body = tableHtml.split(/<tbody>/)[1] ?? '';
    const rows = [...body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(row =>
        [...row[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map(cell => cell[1])
    );
    return { headers, rows };
}

/**
 * Splits a section of the page into its <h4> blocks. Each block keeps its raw
 * HTML so tables, lists and paragraphs can be read independently.
 */
function splitSections(html) {
    // Update and WebhookInfo live under "Getting updates", before "Available types".
    const start = html.search(/<h3>(?:<a[^>]*>.*?<\/a>)?Getting updates<\/h3>/);
    const content = start >= 0 ? html.slice(start) : html;
    const parts = content.split(/(?=<h[34]>)/);
    const sections = [];
    for (const part of parts) {
        const heading = part.match(/^<h([34])>(?:<a[^>]*>.*?<\/a>)?([\s\S]*?)<\/h\1>/);
        if (!heading || heading[1] !== '4') continue;
        const name = stripTags(heading[2]);
        if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name)) continue;
        sections.push({ name, body: part.slice(heading[0].length) });
    }
    return sections;
}

function sectionDescription(body) {
    const beforeTable = body.split(/<table|<ul|<blockquote|<h[34]>/)[0];
    return [...beforeTable.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m => stripTags(m[1])).join('\n');
}

function sectionDescriptionHtml(body) {
    const beforeTable = body.split(/<table|<h[34]>/)[0];
    return [...beforeTable.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m => m[1]).join(' ');
}

/** Splits a Bot API type expression into a list of alternatives. */
function splitTypeAlternatives(typeText) {
    return typeText
        .split(/\s+or\s+|\s*,\s*|\s+and\s+/)
        .map(part => part.trim())
        .filter(Boolean);
}

/**
 * Converts a spec type string (e.g. "Array of Array of PhotoSize", "Integer or String")
 * into a normalized structure: { kind: 'array', of } | { kind: 'union', of: [] } | { kind: 'ref', name }.
 */
function parseTypeExpression(typeText) {
    const text = typeText.trim();
    const arrayMatch = text.match(/^Array of (.+)$/);
    if (arrayMatch) {
        return { kind: 'array', of: parseTypeExpression(arrayMatch[1]) };
    }
    const alternatives = splitTypeAlternatives(text);
    if (alternatives.length > 1) {
        return { kind: 'union', of: alternatives.map(parseTypeExpression) };
    }
    return { kind: 'ref', name: text };
}

const RETURN_PRIMITIVES = ['True', 'Boolean', 'Integer', 'Int', 'String', 'Float'];

/**
 * Heuristically extracts a method's return type from its description by scanning
 * sentences that mention "return" for known type names.
 */
function parseReturnType(description, typeNames) {
    const names = [...typeNames, ...RETURN_PRIMITIVES].sort((a, b) => b.length - a.length);
    const namePattern = names.join('|');
    const pattern = new RegExp(`(\\b(?:an? )?[Aa]rray of )?\\b(${namePattern})(?:s)?\\b`, 'g');
    const sentences = description.split(/(?<=\.)\s+/).filter(s => /return/i.test(s));
    const found = [];
    const seen = new Set();
    for (const sentence of sentences) {
        for (const match of sentence.matchAll(pattern)) {
            const expr = match[1]
                ? { kind: 'array', of: { kind: 'ref', name: match[2] } }
                : { kind: 'ref', name: match[2] };
            const key = JSON.stringify(expr);
            if (seen.has(key)) continue;
            seen.add(key);
            found.push(expr);
        }
    }
    if (found.length === 0) return null;
    if (found.length === 1) return found[0];
    return { kind: 'union', of: found };
}

function parseSpec(html) {
    const { version, date } = parseVersion(html);
    const sections = splitSections(html);
    const typeNames = sections.filter(s => /^[A-Z]/.test(s.name)).map(s => s.name);
    const types = {};
    const methods = {};

    for (const { name, body } of sections) {
        const description = sectionDescription(body);
        const tableMatch = body.split(/<h[34]>/)[0].match(/<table class="table">([\s\S]*?)<\/table>/);
        const listMatch = body.split(/<h[34]>|<table/)[0].match(/<ul>([\s\S]*?)<\/ul>/);

        if (/^[A-Z]/.test(name)) {
            const entry = { name, description, kind: 'object', fields: [] };
            if (tableMatch) {
                const { headers, rows } = parseTable(tableMatch[1]);
                if (headers[0] === 'Field') {
                    entry.fields = rows.map(([field, type, desc]) => {
                        const fieldDescription = stripTags(desc ?? '');
                        return {
                            name: stripTags(field),
                            type: stripTags(type),
                            typeExpr: parseTypeExpression(stripTags(type)),
                            required: !/^Optional\./.test(fieldDescription),
                            description: fieldDescription,
                        };
                    });
                }
            } else if (listMatch) {
                // "It can be one of" / "any of the following" lists: every item is a link to a type.
                const items = [...listMatch[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => m[1].trim());
                if (items.length > 0 && items.every(item => /^<a href="#[a-z0-9]+">[A-Za-z0-9]+<\/a>$/.test(item))) {
                    entry.kind = 'union';
                    entry.oneOf = items.map(stripTags);
                }
            }
            types[name] = entry;
        } else {
            const entry = {
                name,
                description,
                params: [],
                returns: parseReturnType(stripTags(sectionDescriptionHtml(body)), typeNames),
            };
            if (tableMatch) {
                const { headers, rows } = parseTable(tableMatch[1]);
                if (headers[0] === 'Parameter') {
                    entry.params = rows.map(([param, type, required, desc]) => ({
                        name: stripTags(param),
                        type: stripTags(type),
                        typeExpr: parseTypeExpression(stripTags(type)),
                        required: stripTags(required) === 'Yes',
                        description: stripTags(desc ?? ''),
                    }));
                }
            }
            methods[name] = entry;
        }
    }

    return { version, date, types, methods };
}

module.exports = {
    parseSpec,
    parseVersion,
    parseTypeExpression,
    parseReturnType,
    stripTags,
};
