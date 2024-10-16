class Diary {
	constructor(env) {
		this.db = env.DB; // Cloudflare D1 数据库实例
	}

	// 新增用户
	async addUser(userid) {
		const { results } = await this.db.prepare('SELECT * FROM users WHERE userid = ?').bind(userid).all();

		if (results.length > 0) {
			return results[0];
		}

		const { meta } = await this.db.prepare('INSERT INTO users (userid, sizes) VALUES (?, 0)').bind(userid).run();

		return { userid, sizes: 0 };
	}

	async saveDiary(userid, diaryData) {
		const { step1, step2, step3, step4, step5, step6, step7, step8, timestamp } = diaryData;

		const { results } = await this.db.prepare('SELECT username FROM users WHERE userid = ?').bind(userid).all();

		if (results.length === 0) {
			throw new Error('User not found');
		}

		const username = results[0].username;

		const { meta } = await this.db
			.prepare(
				`
			INSERT INTO diary (
			  userid, username, step1, step2, step3, step4, step5, step6, step7, step8, curstep
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 8)
		  `
			)
			.bind(userid, username, step1, step2, step3, step4, step5, step6, step7, step8, timestamp)
			.run();

		// 更新用户的日记数量
		await this.updateUserDiaryCount(userid);

		return {
			id: meta.last_row_id,
			userid,
			username,
			step1,
			step2,
			step3,
			step4,
			step5,
			step6,
			step7,
			step8,
			timestamp,
			curstep: 1,
		};
	}

	// 更新日记步骤
	async updateDiaryStep(id, stepNumber, content) {
		if (stepNumber < 1 || stepNumber > 8) {
			throw new Error('Invalid step number');
		}

		const { meta } = await this.db
			.prepare(`UPDATE diary SET step${stepNumber} = ?, curstep = ? WHERE id = ?`)
			.bind(content, stepNumber, id)
			.run();

		return meta.changes > 0;
	}

	// 获取用户的所有日记
	async getUserDiaries(userid) {
		const { results } = await this.db.prepare('SELECT * FROM diary WHERE userid = ? AND isdel = 0 ORDER BY id DESC').bind(userid).all();

		return results;
	}

	// 获取特定日记
	async getDiary(id) {
		const { results } = await this.db.prepare('SELECT * FROM diary WHERE id = ? AND isdel = 0').bind(id).all();

		return results.length > 0 ? results[0] : null;
	}

	// 删除日记（软删除）
	async deleteDiary(id) {
		const { meta } = await this.db.prepare('UPDATE diary SET isdel = 1 WHERE id = ?').bind(id).run();

		return meta.changes > 0;
	}

	// 获取用户信息
	async getUser(userid) {
		const { results } = await this.db.prepare('SELECT * FROM users WHERE userid = ? AND isdel = 0').bind(userid).all();

		return results.length > 0 ? results[0] : null;
	}

	// 更新用户的日记数量
	async updateUserDiaryCount(userid) {
		await this.db
			.prepare('UPDATE users SET sizes = (SELECT COUNT(*) FROM diary WHERE userid = ? AND isdel = 0) WHERE userid = ?')
			.bind(userid, userid)
			.run();
	}
}

let diaryModel;
const getDiaryModel = () => {
	if (!diaryModel) {
		throw new Error('Diary model is not initialized');
	}
	return diaryModel;
};
const setDiaryModel = (env) => {

	if (diaryModel) {
		return diaryModel;
	}
	diaryModel = new Diary(env);
	return diaryModel;
};

export { setDiaryModel, getDiaryModel };
