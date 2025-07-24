# Supabase 设置指南

本文档将指导你如何设置 Supabase 数据库来替代之前的 Flask 后端。

## 📋 前置要求

- Supabase 账户（免费）
- 网络连接

## 🚀 步骤 1: 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com/)
2. 点击 "Start your project" 
3. 登录或注册账户
4. 点击 "New Project"
5. 选择组织（Organization）
6. 填写项目信息：
   - **Name**: `heartnote-diary`
   - **Database Password**: 创建一个强密码（记住它！）
   - **Region**: 选择离你最近的区域（如 Northeast Asia）
7. 点击 "Create new project"

⏳ 等待 2-3 分钟项目创建完成。

## 🔧 步骤 2: 获取 API 密钥

项目创建完成后：

1. 在左侧菜单点击 **Settings** (⚙️)
2. 点击 **API**
3. 复制以下信息：
   - **Project URL**: `https://xxx.supabase.co`
   - **anon public**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 📊 步骤 3: 创建数据库表

1. 在左侧菜单点击 **SQL Editor**
2. 点击 **New query**
3. 复制项目根目录的 `supabase-schema.sql` 内容
4. 粘贴到 SQL 编辑器中
5. 点击 **RUN** 执行

这将创建：
- `users` 表（用户信息）
- `diaries` 表（日记数据）
- 索引和安全策略

## 🔐 步骤 4: 配置环境变量

在项目根目录创建 `.env.local` 文件：

```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# 其他API配置
BYTEDANCE_APP_KEY=your_bytedance_app_key
BYTEDANCE_ACCESS_TOKEN=your_bytedance_access_token
ARK_API_KEY=your_ark_api_key
DOUBAO_MODEL=doubao-1-5-pro-32k-250115
```

替换：
- `your-project-ref` 为你的项目 ID
- `your_anon_key` 为你的匿名公钥

## 🧪 步骤 5: 测试连接

1. 启动开发服务器
2. 访问应用
3. 尝试保存一篇日记
4. 检查 Supabase 后台的 **Table Editor** > **diaries** 是否有新数据

## 📈 步骤 6: 查看数据（可选）

在 Supabase 控制台：

1. 点击左侧菜单的 **Table Editor**
2. 查看 `users` 和 `diaries` 表
3. 可以直接在这里查看、编辑数据

## 🚀 步骤 7: 部署到 Vercel

1. 将代码推送到 GitHub
2. 在 Vercel 导入项目
3. 在 Vercel 设置环境变量：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - 其他 API 密钥
4. 部署完成！

## 🔍 常见问题

### Q: 无法连接到 Supabase？
A: 检查：
- 环境变量是否正确设置
- URL 是否包含 `https://`
- 密钥是否完整复制

### Q: RLS 策略阻止访问？
A: 当前设置允许所有访问。如需更严格的安全策略，可以修改 SQL 中的 RLS 策略。

### Q: 数据类型不匹配？
A: 确保日期格式为 ISO 字符串，分数为 1-10 的整数。

## 🎯 优势对比

| Flask 后端 | Supabase |
|------------|----------|
| 需要独立服务器 | 无需服务器管理 |
| SQLite 本地数据库 | PostgreSQL 云数据库 |
| 手动部署维护 | 自动扩展和备份 |
| 单点故障 | 高可用性 |
| 需要配置CORS | 原生支持 |

现在你的应用使用现代化的 Serverless 架构，更容易维护和扩展！🎉 