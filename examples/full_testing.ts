import { Bot, session, logger, rateLimit, Scene, Stage, Wizard, Markup } from '../src/index';

// =========================================================================
// VIBEGRAM: COMPREHENSIVE API TEST SUITE
// =========================================================================
// This file exercises every major VibeGram API method individually.
// Replace the token below with your test bot token.
// Run: npx ts-node examples/full_testing.ts

const bot = new Bot('YOUR_BOT_TOKEN');

// ==========================================
// 1. MIDDLEWARE STACK
// ==========================================
bot.use(logger());
bot.use(rateLimit({ windowMs: 30000, limit: 30 }));
bot.use(session());

// ==========================================
// 2. SCENE (ISOLATED ROUTING)
// ==========================================
const quarantineScene = new Scene('quarantine');
quarantineScene.command('status', ctx => ctx.reply('🔒 [Quarantine] Isolation active.'));
quarantineScene.command('exit', ctx => {
    ctx.reply('🚪 Exiting quarantine. Returning to global router.');
    ctx.scene?.leave();
});
quarantineScene.on('message', ctx => ctx.reply('Blocked by isolation. Use /status or /exit.'));

const stage = new Stage([quarantineScene]);
bot.use(stage.middleware());

// ==========================================
// 3. WIZARD (MULTI-STEP FORM)
// ==========================================
const RegWizard = new Wizard('reg_wizard', [
    async ctx => {
        await ctx.reply('Wizard Step 1: What is your name?', {
            reply_markup: Markup.forceReply(),
        });
        ctx.wizard?.next();
    },
    async ctx => {
        if (!ctx.message?.text) return ctx.reply('Please provide plain text.');
        ctx.wizard!.state.name = ctx.message.text;
        await ctx.reply(`Step 2: Hello ${ctx.wizard!.state.name}, what is your city?`);
        ctx.wizard?.next();
    },
    async ctx => {
        ctx.wizard!.state.city = ctx.message?.text;
        await ctx.reply(
            `Wizard complete!\nName: ${ctx.wizard!.state.name}\nCity: ${ctx.wizard!.state.city}`
        );
        ctx.wizard?.leave();
    },
]);
bot.use(RegWizard.middleware());

// ==========================================
// 4. COMMAND MENU & ARGUMENT PARSING
// ==========================================
bot.command('start', async ctx => {
    const menu = `
<b>🚀 VibeGram Comprehensive Test Suite</b>

<b>Media</b>
<code>/photo</code> | <code>/video</code> | <code>/audio</code> | <code>/document</code>
<code>/voice</code> | <code>/videonote</code> | <code>/sticker</code>
<code>/animation</code> | <code>/album</code>

<b>Interactive</b>
<code>/poll</code> | <code>/quiz</code> | <code>/dice</code>
<code>/location</code> | <code>/venue</code> | <code>/contact</code>

<b>Message Manipulation</b>
<code>/edit_text</code> | <code>/edit_caption</code> | <code>/edit_markup</code>
<code>/copy_msg</code> | <code>/forward_msg</code> | <code>/delete_msg</code>

<b>Formatting</b>
<code>/html</code> | <code>/markdown</code> | <code>/markdownv2</code>

<b>Modern API (v7.0 - v9.6)</b>
<code>/draft</code> | <code>/paid_media</code> | <code>/reaction</code> | <code>/chat_action</code>

<b>Admin & Utilities</b>
<code>/ban_test</code> | <code>/mute_test</code> | <code>/promote_test</code>
<code>/invite_link</code> | <code>/get_chat</code> | <code>/member_count</code>

<b>UI & Keyboards</b>
<code>/inline_keyboard</code> | <code>/reply_keyboard</code> | <code>/pagination</code>

<b>State Management</b>
<code>/quarantine</code> | <code>/wizard</code>

<b>Bot-Level</b>
<code>/bot_info</code> | <code>/set_commands</code>

<code>/error_test</code> — Test error handler resilience.
    `;
    await ctx.replyWithHTML(menu);
});

bot.command('extract', async ctx => {
    const payload = ctx.command?.args?.join(' ') || 'Empty';
    await ctx.reply(`Parsed arguments: [ ${payload} ]`);
});

// ==========================================
// 5. MEDIA
// ==========================================
bot.command('photo', ctx =>
    ctx.replyWithPhoto('https://picsum.photos/400', { caption: 'Photo via URL.' })
);
bot.command('document', ctx =>
    ctx.replyWithDocument(
        'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        { caption: 'PDF document.' }
    )
);
bot.command('audio', ctx =>
    ctx.replyWithAudio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', {
        caption: 'Audio file.',
    })
);
bot.command('video', ctx =>
    ctx.replyWithVideo(
        'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
        { caption: 'Video file.' }
    )
);
bot.command('voice', ctx =>
    ctx.replyWithVoice(
        'https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_2.ogg'
    )
);
bot.command('videonote', ctx =>
    ctx.reply(
        'Video notes require a pre-uploaded circular video file. Send one to the bot to test the on(video_note) handler.'
    )
);
bot.command('sticker', ctx =>
    ctx.replyWithSticker('CAACAgIAAxkBAAEDcm1hY0TpAAGVMqU5QjZRzkQxsqx6jyMAAgEAA8A2TxP0bFmGlVVlEiEE')
);
bot.command('animation', ctx =>
    ctx.replyWithAnimation('https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif', {
        caption: 'GIF animation.',
    })
);

// Media Group (Album)
bot.command('album', async ctx => {
    await ctx.replyWithMediaGroup([
        { type: 'photo', media: 'https://picsum.photos/400/300' },
        { type: 'photo', media: 'https://picsum.photos/400/301' },
        { type: 'photo', media: 'https://picsum.photos/400/302' },
    ]);
});

// Event handlers for incoming media
bot.on('photo', ctx => ctx.reply('Photo received and processed.'));
bot.on('document', async ctx => {
    const fileId = ctx.message?.document?.file_id;
    await ctx.reply(`Document received. File ID: \`${fileId}\``, { parse_mode: 'Markdown' });
});

// ==========================================
// 6. INTERACTIVE
// ==========================================
bot.command('poll', async ctx => {
    await ctx.replyWithPoll('What is your favorite programming language?', [
        { text: 'TypeScript' },
        { text: 'Python' },
        { text: 'Rust' },
        { text: 'Go' },
    ]);
});

bot.command('quiz', async ctx => {
    await ctx.replyWithPoll(
        'What does HTML stand for?',
        [
            { text: 'Hyper Text Markup Language' },
            { text: 'High Tech Modern Language' },
            { text: 'Home Tool Markup Language' },
        ],
        {
            type: 'quiz',
            correct_option_id: 0,
            explanation: 'HTML = Hyper Text Markup Language',
        }
    );
});

bot.command('dice', async ctx => await ctx.replyWithDice('🎰'));
bot.command('location', async ctx => await ctx.replyWithLocation(-6.2088, 106.8456));
bot.command(
    'venue',
    async ctx => await ctx.replyWithVenue(-6.2088, 106.8456, 'National Monument', 'Central Jakarta')
);
bot.command('contact', async ctx => await ctx.replyWithContact('+1234567890', 'John Doe'));

// ==========================================
// 7. MESSAGE MANIPULATION
// ==========================================
bot.command('edit_text', async ctx => {
    const msg = await ctx.reply('This text will be edited in 2 seconds...');
    setTimeout(() => {
        bot.callApi('editMessageText', {
            chat_id: ctx.chat?.id,
            message_id: msg.message_id,
            text: '✅ Text successfully edited via editMessageText.',
        }).catch(() => {});
    }, 2000);
});

bot.command('edit_caption', async ctx => {
    const msg = await ctx.replyWithPhoto('https://picsum.photos/400', {
        caption: 'Original caption.',
    });
    setTimeout(() => {
        bot.callApi('editMessageCaption', {
            chat_id: ctx.chat?.id,
            message_id: msg.message_id,
            caption: '✅ Caption updated via editMessageCaption.',
        }).catch(() => {});
    }, 2000);
});

bot.command('edit_markup', async ctx => {
    const keyboard = Markup.inlineKeyboard([[Markup.button.callback('Before Edit', 'noop')]]);
    const msg = await ctx.reply('Keyboard will update in 2 seconds.', { reply_markup: keyboard });
    setTimeout(() => {
        const newKeyboard = Markup.inlineKeyboard([
            [Markup.button.callback('✅ After Edit', 'noop')],
        ]);
        bot.callApi('editMessageReplyMarkup', {
            chat_id: ctx.chat?.id,
            message_id: msg.message_id,
            reply_markup: newKeyboard,
        }).catch(() => {});
    }, 2000);
});

bot.command('delete_msg', async ctx => {
    const msg = await ctx.reply('This message self-destructs in 3 seconds.');
    setTimeout(() => ctx.deleteMessage(msg.message_id).catch(() => {}), 3000);
});

bot.command('copy_msg', async ctx => {
    if (ctx.message) {
        await ctx.copyMessage(ctx.chat!.id);
        await ctx.reply('Message duplicated via copyMessage.');
    }
});

bot.command('forward_msg', async ctx => {
    if (ctx.message) {
        await ctx.forwardMessage(ctx.chat!.id);
        await ctx.reply('Message forwarded via forwardMessage.');
    }
});

// ==========================================
// 8. FORMATTING
// ==========================================
bot.command('html', ctx =>
    ctx.replyWithHTML(
        '<b>Bold</b>, <i>Italic</i>, <code>Monospace</code>, <a href="https://telegram.org">Link</a>'
    )
);
bot.command('markdown', ctx =>
    ctx.replyWithMarkdown('*Bold*, _Italic_, `Monospace`, [Link](https://telegram.org)')
);
bot.command('markdownv2', ctx =>
    ctx.replyWithMarkdownV2('*Bold*, _Italic_, `Monospace`, [Link](https://telegram\\.org)')
);

// ==========================================
// 9. MODERN API (v7.0 - v9.6)
// ==========================================
bot.command('chat_action', async ctx => {
    await ctx.sendChatAction('upload_video');
    await new Promise(r => setTimeout(r, 2000));
    await ctx.reply('Chat action "upload_video" was displayed for 2 seconds.');
});

bot.command('reaction', async ctx => {
    if (ctx.message) await ctx.setReaction('👀');
});

bot.command('draft', async ctx => {
    await ctx.replyWithDraft('This draft text pre-fills the user input field. (Bot API 9.5)');
});

bot.command('paid_media', async ctx => {
    await ctx.replyWithPaidMedia(15, [{ type: 'photo', media: 'https://picsum.photos/400/400' }], {
        caption: 'Paid media content (15 Telegram Stars)',
    });
});

// ==========================================
// 10. ADMIN & UTILITIES
// ==========================================
bot.command('ban_test', async ctx => {
    await ctx.reply('banChatMember simulation — requires Supergroup context and admin privileges.');
});

bot.command('mute_test', async ctx => {
    await ctx.reply(
        'restrictChatMember simulation — requires Supergroup context and admin privileges.'
    );
});

bot.command('promote_test', async ctx => {
    await ctx.reply(
        'promoteChatMember simulation — requires Supergroup context and admin privileges.'
    );
});

bot.command('invite_link', async ctx => {
    if (ctx.chat?.type === 'private') {
        return ctx.reply('Invite links require Group or Channel context.');
    }
    try {
        const link = await ctx.createChatInviteLink({ name: 'Test Link' });
        await ctx.reply(`Invite link created: ${link.invite_link}`);
    } catch (e) {
        await ctx.reply(`Failed: ${(e as Error).message}`);
    }
});

bot.command('get_chat', async ctx => {
    try {
        const chat = await ctx.getChat();
        await ctx.reply(
            `Chat info:\nType: ${chat.type}\nTitle: ${chat.title || chat.first_name || 'N/A'}`
        );
    } catch (e) {
        await ctx.reply(`Failed: ${(e as Error).message}`);
    }
});

bot.command('member_count', async ctx => {
    try {
        const count = await ctx.getChatMembersCount();
        await ctx.reply(`Members in this chat: ${count}`);
    } catch (e) {
        await ctx.reply(`Failed: ${(e as Error).message}`);
    }
});

// Bot-level methods
bot.command('bot_info', async ctx => {
    const me = await bot.getMe();
    await ctx.replyWithHTML(
        `<b>Bot Info</b>\nID: <code>${me.id}</code>\nUsername: @${me.username}\nName: ${me.first_name}\nCan Join Groups: ${me.can_join_groups}\nSupports Inline: ${me.supports_inline_queries}`
    );
});

bot.command('set_commands', async ctx => {
    await bot.setMyCommands([
        { command: 'start', description: 'Show test menu' },
        { command: 'bot_info', description: 'Display bot information' },
        { command: 'photo', description: 'Send a test photo' },
        { command: 'poll', description: 'Create a test poll' },
    ]);
    await ctx.reply('✅ Bot command menu updated. Restart Telegram to see changes.');
});

// ==========================================
// 11. UI & KEYBOARDS
// ==========================================
bot.command('inline_keyboard', async ctx => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('Button A', 'val_A'), Markup.button.callback('Button B', 'val_B')],
        [Markup.button.url('Documentation', 'https://telegram.org')],
        [Markup.button.switchInlineQuery('Inline Query (other chat)', 'search')],
        [Markup.button.switchInlineQueryCurrentChat('Inline Query (this chat)', 'search')],
    ]);
    await ctx.reply('Inline keyboard with callbacks, URLs, and inline queries:', {
        reply_markup: keyboard,
    });
});

bot.action('val_A', async ctx => {
    await ctx.answerCbQuery('Button A pressed.');
});
bot.action('val_B', async ctx => {
    await ctx.answerCbQuery('Button B pressed.');
});
bot.action('noop', async ctx => {
    await ctx.answerCbQuery();
});

bot.command('reply_keyboard', async ctx => {
    const keyboard = Markup.keyboard(
        [
            [Markup.replyButton.requestContact('📱 Share Phone')],
            [Markup.replyButton.requestLocation('📍 Share Location')],
            [Markup.replyButton.requestPoll('📊 Create Poll')],
        ],
        { resize_keyboard: true }
    );
    await ctx.reply('Reply keyboard activated:', { reply_markup: keyboard });
});

// ==========================================
// 12. PAGINATION
// ==========================================
const sampleData = [...Array(15)].map((_, i) => ({
    text: `Item ${i + 1}`,
    callback_data: `p_id_${i + 1}`,
}));

bot.command('pagination', async ctx => {
    const layout = Markup.pagination(sampleData, {
        currentPage: 1,
        itemsPerPage: 4,
        columns: 2,
        actionNext: 'np.next',
        actionPrev: 'np.prev',
    });
    await ctx.reply('Paginated data:', { reply_markup: layout });
});

bot.action(/np\.(next|prev)/, async ctx => {
    ctx.session.cursor = ctx.session.cursor || 1;
    const mode = ctx.update.callback_query?.data?.split('.')[1];
    mode === 'next' ? ctx.session.cursor++ : ctx.session.cursor--;
    if (ctx.session.cursor < 1) ctx.session.cursor = 1;

    const layout = Markup.pagination(sampleData, {
        currentPage: ctx.session.cursor,
        itemsPerPage: 4,
        columns: 2,
        actionNext: 'np.next',
        actionPrev: 'np.prev',
    });
    await ctx.answerCbQuery();
    await bot
        .callApi('editMessageReplyMarkup', {
            chat_id: ctx.chat?.id,
            message_id: ctx.update.callback_query?.message?.message_id,
            reply_markup: layout,
        })
        .catch(() => {});
});

bot.action(/p_id_(\d+)/, async ctx => {
    const data = ctx.update.callback_query?.data || '';
    const itemId = data.split('_')[2];
    await ctx.answerCbQuery(`Item ${itemId} selected.`);
});

// ==========================================
// 13. STATE MANAGEMENT
// ==========================================
bot.command('quarantine', ctx => ctx.scene?.enter('quarantine'));
bot.command('wizard', ctx => RegWizard.enter(ctx));

// ==========================================
// 14. ERROR HANDLER RESILIENCE TEST
// ==========================================
bot.command('error_test', async ctx => {
    await ctx.reply('Triggering a deliberate runtime error...');
    // @ts-ignore
    const crash = ctx.nonexistent.property.access();
});

bot.catch((err, ctx) => {
    console.error('[Error Handler]', err);
    ctx.reply('Error caught by bot.catch — server remains stable.').catch(() => {});
});

// ==========================================
// 15. LAUNCH
// ==========================================
bot.launch().then(() => console.log('✅ VibeGram Comprehensive Test Suite running.'));

process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());
