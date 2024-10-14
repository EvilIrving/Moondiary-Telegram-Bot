import { getBot, setBot } from './bot';
import { InlineKeyboard, webhookCallback } from 'grammy';
import { setDiaryModel, getDiaryModel } from './db';

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
		faq_1: () =>
			ctx.reply(`要知道写心情日记有否帮助你了解自己更多，不妨看看自己所写内容及其详尽程度。例如，问自己：

			1. 写日记有让我更留意自己的情绪变化吗？
			2. 写日记有让我更了解情绪改变的规律和触发情绪的事物吗？
			3. 我能否在写日记时梳理出情绪、思想和行为之间的关系，再找出当中规律？ `),
		faq_2: () =>
			ctx.reply(`写日记让我们探索情绪低落的原因及规律，了解自己的内心状态，令我们更知道要做什么去照顾自己的心情。

				透过反覆练习写日记，当我们慢慢养成了解和觉察自己情绪变化的习惯，或会更容易持续地记录。可以尝试先填写自己比较能承受的情绪，或先填写得比较简洁，再慢慢接触较难承载的情绪和记录得更深入仔细。

				如果当刻情绪令你十分困扰，也可以暂时放下这练习，先做一些纾缓情绪的练习（例如，第二站所提及的相反行为），当自己有空间时，再尝试填写心情日记。

				不是所有方法都适合所有人，如果心情日记不合适你，不妨稍后有机会再尝试，并在课程中探索其他方法。 `),
		faq_3: () =>
			ctx.reply(`刚开始写时，以下方法或有助推动自己持续写日记，例如：手机设提示何时写日记、奖励自己持续一星期完成日记、不时灵活转换写日记的形式：利用电话录音／语音转文字工具／拍照，即时记录当时情绪状态等。

			另外，请先从简单写下当天情绪和评分开始，再慢慢增加填写内容的详细程度。随着不断练习，或会写得更得心应手。

			当我们逐渐养成写日记的习惯，掌握合适自己填写的方式，或会更易体验写日记的好处和持之以恒地写。

			鼓励你继续尝试！`),
		faq_4: () =>
			ctx.reply(`即使不能每日都想到一个难过或心情舒畅的情况，任何关于情绪变化的资讯都十分重要，这些资讯有助了解当中的规律和模式。

			如果准备好尝试，鼓励先从微小容易的一步开始，例如：一星期写一次心情纪录、从简略记录当天情绪开始等，再逐步增加内容的详细程度和频率，又或者刚开始时，先集中记录一种较容易承载的情绪（如愉快／舒适的情绪的情况），让自己更容易掌握和开始写。`),
		faq_5: () =>
			ctx.reply(`将任何感觉，不论是细微或者强烈的情绪变化都记下，有助我们认出当中的规律和触发点，及有意识地回应。

			当抑压焦虑情绪出现时，我们可能倾向只察觉到心情差的时候，觉得自己没有开心过，甚至觉得心情永远都不好。在日记中记录感到舒适的时刻，能帮助自己发掘什么情况会让自己的感觉转好。同时，借此提醒自己留意和感受身心舒畅的经历。

			记录的事情不需要是大事，任何令心情好一点点的事情也可。`),

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

		"1": () => handleScore(ctx),
		"2": () => handleScore(ctx),
		"3": () => handleScore(ctx),
		"4": () => handleScore(ctx),
		"5": () => handleScore(ctx),
		'6': () => handleScore(ctx),
		'7': () => handleScore(ctx),
		'8': () => handleScore(ctx),
		'9': () => handleScore(ctx),
		'10': () => handleScore(ctx),
	};

	if (actions[callbackData]) {
		await actions[callbackData]();
	}
}
async function handlePreviousStep(ctx) {
	const userId = ctx.from.id;
	const userState = getUserState(userId);
	const currentStepIndex = steps.indexOf(userState.step);

	if (currentStepIndex > 0) {
		updateUserState(userId, { step: steps[currentStepIndex - 1] });
		await ctx.editMessageText(`你正在返回第${currentStepIndex}步。`, {
			reply_markup: new InlineKeyboard().text('上一步', 'previous_step').text('下一步', 'next_step_1'),
		});
	}
}

// 开始记录过程
async function startRecordProcess(ctx) {
	const diaryModel = getDiaryModel();
	const userId = ctx.from.id;
	diaryModel.addUser(userId);

	// 实现步骤2-5的逻辑
	await ctx.reply(
		'现在,试完成「心情日记」:\n\n回想这一星期内任何一个引起你情绪变化的时候。\n例如,当你感到困扰(如:烦躁、紧张或嬲怒)的时间;亦可以是你感到舒适的时刻,或是只有细微情绪变化的时刻也可。\n写下当时的时间和情况。\n用一至两个形容词描述自己经历的情绪,并为该情绪的强烈程度从一至十评分,最高为十分。\n写下你当时的反应和你的该反应带来的结果',
		{
			reply_markup: new InlineKeyboard().text('上一步', 'previous_step').text('下一步', 'next_step_1'),
		}
	);
}
// 处理步骤1
async function handleNextStep1(ctx) {
	await ctx.editMessageText(
		'日记要写得几详细?\n小贴士:写日记时写得愈仔细,愈容易了解自己的回应模式。\n\n例如:「到底发生什么事?」、「在什么时候和地方发生?」、「牵涉谁?」,这些问题都会帮我们更察觉到自己的感受和行为,更明白自己回应情绪的习惯,减少无意识地反应。',
		{
			reply_markup: new InlineKeyboard().text('上一步', 'previous_step').text('下一步', 'next_step_2'),
		}
	);
}
// 处理步骤2
async function handleNextStep2(ctx) {
	await ctx.editMessageText('我现在想记录的事情是：', {
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
	const userId = ctx.callbackQuery.from.id;
	updateUserState(userId, { step: 'emotion_type', emotionType: ctx.callbackQuery.data });

	console.log(ctx.callbackQuery.data, 'emotiontype');
	const emotions = {
		distressed: '困扰',
		comfortable: '舒适',
		subtle: '细微变化',
	};
	await ctx.editMessageText(
		`感到 ${emotions[ctx.callbackQuery.data]} 的时候：

		当你有这种感觉的时候...

		发生什么事情？
		什么时候发生？
		你在哪里？
		你在做什么？
		牵涉谁？

		比如:今天下午，我与好朋友Ruth约好一起到XYZ Cafe 享用下午茶，但Ruth在4时仍未出现，亦没有联络我。打电话，但她的电话关了机，我只好一直在门外等待。

		请描述你的情况，完成后我们将进入下一步。`
	);
}

// 处理文本消息
async function handleMessage(ctx) {
	const userId = ctx.from.id;
	const userState = getUserState(userId);

	switch (userState.step) {
		case 'emotion_type':
			updateUserState(userId, { step: 'event_details', event_details: ctx.message.text });
			await ctx.reply('谢谢你的描述。现在，请记下你当时的情绪（例如：愤怒、厌恶、恐惧、愉快、悲伤、羞耻和惊讶等）。');
			break;
		case 'event_details':
			updateUserState(userId, { step: 'event_feeling', event_feeling: ctx.message.text });
			await ctx.reply('请为该情绪的强烈程度从1至10评分，最高为10分。', {
				reply_markup: new InlineKeyboard()
					.text('1', '1')
					.text('2', '2')
					.text('3', '3')
					.text('4', '4')
					.text('5', '5')
					.row()
					.text('6', '6')
					.text('7', '7')
					.text('8', '8')
					.text('9', '9')
					.text('10', '10'),
			});

			break;
		case 'event_feeling':
			updateUserState(userId, { step: 'emotional_rating', emotional_rating: ctx.message.text });
			await ctx.reply('你当时有什么想法（思想)？ ');
			break;
		case 'thoughts':
			updateUserState(userId, { step: 'actions', actions: ctx.message.text });
			await ctx.reply('你当时的行为和想法对你身体有何影响（身体反应） ？');
			break;
		case 'actions':
			updateUserState(userId, { step: 'physical_reactions', physical_reactions: ctx.message.text });
			await ctx.reply('你当时的行为和想法对当时的情况有何影响？');

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
		text = ctx.callbackQuery.data;
	updateUserState(userId, { step: 'thoughts', emotional_rating: text });
	await ctx.reply('你当时做了和说了什么（行为）？');
}
// 添加保存日记的函数
async function saveDiary(userId) {
	const diaryModel = getDiaryModel();
	const userState = getUserState(userId);

	// 保存日记到数据库
	await diaryModel.saveDiary(userId, {
		emotionType: userState.emotionType,
		situationDescription: userState.situationDescription,
		emotion: userState.emotion,
		emotionIntensity: userState.emotionIntensity,
		reaction: userState.reaction,
		result: userState.result,
		timestamp: new Date(),
	});

	// 清除用户状态
	delete userStates[userId];
}

// 实现列表功能
async function listDiaries(ctx) {
	// 实现列出用户日记的逻辑
	ctx.reply('不好意思，暂不支持');
}

// 显示FAQ
async function showFAQ(ctx) {
	ctx.reply('你想问的是这些吗？', {
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
