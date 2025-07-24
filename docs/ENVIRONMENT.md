# 环境变量配置指南

## 概述

本项目使用环境变量来配置不同环境下的设置，包括API服务器地址、第三方服务密钥等。

## 配置文件

在项目根目录下创建 `.env.local` 文件来配置环境变量：

```bash
# 复制示例文件
cp .env.example .env.local
```

## 环境变量列表

### 必需的环境变量

#### Supabase 数据库配置

```bash
# Supabase 项目 URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co

# Supabase 匿名公钥
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**说明**：
- `NEXT_PUBLIC_` 前缀表示这些变量会暴露给客户端（浏览器）
- Supabase 匿名密钥是公开的，可以安全地在客户端使用
- 在 Supabase 控制台的 Settings > API 页面获取这些值
- 项目 URL 格式：`https://项目ID.supabase.co`
- 修改后需要重启开发服务器

#### 字节跳动API配置

```bash
# 语音识别API
BYTEDANCE_APP_KEY=your_app_key_here
BYTEDANCE_ACCESS_TOKEN=your_access_token_here

# 大模型API (豆包)
ARK_API_KEY=your_ark_api_key_here
DOUBAO_MODEL=doubao-1-5-pro-32k-250115
```

**获取方式**：
1. 访问 [火山引擎控制台](https://console.volcengine.com/)
2. 注册账号并完成认证
3. 开通语音识别和大模型服务
4. 在控制台获取相应的密钥

## 环境变量优先级

1. **`.env.local`** - 本地开发环境（优先级最高）
2. **`next.config.ts`** - Next.js配置文件中的默认值
3. **系统环境变量** - 操作系统级别的环境变量

## 不同环境的配置

### 开发环境

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-dev-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_dev_anon_key
BYTEDANCE_APP_KEY=dev_app_key
BYTEDANCE_ACCESS_TOKEN=dev_access_token
ARK_API_KEY=dev_ark_api_key
```

### 生产环境

```bash
# .env.production
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_prod_anon_key
BYTEDANCE_APP_KEY=prod_app_key
BYTEDANCE_ACCESS_TOKEN=prod_access_token
ARK_API_KEY=prod_ark_api_key
```

### 测试环境

```bash
# .env.test
NEXT_PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_test_anon_key
BYTEDANCE_APP_KEY=test_app_key
BYTEDANCE_ACCESS_TOKEN=test_access_token
ARK_API_KEY=test_ark_api_key
```

## 安全注意事项

⚠️ **重要提醒**：

1. **永远不要提交 `.env.local` 到版本控制系统**
2. **不要在前端代码中硬编码敏感信息**
3. **生产环境使用专用的API密钥**
4. **定期更换API密钥**
5. **使用 `NEXT_PUBLIC_` 前缀时要注意信息会暴露给客户端**

## 故障排除

### 常见问题

#### 1. API连接失败
```
错误：无法连接到服务器
解决：检查 NEXT_PUBLIC_API_BASE_URL 是否正确，确保后端服务正在运行
```

#### 2. 环境变量不生效
```
原因：修改环境变量后未重启开发服务器
解决：停止开发服务器 (Ctrl+C) 并重新运行 npm run dev
```

#### 3. API密钥错误
```
错误：401 Unauthorized
解决：检查 BYTEDANCE_APP_KEY 和 ARK_API_KEY 是否正确
```

### 调试方法

在代码中添加以下内容来检查环境变量是否正确加载：

```javascript
console.log('API Base URL:', process.env.NEXT_PUBLIC_API_BASE_URL);
// 注意：不要在生产环境中打印敏感信息
```

## 示例配置文件

创建 `.env.local` 文件的完整示例：

```bash
# ===========================================
# 信语日记应用环境变量配置
# ===========================================

# Supabase 数据库配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 字节跳动语音识别API
BYTEDANCE_APP_KEY=your_bytedance_app_key_here
BYTEDANCE_ACCESS_TOKEN=your_bytedance_access_token_here

# 字节跳动大模型API (豆包)
ARK_API_KEY=your_ark_api_key_here
DOUBAO_MODEL=doubao-1-5-pro-32k-250115

# 旧版本兼容配置（可选）
NEXT_PUBLIC_DOUBAO_APP_ID=your_legacy_app_id
NEXT_PUBLIC_DOUBAO_ACCESS_KEY=your_legacy_access_key
DOUBAO_APP_ID=your_legacy_app_id
DOUBAO_ACCESS_KEY=your_legacy_access_key
```

## 更多信息

- [Next.js 环境变量文档](https://nextjs.org/docs/basic-features/environment-variables)
- [火山引擎API文档](https://www.volcengine.com/docs/)
- [项目配置说明](../README.md) 