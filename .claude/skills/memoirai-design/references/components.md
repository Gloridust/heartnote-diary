# 组件目录

本文件列出所有已定义的 UI 组件 + 常用内联模式。**先翻目录，能复用就复用，避免造重复轮子。**

## 目录

- [1. GlassCard — 微光卡片](#1-glasscard)
- [2. SlidingSegment — 滑块式单选](#2-slidingsegment)
- [3. FrostedTabBar — 悬浮毛玻璃底栏](#3-frostedtabbar)
- [4. ChatBubble / TypingBubble — 对话气泡](#4-chatbubble)
- [5. VoiceInputBar — 输入栏](#5-voiceinputbar)
- [6. 内联模式 — Chip / IconButton / Pill](#6-内联模式)

---

## 1. GlassCard

文件：`lib/widgets/glass_card.dart`

所有需要浮起视觉的内容容器都用它，**不要自己写 Container + BoxDecoration + BoxShadow**。

### API
```dart
GlassCard({
  Widget child,
  EdgeInsetsGeometry padding = EdgeInsets.all(18),
  double radius = 20,
  Color? color,      // 默认 AppColors.surface
  bool glow = true,  // false 时用 Shadows.soft 替代
})
```

### 视觉特征
- 顶亮底略沉的垂直渐变（与 `bgPageAlt` 混入 15%）
- 1px 米色描边（`AppColors.border`）
- `Shadows.glow`：顶部 1px 白色高光 + 底部双层柔阴影

### 用法
```dart
GlassCard(
  padding: const EdgeInsets.all(20),
  child: Column(children: [...]),
)
```

### 何时不用 GlassCard
- 页面级大背景 → 用 `Scaffold` + `AppColors.bgPage`
- 渐变强调卡（如活力值紫色大卡） → 自己写 Container + LinearGradient
- 对话气泡 → 用 `ChatBubble`

---

## 2. SlidingSegment

文件：`lib/widgets/sliding_segment.dart`

2–4 个互斥选项的水平切换。滑块背景用 `AnimatedPositioned` 平滑滑动（360ms easeOutCubic）。

### API
```dart
SlidingSegment<T>({
  required T value,
  required ValueChanged<T> onChanged,
  required List<SlidingSegmentItem<T>> items,
  double height = 44,
  Color trackColor = AppColors.bgPage,
  Gradient? thumbGradient,      // 默认 primaryLight → primary
  Color selectedColor = Colors.white,
  Color unselectedColor = AppColors.textSecondary,
  TextStyle? textStyle,
})

SlidingSegmentItem<T>({
  required T value,
  required String label,
  IconData? icon,  // 可选，出现在 label 左侧
})
```

### 用法
```dart
enum _Range { d3, d7, d30 }
_Range current = _Range.d7;

SlidingSegment<_Range>(
  value: current,
  onChanged: (v) => setState(() => current = v),
  trackColor: AppColors.surface,
  items: const [
    SlidingSegmentItem(value: _Range.d3, label: '3 天'),
    SlidingSegmentItem(value: _Range.d7, label: '7 天'),
    SlidingSegmentItem(value: _Range.d30, label: '30 天'),
  ],
)
```

**内置了震动**（`Haptics.tabSwitch()`）— 业务代码无需另外调用。

### 何时不用
- ≥ 5 个选项 → 用 Dropdown / BottomSheet
- 选项需要动态增减 → 用 Chip group
- 文本过长超过容器宽度 → 考虑竖排列表

---

## 3. FrostedTabBar

文件：`lib/widgets/glass_card.dart`（同文件）

App 主 shell 底部专用，悬浮毛玻璃药丸 + 内嵌滑动胶囊。已经在 `MainShell` 里使用，**一般不需要另外用**。

### 视觉特征
- `BackdropFilter.blur(24, 24)` 毛玻璃背景
- 白色 72% 透明主体 + 白色 70% 透明 1px 边
- `AnimatedPositioned` 左右滑动的紫色渐变胶囊
- 图标 + label 上下排列，激活态白色，未激活 `textSecondary`

### 用法（一般只在 `MainShell` 里）
```dart
FrostedTabBar(
  currentIndex: _idx,
  onTap: (i) {
    if (i != _idx) Haptics.tabSwitch();
    setState(() => _idx = i);
  },
  tabs: const [
    FrostedTab(Icons.chat_bubble_outline_rounded, '对话'),
    FrostedTab(Icons.book_outlined, '日记本'),
    FrostedTab(Icons.person_outline_rounded, '我的'),
  ],
)
```

---

## 4. ChatBubble / TypingBubble

文件：`lib/widgets/chat_bubble.dart`

### ChatBubble
- 用户气泡：紫色渐变 + 白字，右下角尖 6px，其他 20px
- AI 气泡：`primarySoft` 底 + `textPrimary` 文字，左下角尖 6px
- 最大宽度屏幕 78%

```dart
ChatBubble(text: msg.content, isUser: msg.isUser)
```

### TypingBubble
AI 思考中的"..."气泡，三个圆点依次呼吸。

```dart
if (chat.thinking) const TypingBubble()
```

---

## 5. VoiceInputBar

文件：`lib/widgets/voice_input.dart`

底部输入栏：

- **永远显示**圆角胶囊文本框（不像微信切换模式）
- 右侧按钮：空内容 = 麦克风（长按说话） / 有内容 = 紫色发送按钮
- 长按麦克风录音 → 全屏中央浮层 → 松开 STT → 文字自动填入输入框（可编辑再发送）
- 上滑 80px → 取消录音（按钮变红 + 震动 warning + 浮层变红）

### API
```dart
VoiceInputBar({
  required bool busy,
  required ValueChanged<String> onSubmitText,
})
```

### 用法
```dart
VoiceInputBar(
  busy: chat.thinking,
  onSubmitText: (t) => chat.sendUserText(t),
)
```

震动反馈已内置（录音开始 event、进入取消区 warning、发送 tap）。

---

## 6. 内联模式

这些不值得封装成独立组件，但有统一写法。

### 6.1 状态 Chip（心情、标签、天气、位置）

圆角 999 胶囊，内部 Row + Icon + 文字：

```dart
Container(
  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
  decoration: BoxDecoration(
    color: AppColors.primarySoft, // 或 surface + border
    borderRadius: BorderRadius.circular(999),
  ),
  child: Row(mainAxisSize: MainAxisSize.min, children: [
    const Icon(Icons.local_offer_rounded, size: 11, color: AppColors.primaryDark),
    const SizedBox(width: 3),
    Text('工作', style: TextStyle(fontSize: 12,
      color: AppColors.primaryDark, fontWeight: FontWeight.w600)),
  ]),
)
```

变体：
- 主色填充（紫 soft） + 紫深文字：**重要 tag**（当前选中、主 tag）
- surface + `border` 描边 + `textSecondary` 文字：**次要 chip**（天气、位置）
- 心情色.withValues(alpha: .25) + 深色文字：**分数 chip**

### 6.2 圆形 IconButton（"我的页面"设置齿轮那种）

```dart
GestureDetector(
  onTap: () { Haptics.tap(); doStuff(); },
  child: Container(
    width: 40, height: 40,
    decoration: BoxDecoration(
      color: AppColors.surface,
      shape: BoxShape.circle,
      border: Border.all(color: AppColors.border),
      boxShadow: Shadows.soft,
    ),
    child: Icon(icon, size: 20, color: AppColors.textSecondary),
  ),
)
```

### 6.3 Pill 按钮（大胶囊主操作）

主题里已经把 `ElevatedButton` 默认改成 pill，直接用：

```dart
ElevatedButton(
  onPressed: _save,
  child: const Text('保 存 日 记', style: TextStyle(letterSpacing: 2)),
)
```

次要按钮：
```dart
OutlinedButton(
  onPressed: _cancel,
  style: OutlinedButton.styleFrom(
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
    side: const BorderSide(color: AppColors.border),
    padding: const EdgeInsets.symmetric(vertical: 12),
  ),
  child: const Text('取消', style: TextStyle(color: AppColors.textSecondary)),
)
```

### 6.4 毛玻璃浮起 pill（对话页"帮我整理成日记"那种）

```dart
ClipRRect(
  borderRadius: BorderRadius.circular(999),
  child: BackdropFilter(
    filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .55),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: .65)),
        boxShadow: [BoxShadow(
          color: AppColors.primary.withValues(alpha: .12),
          blurRadius: 14, offset: const Offset(0, 4))],
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.auto_awesome_rounded, size: 16, color: AppColors.primaryDark),
        SizedBox(width: 6),
        Text('帮我整理成日记',
          style: TextStyle(color: AppColors.primaryDark,
            fontSize: 13, fontWeight: FontWeight.w600)),
      ]),
    ),
  ),
)
```

### 6.5 页面标题

标准「页面大标题 + 右上角圆形 icon 按钮」的组合：

```dart
Padding(
  padding: const EdgeInsets.fromLTRB(22, 14, 22, 8),
  child: Row(children: [
    const Expanded(child: Text('我的声迹',
      style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700,
        color: AppColors.textPrimary))),
    // 右上角圆形按钮 — 见 6.2
    _RoundIconButton(icon: Icons.settings_outlined, onTap: ...),
  ]),
)
```

### 6.6 提示条（恢复对话、活力不足、DEV 角标）

三种形态：

- **温和提示** — 紫色 primarySoft 底 + 紫深文字 + icon
- **警告提示** — `danger` alpha .12 底 + `danger` 边 + icon + 「去处理」按钮
- **成功提示** — SnackBar 即可，不需要常驻条

```dart
// 警告示例
Container(
  padding: const EdgeInsets.fromLTRB(14, 10, 10, 10),
  decoration: BoxDecoration(
    color: AppColors.danger.withValues(alpha: .12),
    borderRadius: BorderRadius.circular(14),
    border: Border.all(color: AppColors.danger.withValues(alpha: .3)),
  ),
  child: Row(children: [
    const Icon(Icons.bolt_rounded, color: AppColors.danger, size: 18),
    const SizedBox(width: 6),
    const Expanded(child: Text('活力不足，充值后继续畅聊',
      style: TextStyle(fontSize: 13, color: AppColors.textPrimary,
        fontWeight: FontWeight.w600))),
    TextButton(onPressed: onRecharge, child: const Text('去充值')),
  ]),
)
```

---

## 命名约定

- `lib/widgets/` 通用可复用 widget（`ChatBubble`, `SlidingSegment`）
- `lib/pages/` 整页级 widget（`HomePage`, `SettingsPage`）
- `lib/pages/home_page.dart` 内部的私有子组件用 `_Xxx` 下划线前缀（`_DraftCard`, `_OutOfVitalityNotice`）
- 动词 or 状态开头：`_FinishPill`, `_RestoreNotice`, `_ContextBanner`

## 新加组件的 checklist

1. 颜色全部从 `AppColors` 取
2. 圆角用 token 尺度（20 / 28 / 999 等）
3. 阴影用 `Shadows.glow / soft / strong`
4. 文字用 theme.textTheme.xxx 或明确的 `TextStyle(fontSize: 15, color: AppColors.textPrimary)`
5. 图标 `Icons.xxx_rounded`
6. 主交互点位加 `Haptics.xxx()`
7. 动画 `Duration` + `Curves.easeOutCubic`
