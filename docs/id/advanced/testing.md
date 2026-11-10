# Testing

`vibegram/testing` menjalankan bot secara offline. Kit ini mencegat setiap panggilan
Bot API keluar, merekamnya, dan mengembalikan hasil yang realistis, sehingga test tidak
butuh token maupun jaringan.

```typescript
import { describe, expect, it } from 'vitest';
import { Bot, Markup } from 'vibegram';
import { createTestBot } from 'vibegram/testing';

function buatBot() {
    const bot = new Bot('test-token');
    bot.command('start', ctx =>
        ctx.reply('Selamat datang!', {
            reply_markup: Markup.inlineKeyboard([[Markup.button.callback('Toko', 'toko')]]),
        })
    );
    bot.action('toko', ctx => ctx.answerCbQuery('Membuka toko...'));
    return bot;
}

describe('bot', () => {
    it('menyapa saat /start', async () => {
        const t = createTestBot(buatBot());

        await t.sendCommand('start');

        const call = t.lastCall('sendMessage');
        expect(call?.payload.text).toBe('Selamat datang!');
        expect(call?.payload.reply_markup.inline_keyboard[0][0].callback_data).toBe('toko');
    });

    it('menjawab tombol', async () => {
        const t = createTestBot(buatBot());
        await t.pressButton('toko');
        expect(t.lastCall('answerCallbackQuery')?.payload.text).toBe('Membuka toko...');
    });
});
```

## Mengirim update

| Metode | Yang dikirim |
| --- | --- |
| `sendText(text, options?)` | Pesan teks. |
| `sendCommand(name, args?, options?)` | `/name args` dengan entity `bot_command`. |
| `sendMessage(fields, options?)` | Pesan dengan field apa pun, misalnya `{ photo: [...] }`. |
| `pressButton(data, options?)` | Callback query. |
| `sendUpdate(update)` | Update mentah (`update_id` diisi otomatis). |

Opsi pesan: `from`, `chat`, `message` (field tambahan), dan `updateType`
(`'edited_message'`, `'channel_post'`, ...). Setiap metode selesai setelah middleware
bot selesai; error tanpa `bot.catch()` akan reject.

```typescript
await t.sendText('halo', { chat: { id: -100, type: 'supergroup', title: 'Tim' } });
await t.sendCommand('start', undefined, { updateType: 'edited_message' });
```

## Memeriksa panggilan

| Member | Deskripsi |
| --- | --- |
| `calls` | Semua panggilan keluar, berurutan (`{ method, payload }`). |
| `callsOf(method)` | Panggilan untuk satu metode. |
| `lastCall(method?)` | Panggilan terakhir. |
| `clearCalls()` | Reset rekaman. |

Secara default, `send*` / `edit*` / `copyMessage` / `forwardMessage` mengembalikan
`Message` buatan, `getMe` mengembalikan user bot, dan sisanya mengembalikan `true`.

## Stub hasil dan error

```typescript
const t = createTestBot(bot)
    .stub('getChatMember', { status: 'administrator', user: { id: 1, is_bot: false, first_name: 'A' } })
    .stub('sendMessage', call => {
        if (call.payload.chat_id === CHAT_DIBLOKIR) throw new Error('Forbidden: bot was blocked');
        return { message_id: 1, date: 0, chat: { id: call.payload.chat_id, type: 'private' } };
    });
```

`createTestBot(bot, { user, chat, botInfo })` mengatur pengirim, chat, dan identitas
bot default. Kit ini memasang request transformer di `bot.client`, jadi juga mencakup
panggilan `bot.callApi()` dan `bot.client.callApi()` di luar handler.
