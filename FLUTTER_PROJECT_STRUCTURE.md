 # 声命体MemoirAI - Flutter复现项目结构文档

## 项目概述

**项目名称**: 声命体MemoirAI  
**项目类型**: AI驱动的对话式日记应用  
**技术栈**: Next.js (原版) → Flutter (目标)  
**核心功能**: 语音对话、AI日记生成、心情记录、数据分析

## 🎨 设计系统

### 主题色彩系统

#### 主色调 (Primary Colors)
```dart
// 主色调 - 紫色系
const Color primaryBase = Color(0xFFB19CD9);     // #B19CD9
const Color primaryLight = Color(0xFFD4C7E8);    // #D4C7E8  
const Color primaryDark = Color(0xFF9B7FC7);     // #9B7FC7

// 深色模式主色调
const Color primaryBaseDark = Color(0xFFC4A3E8);  // #C4A3E8
```

#### 背景色系统 (Background Colors)
```dart
// 亮色模式
const Color backgroundPage = Color(0xFFF7F7EC);      // #F7F7EC - 页面背景
const Color surfaceMain = Color(0xFFFFFFF4);        // #FFFFF4 - 主要表面
const Color surfaceLight = Color(0xE6FFFFFF);       // rgba(255, 255, 255, 0.901961)
const Color surfaceDark = Color(0xFFD6D6C2);        // #D6D6C2 - 深色表面
const Color surfaceAccent = Color(0xFFE8E0F7);      // #E8E0F7 - 强调表面

// 深色模式
const Color backgroundPageDark = Color(0xFF121212);  // #121212
const Color surfaceMainDark = Color(0xFF1E1E1E);    // #1e1e1e
const Color surfaceLightDark = Color(0xF21E1E1E);   // rgba(30, 30, 30, 0.95)
const Color surfaceDarkDark = Color(0xFF2A2A2A);    // #2a2a2a
const Color surfaceAccentDark = Color(0xFF2D2D3A);  // #2d2d3a
```

### 圆角系统 (Border Radius)
```dart
const double radiusSmall = 12.0;    // 小圆角
const double radiusMedium = 16.0;   // 中等圆角
const double radiusFull = 999.0;    // 完全圆角 (pill shape)
```

## 📱 页面结构与设计

### 1. 主页 (首页/记录页) - `HomePage`

#### 功能描述
- AI语音对话界面
- 实时语音识别和AI回复
- 日记预览卡片
- 对话历史显示

#### 页面结构
```
AppBar (固定顶部)
├── Logo + 应用名称
├── 位置天气指示器 (🌤️/⏳/❌)
├── 重新开始按钮 (🔄)
├── 测试按钮 (🔧)
└── 设置按钮 (⚙️)

Body (滚动内容)
├── 对话记录区域
│   ├── AI消息气泡 (左对齐)
│   ├── 用户消息气泡 (右对齐)
│   ├── 加载动画
│   └── 日记预览卡片
└── 引导界面 (无对话时)
    ├── 麦克风图标 (🎤)
    ├── 标题文字
    └── 说明文字

VoiceInput Component (浮动)
├── 录音按钮
├── 暂停/继续按钮
├── 结束会话按钮
└── 录音状态显示

BottomNavigationBar (固定底部)
├── 记录 (🏠) - 当前页
├── 日记本 (📖)
└── 档案 (👤)
```

#### 关键组件设计

**聊天气泡组件**
```dart
// AI消息气泡
Container(
  padding: EdgeInsets.symmetric(horizontal: 18, vertical: 14),
  decoration: BoxDecoration(
    color: surfaceAccent,
    borderRadius: BorderRadius.only(
      topLeft: Radius.circular(18),
      topRight: Radius.circular(18),
      bottomRight: Radius.circular(18),
      bottomLeft: Radius.circular(4),
    ),
  ),
  child: Text(message, style: TextStyle(fontSize: 16, lineHeight: 1.5)),
)

// 用户消息气泡
Container(
  padding: EdgeInsets.symmetric(horizontal: 18, vertical: 14),
  decoration: BoxDecoration(
    color: primaryBase,
    borderRadius: BorderRadius.only(
      topLeft: Radius.circular(18),
      topRight: Radius.circular(18),
      bottomLeft: Radius.circular(18),
      bottomRight: Radius.circular(4),
    ),
  ),
  child: Text(message, style: TextStyle(fontSize: 16, color: textInverse)),
)
```

**语音输入组件**
- 圆形录音按钮 (渐变背景)
- 录音时间显示
- 波形动画效果
- 录音状态指示器

### 2. 日记本页 - `DiaryPage`

#### 功能描述
- 日历视图展示日记
- 心情颜色标记
- 日记预览列表
- 搜索和筛选

#### 页面结构
```
AppBar (固定顶部)
├── 标题 "日记本"
├── 用户ID显示
├── 刷新按钮 (🔍)
└── 设置按钮 (⚙️)

Body (滚动内容)
├── 日历组件
│   ├── 月份导航
│   ├── 星期标题行
│   └── 日期网格
│       ├── 普通日期
│       ├── 有日记日期 (带背景色)
│       └── 选中日期 (高亮)
├── 心情颜色说明
└── 日记列表
    └── 日记预览卡片

BottomNavigationBar
```

#### 日历组件设计
```dart
// 日期按钮
Container(
  width: 40,
  height: 40,
  decoration: BoxDecoration(
    color: getDateBackgroundColor(date),
    borderRadius: BorderRadius.circular(20),
    border: isSelected ? Border.all(color: primaryBase, width: 2) : null,
  ),
  child: Center(
    child: Text(
      day.toString(),
      style: TextStyle(
        fontSize: fontSizeBody,
        color: getTextColor(date),
        fontWeight: FontWeight.w600,
      ),
    ),
  ),
)
```

#### 心情颜色映射
```dart
Color getMoodColor(int score) {
  if (score >= 9) return Color(0xFF4CAF50);      // 绿色 - 非常好
  if (score >= 7) return Color(0xFF8BC34A);      // 浅绿 - 好
  if (score >= 5) return Color(0xFFFFC107);      // 黄色 - 一般
  if (score >= 3) return Color(0xFFFF9800);      // 橙色 - 不太好
  return Color(0xFFF44336);                      // 红色 - 很差
}
```

### 3. 个人档案页 - `ProfilePage`

#### 功能描述
- 统计数据展示
- 心情趋势图表
- 时间筛选
- 数据分析

#### 页面结构
```
AppBar (固定顶部)
├── 标题 "个人档案"
├── 用户ID显示
└── 设置按钮 (⚙️)

Body (滚动内容)
├── 时间筛选器
│   ├── 3天按钮
│   ├── 7天按钮
│   └── 30天按钮
├── 统计卡片网格
│   ├── 总日记数
│   ├── 平均心情
│   ├── 连续天数
│   ├── 最爱标签
│   ├── 总字数
│   └── 本周日记
├── 心情趋势图表
└── Web3奖励部分
    ├── 钱包连接
    ├── 奖励申请
    └── 奖励记录

BottomNavigationBar
```

#### 统计卡片设计
```dart
Container(
  padding: EdgeInsets.all(spacingStandard),
  decoration: BoxDecoration(
    color: surfaceMain,
    borderRadius: BorderRadius.circular(radiusMedium),
    boxShadow: [
      BoxShadow(
        color: Colors.black.withOpacity(0.05),
        blurRadius: 10,
        offset: Offset(0, 2),
      ),
    ],
  ),
  child: Column(
    children: [
      Text(value, style: TextStyle(fontSize: fontSizeHeading, fontWeight: fontWeightMedium)),
      Text(label, style: TextStyle(fontSize: fontSizeBody, color: textSecondary)),
    ],
  ),
)
```

## 🧩 核心组件设计

### 1. VoiceInput 语音输入组件

#### 功能特性
- 录音控制 (开始/暂停/停止)
- 语音转文字
- AI对话集成
- 录音时间限制 (60秒)
- 多浏览器兼容性

#### 状态管理
```dart
class VoiceInputState {
  bool isRecording = false;
  bool isPaused = false;
  bool isConnected = false;
  bool isProcessing = false;
  int recordingTime = 0;
  String? error = null;
  List<AIChatMessage> aiChatHistory = [];
}
```

#### UI设计
- 中央圆形录音按钮 (渐变背景)
- 录音时显示波形动画
- 录音时间圆形进度条
- 暂停/继续/结束按钮

### 2. DiaryPreviewCard 日记预览卡片

#### 组件结构
```dart
Container(
  padding: EdgeInsets.all(spacingStandard),
  decoration: BoxDecoration(
    color: surfaceMain,
    borderRadius: BorderRadius.circular(radiusMedium),
    border: Border.all(color: primaryLight, width: 2, style: BorderStyle.dashed),
  ),
  child: Column(
    children: [
      // 标题行
      Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text("📝 ${diary.title}"),
          Row(children: [
            Text(getMoodEmoji(diary.score)),
            Text("${diary.score}/10"),
          ]),
        ],
      ),
      // 标签
      if (diary.tag != null) Chip(label: Text("#${getTagTitle(diary.tag)}")),
      // 内容
      Text(diary.content),
      // 保存按钮
      ElevatedButton(onPressed: saveDiary, child: Text("💾 保存日记")),
    ],
  ),
)
```

### 3. MoodChart 心情图表组件

#### 功能特性
- 折线图显示心情趋势
- 点击查看详细信息
- 时间轴标注
- 响应式设计

### 4. Calendar 日历组件

#### 功能特性
- 月份导航
- 日期网格布局
- 心情颜色标记
- 日期选择
- 多日记日期显示

### 5. SettingsModal 设置弹窗

#### 功能特性
- 用户ID管理
- 主题切换
- 数据导出
- 隐私设置

## 🗂️ 数据模型

### 核心数据结构

#### Message 消息模型
```dart
class Message {
  int id;
  String content;
  bool isUser;
  String timestamp;
  
  Message({
    required this.id,
    required this.content,
    required this.isUser,
    required this.timestamp,
  });
}
```

#### DiaryEntry 日记模型
```dart
class DiaryEntry {
  int id;
  String date;           // YYYY-MM-DD
  String title;
  String content;
  String time;           // HH:MM
  bool generated;        // AI生成标记
  int? score;            // 心情评分 1-10
  String? tag;           // 标签
  LocationInfo? location; // 位置信息
  WeatherInfo? weather;   // 天气信息
  
  DiaryEntry({
    required this.id,
    required this.date,
    required this.title,
    required this.content,
    required this.time,
    this.generated = false,
    this.score,
    this.tag,
    this.location,
    this.weather,
  });
}
```

#### LocationInfo 位置信息
```dart
class LocationInfo {
  double latitude;
  double longitude;
  String formattedAddress;
  String city;
  String district;
  String street;
  
  LocationInfo({
    required this.latitude,
    required this.longitude,
    required this.formattedAddress,
    required this.city,
    required this.district,
    required this.street,
  });
}
```

#### WeatherInfo 天气信息
```dart
class WeatherInfo {
  double temperature;
  String description;
  String icon;
  int humidity;
  double windSpeed;
  double feelsLike;
  
  WeatherInfo({
    required this.temperature,
    required this.description,
    required this.icon,
    required this.humidity,
    required this.windSpeed,
    required this.feelsLike,
  });
}
```

### 标签系统

#### 预定义标签
```dart
Map<String, String> tagTitles = {
  'work': '工作日记',
  'personal': '个人日记',
  'travel': '旅行日记',
  'relationships': '人际日记',
  'health': '健康日记',
  'goals': '目标日记',
  'reflection': '反思日记',
  'gratitude': '感恩日记',
  'dreams': '梦想日记',
  'memories': '回忆日记',
};
```

## 🔌 API接口设计

### 基础API配置
- 基础URL: `/api` (Next.js API路由)
- 认证方式: 用户ID
- 数据格式: JSON

### 核心接口

#### 1. 保存日记
```
POST /api/diary
Body: {
  id: number,              // 用户ID
  title: string,           // 日记标题
  content: string,         // 日记内容  
  date: string,            // YYYY-MM-DD HH:MM:SS
  score?: number,          // 心情评分
  tag?: string,            // 标签
  location?: LocationInfo, // 位置信息
  weather?: WeatherInfo    // 天气信息
}
```

#### 2. 获取用户日记
```
GET /api/diary?id={userId}
Response: {
  status: 'success' | 'error',
  data: DiaryEntry[],
  message?: string
}
```

#### 3. 删除日记
```
DELETE /api/diary
Body: {
  id: number,        // 用户ID
  diary_id: number   // 日记ID
}
```

#### 4. 语音转文字
```
POST /api/speech-to-text
Body: {
  audio: string,     // base64音频数据
  user_id: number,   // 用户ID
  chat_history: AIChatMessage[] // 对话历史
}
```

#### 5. Web3奖励
```
POST /api/web3/claim-reward
Body: {
  userId: number,
  walletAddress: string
}
```

## 📦 依赖包推荐

### Flutter核心包
```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # 状态管理
  provider: ^6.0.5
  
  # 网络请求
  http: ^0.13.5
  dio: ^5.3.2
  
  # 本地存储
  shared_preferences: ^2.2.2
  sqflite: ^2.3.0
  
  # UI组件
  flutter_svg: ^2.0.7
  cached_network_image: ^3.3.0
  
  # 录音功能
  record: ^4.4.4
  audio_waveforms: ^1.0.5
  permission_handler: ^11.0.1
  
  # 图表
  fl_chart: ^0.63.0
  
  # 日期处理
  intl: ^0.18.1
  
  # 地理位置
  geolocator: ^9.0.2
  geocoding: ^2.1.1
  
  # Web3
  web3dart: ^2.7.3
  
  # 其他工具
  uuid: ^4.1.0
  path_provider: ^2.1.1
```

## 🏗️ 项目文件结构

```
lib/
├── main.dart                    # 应用入口
├── app.dart                     # 主应用配置
├── theme/
│   ├── app_theme.dart          # 主题配置
│   ├── colors.dart             # 颜色定义
│   ├── typography.dart         # 字体样式
│   └── dimensions.dart         # 尺寸规范
├── pages/
│   ├── home/
│   │   ├── home_page.dart      # 首页
│   │   └── home_binding.dart   # 首页绑定
│   ├── diary/
│   │   ├── diary_page.dart     # 日记页
│   │   └── diary_binding.dart  # 日记页绑定
│   └── profile/
│       ├── profile_page.dart   # 档案页
│       └── profile_binding.dart # 档案页绑定
├── widgets/
│   ├── voice_input/
│   │   ├── voice_input_widget.dart     # 语音输入组件
│   │   ├── recording_button.dart       # 录音按钮
│   │   └── waveform_painter.dart       # 波形绘制
│   ├── chat/
│   │   ├── chat_bubble.dart            # 聊天气泡
│   │   └── loading_animation.dart      # 加载动画
│   ├── diary/
│   │   ├── diary_preview_card.dart     # 日记预览卡片
│   │   ├── diary_detail_modal.dart     # 日记详情弹窗
│   │   └── calendar_widget.dart        # 日历组件
│   ├── profile/
│   │   ├── stats_card.dart             # 统计卡片
│   │   ├── mood_chart.dart             # 心情图表
│   │   └── filter_tabs.dart            # 筛选标签
│   └── common/
│       ├── app_bar.dart                # 通用导航栏
│       ├── bottom_nav.dart             # 底部导航
│       ├── settings_modal.dart         # 设置弹窗
│       └── loading_overlay.dart        # 加载遮罩
├── models/
│   ├── message.dart            # 消息模型
│   ├── diary_entry.dart        # 日记模型
│   ├── location_info.dart      # 位置信息
│   ├── weather_info.dart       # 天气信息
│   └── user_stats.dart         # 用户统计
├── services/
│   ├── api_service.dart        # API服务
│   ├── voice_service.dart      # 语音服务
│   ├── location_service.dart   # 位置服务
│   ├── storage_service.dart    # 存储服务
│   └── web3_service.dart       # Web3服务
├── providers/
│   ├── conversation_provider.dart  # 对话状态管理
│   ├── diary_provider.dart         # 日记状态管理
│   ├── user_provider.dart          # 用户状态管理
│   └── theme_provider.dart         # 主题状态管理
├── utils/
│   ├── constants.dart          # 常量定义
│   ├── helpers.dart            # 工具函数
│   ├── date_utils.dart         # 日期工具
│   └── validators.dart         # 验证工具
└── config/
    ├── app_config.dart         # 应用配置
    ├── api_config.dart         # API配置
    └── env.dart                # 环境变量
```

## 🚀 实现优先级

### Phase 1: 基础框架 (Week 1-2)
1. 项目初始化和依赖配置
2. 主题系统和设计规范实现
3. 底部导航和页面路由
4. 基础API服务搭建

### Phase 2: 核心功能 (Week 3-4)
1. 语音录音和播放功能
2. 聊天界面和消息展示
3. 日记数据模型和存储
4. 基础对话流程

### Phase 3: 日记功能 (Week 5-6)
1. 日历组件实现
2. 日记列表和详情页
3. 心情评分和标签系统
4. 数据同步和缓存

### Phase 4: 高级功能 (Week 7-8)
1. 统计分析和图表
2. 位置和天气集成
3. Web3奖励系统
4. 设置和用户管理

### Phase 5: 优化完善 (Week 9-10)
1. 性能优化和错误处理
2. 深色模式适配
3. 响应式设计优化
4. 测试和调试

## 📝 开发注意事项

### 1. 状态管理
- 使用Provider进行全局状态管理
- 对话状态需要持久化存储
- 音频录制状态需要实时更新

### 2. 音频处理
- 权限请求和错误处理
- 多平台兼容性考虑
- 音频格式转换和压缩

### 3. 网络请求
- API接口统一封装
- 错误重试机制
- 离线数据缓存

### 4. 用户体验
- 加载状态指示
- 错误提示友好
- 流畅的动画过渡

### 5. 安全考虑
- 用户数据加密存储
- API请求安全验证
- 隐私信息保护

这个文档提供了完整的Flutter复现指南，包含了所有必要的设计规范、组件结构和实现细节。可以按照这个文档逐步构建Flutter版本的声命体MemoirAI应用。