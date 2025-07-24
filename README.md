# 信语日记 (Heartnote Diary)

一个基于LLM驱动的对话式日记应用，通过与AI伙伴的自然对话，帮助用户记录每天的生活点滴，自动生成温暖而个性化的日记内容。

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

### 安装依赖

```bash
npm install
# 或
yarn install
```

### 配置字节豆包API

1. 在 [火山引擎控制台](https://console.volcengine.com/) 注册并获取API密钥
2. 创建 `.env.local` 文件并添加以下配置：

```bash
# API服务器地址配置
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5000

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

- **`NEXT_PUBLIC_API_BASE_URL`**: 后端API服务器地址
  - 本地开发: `http://127.0.0.1:5000` 或 `http://localhost:5000`
  - 生产环境: 修改为实际的API服务器地址
- **`BYTEDANCE_APP_KEY`**: 字节跳动语音识别服务的应用密钥
- **`BYTEDANCE_ACCESS_TOKEN`**: 字节跳动语音识别服务的访问令牌
- **`ARK_API_KEY`**: 字节跳动大模型服务的API密钥
- **`DOUBAO_MODEL`**: 使用的豆包模型名称

### 启动开发服务器

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

## 🎨 设计理念

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
