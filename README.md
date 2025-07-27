# 声命体MemoirAI (Heartnote Diary)

一个基于LLM驱动的对话式日记应用，通过与AI伙伴的自然对话，帮助用户记录每天的生活点滴，自动生成温暖而个性化的日记内容。

AdventureX2025 参赛项目

## ✨ 功能特点

- **智能对话日记**: 与AI伙伴进行自然对话，分享今天的经历和感受
- **自动日记生成**: 基于对话内容，智能生成第一人称视角的日记
- **日历式浏览**: 以日历形式查看和管理历史日记
- **美观UI设计**: 温馨的紫色主题，符合日记应用的温暖氛围
- **响应式设计**: 支持手机和桌面端使用

## 🛠️ 技术栈

- **前端框架**: Next.js 15 + React 19
- **样式方案**: Tailwind CSS 4
- **语言**: TypeScript
- **部署**: Vercel (推荐)

## 🏗️ 项目结构

```
src/
├── pages/
│   ├── index.tsx        # 主页 - 对话式日记界面
│   ├── diary.tsx        # 日记本页面 - 日历视图和历史日记
│   └── api/             # API路由 (预留后端接口)
├── lib/
│   └── data.ts          # 数据管理层和API接口预留
└── styles/
    └── globals.css      # 全局样式
```

## 🚀 快速开始

### 1. 设置 Supabase 数据库

请先阅读 [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md) 完成 Supabase 数据库设置。

### 2. 安装依赖

```bash
npm install
# 或
yarn install
```

### 3. 配置字节豆包API

1. 在 [火山引擎控制台](https://console.volcengine.com/) 注册并获取API密钥
2. 创建 `.env.local` 文件并添加以下配置：

```bash
# Supabase 数据库配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenWeatherMap 天气API配置
NEXT_PUBLIC_OPENWEATHER_API_KEY=your_openweather_api_key

# Web3 奖励系统配置 (Injective EVM Testnet)
WEB3_PRIVATE_KEY=your_wallet_private_key
WEB3_RPC_URL=https://testnet.sentry.tm.injective.network:443
WEB3_REWARD_CONTRACT_ADDRESS=your_reward_contract_address

# 字节跳动语音识别API配置
BYTEDANCE_APP_KEY=your_app_key_here
BYTEDANCE_ACCESS_TOKEN=your_access_token_here

# 豆包大模型API配置
ARK_API_KEY=your_ark_api_key_here
DOUBAO_MODEL=doubao-1-5-pro-32k-250115

# 旧配置（兼容性保留）
NEXT_PUBLIC_DOUBAO_APP_ID=your_app_id_here
NEXT_PUBLIC_DOUBAO_ACCESS_KEY=your_access_key_here
DOUBAO_APP_ID=your_app_id_here
DOUBAO_ACCESS_KEY=your_access_key_here
```

#### 环境变量说明

- **`NEXT_PUBLIC_SUPABASE_URL`**: Supabase 项目 URL
  - 在 Supabase 控制台的 Settings > API 中找到
  - 格式: `https://your-project-ref.supabase.co`
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: Supabase 匿名公钥
  - 在 Supabase 控制台的 Settings > API 中找到
  - 这是公开的密钥，可以安全地暴露给客户端
- **`NEXT_PUBLIC_OPENWEATHER_API_KEY`**: OpenWeatherMap API密钥
  - 在 [OpenWeatherMap](https://openweathermap.org/api) 注册获取免费API密钥
  - 用于获取用户当前位置的天气信息
- **`BYTEDANCE_APP_KEY`**: 字节跳动语音识别服务的应用密钥
- **`BYTEDANCE_ACCESS_TOKEN`**: 字节跳动语音识别服务的访问令牌
- **`ARK_API_KEY`**: 字节跳动大模型服务的API密钥
- **`DOUBAO_MODEL`**: 使用的豆包模型名称

#### Web3 奖励系统环境变量

- **`WEB3_PRIVATE_KEY`**: 用于发放奖励的钱包私钥
  - 格式: `0x` 开头的64位十六进制字符串
  - ⚠️ 重要：这是私钥，绝对不能泄露，仅在服务器端使用
  - 建议创建一个专门用于奖励发放的钱包
- **`WEB3_RPC_URL`**: Injective EVM测试网RPC端点
  - 默认值: `https://testnet.tm.injective.network`
  - 或使用其他兼容的EVM RPC端点
- **`WEB3_TOKEN_CONTRACT_ADDRESS`**: ERC20代币合约地址
  - 格式: `0x` 开头的42位十六进制地址
  - 部署在Injective EVM测试网上的代币合约
- **`WEB3_REWARD_AMOUNT`**: 新用户奖励代币数量
  - 格式: 纯数字字符串，如 `100`
  - 这是代币的基础单位数量（会根据代币decimals自动换算）

### 4. 启动开发服务器

```bash
npm run dev
# 或
yarn dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看应用。

## 📱 功能说明

### 主页 - 对话式日记

1. **AI引导对话**: AI会主动询问你今天的经历
2. **自然交流**: 像和朋友聊天一样分享你的一天
3. **智能回复**: AI会根据你的分享内容进行有针对性的回应
4. **日记生成**: 对话结束后，AI自动生成日记草稿
5. **编辑功能**: 可以继续完善、手动编辑或保存日记

### 日记本页面 - 历史管理

1. **日历视图**: 以月份为单位的日历界面
2. **日期标记**: 有日记的日期会用紫色圆点标记
3. **日记列表**: 点击日期查看当天的所有日记条目
4. **多条目支持**: 每天可以有多条日记记录

## 🔌 API接口设计

项目已预留完整的API接口结构，便于后续集成LLM服务：

### 对话相关API (`conversationAPI`)
- `startConversation()`: 开始新对话
- `sendMessage()`: 发送用户消息
- `getAIResponse()`: 获取AI回复
- `generateDiary()`: 生成日记

### 日记相关API (`diaryAPI`)
- `getAllDiaries()`: 获取所有日记
- `getDiariesByDate()`: 根据日期获取日记
- `saveDiary()`: 保存日记
- `updateDiary()`: 更新日记
- `deleteDiary()`: 删除日记

### 用户设置API (`userAPI`)
- `getUserSettings()`: 获取用户设置
- `updateUserSettings()`: 更新用户设置

## 🎨 UI设计配色标准

### 主色调 (Primary Colors)
```css
--primary-base: #B19CD9;    /* 主紫色 - 按钮、链接、强调元素 */
--primary-light: #D4C7E8;  /* 浅紫色 - 悬浮状态、辅助背景 */
--primary-dark: #9B7FC7;   /* 深紫色 - 按下状态、深色强调 */
```

### 背景颜色 (Background Colors)
```css
--background-page: #F7F7EC;   /* 页面主背景 - 温暖的米色 */
--surface-main: #FFFFF4;      /* 卡片主背景 - 奶白色 */
--surface-light: rgba(255, 255, 255, 0.901961); /* 半透明背景 */
--surface-dark: #D6D6C2;      /* 边框、分割线 - 浅灰绿 */
--surface-accent: #E8E0F7;    /* 强调背景 - 极浅紫色 */
```

### 文字颜色 (Text Colors)
```css
--text-primary: #000000;     /* 主要文字 - 纯黑 */
--text-secondary: #808080;   /* 次要文字 - 中灰 */
--text-tertiary: #999999;    /* 辅助文字 - 浅灰 */
--text-inverse: #FFFFFF;     /* 反色文字 - 纯白 */
```

### 深色模式适配 (Dark Mode)
```css
/* 深色模式下的颜色调整 */
--background-page: #121212;  /* 深色页面背景 */
--surface-main: #1e1e1e;     /* 深色卡片背景 */
--surface-dark: #2a2a2a;     /* 深色边框 */
--surface-accent: #2d2d3a;   /* 深色强调背景 */
--text-primary: #ffffff;     /* 深色模式主文字 */
--text-secondary: #b3b3b3;   /* 深色模式次要文字 */
--text-tertiary: #808080;    /* 深色模式辅助文字 */
--primary-base: #C4A3E8;     /* 深色模式下略亮的主紫色 */
```

### 心情可视化配色 (Mood Visualization)
```js
 if (score >= 8) {
      // 😊 非常开心 - 亮蓝色
      return {
        bg: '#3B82F6', // 亮蓝色
        bgHover: '#2563EB', // 深一点的蓝色
        text: '#FFFFFF'
      };
    } else if (score >= 6) {
      // 🙂 愉快 - 天蓝色
      return {
        bg: '#60A5FA', // 天蓝色
        bgHover: '#3B82F6', // 亮蓝色
        text: '#FFFFFF'
      };
    } else if (score >= 4) {
      // 😐 平静 - 浅灰蓝
      return {
        bg: '#93C5FD', // 浅灰蓝
        bgHover: '#60A5FA', // 天蓝色
        text: '#1F2937' // 深色文字以保证对比度
      };
    } else if (score >= 2) {
      // 😔 低落 - 暗灰蓝
      return {
        bg: '#64748B', // 暗灰蓝
        bgHover: '#475569', // 更深的灰蓝
        text: '#FFFFFF'
      };
    } else {
      // 😢 难过 - 深蓝灰
      return {
        bg: '#334155', // 深蓝灰
        bgHover: '#1E293B', // 最深的蓝灰
        text: '#FFFFFF'
      };
    }
```

### 设计原则

1. **温暖友好**: 采用温暖的米色背景配合柔和的紫色主色调，营造亲近感
2. **层次分明**: 通过不同深浅的颜色建立清晰的视觉层次
3. **对比适度**: 确保文字在各种背景上都有足够的对比度，保证可读性
4. **情感表达**: 心情可视化采用直观的颜色语言，绿色代表积极，红色代表消极
5. **适配性强**: 支持明暗模式自动切换，在不同环境下都有良好的视觉体验
6. **品牌一致**: 紫色系贯穿整个设计，建立统一的品牌视觉识别

### 字体规范 (Typography)
```css
--font-size-caption: 10px;   /* 说明文字 */
--font-size-body: 12px;      /* 正文内容 */
--font-size-subtitle: 14px;  /* 副标题 */
--font-size-title: 20px;     /* 页面标题 */
--font-size-heading: 30px;   /* 大标题 */
--font-size-display: 40px;   /* 展示标题 */
```

### 间距规范 (Spacing)
```css
--spacing-tight: 8px;        /* 紧密间距 */
--spacing-compact: 12px;     /* 紧凑间距 */
--spacing-standard: 16px;    /* 标准间距 */
--spacing-comfortable: 24px; /* 舒适间距 */
```

### 圆角规范 (Border Radius)
```css
--radius-small: 12px;        /* 小圆角 - 按钮、标签 */
--radius-medium: 16px;       /* 中圆角 - 卡片、面板 */
--radius-full: 50%;          /* 全圆角 - 头像、圆形按钮 */
```

## 🎯 设计理念

- **温暖友好**: 紫色主题营造温馨的记录氛围
- **对话式交互**: 降低日记书写门槛，让记录变得自然
- **智能辅助**: AI不是替代思考，而是帮助整理和表达
- **隐私保护**: 日记是个人私密空间，注重数据安全

## 🔮 后续计划

- [ ] 集成OpenAI/Claude等LLM API
- [ ] 添加用户认证系统
- [ ] 实现数据持久化存储
- [ ] 支持日记搜索功能
- [ ] 添加心情统计分析
- [ ] 支持图片上传
- [ ] 导出日记功能
- [ ] 多语言支持

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request来帮助改进这个项目！
