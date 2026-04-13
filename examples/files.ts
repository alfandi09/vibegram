import { Bot } from '../src/index';
// @ts-ignore
import fs from 'fs';
// @ts-ignore
import path from 'path';

const bot = new Bot('YOUR_BOT_TOKEN');

// Download incoming photo to local filesystem
bot.on('photo', async (ctx) => {
    await ctx.reply('Processing photo...');

    const photoArray = ctx.message?.photo;
    if (photoArray && photoArray.length > 0) {
        // Get the highest resolution variant (last element)
        const fileId = photoArray[photoArray.length - 1].file_id;

        const dest = path.join(__dirname, 'downloaded_image.jpg');
        await ctx.downloadFile(fileId, dest);

        await ctx.reply(`Photo saved to: ${dest}`);
    }
});

// Upload a local file using Node.js ReadStream
bot.command('getfile', async (ctx) => {
    await ctx.reply('Uploading file...');

    // Multipart form-data serialization is handled automatically
    const localStream = fs.createReadStream(path.join(__dirname, 'wizard.ts'));

    await bot.callApi('sendDocument', {
        chat_id: ctx.chat?.id,
        document: localStream,
        caption: 'Source code: wizard.ts'
    });
});

bot.launch().then(() => console.log('File management bot running.'));
