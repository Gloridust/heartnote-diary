---
name: memoirai-design
description: MemoirAI 声迹 App 的设计与交互系统规范。涵盖微光拟物治愈风调色板、Liquid Glass 卡片、圆角胶囊输入框、滑块式 Tab、Material rounded 图标体系、动效曲线、震动反馈语义。**任何时候在 memoirai/ Flutter 项目里新增/修改 UI 组件、调整颜色阴影圆角、加新页面、调整交互动画、改输入框/按钮/Tab 的样式，或者讨论"治愈风/微光/玻璃感"风格设计时都应使用此 skill**，确保新代码视觉与交互上与既有界面一致。在添加任何用户交互（按钮、Tab、表单提交、长按手势、AI 回复等）时也必须查阅此 skill 的 haptic 章节决定是否要加震动反馈。
---

# MemoirAI 设计系统

> 用一句话概括：**温暖米白底 + 薰衣草紫强调 + Liquid Glass 卡片质感 + 节制的震动反馈**，所有改动都先来这里对齐。

## 何时使用

读到下面任一信号时，**先打开本 skill 再动手**：

- 在 `memoirai/lib/` 下新建 widget / page
- 改任何颜色、阴影、圆角、字号
- 加按钮、Tab、表单、对话气泡、卡片
- 涉及交互的手势（点击、长按、滑动、Tab 切换）
- 用户说「治愈风 / 微光 / 玻璃感 / 圆角 / iOS 风」之类描述
- 添加任何动效或过渡

## 核心设计原则

1. **可读性先于装饰**。这是一个长文阅读应用（日记），文字对比度必须 ≥ 4.5:1。Liquid Glass 美则美矣，但只用在卡片边缘、Tab、悬浮按钮等装饰层，**不要拿玻璃感当主背景**。
2. **温暖米白做主色，薰衣草紫做强调**。整体调性"治愈"——避免高饱和、避免冷色、避免纯黑。
3. **节制的动效**。曲线统一 `Curves.easeOutCubic`，时长 220–360ms。**不要堆砌弹簧、闪烁、抖动**。
4. **图标用 `Icons.xxx_rounded`，不用 emoji 当 UI 图标**。Emoji 只在表达情绪时用（如心情评分的 😊🙂😐😔😢）。
5. **震动要节制**。仅在用户主动动作或重要状态变更时触发。治愈风应用不该让手一直在抖。
6. **颜色用 token，不写裸 hex**。所有颜色从 `lib/theme/colors.dart` 的 `AppColors` 读取。

## 快速 Token 参考

> 完整规范见 `references/tokens.md`，下面是高频用到的几条。

```dart
// 颜色（来自 AppColors）
AppColors.bgPage           // #F7F5EC 主背景米白
AppColors.surface          // #FFFCF4 卡片底
AppColors.primary          // #7A5FB8 强调色 / 按钮 / 链接
AppColors.primaryDark      // #5E3FA0 强调加深 / 紧凑文字
AppColors.primaryLight     // #A890DD 渐变高光端
AppColors.primarySoft      // #EDE5FA 状态徽标背景
AppColors.textPrimary      // #1F1B2E 正文
AppColors.textSecondary    // #5C5670 次要
AppColors.textTertiary     // #8E889E 仅辅助说明
AppColors.border           // #EDE8D8 卡片描边
AppColors.danger / .success / .warning  // 语义色

// 阴影（来自 Shadows）
Shadows.glow    // 卡片默认 — 顶部白色高光 + 底部柔阴影
Shadows.soft    // 按钮 / 徽标
Shadows.strong  // FAB / Tab Bar / 浮层

// 圆角尺度
- 4   微元素：列表项内的小色块
- 12  紧凑卡片角（嵌套时）
- 16  输入框 / 二级按钮
- 20  卡片标准圆角
- 28  胶囊文本框 / 大按钮
- 999 完全胶囊（pill）— Tab、Chip、状态徽标、主操作按钮

// 动效
- 切换/滑动:   320–360ms easeOutCubic
- 颜色淡化:   220–280ms easeOut
- 微反馈:     160–180ms（按下、长按状态变化）
```

## 组件目录

> 完整代码模板见 `references/components.md`。

| 用途 | 已有组件 | 何时用 |
|---|---|---|
| 卡片 | `GlassCard` | 所有需要 elevated 视觉的内容容器 |
| Tab / 单选 | `SlidingSegment<T>` | 2–4 个互斥选项的水平切换 |
| 底部导航 | `FrostedTabBar` | 主 shell 底部 — 已经在用 |
| 对话气泡 | `ChatBubble`, `TypingBubble` | 聊天界面 |
| 输入栏 | `VoiceInputBar` | 文字输入 + 长按麦克风 |
| 状态徽标 | 内联实现（pill + Icon + 文字） | 心情、tag、位置、天气标签 |

**重要：新增类似功能前先看这个目录有没有，避免造重复轮子。** 比如要做一组单选按钮，第一反应是 `SlidingSegment`，不要再写 ToggleButtons。

## 图标规则

- ✅ 全部用 `Icons.xxx_rounded` 系列（Flutter 内置，零依赖，圆角风与治愈调性贴合）
- ✅ 心情评分保留 emoji 表情：`😊🙂😐😔😢`（这是情感表达，不是图标）
- ❌ 不要用 `Icons.xxx_outlined` 或不带 `_rounded` 后缀的版本（角太硬）
- ❌ 不要把 ⚡📍🏷📝💖 这种 emoji 用作 UI 图标（视觉断层）

常用图标对照：
| 含义 | 图标 |
|---|---|
| 活力值 | `Icons.bolt_rounded` |
| 设置 | `Icons.settings_outlined`（这是少数例外，rounded 版有点笨） |
| 标签 | `Icons.local_offer_rounded` 或 `Icons.tag_rounded` |
| 位置 | `Icons.location_on_rounded` |
| 日记 | `Icons.edit_note_rounded` |
| 心情 | `Icons.favorite_rounded` |
| 火/连续 | `Icons.local_fire_department_rounded` |
| 字数 | `Icons.text_snippet_rounded` |
| 日历 | `Icons.calendar_month_rounded` |
| 图表 | `Icons.show_chart_rounded` |
| 麦克风（默认/录音） | `Icons.mic_none_rounded` / `Icons.mic_rounded` |
| 发送 | `Icons.arrow_upward_rounded`（不要用 send 飞机，太重） |
| AI / 生成 | `Icons.auto_awesome_rounded` |
| 删除 | `Icons.delete_outline_rounded` |
| 关闭 | `Icons.close_rounded` |
| 返回 | `Icons.chevron_left_rounded` |
| 前进/导航 | `Icons.chevron_right_rounded` |

天气图标见 `lib/models/context.dart` 的 `WeatherInfo.iconData` getter，已经把高德返回的 description 映射到 `wb_sunny_rounded`/`cloud_rounded`/`water_drop_rounded`/`thunderstorm_rounded`/`ac_unit_rounded`/`foggy`。

## 震动反馈

> 完整规则见 `references/haptics.md`。一句话：**用 `Haptics` 工具类（`lib/utils/haptics.dart`），不要直接调 `HapticFeedback`**。

```dart
import '../utils/haptics.dart';

Haptics.tabSwitch();        // Tab/segment 切换
Haptics.tap();              // 主按钮点击 / 发送
Haptics.event();            // 长按录音开始 / 重要事件发生
Haptics.warning();          // 取消 / 删除 / 错误
Haptics.success();          // 保存成功
Haptics.aiReplyReceived();  // AI 一段对话回复送达
Haptics.aiDraftReady();     // AI 生成完整日记草稿
```

**何时震、何时不震**（关键判断）：
- ✅ 用户的主动确认行为（点击发送、保存、切 Tab）
- ✅ 重要异步事件完成（AI 回复、草稿生成、保存成功）
- ✅ 危险/警告（取消录音、删除、活力不足）
- ❌ 滚动、悬停、键盘输入字符
- ❌ 屏幕过场动画
- ❌ 短时间内重复触发（如来回滑动取消区，只在第一次进入时震）

## 风格反例（不要这样写）

```dart
// ❌ 直接用 hex
Container(color: const Color(0xFFB19CD9))
// ✅ 用 token
Container(color: AppColors.primary)

// ❌ 自己堆 BoxShadow
boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 8)]
// ✅ 用 Shadows 体系
boxShadow: Shadows.glow

// ❌ Material 默认带角的按钮
ElevatedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)))
// ✅ 全部胶囊，主题里已经设过了，直接 ElevatedButton 即可
ElevatedButton(onPressed: ..., child: Text('保存'))

// ❌ 用 emoji 当图标
Text('⚡ 活力值')
// ✅ 用 Material rounded
Row(children: [Icon(Icons.bolt_rounded), Text('活力值')])

// ❌ TabBar 默认下划线 indicator
TabBar(tabs: [...])
// ✅ 用 SlidingSegment + PageView，或 SlidingSegment 单独（视场景）
SlidingSegment<int>(value: idx, onChanged: ..., items: [...])

// ❌ 简单变色按钮 / 自定义 onTap 后忘了震动
GestureDetector(onTap: () => doStuff())
// ✅ 主操作要带震动
GestureDetector(onTap: () { Haptics.tap(); doStuff(); })
```

## 决策流程

写新 UI 时按这个顺序判断：

1. **能用现有组件吗？** 看上面"组件目录"。能就用，不能再写新的。
2. **新组件命名风格?** widget 文件放 `lib/widgets/`，page 文件放 `lib/pages/`。
3. **颜色都从 AppColors 读了吗？** 不要写裸 hex。
4. **圆角对齐了吗？** 看 token 的圆角尺度表，挑最接近的，别写 `13` `19` 这种数字。
5. **图标都是 `_rounded` 吗？** 没有 emoji 当图标？
6. **交互该有震动吗？** 看 `references/haptics.md`。
7. **动画曲线是 `easeOutCubic`，时长 220–360ms 吗？** 不要默认的 `Curves.linear` 或 `Curves.fastOutSlowIn`。

## 进一步阅读

- `references/tokens.md` — 完整 Color / Shadow / Typography / Radius / Animation token 列表
- `references/components.md` — 每个核心组件的代码骨架与变体
- `references/haptics.md` — 震动反馈对照表 + 平台行为说明
