import { Bot } from 'grammy';
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
	return bot;
};

export { getBot, setBot };
