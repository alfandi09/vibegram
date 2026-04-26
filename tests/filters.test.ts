import { describe, expect, it, vi } from 'vitest';
import {
    and,
    guard,
    or,
    not,
    isPrivate,
    isGroup,
    isSupergroup,
    isChannel,
    isBot,
    isHuman,
    isForwarded,
    isReply,
    hasText,
    hasPhoto,
    hasDocument,
    hasVideo,
    hasAudio,
    hasVoice,
    hasSticker,
    hasAnimation,
    hasLocation,
    hasContact,
    isCallbackQuery,
    isInlineQuery,
    isUser,
    isChat,
    isAdmin,
    hasTextContaining,
} from '../src/filters';
import {
    createContext,
    createNext,
    makeCallbackQueryUpdate,
    makeGroupMessageUpdate,
    makeMessageUpdate,
    makePhotoUpdate,
} from './helpers/mock';
import { Context } from '../src/context';
import { Message } from '../src/types';

describe('filters', () => {
    it('guard() runs guarded middleware only when the predicate passes', async () => {
        const guarded = vi.fn();
        const middleware = guard(ctx => typeof ctx.message?.text === 'string', guarded);

        const textCtx = createContext(makeMessageUpdate('hello')).ctx;
        const photoCtx = createContext(makePhotoUpdate()).ctx;

        await middleware(textCtx, vi.fn());
        await middleware(photoCtx, vi.fn());

        expect(guarded).toHaveBeenCalledTimes(1);
        expect(guarded).toHaveBeenCalledWith(textCtx, expect.any(Function));
    });

    it('guard() supports type predicates for narrowed handlers', async () => {
        type TextMessageContext = Context & { message: Message & { text: string } };
        const hasTextMessage = (ctx: Context): ctx is TextMessageContext =>
            typeof ctx.message?.text === 'string';

        let capturedText = '';
        const middleware = guard(hasTextMessage, ctx => {
            capturedText = ctx.message.text.toUpperCase();
        });

        await middleware(createContext(makeMessageUpdate('hello')).ctx, vi.fn());

        expect(capturedText).toBe('HELLO');
    });

    it('guard() without nested middleware behaves like a blocking filter', async () => {
        const middleware = guard(ctx => typeof ctx.message?.text === 'string');
        const textNext = createNext();
        const photoNext = createNext();

        await middleware(createContext(makeMessageUpdate('hello')).ctx, textNext.next);
        await middleware(createContext(makePhotoUpdate()).ctx, photoNext.next);

        expect(textNext.called()).toBe(true);
        expect(photoNext.called()).toBe(false);
    });

    it('and() runs next only when every filter passes', async () => {
        const middleware = and(
            () => true,
            async () => true
        );
        const { ctx } = createContext(makeMessageUpdate('hello'));
        const { next, called } = createNext();

        await middleware(ctx, next);
        expect(called()).toBe(true);
    });

    it('or() runs next when at least one filter passes and not() negates filters', async () => {
        const middleware = or(
            () => false,
            not(() => false)
        );
        const { ctx } = createContext(makeMessageUpdate('hello'));
        const { next, called } = createNext();

        await middleware(ctx, next);
        expect(called()).toBe(true);
    });

    it('built-in chat and actor filters match expected update shapes', async () => {
        const privateCtx = createContext(makeMessageUpdate('hello')).ctx;
        const groupCtx = createContext(makeGroupMessageUpdate('hello')).ctx;
        const channelCtx = createContext({
            update_id: 10,
            channel_post: {
                message_id: 1,
                date: 1,
                text: 'news',
                chat: { id: -200, type: 'channel', title: 'Updates' },
            },
        } as any).ctx;
        const botCtx = createContext(
            makeMessageUpdate('hello', {
                from: { id: 7, is_bot: true, first_name: 'Worker' },
            })
        ).ctx;

        expect(isPrivate(privateCtx)).toBe(true);
        expect(isGroup(groupCtx)).toBe(true);
        expect(isSupergroup(groupCtx)).toBe(true);
        expect(isChannel(channelCtx)).toBe(true);
        expect(isBot(botCtx)).toBe(true);
        expect(isHuman(privateCtx)).toBe(true);
    });

    it('message content filters cover forwarded, reply, media, and text matching', async () => {
        const forwardedCtx = createContext(
            makeMessageUpdate('hello', {
                forward_origin: {
                    type: 'user',
                    date: 1,
                    sender_user: { id: 7, is_bot: false, first_name: 'Ada' },
                },
            })
        ).ctx;
        const replyCtx = createContext(
            makeMessageUpdate('hello', { reply_to_message: { message_id: 90 } })
        ).ctx;
        const documentCtx = createContext(
            makeMessageUpdate('file', { document: { file_id: 'doc-1' } })
        ).ctx;
        const videoCtx = createContext(
            makeMessageUpdate('video', { video: { file_id: 'vid-1' } })
        ).ctx;
        const audioCtx = createContext(
            makeMessageUpdate('audio', { audio: { file_id: 'aud-1' } })
        ).ctx;
        const voiceCtx = createContext(
            makeMessageUpdate('voice', { voice: { file_id: 'voc-1' } })
        ).ctx;
        const stickerCtx = createContext(
            makeMessageUpdate('sticker', { sticker: { file_id: 'stk-1' } })
        ).ctx;
        const animationCtx = createContext(
            makeMessageUpdate('gif', { animation: { file_id: 'gif-1' } })
        ).ctx;
        const locationCtx = createContext(
            makeMessageUpdate('where', { location: { latitude: 1, longitude: 2 } })
        ).ctx;
        const contactCtx = createContext(
            makeMessageUpdate('person', { contact: { phone_number: '123', first_name: 'Ada' } })
        ).ctx;
        const captionCtx = createContext({
            update_id: 11,
            message: {
                message_id: 1,
                date: 1,
                caption: 'Summer Sale 50%',
                from: { id: 42, is_bot: false, first_name: 'Test' },
                chat: { id: 99, type: 'private' },
            },
        } as any).ctx;

        expect(isForwarded(forwardedCtx)).toBe(true);
        expect(isReply(replyCtx)).toBe(true);
        expect(hasText(forwardedCtx)).toBe(true);
        expect(hasPhoto(createContext(makePhotoUpdate()).ctx)).toBe(true);
        expect(hasDocument(documentCtx)).toBe(true);
        expect(hasVideo(videoCtx)).toBe(true);
        expect(hasAudio(audioCtx)).toBe(true);
        expect(hasVoice(voiceCtx)).toBe(true);
        expect(hasSticker(stickerCtx)).toBe(true);
        expect(hasAnimation(animationCtx)).toBe(true);
        expect(hasLocation(locationCtx)).toBe(true);
        expect(hasContact(contactCtx)).toBe(true);
        expect(hasTextContaining('sale')(captionCtx)).toBe(true);
    });

    it('query and id filters match callback, inline, user, and chat identifiers', () => {
        const callbackCtx = createContext(makeCallbackQueryUpdate('pick')).ctx;
        const inlineCtx = createContext({
            update_id: 12,
            inline_query: {
                id: 'iq-1',
                from: { id: 42, is_bot: false, first_name: 'Test' },
                query: 'hello',
                offset: '',
            },
        } as any).ctx;

        expect(isCallbackQuery(callbackCtx)).toBe(true);
        expect(isInlineQuery(inlineCtx)).toBe(true);
        expect(isUser(42, 99)(callbackCtx)).toBe(true);
        expect(isChat(99, 123)(callbackCtx)).toBe(true);
    });

    it('isAdmin() handles private chats, admin members, and API failures', async () => {
        const privateCtx = createContext(makeMessageUpdate('hello')).ctx;
        const groupContextResult = createContext(makeGroupMessageUpdate('hello'), {
            status: 'administrator',
        });
        const groupCtx = groupContextResult.ctx;
        const failedContextResult = createContext(makeGroupMessageUpdate('hello'));
        const failedCtx = failedContextResult.ctx;

        vi.mocked(groupCtx.client.callApi).mockResolvedValueOnce({
            status: 'administrator',
        } as never);
        vi.mocked(failedCtx.client.callApi).mockRejectedValueOnce(new Error('forbidden'));

        expect(await isAdmin()(privateCtx)).toBe(true);
        expect(await isAdmin()(groupCtx)).toBe(true);
        expect(await isAdmin()(failedCtx)).toBe(false);
    });
});
