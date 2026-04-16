# MemoirAI Backend

Flask + SQLAlchemy 后端，为 Flutter App 提供 API，并附带管理员面板。

## 环境要求
- Python 3.10+
- 生产：MySQL 8 / 开发：SQLite（无需安装）

## 本地启动

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate       # Windows
# source .venv/bin/activate  # macOS/Linux

pip install -r requirements.txt
cp .env.example .env         # 然后按需编辑
python run.py
```

服务跑在 `http://localhost:5000`：
- `GET  /api/health`  健康检查
- `POST /api/auth/register`  `{phone, password, nickname?}`
- `POST /api/auth/login`     `{identifier, password}` — identifier 可为手机号或 6 位 user_id
- `GET  /api/auth/me`  (Bearer)
- `GET  /api/diary`  (Bearer) 拉取当前用户所有日记
- `POST /api/diary`  (Bearer) 新建/更新
- `DELETE /api/diary/<diary_id>` (Bearer)
- `POST /api/chat`   (Bearer) LLM 对话（messages + 可选 weather/location 文本，**消耗活力**）
- `POST /api/speech/recognize` (Bearer) 语音转文字
- `GET  /api/geo/context?lat=&lon=` (Bearer) 位置+天气（高德，大陆可用）
- `GET  /api/vitality/balance` (Bearer)
- `GET  /api/vitality/history` (Bearer) 按天聚合
- `POST /api/vitality/redeem`  (Bearer) `{code}` 兑换码
- `GET  /api/settings/public`  云控开关（无需登录）
- `POST /api/auth/delete-account` (Bearer) `{password}` 注销账号（前端"永久删除"实则禁用）
- `GET  /legal/privacy`  隐私政策 HTML（公开，可浏览器打开）
- `GET  /legal/privacy.json`  隐私政策 Markdown（供 App 内自渲染）

## 计费规则
- 普通对话：1 ⚡/次
- 生成日记（mode=end）：5 ⚡/次
- 新用户初始：100 ⚡

## Token
- JWT 默认 365 天 (`JWT_ACCESS_TOKEN_HOURS=8760`)
- 改密 / admin 重置 / admin 禁用 → `User.token_version += 1` → 所有旧 token 立即失效（HTTP 401, code=auth_invalid）

## 管理后台新增页面
- `/admin/codes` 兑换码批量生成 / 删除 / 状态筛选
- `/admin/settings` 云控开关切换（如「兑换码入口」）
- 用户行新增「活力」操作（发放/扣除 + 备注）
- ⚡ 列点击进入用户的活力流水

管理后台：`http://localhost:5000/admin/login` — 首次启动自动创建账号 `admin / admin123`（可在 .env 改）。

## 切换到 MySQL 生产

`.env` 里：
```
FLASK_ENV=production
DB_TYPE=mysql
MYSQL_HOST=...
MYSQL_PORT=3306
MYSQL_USER=memoirai
MYSQL_PASSWORD=...
MYSQL_DB=memoirai
```

建库：
```sql
CREATE DATABASE memoirai DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'memoirai'@'%' IDENTIFIED BY '<password>';
GRANT ALL PRIVILEGES ON memoirai.* TO 'memoirai'@'%';
FLUSH PRIVILEGES;
```

首次启动会自动 `create_all()`。需要迁移用 `flask db` 命令。

## 生产部署（简）
```bash
gunicorn -w 4 -b 0.0.0.0:5000 run:app
```
