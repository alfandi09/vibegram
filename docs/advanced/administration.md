# Group Administration

<FeatureGrid title="Group management surfaces" description="Use these shortcuts when a bot moderates groups, supergroups, join requests, or member permissions.">
  <FeatureCard title="Member controls" description="Ban, unban, restrict, and promote members from Context helpers." href="#member-management" />
  <FeatureCard title="Permissions" description="Set default chat permissions and moderation policy." href="#permissions" />
  <FeatureCard title="Join requests" description="Approve or decline users before they enter the group." href="#join-requests" />
</FeatureGrid>

VibeGram provides Context shortcuts for common group and supergroup management tasks.

## Banning & Unbanning

```typescript
// Ban a user
bot.command('ban', async ctx => {
    const userId = ctx.message?.reply_to_message?.from?.id;
    if (!userId) return ctx.reply('Reply to a message to ban the user.');

    await ctx.banChatMember(userId);
    await ctx.reply('User banned.');
});

// Unban a user
bot.command('unban', async ctx => {
    const userId = parseInt(ctx.command?.args?.[0] || '0');
    await ctx.unbanChatMember(userId, { only_if_banned: true });
    await ctx.reply('User unbanned.');
});
```

## Restricting Members

```typescript
bot.command('mute', async ctx => {
    const userId = ctx.message?.reply_to_message?.from?.id;
    if (!userId) return ctx.reply('Reply to a message to mute.');

    await ctx.restrictChatMember(
        userId,
        {
            can_send_messages: false,
            can_send_photos: false,
            can_send_videos: false,
        },
        {
            until_date: Math.floor(Date.now() / 1000) + 3600, // 1 hour
        }
    );
    await ctx.reply('User muted for 1 hour.');
});
```

## Promoting to Admin

```typescript
bot.command('promote', async ctx => {
    const userId = ctx.message?.reply_to_message?.from?.id;
    if (!userId) return;

    await ctx.promoteChatMember(userId, {
        can_delete_messages: true,
        can_restrict_members: true,
        can_pin_messages: true,
    });
    await ctx.reply('User promoted to admin.');
});
```

## Chat Information

```typescript
// Get chat details
bot.command('info', async ctx => {
    const chat = await ctx.getChat();
    const count = await ctx.getChatMembersCount();
    await ctx.reply(`Chat: ${chat.title}\nMembers: ${count}`);
});

// Check member status
bot.command('status', async ctx => {
    const userId = ctx.message?.reply_to_message?.from?.id || ctx.from?.id || 0;
    const member = await ctx.getChatMember(userId);
    await ctx.reply(`Status: ${member.status}`);
});
```

## Invite Links

```typescript
bot.command('invite', async ctx => {
    const link = await ctx.createChatInviteLink({
        name: 'Promo Link',
        expire_date: Math.floor(Date.now() / 1000) + 86400, // 24 hours
        member_limit: 100,
    });
    await ctx.reply(`Invite: ${link.invite_link}`);
});
```

## Setting Permissions

```typescript
bot.command('lockdown', async ctx => {
    await ctx.setChatPermissions({
        can_send_messages: false,
        can_send_photos: false,
        can_send_videos: false,
    });
    await ctx.reply('Chat locked down — only admins can post.');
});
```

## All Admin Methods

| Method                                          | API                      | Description                  |
| ----------------------------------------------- | ------------------------ | ---------------------------- |
| `ctx.banChatMember(userId, extra?)`             | `banChatMember`          | Ban a user                   |
| `ctx.unbanChatMember(userId, extra?)`           | `unbanChatMember`        | Unban a user                 |
| `ctx.restrictChatMember(userId, perms, extra?)` | `restrictChatMember`     | Restrict user permissions    |
| `ctx.promoteChatMember(userId, perms?)`         | `promoteChatMember`      | Promote to admin             |
| `ctx.setChatPermissions(perms, extra?)`         | `setChatPermissions`     | Set default chat permissions |
| `ctx.getChatMember(userId)`                     | `getChatMember`          | Get member info and status   |
| `ctx.getChatMembersCount()`                     | `getChatMemberCount`     | Get total member count       |
| `ctx.getChat()`                                 | `getChat`                | Get full chat information    |
| `ctx.createChatInviteLink(extra?)`              | `createChatInviteLink`   | Create invite link           |
| `ctx.exportChatInviteLink()`                    | `exportChatInviteLink`   | Get primary invite link      |
| `ctx.approveChatJoinRequest(userId)`            | `approveChatJoinRequest` | Approve join request         |
| `ctx.declineChatJoinRequest(userId)`            | `declineChatJoinRequest` | Decline join request         |
| `ctx.leaveChat()`                               | `leaveChat`              | Bot leaves the chat          |
| `ctx.pinChatMessage(messageId?, notify?)`       | `pinChatMessage`         | Pin a message                |
| `ctx.unpinChatMessage(messageId?)`              | `unpinChatMessage`       | Unpin a message              |
