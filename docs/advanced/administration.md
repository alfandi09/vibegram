# Group Administration

<FeatureGrid title="Group management surfaces" description="Use these shortcuts when a bot moderates groups, supergroups, join requests, or member permissions.">
  <FeatureCard title="Member controls" description="Ban, unban, restrict, and promote members from Context helpers." href="#banning-unbanning" />
  <FeatureCard title="Permissions" description="Set default chat permissions and moderation policy." href="#setting-permissions" />
  <FeatureCard title="All admin methods" description="Browse the complete table of administration shortcuts." href="#all-admin-methods" />
</FeatureGrid>

Moderation bots ban spammers, mute people for a while, promote helpers, and lock a
chat during a raid. VibeGram exposes each of these as a `ctx` shortcut that already
knows the current chat, so you only pass the user and the options.

## Before You Start

Three rules apply to every example on this page:

1. **The bot must be an admin** of the group, with the right that the action needs
   (for example *Ban users* for `banChatMember`). Otherwise Telegram answers with
   `400 Bad Request: not enough rights`.
2. **Check that the person sending the command is an admin.** Without this check,
   any member could ban or promote others through your bot.
3. **Pick the target user by reply.** Telegram does not give bots a list of members,
   so the usual pattern is: an admin replies to someone's message with `/ban`.

The examples below share one guard built from the core `isAdmin()` filter. It lets
admins through and silently ignores everyone else:

```typescript
import { Bot, guard, isAdmin, type Context } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
const adminsOnly = guard(isAdmin());

/** The user whose message was replied to, if any. */
const replyTarget = (ctx: Context) => ctx.message?.reply_to_message?.from?.id;
```

::: tip Many admin checks?
`isAdmin()` calls `getChatMember` on every command. For busy groups, use the
[`@vibegram/chat-members`](/plugins/chat-members) plugin, which caches member status.
:::

## Banning & Unbanning

`banChatMember` removes a user and keeps them out until they are unbanned. A **kick**
(remove now, allow them back later) is a ban followed by an unban.

```typescript
bot.command('ban', adminsOnly, async ctx => {
    const userId = replyTarget(ctx);
    if (!userId) return ctx.reply('Reply to a message from the user you want to ban.');

    await ctx.banChatMember(userId);
    await ctx.reply('User banned.');
});

bot.command('kick', adminsOnly, async ctx => {
    const userId = replyTarget(ctx);
    if (!userId) return ctx.reply('Reply to a message from the user you want to kick.');

    await ctx.banChatMember(userId);
    await ctx.unbanChatMember(userId); // they can join again with an invite link
    await ctx.reply('User removed from the group.');
});

// /unban 123456789 — a banned user has no message left to reply to, so take the id.
bot.command('unban', adminsOnly, async ctx => {
    const userId = Number(ctx.command?.args[0]);
    if (!Number.isInteger(userId) || userId <= 0) return ctx.reply('Usage: /unban <user id>');

    await ctx.unbanChatMember(userId, { only_if_banned: true });
    await ctx.reply('User unbanned.');
});
```

`only_if_banned: true` makes the unban a no-op for users who are still in the chat;
without it, Telegram would remove them.

## Restricting Members

`restrictChatMember` changes what one user may do. Pass the permissions to set and,
optionally, `until_date` (a Unix timestamp in seconds) to make it temporary.

```typescript
bot.command('mute', adminsOnly, async ctx => {
    const userId = replyTarget(ctx);
    if (!userId) return ctx.reply('Reply to a message from the user you want to mute.');

    await ctx.restrictChatMember(
        userId,
        {
            can_send_messages: false,
            can_send_photos: false,
            can_send_videos: false,
            can_send_audios: false,
            can_send_documents: false,
        },
        { until_date: Math.floor(Date.now() / 1000) + 60 * 60 } // 1 hour
    );
    await ctx.reply('User muted for 1 hour.');
});

bot.command('unmute', adminsOnly, async ctx => {
    const userId = replyTarget(ctx);
    if (!userId) return ctx.reply('Reply to a message from the user you want to unmute.');

    await ctx.restrictChatMember(userId, {
        can_send_messages: true,
        can_send_photos: true,
        can_send_videos: true,
        can_send_audios: true,
        can_send_documents: true,
    });
    await ctx.reply('User can talk again.');
});
```

Telegram treats an `until_date` under 30 seconds or over 366 days as "forever".

## Promoting to Admin

`promoteChatMember` grants admin rights. Grant only what the new admin needs: the bot
can only give rights that it has itself.

```typescript
bot.command('promote', adminsOnly, async ctx => {
    const userId = replyTarget(ctx);
    if (!userId) return ctx.reply('Reply to a message from the user you want to promote.');

    await ctx.promoteChatMember(userId, {
        can_manage_chat: true,
        can_delete_messages: true,
        can_restrict_members: true,
        can_pin_messages: true,
    });
    await ctx.setChatAdministratorCustomTitle(userId, 'Moderator');
    await ctx.reply('User promoted to moderator.');
});

// Passing no rights removes admin status.
bot.command('demote', adminsOnly, async ctx => {
    const userId = replyTarget(ctx);
    if (!userId) return ctx.reply('Reply to a message from the admin you want to demote.');

    await ctx.promoteChatMember(userId, {});
    await ctx.reply('Admin rights removed.');
});
```

## Chat Information

These calls read data and need no admin rights, so anyone may use them.

```typescript
bot.command('info', async ctx => {
    const chat = await ctx.getChat();
    const members = await ctx.getChatMembersCount();
    const admins = await ctx.getChatAdministrators();

    await ctx.reply(`${chat.title}\nMembers: ${members}\nAdmins: ${admins.length}`);
});

// Status of the replied-to user, or of yourself.
bot.command('status', async ctx => {
    const userId = replyTarget(ctx) ?? ctx.from?.id;
    if (!userId) return;

    const member = await ctx.getChatMember(userId);
    await ctx.reply(`Status: ${member.status}`); // creator, administrator, member, restricted, left, kicked
});
```

## Invite Links

Create extra links to track where members come from, or to limit how long and how
often a link works.

```typescript
bot.command('invite', adminsOnly, async ctx => {
    const link = await ctx.createChatInviteLink({
        name: 'Promo link',
        expire_date: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
        member_limit: 100,
    });
    await ctx.reply(`Invite link (100 people, 24 hours):\n${link.invite_link}`);
});
```

Set `creates_join_request: true` instead of `member_limit` to make people request to
join; approve them with `ctx.approveChatJoinRequest(userId)` in a
`bot.on('chat_join_request', ...)` handler.

## Setting Permissions

`setChatPermissions` sets the default rights of **all** non-admin members, for
example to lock the chat during a spam wave. Admins are not affected.

```typescript
bot.command('lockdown', adminsOnly, async ctx => {
    await ctx.setChatPermissions({
        can_send_messages: false,
        can_send_photos: false,
        can_send_videos: false,
    });
    await ctx.reply('Chat locked: only admins can post.');
});

bot.command('unlock', adminsOnly, async ctx => {
    await ctx.setChatPermissions({
        can_send_messages: true,
        can_send_photos: true,
        can_send_videos: true,
        can_send_audios: true,
        can_send_documents: true,
    });
    await ctx.reply('Chat unlocked for everyone.');
});
```

## Forum Topics

In supergroups with topics enabled, the bot can create and close topics. A message
inside a topic carries its `message_thread_id`.

```typescript
bot.command('topic', adminsOnly, async ctx => {
    const topic = await ctx.createForumTopic('Announcements', { icon_color: 0x6fb9f0 });
    await ctx.reply(`Topic "${topic.name}" created.`);
});

bot.command('close_topic', adminsOnly, async ctx => {
    const threadId = ctx.message?.message_thread_id;
    if (!threadId) return ctx.reply('Run this command inside a forum topic.');

    await ctx.closeForumTopic(threadId);
});
```

Command names may only contain letters, digits, and underscores, so use
`close_topic`, not `close-topic`.

## All Admin Methods

| Method | API | Description |
| --- | --- | --- |
| `ctx.banChatMember(userId, extra?)` | `banChatMember` | Ban a user |
| `ctx.unbanChatMember(userId, extra?)` | `unbanChatMember` | Unban a user |
| `ctx.restrictChatMember(userId, perms, extra?)` | `restrictChatMember` | Restrict one user's permissions |
| `ctx.promoteChatMember(userId, rights?)` | `promoteChatMember` | Grant or remove admin rights |
| `ctx.setChatAdministratorCustomTitle(userId, title)` | `setChatAdministratorCustomTitle` | Set an admin's custom title |
| `ctx.setChatPermissions(perms, extra?)` | `setChatPermissions` | Set default member permissions |
| `ctx.getChatMember(userId)` | `getChatMember` | Get one member's info and status |
| `ctx.getChatAdministrators(extra?)` | `getChatAdministrators` | List the chat's admins |
| `ctx.getChatMembersCount()` | `getChatMemberCount` | Get the member count |
| `ctx.getChat()` | `getChat` | Get full chat information |
| `ctx.createChatInviteLink(extra?)` | `createChatInviteLink` | Create an extra invite link |
| `ctx.exportChatInviteLink()` | `exportChatInviteLink` | Replace and return the primary invite link |
| `ctx.approveChatJoinRequest(userId)` | `approveChatJoinRequest` | Approve a join request |
| `ctx.declineChatJoinRequest(userId)` | `declineChatJoinRequest` | Decline a join request |
| `ctx.pinChatMessage(messageId?, disableNotification?)` | `pinChatMessage` | Pin a message |
| `ctx.unpinChatMessage(messageId?)` | `unpinChatMessage` | Unpin a message |
| `ctx.createForumTopic(name, extra?)` | `createForumTopic` | Create a forum topic |
| `ctx.closeForumTopic(threadId)` | `closeForumTopic` | Close a forum topic |
| `ctx.leaveChat()` | `leaveChat` | Make the bot leave the chat |
