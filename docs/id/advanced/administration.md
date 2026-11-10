# Administrasi Grup

<FeatureGrid title="Fitur manajemen grup" description="Gunakan shortcut ini saat bot memoderasi grup, supergrup, join request, atau izin anggota.">
  <FeatureCard title="Kontrol member" description="Ban, unban, restrict, dan promote member dari helper Context." href="#ban-unban" cta="Buka member" />
  <FeatureCard title="Permission" description="Atur permission chat dan kebijakan moderasi default." href="#pengaturan-izin-chat" cta="Buka permission" />
  <FeatureCard title="Semua metode admin" description="Lihat tabel lengkap shortcut administrasi." href="#referensi-metode-admin" cta="Buka referensi" />
</FeatureGrid>

Bot moderasi biasanya mengeluarkan spammer, membisukan orang sementara, mengangkat
moderator, dan mengunci chat saat ada serbuan spam. VibeGram menyediakan semua itu
sebagai shortcut `ctx` yang sudah tahu chat yang sedang aktif, jadi Anda cukup
memberikan user dan opsinya.

## Sebelum Mulai

Tiga aturan berlaku untuk semua contoh di halaman ini:

1. **Bot harus menjadi admin** di grup, dengan hak yang dibutuhkan aksinya (misalnya
   *Ban users* untuk `banChatMember`). Kalau tidak, Telegram membalas
   `400 Bad Request: not enough rights`.
2. **Cek bahwa pengirim command adalah admin.** Tanpa pengecekan ini, anggota mana
   pun bisa mem-ban atau mempromosikan orang lain lewat bot Anda.
3. **Pilih user target lewat reply.** Telegram tidak memberi bot daftar anggota, jadi
   pola yang umum adalah: admin membalas pesan seseorang dengan `/ban`.

Contoh-contoh di bawah memakai satu guard yang dibuat dari filter inti `isAdmin()`.
Guard ini meloloskan admin dan diam-diam mengabaikan selain admin:

```typescript
import { Bot, guard, isAdmin, type Context } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
const adminsOnly = guard(isAdmin());

/** User yang pesannya dibalas, jika ada. */
const replyTarget = (ctx: Context) => ctx.message?.reply_to_message?.from?.id;
```

::: tip Banyak pengecekan admin?
`isAdmin()` memanggil `getChatMember` di setiap command. Untuk grup yang ramai, pakai
plugin [`@vibegram/chat-members`](/id/plugins/chat-members) yang menyimpan cache status anggota.
:::

## Ban & Unban

`banChatMember` mengeluarkan user dan mencegahnya kembali sampai di-unban. **Kick**
(keluarkan sekarang, boleh kembali nanti) adalah ban yang langsung diikuti unban.

```typescript
bot.command('ban', adminsOnly, async ctx => {
    const userId = replyTarget(ctx);
    if (!userId) return ctx.reply('Balas pesan user yang ingin di-ban.');

    await ctx.banChatMember(userId);
    await ctx.reply('User di-ban.');
});

bot.command('kick', adminsOnly, async ctx => {
    const userId = replyTarget(ctx);
    if (!userId) return ctx.reply('Balas pesan user yang ingin dikeluarkan.');

    await ctx.banChatMember(userId);
    await ctx.unbanChatMember(userId); // bisa bergabung lagi lewat link undangan
    await ctx.reply('User dikeluarkan dari grup.');
});

// /unban 123456789 — user yang di-ban tidak punya pesan untuk dibalas, jadi pakai id.
bot.command('unban', adminsOnly, async ctx => {
    const userId = Number(ctx.command?.args[0]);
    if (!Number.isInteger(userId) || userId <= 0) return ctx.reply('Cara pakai: /unban <id user>');

    await ctx.unbanChatMember(userId, { only_if_banned: true });
    await ctx.reply('User di-unban.');
});
```

`only_if_banned: true` membuat unban tidak melakukan apa-apa untuk user yang masih ada
di chat; tanpa opsi ini, Telegram justru akan mengeluarkan mereka.

## Membatasi Anggota (Mute)

`restrictChatMember` mengubah apa yang boleh dilakukan satu user. Berikan izin yang
ingin diatur dan, jika perlu, `until_date` (timestamp Unix dalam detik) agar
pembatasannya sementara.

```typescript
bot.command('mute', adminsOnly, async ctx => {
    const userId = replyTarget(ctx);
    if (!userId) return ctx.reply('Balas pesan user yang ingin dibisukan.');

    await ctx.restrictChatMember(
        userId,
        {
            can_send_messages: false,
            can_send_photos: false,
            can_send_videos: false,
            can_send_audios: false,
            can_send_documents: false,
        },
        { until_date: Math.floor(Date.now() / 1000) + 60 * 60 } // 1 jam
    );
    await ctx.reply('User dibisukan selama 1 jam.');
});

bot.command('unmute', adminsOnly, async ctx => {
    const userId = replyTarget(ctx);
    if (!userId) return ctx.reply('Balas pesan user yang ingin dibuka bisunya.');

    await ctx.restrictChatMember(userId, {
        can_send_messages: true,
        can_send_photos: true,
        can_send_videos: true,
        can_send_audios: true,
        can_send_documents: true,
    });
    await ctx.reply('User bisa berbicara lagi.');
});
```

Telegram menganggap `until_date` di bawah 30 detik atau di atas 366 hari sebagai "selamanya".

## Promosi ke Admin

`promoteChatMember` memberi hak admin. Berikan hanya hak yang dibutuhkan admin baru:
bot hanya bisa memberikan hak yang ia miliki sendiri.

```typescript
bot.command('promote', adminsOnly, async ctx => {
    const userId = replyTarget(ctx);
    if (!userId) return ctx.reply('Balas pesan user yang ingin dipromosikan.');

    await ctx.promoteChatMember(userId, {
        can_manage_chat: true,
        can_delete_messages: true,
        can_restrict_members: true,
        can_pin_messages: true,
    });
    await ctx.setChatAdministratorCustomTitle(userId, 'Moderator');
    await ctx.reply('User diangkat menjadi moderator.');
});

// Tanpa hak apa pun berarti status admin dicabut.
bot.command('demote', adminsOnly, async ctx => {
    const userId = replyTarget(ctx);
    if (!userId) return ctx.reply('Balas pesan admin yang ingin diturunkan.');

    await ctx.promoteChatMember(userId, {});
    await ctx.reply('Hak admin dicabut.');
});
```

## Informasi Grup

Pemanggilan ini hanya membaca data dan tidak butuh hak admin, jadi siapa pun boleh memakainya.

```typescript
bot.command('info', async ctx => {
    const chat = await ctx.getChat();
    const anggota = await ctx.getChatMembersCount();
    const admin = await ctx.getChatAdministrators();

    await ctx.reply(`${chat.title}\nAnggota: ${anggota}\nAdmin: ${admin.length}`);
});

// Status user yang pesannya dibalas, atau status Anda sendiri.
bot.command('status', async ctx => {
    const userId = replyTarget(ctx) ?? ctx.from?.id;
    if (!userId) return;

    const member = await ctx.getChatMember(userId);
    await ctx.reply(`Status: ${member.status}`); // creator, administrator, member, restricted, left, kicked
});
```

## Link Undangan

Buat link tambahan untuk melacak dari mana anggota datang, atau untuk membatasi berapa
lama dan berapa kali link bisa dipakai.

```typescript
bot.command('undangan', adminsOnly, async ctx => {
    const link = await ctx.createChatInviteLink({
        name: 'Link promo',
        expire_date: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 jam
        member_limit: 100,
    });
    await ctx.reply(`Link undangan (100 orang, 24 jam):\n${link.invite_link}`);
});
```

Pakai `creates_join_request: true` (sebagai ganti `member_limit`) agar orang harus
mengajukan permintaan bergabung; setujui dengan `ctx.approveChatJoinRequest(userId)`
di handler `bot.on('chat_join_request', ...)`.

## Pengaturan Izin Chat

`setChatPermissions` mengatur hak default **semua** anggota non-admin, misalnya untuk
mengunci chat saat ada gelombang spam. Admin tidak terpengaruh.

```typescript
bot.command('lockdown', adminsOnly, async ctx => {
    await ctx.setChatPermissions({
        can_send_messages: false,
        can_send_photos: false,
        can_send_videos: false,
    });
    await ctx.reply('Chat dikunci: hanya admin yang bisa mengirim pesan.');
});

bot.command('buka', adminsOnly, async ctx => {
    await ctx.setChatPermissions({
        can_send_messages: true,
        can_send_photos: true,
        can_send_videos: true,
        can_send_audios: true,
        can_send_documents: true,
    });
    await ctx.reply('Chat dibuka lagi untuk semua anggota.');
});
```

## Forum Topic

Di supergrup yang mengaktifkan topik, bot bisa membuat dan menutup topik. Pesan di
dalam topik membawa `message_thread_id`-nya.

```typescript
bot.command('topik', adminsOnly, async ctx => {
    const topik = await ctx.createForumTopic('Pengumuman', { icon_color: 0xff93b2 });
    await ctx.reply(`Topik "${topik.name}" dibuat.`);
});

bot.command('tutup_topik', adminsOnly, async ctx => {
    const threadId = ctx.message?.message_thread_id;
    if (!threadId) return ctx.reply('Jalankan command ini di dalam sebuah topik forum.');

    await ctx.closeForumTopic(threadId);
});
```

Nama command hanya boleh berisi huruf, angka, dan garis bawah, jadi pakai
`tutup_topik`, bukan `tutup-topik`.

## Referensi Metode Admin

| Metode | API | Deskripsi |
| --- | --- | --- |
| `ctx.banChatMember(userId, extra?)` | `banChatMember` | Ban user |
| `ctx.unbanChatMember(userId, extra?)` | `unbanChatMember` | Unban user |
| `ctx.restrictChatMember(userId, perms, extra?)` | `restrictChatMember` | Batasi izin satu user |
| `ctx.promoteChatMember(userId, rights?)` | `promoteChatMember` | Beri atau cabut hak admin |
| `ctx.setChatAdministratorCustomTitle(userId, title)` | `setChatAdministratorCustomTitle` | Atur gelar kustom admin |
| `ctx.setChatPermissions(perms, extra?)` | `setChatPermissions` | Atur izin default anggota |
| `ctx.getChatMember(userId)` | `getChatMember` | Info dan status satu anggota |
| `ctx.getChatAdministrators(extra?)` | `getChatAdministrators` | Daftar admin chat |
| `ctx.getChatMembersCount()` | `getChatMemberCount` | Jumlah anggota |
| `ctx.getChat()` | `getChat` | Informasi lengkap chat |
| `ctx.createChatInviteLink(extra?)` | `createChatInviteLink` | Buat link undangan tambahan |
| `ctx.exportChatInviteLink()` | `exportChatInviteLink` | Ganti dan ambil link undangan utama |
| `ctx.approveChatJoinRequest(userId)` | `approveChatJoinRequest` | Setujui join request |
| `ctx.declineChatJoinRequest(userId)` | `declineChatJoinRequest` | Tolak join request |
| `ctx.pinChatMessage(messageId?, disableNotification?)` | `pinChatMessage` | Sematkan pesan |
| `ctx.unpinChatMessage(messageId?)` | `unpinChatMessage` | Lepas sematan pesan |
| `ctx.createForumTopic(name, extra?)` | `createForumTopic` | Buat topik forum |
| `ctx.closeForumTopic(threadId)` | `closeForumTopic` | Tutup topik forum |
| `ctx.leaveChat()` | `leaveChat` | Bot keluar dari chat |
