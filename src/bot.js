import { Bot } from 'grammy';
import { hydrateReply, parseMode } from '@grammyjs/parse-mode';

let bot;
const getBot = () => {
	if (!bot) {
		throw new Error('Bot is not initialized');
	}
	return bot;
};
const setBot = (env) => {
	if (bot) {
		return bot;
	}
	bot = new Bot(env.BOT_TOKEN, { botInfo: JSON.parse(env.BOT_INFO) });

	// Install the plugin.
	bot.use(hydrateReply);

	// Set the default parse mode for ctx.reply.
	bot.api.config.use(parseMode('MarkdownV2'));
	return bot;
};

export { getBot, setBot };
