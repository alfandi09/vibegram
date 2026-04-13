import { Bot, WebAppUtils } from '../src/index';

const bot = new Bot('YOUR_BOT_TOKEN');

// Scenario: Express.js backend receives initData from a Telegram Mini App
// The Mini App sends `window.Telegram.WebApp.initData` via POST request.

// Simulated tampered payload
const manipulatedInitData = 'query_id=AAHdF...&user=%7B%22id%22%3A123456...&hash=Fake123';

try {
    // Option 1: Validate using the bot instance
    const userData = bot.validateWebAppData(manipulatedInitData);

    // Option 2: Validate using the static utility class
    // const userData = WebAppUtils.validate('YOUR_BOT_TOKEN', manipulatedInitData);

    console.log('Validation successful:', userData);

    // Safe to proceed with database operations:
    // db.users.update(userData.id, { diamonds: +10 });

} catch (error) {
    console.error('Validation failed — HMAC signature mismatch:');
    console.error((error as Error).message);
}
