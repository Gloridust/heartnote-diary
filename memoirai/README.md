# 声命体 MemoirAI（Flutter）

AI 驱动的对话式日记 App。Flutter 客户端，配合 [`backend/`](../backend) Flask 后端使用。

## 跑起来

```bash
cd memoirai
flutter pub get

# 本地开发（连本地 Flask 后端，默认 http://10.0.2.2:5000）
flutter run --dart-define=ENV=dev

# 真机调试 — 指定本机局域网 IP
flutter run --dart-define=ENV=dev --dart-define=DEV_API=http://192.168.1.10:5000

# 出云端包（不传 ENV 默认 cloud）
flutter build apk --dart-define=ENV=cloud
```

### 环境切换
- `ENV=dev`   → 连本地后端（`DEV_API`，默认 `http://10.0.2.2:5000`）
- `ENV=cloud` → 连生产后端（`CLOUD_API`，在 `lib/services/env.dart` 改默认值，或 `--dart-define=CLOUD_API=...`）
- UI 里不暴露地址输入框；DEV 环境下登录页和设置页会显示黄色 `DEV` 角标。
- VS Code 用户：`.vscode/launch.json` 已提供 dev/cloud/profile/release 四种启动配置，F5 直接选。

## 项目结构

```
lib/
├── main.dart
├── app.dart                  # MaterialApp + GoRouter
├── theme/
│   ├── colors.dart           # 微光拟物治愈风调色板
│   └── app_theme.dart        # ThemeData + 阴影
├── models/
│   ├── user.dart
│   ├── diary.dart
│   └── message.dart
├── services/
│   └── api_service.dart      # Dio + JWT
├── providers/
│   ├── auth_provider.dart
│   ├── diary_provider.dart
│   └── chat_provider.dart
├── widgets/
│   ├── glass_card.dart       # 微光卡片 + iOS26 悬浮 Tab
│   ├── chat_bubble.dart
│   └── voice_input.dart      # 长按录音 + 文本输入
└── pages/
    ├── splash_page.dart
    ├── login_page.dart       # 登录 / 注册（手机号或 user_id）
    ├── main_shell.dart       # 三 tab 容器
    ├── home_page.dart        # 对话 + 日记草稿卡
    ├── diary_list_page.dart  # 日历 + 列表
    ├── diary_detail_page.dart
    ├── profile_page.dart     # 统计 + 趋势图
    └── settings_page.dart
```

## 设计要点
- **微光拟物治愈风**：柔和米白底 + 薰衣草紫主色，卡片带细微高光与柔阴影
- **iOS 26 悬浮 Tab**：底部毛玻璃 pill 状导航，选中态渐变胶囊
- **心情色**：日历日期格按当天日记平均分着色
- **LLM 协议**：服务端强制 JSON 结构化输出，支持 `mode=continue/end` 两种模式
- **语音**：长按麦克风按钮录音，松开后服务端转文字自动发送
