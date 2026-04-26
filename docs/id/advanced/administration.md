# Administrasi Grup

<FeatureGrid title="Permukaan manajemen grup" description="Gunakan shortcut ini saat bot memoderasi grup, supergrup, join request, atau permission member.">
  <FeatureCard title="Kontrol member" description="Ban, unban, restrict, dan promote member dari helper Context." href="#manajemen-member" cta="Buka member" />
  <FeatureCard title="Permission" description="Atur permission chat dan kebijakan moderasi default." href="#permission" cta="Buka permission" />
  <FeatureCard title="Join request" description="Setujui atau tolak pengguna sebelum masuk grup." href="#join-request" cta="Buka request" />
</FeatureGrid>

VibeGram menyediakan shortcut Context untuk semua tugas manajemen grup dan supergrup yang umum.

## Ban & Unban

```typescript
// Ban pengguna
bot.command('ban', async ctx => {
    const userId = ctx.message?.reply_to_message?.from?.id;
    if (!userId) return ctx.reply('Balas pesan pengguna untuk mengeluarkannya.');

    await ctx.banChatMember(userId);
    await ctx.reply('✅ Pengguna telah dikeluarkan.');
});

// Unban pengguna
bot.command('unban', async ctx => {
    const userId = parseInt(ctx.command?.args?.[0] || '0');
    if (!userId) return ctx.reply('Masukkan ID pengguna.');

    await ctx.unbanChatMember(userId, { only_if_banned: true });
    await ctx.reply('✅ Pengguna telah di-unban.');
});

// Kick sementara (ban + unban segera)
bot.command('kick', async ctx => {
    const userId = ctx.message?.reply_to_message?.from?.id;
    if (!userId) return;

    await ctx.banChatMember(userId);
    await ctx.unbanChatMember(userId); // izinkan bergabung kembali
    await ctx.reply('🦶 Pengguna telah di-kick dari grup.');
});
```

## Membatasi Anggota (Mute)

```typescript
bot.command('mute', async ctx => {
    const userId = ctx.message?.reply_to_message?.from?.id;
    if (!userId) return ctx.reply('Balas pesan untuk membisukan pengguna.');

    await ctx.restrictChatMember(
        userId,
        {
            can_send_messages: false,
            can_send_photos: false,
            can_send_videos: false,
            can_send_audios: false,
            can_send_documents: false,
        },
        {
            until_date: Math.floor(Date.now() / 1000) + 3600, // 1 jam
        }
    );
    await ctx.reply('🔇 Pengguna dibisukan selama 1 jam.');
});

bot.command('unmute', async ctx => {
    const userId = ctx.message?.reply_to_message?.from?.id;
    if (!userId) return;

    await ctx.restrictChatMember(userId, {
        can_send_messages: true,
        can_send_photos: true,
        can_send_videos: true,
    });
    await ctx.reply('🔊 Pengguna sudah bisa berbicara kembali.');
});
```

## Promosi ke Admin

```typescript
bot.command('promote', async ctx => {
    const userId = ctx.message?.reply_to_message?.from?.id;
    if (!userId) return;

    await ctx.promoteChatMember(userId, {
        can_manage_chat: true,
        can_delete_messages: true,
        can_restrict_members: true,
        can_pin_messages: true,
    });

    // Set gelar kustom
    await ctx.setChatAdministratorCustomTitle(userId, 'Moderator');
    await ctx.reply('⭐ Pengguna dipromosikan menjadi Admin.');
});

// Turunkan admin (hapus semua hak)
bot.command('demote', async ctx => {
    const userId = ctx.message?.reply_to_message?.from?.id;
    if (!userId) return;

    await ctx.promoteChatMember(userId, {}); // hapus semua hak
    await ctx.reply('✅ Hak admin telah dicabut.');
});
```

## Informasi Grup

```typescript
bot.command('info', async ctx => {
    const chat = await ctx.getChat();
    const jumlah = await ctx.getChatMembersCount();
    const admin = await ctx.getChatAdministrators();

    await ctx.reply(
        `📊 Info Grup:\n` +
            `Nama: ${chat.title}\n` +
            `Anggota: ${jumlah}\n` +
            `Admin: ${admin.length}`
    );
});

bot.command('status', async ctx => {
    const userId = ctx.message?.reply_to_message?.from?.id || ctx.from?.id || 0;
    const member = await ctx.getChatMember(userId);
    await ctx.reply(`Status: ${member.status}`);
});
```

## Link Undangan

```typescript
bot.command('undangan', async ctx => {
    const link = await ctx.createChatInviteLink({
        name: 'Link Promo',
        expire_date: Math.floor(Date.now() / 1000) + 86400, // 24 jam
        member_limit: 100,
        creates_join_request: false,
    });
    await ctx.reply(`🔗 Link Undangan (100 orang, 24 jam):\n${link.invite_link}`);
});
```

## Pengaturan Izin Chat

```typescript
bot.command('lockdown', async ctx => {
    await ctx.setChatPermissions({
        can_send_messages: false,
        can_send_photos: false,
        can_send_videos: false,
    });
    await ctx.reply('🔒 Mode lockdown aktif — hanya admin yang bisa posting.');
});

bot.command('buka', async ctx => {
    await ctx.setChatPermissions({
        can_send_messages: true,
        can_send_photos: true,
        can_send_videos: true,
        can_send_audios: true,
    });
    await ctx.reply('🔓 Grup dibuka kembali untuk semua anggota.');
});
```

## Forum Topic

```typescript
bot.command('topik', async ctx => {
    const topik = await ctx.createForumTopic('Pengumuman 📢', {
        icon_color: 0xff93b2,
    });
    await ctx.reply(`✅ Topik "${topik.name}" berhasil dibuat.`);
});
```

## Referensi Metode Admin

| Metode                                               | Deskripsi                    |
| ---------------------------------------------------- | ---------------------------- |
| `ctx.banChatMember(userId, extra?)`                  | Keluarkan pengguna           |
| `ctx.unbanChatMember(userId, extra?)`                | Izinkan bergabung kembali    |
| `ctx.restrictChatMember(userId, perms, extra?)`      | Batasi hak pengguna          |
| `ctx.promoteChatMember(userId, perms?)`              | Jadikan admin                |
| `ctx.setChatAdministratorCustomTitle(userId, title)` | Set gelar admin              |
| `ctx.setChatPermissions(perms)`                      | Set izin default grup        |
| `ctx.getChatMember(userId)`                          | Info dan status anggota      |
| `ctx.getChatMembersCount()`                          | Jumlah anggota               |
| `ctx.getChatAdministrators()`                        | Daftar semua admin           |
| `ctx.getChat()`                                      | Info lengkap chat            |
| `ctx.createChatInviteLink(extra?)`                   | Buat link undangan           |
| `ctx.exportChatInviteLink()`                         | Ambil link undangan utama    |
| `ctx.approveChatJoinRequest(userId)`                 | Setujui permintaan bergabung |
| `ctx.declineChatJoinRequest(userId)`                 | Tolak permintaan bergabung   |
| `ctx.leaveChat()`                                    | Bot keluar dari chat         |
| `ctx.pinChatMessage(msgId?, notify?)`                | Pin pesan                    |
| `ctx.unpinChatMessage(msgId?)`                       | Unpin pesan                  |
| `ctx.unpinAllChatMessages()`                         | Unpin semua pesan            |
| `ctx.deleteUserMessagesFromChat(userId)`             | Hapus semua pesan pengguna   |
