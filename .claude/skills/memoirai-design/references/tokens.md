# Design Tokens — 完整规范

权威定义：`lib/theme/colors.dart` (`AppColors`) + `lib/theme/app_theme.dart` (`Shadows`)。本文档是"为什么这样选"的解释 + 速查表。

## 1. Color

### 1.1 Primary（薰衣草紫，调深以满足 WCAG AA）

| Token | Hex | 对比度对 surface | 用途 |
|---|---|---|---|
| `primary` | `#7A5FB8` | 5.6 : 1 ✅ | 按钮背景、主操作、强调标签 |
| `primaryDark` | `#5E3FA0` | 8.4 : 1 ✅ | 文字链接、按钮按下、激活态文字、icon |
| `primaryLight` | `#A890DD` | 3.2 : 1 | 渐变高光端，**不要用作文字** |
| `primarySoft` | `#EDE5FA` | — | 状态徽标背景 / 提示条底色 |
| `primaryTint` | `#F4EFFC` | — | 卡片偏紫淡背景（如登录卡渐晕） |

**为什么不用更鲜艳的紫色？** 治愈风核心是低饱和。原版 `#B19CD9` 视觉很美但对比度 3.0 撑不住按钮上的白字（仅 2.6:1）。新版 `#7A5FB8` 仍是薰衣草调，但满足 WCAG AA。

### 1.2 背景

| Token | Hex | 用途 |
|---|---|---|
| `bgPage` | `#F7F5EC` | 主页面米白 |
| `bgPageAlt` | `#F2EFE4` | 嵌套区域 / 凹陷 |

### 1.3 表面

| Token | Hex | 用途 |
|---|---|---|
| `surface` | `#FFFCF4` | 卡片底（暖白） |
| `surfaceElev` | `#FFFFFF` | 浮起卡片（更亮） |
| `surfaceSunk` | `#EEEAD8` | 输入框灰底（凹陷态） |

### 1.4 文字

| Token | Hex | 对比度 | 适用场景 |
|---|---|---|---|
| `textPrimary` | `#1F1B2E` | 15 : 1 | 标题、正文 |
| `textSecondary` | `#5C5670` | 7.2 : 1 | 次要说明、列表副标 |
| `textTertiary` | `#8E889E` | 4.6 : 1 | 时间戳、placeholder、不重要的辅助文字 |
| `textInverse` | `#FFFFFF` | — | 紫色按钮、紫色徽标上的文字 |

**禁忌**：不要把 `textTertiary` 用在按钮、链接或任何承载操作意图的地方（仅 4.6 临界，色弱用户会看不清）。

### 1.5 边框 / 分割

| Token | Hex | 用途 |
|---|---|---|
| `border` | `#EDE8D8` | 卡片描边、输入框默认边 |
| `borderStrong` | `#D8D0B5` | 按钮 / 重要分隔 |
| `divider` | `#00000014` | 设置项之间的细分割线 |

### 1.6 心情色（5 档，覆盖 1–10 分）

| 分数 | Token | Hex | Emoji |
|---|---|---|---|
| 8–10 | `mood10` | `#5FBE8A` | 😊 |
| 6–7  | `mood7`  | `#8DC9A4` | 🙂 |
| 4–5  | `mood5`  | `#E3C588` | 😐 |
| 2–3  | `mood3`  | `#E39E72` | 😔 |
| 1    | `mood1`  | `#D27575` | 😢 |

用法：
```dart
Color c = AppColors.moodColor(score);   // 自动按分段返回
String e = AppColors.moodEmoji(score);  // 自动返回 emoji
```

### 1.7 语义色

| Token | Hex | 用途 |
|---|---|---|
| `success` | `#4FA374` | 成功 toast / 兑换成功提示 |
| `danger`  | `#D15555` | 删除按钮、错误文字、上滑取消态 |
| `warning` | `#D68F3F` | DEV 角标、等待提示 |

## 2. Shadow

权威定义：`lib/theme/app_theme.dart::Shadows`。

```dart
class Shadows {
  /// 卡片默认 — 顶部 1px 白色高光 + 底部柔阴影 + 极轻贴近阴影
  /// 这就是 iOS 26 Liquid Glass 的关键三层
  static const List<BoxShadow> glow = [
    BoxShadow(color: Colors.white,    blurRadius: 0,  offset: Offset(0, -1)),
    BoxShadow(color: Color(0x14000000), blurRadius: 22, offset: Offset(0, 8)),
    BoxShadow(color: Color(0x08000000), blurRadius: 4,  offset: Offset(0, 1)),
  ];

  /// 按钮 / 徽标 — 比 glow 轻
  static const List<BoxShadow> soft = [
    BoxShadow(color: Color(0x0D000000), blurRadius: 16, offset: Offset(0, 5)),
    BoxShadow(color: Color(0x06000000), blurRadius: 3,  offset: Offset(0, 1)),
  ];

  /// FAB / Tab Bar / 浮层 — 重阴影显示"浮起"
  static const List<BoxShadow> strong = [
    BoxShadow(color: Color(0x1F000000), blurRadius: 30, offset: Offset(0, 12)),
    BoxShadow(color: Color(0x0A000000), blurRadius: 6,  offset: Offset(0, 2)),
  ];

  /// 凹陷态 — 输入框按下、嵌套面板
  static const List<BoxShadow> sunk = [
    BoxShadow(color: Color(0x0A000000), blurRadius: 6,
              offset: Offset(0, 2), spreadRadius: -2),
  ];
}
```

**禁忌**：永远不要写 `BoxShadow(color: Colors.black12, blurRadius: 8)` 这种零散阴影。要么用 `Shadows.xxx`，要么扩展 `Shadows` 加个新条目。

## 3. Typography

字体：
- **正文**：`GoogleFonts.notoSansSc`（思源黑体）— 中文清爽，与英文混排好看
- **大标题**：`GoogleFonts.notoSerifSc`（思源宋体）— 加一点点文学感

字号 / 行高 / 粗细：

| 用途 | size | weight | height | letterSpacing |
|---|---|---|---|---|
| 页面大标题（"我的声迹"） | 24 | w700 | 1.2 | -.2 |
| 卡片标题 | 18 | w700 | 1.3 | -.1 |
| 正文 | 15 | w400/w500 | 1.65 | 0 |
| 次要文字 | 13 | w500 | 1.55 | 0 |
| 三级文字（时间戳/说明） | 11–12 | w400/w500 | 1.4 | 0 |
| 按钮内文字 | 14–15 | w600/w700 | 1 | .5（按钮专用） |
| 状态徽标 | 11–12 | w600 | 1 | 0 |

**所有字号都是日记长文场景验证过的**——比常见 Material Design 默认略大，因为日记需要长时间阅读。

## 4. Border Radius 尺度

| 数值 | 何时用 | 例子 |
|---|---|---|
| 4 | 微元素 | 列表项内的色块、列表 bullet |
| 8–10 | — | **避免用** — 会显得既不"全圆"又不"完全直角"，视觉模糊 |
| 12 | 紧凑卡片 | 嵌套卡片、tooltip |
| 16 | 输入框 / 二级容器 | 普通 input |
| 20 | **卡片标准** | 所有 GlassCard 默认值 |
| 24 | 浮起的大卡 | 活力余额大卡 |
| 28 | 胶囊文本框 / 大按钮 | 对话输入框、模态弹窗确认按 |
| 999 | 完全胶囊 | Tab、Chip、状态徽标、主操作 pill |

## 5. Animation

```dart
// 所有曲线统一 easeOutCubic（柔和减速，符合"治愈"调性）
const _curve = Curves.easeOutCubic;

// 时长分级
const _instant = Duration(milliseconds: 160); // 按下/释放等微反馈
const _fast    = Duration(milliseconds: 220); // 颜色淡化、文字渐变
const _normal  = Duration(milliseconds: 280); // 大多数过渡
const _slow    = Duration(milliseconds: 360); // tab/segment 滑动
```

**禁忌**：
- 不要用 `Curves.linear`（机械感太强）
- 不要用 `Curves.bounceOut`/`elasticOut`（治愈风不要弹簧）
- 不要 < 160ms（用户感觉"突变"）或 > 500ms（拖沓）

## 6. Spacing

```dart
const space2  = 2;   // 图标内边距
const space4  = 4;   // 紧凑组件内
const space6  = 6;   // 同行小间距
const space8  = 8;   // 列表项间
const space10 = 10;  // 卡片网格间
const space12 = 12;  // 卡片内段落间
const space14 = 14;  // 卡片之间
const space16 = 16;  // 页面外边距
const space18 = 18;  // 卡片内 padding 默认
const space20 = 20;  // 大卡片 padding
const space24 = 24;  // 大节之间
```

**禁忌**：不要写 `EdgeInsets.all(13)` `EdgeInsets.symmetric(vertical: 7)` 这种数。挑最接近的尺度。

## 7. 系统层

```dart
// main.dart 已配置：
SystemUiOverlayStyle(
  statusBarColor: Colors.transparent,
  statusBarIconBrightness: Brightness.dark,
  systemNavigationBarColor: Color(0xFFF7F5EC),  // 同 bgPage
  systemNavigationBarIconBrightness: Brightness.dark,
);
```

**注意**：背景色变了一定要同步改 `systemNavigationBarColor`，否则 Android 系统底栏会与页面割裂。
