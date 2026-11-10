/**
 * Replace this with your model provider's streaming API. Any AsyncIterable of
 * text deltas works, e.g. an SDK stream mapped to its text chunks:
 *
 *   for await (const event of sdkStream) if (event.text) yield event.text;
 */
export async function* generateAnswer(prompt: string): AsyncGenerator<string> {
    const reply = `You asked: "${prompt}". Plug in your model in src/ai.ts to answer for real.`;
    for (const word of reply.split(' ')) {
        await new Promise(resolve => setTimeout(resolve, 80));
        yield `${word} `;
    }
}
