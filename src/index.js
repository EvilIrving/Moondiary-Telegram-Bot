import { getBot, setBot } from './bot';
import { InlineKeyboard, webhookCallback } from 'grammy';
import { setDiaryModel, getDiaryModel } from './db';
import { generateTemplateByStep, getTemplate, emotionPlaceHolders } from './template';

// 添加用户状态对象
const userStates = {};

// 添加用户状态管理函数
function getUserState(userId) {
	return userStates[userId] || {};
}
const steps = [
	'emotion_type',
	'event_details',
	'event_feeling',
	'emotional_rating',
	'thoughts',
	'actions',
	'physical_reactions',
	'impact_on_situation',
	'completed',
];
function updateUserState(userId, newState) {
	userStates[userId] = { ...getUserState(userId), ...newState };
}

export default {
	async fetch(request, env) {
		const bot = setBot(env);

		setDiaryModel(env);

		bot.command('start', async (ctx) => {
			await ctx.reply('欢迎使用Moondiary。您想创建您的心情日记吗?', {
				reply_markup: new InlineKeyboard()
					.text('好，我要怎么开始呢？', 'create_diary')
					.row()
					.text('不，我暂时不想写日记', 'end_exercise')
					.row()
					.text('查看常见问题', 'faq')
					.row(),
			});
		});

		bot.command('record', startRecordProcess);
		bot.command('list', listDiaries);
		bot.command('faq', showFAQ);
		bot.command('help', showHelp);
		bot.on('callback_query', handleCallbackQuery);

		bot.on('message', handleMessage);

		return webhookCallback(bot, 'cloudflare-mod')(request);
	},

	async scheduled(event, env, ctx) {
		const bot = getBot(env);
		await bot.api.methods.getMe();

		return webhookCallback(bot, 'cloudflare-mod');
	},
};

// 处理回调查询
async function handleCallbackQuery(ctx) {
	const callbackData = ctx.callbackQuery.data;

	const actions = {
		faq: () => showFAQ(ctx),
		faq_1: () => ctx.replyWithMarkdownV2(getTemplate('faq_1')),
		faq_2: () => ctx.replyWithMarkdownV2(getTemplate('faq_2')),
		faq_3: () => ctx.replyWithMarkdownV2(getTemplate('faq_3')),
		faq_4: () => ctx.replyWithMarkdownV2(getTemplate('faq_4')),
		faq_5: () => ctx.replyWithMarkdownV2(getTemplate('faq_5')),

		// 创建日记
		create_diary: () => startRecordProcess(ctx),
		distressed: () => handleRecordDistressed(ctx),
		comfortable: () => handleRecordDistressed(ctx),
		subtle: () => handleRecordDistressed(ctx),
		later: () => handleRecordDistressed(ctx),
		end_exercise: () => ctx.answerCallbackQuery('练习结束。'),

		previous_step: () => handlePreviousStep(ctx),
		next_step_1: () => handleNextStep1(ctx),
		next_step_2: () => handleNextStep2(ctx),

		1: () => handleScore(ctx),
		2: () => handleScore(ctx),
		3: () => handleScore(ctx),
		4: () => handleScore(ctx),
		5: () => handleScore(ctx),
		6: () => handleScore(ctx),
		7: () => handleScore(ctx),
		8: () => handleScore(ctx),
		9: () => handleScore(ctx),
		10: () => handleScore(ctx),
	};

	if (actions[callbackData]) {
		await actions[callbackData]();
	} else {
		await ctx.reply(`抱歉，解析 ${callbackData} 回调查询失败。`);
	}
}
async function handlePreviousStep(ctx) {
	const userId = ctx.from.id;
	const userState = getUserState(userId);
	const currentStepIndex = steps.indexOf(userState.step);

	if (currentStepIndex > 0) {
		updateUserState(userId, { step: steps[currentStepIndex - 1] });
		await ctx.reply(`你正在返回第${currentStepIndex}步。`, {
			reply_markup: new InlineKeyboard().text('上一步', 'previous_step').text('下一步', 'next_step_1'),
		});
	}
}

// 开始记录过程
async function startRecordProcess(ctx) {
	const diaryModel = getDiaryModel();
	const userId = ctx.from.id;
	diaryModel.addUser(userId);

	await ctx.replyWithMarkdownV2(getTemplate('tips'), {
		reply_markup: new InlineKeyboard().text('上一步', 'previous_step').text('下一步', 'next_step_1'),
	});
}
// 处理步骤1
async function handleNextStep1(ctx) {
	await ctx.reply(getTemplate('tips2'), {
		reply_markup: new InlineKeyboard().text('上一步', 'previous_step').text('下一步', 'next_step_2'),
	});
}
// 处理步骤2
async function handleNextStep2(ctx) {
	await ctx.reply('我现在想记录的事情是：', {
		reply_markup: new InlineKeyboard()
			.text('感到困扰的时候', 'distressed')
			.row()
			.text('感到舒适的时候', 'comfortable')
			.row()
			.text('只有细微情绪变化的时候', 'subtle')
			.row()
			.text('暂时不想记录，想计划下次再写', 'later')
			.row()
			.text('暂时不想记录，想结束练习', 'end_exercise'),
	});
}

// 处理记录困扰的情况
async function handleRecordDistressed(ctx) {
	const userId = ctx.callbackQuery.from.id,
		data = ctx.callbackQuery.data;

	if (data === 'later') {
		await ctx.reply('好的，稍后可以再写日记。');
		return;
	}
	// 更新 userstate emotion_type
	updateUserState(userId, { step: 'emotion_type', emotion_type: data });

	await ctx.reply(generateTemplateByStep(data));
}

// 处理文本消息
async function handleMessage(ctx) {
	const userId = ctx.from.id;
	const userState = getUserState(userId);

	switch (userState.step) {
		case 'emotion_type':
			updateUserState(userId, { step: 'event_details', event_details: ctx.message.text });
			await ctx.reply(generateTemplateByStep(userState.emotion_type).event_feeling);
			break;
		case 'event_details':
			updateUserState(userId, { step: 'event_feeling', event_feeling: ctx.message.text });
			await ctx.reply('请为该情绪的强烈程度从1至10评分，最高为10分。', {
				reply_markup: new InlineKeyboard()
					.text('1', 1)
					.text('2', 2)
					.text('3', 3)
					.text('4', 4)
					.text('5', 5)
					.row()
					.text('6', 6)
					.text('7', 7)
					.text('8', 8)
					.text('9', 9)
					.text('10', 10),
			});
			break;
		case 'event_feeling':
			updateUserState(userId, { step: 'emotional_rating', emotional_rating: ctx.message.text });
			await ctx.replyWithHTML(emotionPlaceHolders[userState.emotion_type].thoughts);
			break;
		case 'emotional_rating':
			updateUserState(userId, { step: 'thoughts', thoughts: ctx.message.text });
			await ctx.replyWithHTML(emotionPlaceHolders[userState.emotion_type].actions);
			break;
		case 'thoughts':
			updateUserState(userId, { step: 'actions', actions: ctx.message.text });
			await ctx.replyWithHTML(emotionPlaceHolders[userState.emotion_type].physical_reactions);
			break;
		case 'actions':
			updateUserState(userId, { step: 'physical_reactions', physical_reactions: ctx.message.text });
			await ctx.replyWithHTML(emotionPlaceHolders[userState.emotion_type].impact_on_situation);
			break;
		case 'physical_reactions':
			updateUserState(userId, { step: 'impact_on_situation', impact_on_situation: ctx.message.text });
			updateUserState(userId, { step: 'completed' });
			await saveDiary(userId);
			await ctx.reply('感谢你完成了这次心情日记记录。你可以使用 /list 命令查看你的日记记录。');
			break;

		default:
			await ctx.reply('抱歉，我不明白你的意思。你可以使用 /start 命令重新开始。');
	}
}
async function handleScore(ctx) {
	const userId = ctx.callbackQuery.from.id,
		data = ctx.callbackQuery.data,
		userState = getUserState(userId);

	console.log(userState, 'message data', userState.emotion_type);
	updateUserState(userId, { step: 'emotional_rating', emotional_rating: data });
	await ctx.replyWithHTML(emotionPlaceHolders[userState.emotion_type].thoughts);
}
// 添加保存日记的函数
async function saveDiary(userId) {
	const diaryModel = getDiaryModel();
	const userState = getUserState(userId);
	const bot = getBot();
	// 保存日记到数据库
	// await diaryModel.saveDiary(userId, {
	// 	step1: userState.emotion_type,
	// 	step2: userState.event_details,
	// 	step3: userState.event_feeling,
	// 	step4: userState.emotional_rating,
	// 	step5: userState.thoughts,
	// 	step6: userState.actions,
	// 	step7: userState.physical_reactions,
	// 	step8: userState.impact_on_situation,
	// 	timestamp: new Date().toISOString(),
	// });

	// 清除用户状态
	delete userStates[userId];

	await bot.api.sendMessage(userId, generateDiary(userState), {
		parse_mode: 'HTML',
	});
}

function generateDiary(userState) {
	return `
你的心情：<b>${userState.emotion_type}</b>

事情：<b>${userState.event_details}</b>

感觉：<b>${userState.event_feeling}</b>

评分：<b>${userState.emotional_rating}</b>

想法：<b>${userState.thoughts}</b>

行动：<b>${userState.actions}</b>

身体反应：<b>${userState.physical_reactions}</b>

对情况的影响：<b>${userState.impact_on_situation}</b>
	`;
}
// 实现列表功能
async function listDiaries(ctx) {
	// 实现列出用户日记的逻辑
	await ctx.reply('不好意思，暂不支持');
}

// 显示FAQ
async function showFAQ(ctx) {
	await ctx.reply('你想问的是这些吗？', {
		reply_markup: new InlineKeyboard()
			.text('我写得对吗？', 'faq_1')
			.row()
			.text('写心情日记令我心情更差......', 'faq_2')
			.row()
			.text('没有动力持续写日记，怎么办？', 'faq_3')
			.row()
			.text('好像没有什么可以写，怎么办？', 'faq_4')
			.row()
			.text('为何要记录舒适和有细微情绪变化的时刻？', 'faq_5'),
	});
}

async function showHelp(ctx) {
	await ctx.reply('Please Cantact us @noncain');
}
