-- 如果用户表存在，则删除旧表
DROP TABLE IF EXISTS users;

-- 创建用户表
CREATE TABLE users (
    userid INTEGER PRIMARY KEY ,
    username TEXT NOT NULL,
    sizes INTEGER DEFAULT 0,
    isdel BOOLEAN DEFAULT FALSE
);
-- 如果日记表存在，则删除旧表
DROP TABLE IF EXISTS diary;
-- 创建日记表
CREATE TABLE diary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userid INTEGER NOT NULL,
    step1 TEXT DEFAULT NULL, -- 记录时刻
    step2 TEXT DEFAULT NULL, -- 记录时刻第一步
    step3 TEXT DEFAULT NULL, -- 记录时刻第二步
    step4 TEXT DEFAULT NULL, -- 记录时刻第三步
    step5 TEXT DEFAULT NULL, -- 记录时刻第四步
    step6 TEXT DEFAULT NULL, -- 记录时刻第五步
    step7 TEXT DEFAULT NULL, -- 记录时刻第六步
    step8 TEXT DEFAULT NULL, -- 记录时刻第七步
    curstep INTEGER DEFAULT 1, -- 当前步骤
    isdel BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userid) REFERENCES users(userid)
);

-- 为用户名创建索引以提高查询性能
CREATE INDEX idx_users_username ON users(username);

-- 为日记表的 userid 创建索引以提高查询性能
CREATE INDEX idx_diary_userid ON diary(userid);



