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
- `POST /api/chat`   (Bearer) LLM 对话
- `POST /api/speech/recognize` (Bearer) 语音转文字

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
