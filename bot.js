require('dotenv').config();
const http = require('http');
const { 
    Bot, session, rateLimit, logger, apiCache, Composer,
    Markup, Menu, Wizard, Conversation, Scene, Stage,
    I18n, BotQueue, InlineResults, WebAppUtils,
    and, or, not, isPrivate, isGroup, isSupergroup, isChannel, isAdmin, isBot, hasPhoto, hasVoice,
    createPlugin,
    createNativeHandler
} = require('.');

const TOKEN = process.env.BOT_TOKEN || 'TOKEN_BOT_ANDA_DI_SINI';
if (TOKEN === 'TOKEN_BOT_ANDA_DI_SINI') {
    console.error('❌ MASUKKAN TOKEN BOT TERLEBIH DAHULU DI BARIS KE-11!');
    process.exit(1);
}

const bot = new Bot(TOKEN);

// ==============================================================================
// KATEGORI 1: KONFIGURASI DASAR, PLUGIN, I18N, MIDDLEWARE
// ==============================================================================

// -- Plugin System
const testerPlugin = createPlugin('testerPlugin', (b) => {
    b.command('test_plugin', ctx => ctx.reply('✅ Plugin system bekerja. Tereksekusi dari Plugin!'));
});
bot.plugin(testerPlugin());

// -- I18n Integrasi
const i18n = new I18n('id');
i18n.loadLocale('id', { sapa: 'Halo {nama}! 🇮🇩', info: 'Anda memilih bahasa Indonesia.' });
i18n.loadLocale('en', { sapa: 'Hello {nama}! 🇬🇧', info: 'You selected English language.' });

// -- Global Middleware
bot.use(logger());
bot.use(apiCache({ ttl: 60 })); 
bot.use(rateLimit());
bot.use(session({ initial: () => ({ hit: 0, lang: 'id', userProps: {} }) })); 
bot.use(async (ctx, next) => {
    if (ctx.session?.lang) ctx.i18n?.setLocale(ctx.session.lang);
    await next();
});
bot.use(i18n.middleware());

// ==============================================================================
// KATEGORI 3: STATE MANAGEMENT (Inisialisasi)
// (Menu, Wizard, Scene, Conversation)
// ==============================================================================

// -- MENU BUILDER
const mainNavigator = new Menu('nav');
mainNavigator.text('🇬🇧 Change to English', async ctx => {
    ctx.session.lang = 'en';
    await ctx.answerCbQuery('Language Changed');
    await ctx.editMessageText(ctx.i18n.t('info'));
});
const subNav = mainNavigator.submenu('akun', '👤 Buka Sub-Menu');
subNav.text('Ambil Info Akun', async ctx => await ctx.answerCbQuery('Info akun palsu', true));
subNav.row();
subNav.back('🔙 Kembali ke Navigasi');
bot.use(mainNavigator.middleware());

// -- WIZARD
const formWizard = new Wizard('form', [
    async ctx => { await ctx.reply('Langkah 1: Masukkan Umur (Hanya Angka):'); ctx.wizard.next(); },
    async ctx => {
        const umur = parseInt(ctx.message?.text || '');
        if (isNaN(umur)) return ctx.reply('Harus angka. Coba lagi:'); // Tinggal di tahap ini (validasi)
        ctx.wizard.state.umur = umur;
        await ctx.reply(`Umur: ${umur}. Langkah 2: Berikan pendapat Anda (Bisa ketik "batal"):`);
        ctx.wizard.next();
    },
    async ctx => {
        if (ctx.message?.text?.toLowerCase() === 'batal') {
            await ctx.reply('Batal mengisi form.');
            return ctx.wizard.leave();
        }
        await ctx.reply(`Form Selesai! Umur: ${ctx.wizard.state.umur}, Pendapat: ${ctx.message?.text}`);
        ctx.wizard.leave();
    }
]);
bot.use(formWizard.middleware());

// -- SCENE & STAGE
const chatScene = new Scene('s_chat');
chatScene.on('message', async ctx => {
    if (ctx.message?.text === 'exit') return ctx.scene.leave();
    await ctx.reply('Anda Terjebak di Scene! Ketik "exit"');
});
const stageInstance = new Stage([chatScene]);
bot.use(stageInstance.middleware());

// -- CONVERSATION
const dialogKuis = new Conversation();
dialogKuis.define('kuis_cepat', async (ctx, c) => {
    await ctx.reply('Cepat, 1+1 = ?');
    const ans = await c.waitForText({ 
        validate: cx => cx.message?.text === '2', 
        validationError: 'Salah, hitung lagi:', 
        timeout: 10_000 
    });
    await ctx.reply('👍 Benar!');
});
bot.use(dialogKuis.middleware());

// ==============================================================================
// PERINTAH PENGUJIAN ROUTER KATEGORI 3
// ==============================================================================
bot.command('test_menu', ctx => ctx.reply('Uji Menu:', { reply_markup: mainNavigator.renderSync(ctx) }));
bot.command('test_wizard', ctx => formWizard.enter(ctx));
bot.command('test_scene', ctx => ctx.scene.enter('s_chat'));
bot.command('test_conv', ctx => dialogKuis.enter('kuis_cepat', ctx));
bot.command('test_session', async ctx => {
    ctx.session.hit++;
    await ctx.reply(`Session Hitung: ${ctx.session.hit}`);
});


// ==============================================================================
// KATEGORI 2: UI & MARKUP LAYOUT
// ==============================================================================
bot.command('test_inline', ctx => ctx.reply('Inline KB:', { reply_markup: Markup.inlineKeyboard([[Markup.button.callback('Tes', 'tes')]]) }));
bot.command('test_reply', ctx => ctx.reply('Reply KB:', { reply_markup: Markup.keyboard([[Markup.button.contact('Bagi Kontak')]]).resize() }));
bot.command('test_remove', ctx => ctx.reply('Hapus KB', { reply_markup: Markup.removeKeyboard() }));
bot.command('test_force', ctx => ctx.reply('Paksa Reply', { reply_markup: Markup.forceReply() }));

bot.command('test_grid', ctx => {
    ctx.reply('Markup.grid Otomatis:', { reply_markup: Markup.grid(['1','2','3','4','5'].map(x => Markup.button.callback(x, `bt_${x}`)), 2) });
});
bot.action(/^bt_(.*)$/, ctx => ctx.answerCbQuery(ctx.match[1]));

const itemPagination = Array.from({length: 12}).map((_, i) => ({ text: `Halaman ${i+1}`, callback_data: `pgn_${i+1}` }));
bot.command('test_pagination', ctx => {
    ctx.reply('Otomatisasi Pagination:', { reply_markup: Markup.pagination(itemPagination, { currentPage: 1, itemsPerPage: 5, actionNext: 'pg_n', actionPrev: 'pg_p' }) });
});

bot.command('test_buttons_v96', ctx => {
    ctx.reply('Fitur Tombol API 9.6 Telegram:', {
        reply_markup: Markup.inlineKeyboard([
            [Markup.button.copy('📋 Salin Token', 'RAHASIA-1234')],
            [Markup.button.login('🔑 Login', { url: 'https://telegram.org' })],
            [Markup.button.pay('💳 Bayar')],
            [Markup.button.switchInline('🔍 Cari Disini', 'halo', true)],
            [Markup.button.webApp('🌐 WebApp Mini', 'https://telegram.org')]
        ])
    });
});


// ==============================================================================
// KATEGORI 4: API CONTEXT 9.6 (PESAN, MEDIA, INTERAKSI)
// ==============================================================================
bot.command('test_media', async ctx => {
    await ctx.sendChatAction('upload_photo');
    await ctx.replyWithPhoto('https://picsum.photos/400', { caption: '<b>Bold</b> <i>Italic</i>', parse_mode: 'HTML' });
});

bot.command('test_interactive', async ctx => {
    await ctx.replyWithPoll('Pilih bahasa tersulit:', ['C++', 'Rust', 'JS'], { is_anonymous: false });
    await ctx.replyWithDice('🎳'); 
    await ctx.replyWithLocation({ latitude: -6.200000, longitude: 106.816666 });
});

bot.command('test_actions', async ctx => {
    await ctx.setReaction([{ type: 'emoji', emoji: '🔥' }]);
    await ctx.reply('Pesan ini mendapat reaksi API!');
});


// ==============================================================================
// KATEGORI 5: STARS, PAYMENTS & GIFTS
// ==============================================================================
bot.command('test_stars', async ctx => {
    try {
        await ctx.replyWithPaidMedia(15, [{ type: 'photo', media: 'https://picsum.photos/300' }], { caption: 'Membayar 15 Stars untuk buka konten' });
    } catch(e) { ctx.reply('Paid Media dilarang di chat server ini.'); }
});

bot.command('test_invoice', async ctx => {
    await ctx.replyWithInvoice({
        title: 'Beli Fitur', description: 'Deskripsi Produk', payload: 'TES_PAYLOAD',
        provider_token: process.env.STRIPE_TOKEN || '', currency: 'XTR', prices: [{ label: 'Fitur', amount: 50 }]
    });
});
bot.on('pre_checkout_query', ctx => ctx.answerPreCheckoutQuery(true));
bot.on('message', async ctx => {
    if (ctx.message?.successful_payment) await ctx.reply('✅ Terima kasih pembayarannya!');
});

bot.command('test_gift', async ctx => {
    try {
        const giftList = await ctx.getAvailableGifts();
        await ctx.reply(`Ada ${giftList.gifts.length} jenis hadiah tersedia di platform ini.`);
    } catch(e) { /* Abaikan jika blm didukung total */ }
});

bot.command('test_balance', async ctx => {
    try {
        const b = await ctx.getStarBalance();
        await ctx.reply(`Bot ini memiliki ${b.amount} Telegram Stars.`);
    } catch(e) { ctx.reply('Tidak ada Stars.'); }
});


// ==============================================================================
// KATEGORI 6: MODERASI & ADMINISTRASI (Admin Group commands)
// ==============================================================================
bot.command('test_admin', and(isGroup, isAdmin()), async ctx => {
    // Harap balas (reply) member lain untuk ini aslinya, ini hanya mock logic
    const userId = ctx.message?.reply_to_message?.from?.id;
    if (!userId) return ctx.reply('Balas pesan pengguna untuk mute mereka 60dtk.');
    await ctx.restrictChatMember(userId, { can_send_messages: false }, { until_date: Math.floor(Date.now()/1000) + 60 });
    ctx.reply('Di-mute 60 detik.');
});

bot.command('test_groupinfo', async ctx => {
    if (!ctx.chat?.id) return;
    const c = await ctx.getChat();
    const count = await ctx.getChatMembersCount();
    await ctx.reply(`Nama Group: ${c.title}, Member: ${count}`);
});

bot.command('test_lockdown', and(isGroup, isAdmin()), async ctx => {
    await ctx.setChatPermissions({ can_send_messages: false });
    await ctx.reply('Grup Dilockdown. (Panggil /test_unlock untuk membuka)');
});
bot.command('test_unlock', and(isGroup, isAdmin()), async ctx => {
    await ctx.setChatPermissions({ can_send_messages: true, can_send_other_messages: true });
    await ctx.reply('Grup Dibuka.');
});

bot.command('test_pin', and(isGroup, isAdmin()), async ctx => {
    const msgId = ctx.message?.reply_to_message?.message_id;
    if (!msgId) return ctx.reply('Balas pesan tertentu.');
    await ctx.pinChatMessage(msgId);
    await ctx.reply('Pesan disematkan.');
});


// ==============================================================================
// KATEGORI 7: FORUM, DRAFT & DOWNLOAD FILES
// ==============================================================================
bot.command('test_topic', and(isSupergroup), async ctx => {
    try {
        const t = await ctx.createForumTopic('Random Topic');
        await ctx.reply(`Topik "${t.name}" dibuat.`);
    } catch(e) { ctx.reply('Bukan chat berbentuk forum.'); }
});

bot.command('test_verify', async ctx => {
    try {
        await ctx.verifyUser(ctx.from.id); // Khusus bot yg bisa memverifikasi org
    } catch(e) { ctx.reply('Bot ini tidak memiliki hak verifikasi.'); }
});

bot.command('test_draft', async ctx => {
    await ctx.replyWithDraft('/pesan Halo, apa kabar?');
});

bot.on('message', and(isPrivate, hasPhoto), async ctx => {
    if (!ctx.message?.photo) return;
    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const url = await ctx.getFileLink(fileId);
    await ctx.reply(`Link Resolusi Penuh File Anda:\n${url}`);
});


// ==============================================================================
// KATEGORI 8: FILTER COMBINATORS
// ==============================================================================
// Bukti and / or / not
bot.hears('!filter1', and(isPrivate, not(isBot)), ctx => ctx.reply('Ini di Privat, Anda Manusia.'));
bot.hears('!filter2', and(isGroup, isAdmin()), ctx => ctx.reply('Anda adalah Admin Grup.'));
bot.hears('!filter3', or(isChannel, isSupergroup), ctx => ctx.reply('Anda ada di supergrup atau channel post.'));


// ==============================================================================
// KATEGORI 9: INLINE QUERY BUILDER (9 JENIS LISTING API)
// ==============================================================================
bot.on('inline_query', async ctx => {
    const q = ctx.update.inline_query?.query || 'Tes';
    const res = InlineResults.builder()
        .article({ id: '1', title: 'Artikel', text: `Hasil dari: ${q}`, description: 'Format Artikel' })
        .photo({ id: '2', url: 'https://picsum.photos/500/300', thumbnail_url: 'https://picsum.photos/150' })
        .document({ id: '3', title: 'Dokumen', document_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', mime_type: 'application/pdf' })
        .video({ id: '4', title: 'Video', video_url: 'https://www.w3schools.com/html/mov_bbb.mp4', mime_type: 'video/mp4', thumbnail_url: 'https://picsum.photos/100' })
        .gif({ id: '5', gif_url: 'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif' })
        .voice({ id: '6', title: 'Pesan Suara', voice_url: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Olympe_de_Gouges_parlant.ogg' })
        .location({ id: '7', title: 'Lokasi Anda', latitude: -6.2, longitude: 106.8 })
        .venue({ id: '8', title: 'Toko', address: 'Jl. Sudirman', latitude: -6.2, longitude: 106.8 })
        .contact({ id: '9', first_name: 'CS Robot', phone_number: '+123456789' })
        .build();
    await ctx.answerInlineQuery(res, { cache_time: 1 });
});


// ==============================================================================
// KATEGORI 11: QUEUE & BROADCASTING
// ==============================================================================
const bQueue = new BotQueue(bot.client, { concurrency: 2, delayMs: 1000 });
bot.command('test_broadcast', async ctx => {
    const ids = Array(10).fill(ctx.from?.id); // broadcast diri sendiri 10x
    await ctx.reply('Mulai Broadcasting (Cek terminal untuk proses anti rate-limit)...');
    
    const r = await bQueue.broadcastMessage(ids, 'Pengumuman Sistem!');
    await ctx.reply(`Selesai! Berhasil: ${r.success}, Gagal: ${r.failed}, Waktu Total: ${r.durationMs}ms`);
});


// ==============================================================================
// KATEGORI 10: WEBAPP VALIDATION NATIVE DEMO & START MENU
// ==============================================================================
bot.command('start', async ctx => {
    const userSapa = ctx.i18n.t('sapa', { nama: ctx.from?.first_name });
    const content = `${userSapa}\n\n🤖 <b>SEMUA FITUR VIBEGRAM TEST BOTS</b>\n
<b>1. UI & MARKUP</b>
/test_inline — Inline Keyboard Biasa
/test_reply — Keyboard Custom / Location Request
/test_remove — Buang Keyboard Bawah
/test_force — Reply Paksa
/test_grid — <i>Layout Markup Grid Otomatis</i>
/test_pagination — <i>Layout Paginasi Multi-halaman</i>
/test_buttons_v96 — <b>Tombol API 9.6: Copy, Pay, Login, WebApp</b>

<b>2. STATE MANAGEMENT & PLUGIN</b>
/test_plugin — Test Injeksi Plugin Eksternal
/test_session — Penghitung Session Interaktif
/test_menu — <b>Stateful Built-in Menu Navigator</b>
/test_wizard — <b>Formulir 3 Langkah (Validasi Dinamis)</b>
/test_scene — <b>Isolasi Percakapan Keras</b>
/test_conv — <b>Async Linear Dialog Kuis Cepat</b>

<b>3. API 9.6: MEDIA & INTERAKSI</b>
/test_media — Kirim Foto dan Chat Actions
/test_interactive — Poll 1-klik, Dadu, dan Lokasi
/test_actions — Bereaksi Otomatis Emoji API v9.6

<b>4. API 9.6: STARS & PAYMENTS</b>
/test_invoice — Penerbitan Invoice Resmi
/test_stars — Pengiriman Paid Media Telegram Stars
/test_gift — Mengintip ketersediaan Hadiah/Gifts
/test_balance — Mengecek Total Pemasukan Stars Bot

<b>5. MODERASI & ADMIN GRUP</b>
/test_admin — Simulator Mute Pengguna
/test_groupinfo — Metadata Anggota Grup & Link Invite
/test_lockdown — Cabut Izinkan Semua Percakapan
/test_pin — Sematkan Obrolan Permanen

<b>6. TELEGRAM FORUMS & UTILITIES</b>
/test_topic — Membuat Forum Topic Thread Baru
/test_verify — API Verifikasi Bot Centang Biru
/test_draft — Teks Tersisa Pre-filled (Mengisi Kotak Chat)
Kirim Gambar: Bot akan membalas Link File Resolusi Penuh

<b>7. LOGIKA LAINNYA</b>
Coba ketik perintah <code>!filter1</code>, <code>!filter2</code>, atau <code>!filter3</code>
Atau, mention inline query bot ini dengan mengetikkan nama panel untuk mengeksplorasi Katalog Builder (Gif, Contact, Venue, dsb)

/test_broadcast — Simulasi pengiriman berjadwal ekstrim Rate-Limit via BotQueue`;

    await ctx.reply(content, { parse_mode: 'HTML' });
});

bot.catch((err) => console.error('Terdapat Error Global:', err.message));

// ==============================================================================
// LAUNCH ENGINE
// ==============================================================================
bot.launch({
    onStart: (me) => {
        console.log(`\n=================================================`);
        console.log(`✅ OMNI TESTER VIBEGRAM BERHASIL BERJALAN `);
        console.log(`🤖 USERNAME : @${me.username}`);
        console.log(`=================================================\n`);
    }
});

// Contoh Kategori 10: WebApp Authentication Server (Native Handler Express-like Validation)
// Simulasi sederhana memvalidasi initData bawaan telegram (uncomment jika perlu endpoint HTTP Murni)
/*
const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/api/validate-webapp') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const initData = JSON.parse(body).initData;
                const user = WebAppUtils.validate(TOKEN, initData);
                res.writeHead(200);
                res.end(JSON.stringify({ status: 'ok', user }));
            } catch (e) {
                res.writeHead(403);
                res.end(JSON.stringify({ status: 'error', message: e.message }));
            }
        });
    }
});
server.listen(3000, () => console.log('✅ Port 3000 siaga menanti validasi mini-app.'));
*/
