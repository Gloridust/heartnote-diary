# 震动反馈细则

权威实现：`lib/utils/haptics.dart`。

## 核心原则

> **节制 > 丰富。** 治愈风应用的手感不该像游戏机。

四条铁律：

1. **只在用户主动动作或重要状态变更时震**。滚动、悬停、键盘输入字符 → 不震。
2. **强度递进**：切换 < 点击 < 状态变更 < 警告。
3. **去抖**：连续滑动只在第一次跨阈值时震。同一动作短时间内不重复震。
4. **业务代码不直接调 `HapticFeedback.xxx`**，永远走 `Haptics` 工具类。

## 6 种语义 × 用法对照

| 语义 | 方法 | 底层调用 | 用在哪 |
|---|---|---|---|
| 切换 | `Haptics.tabSwitch()` | `selectionClick` | Tab、Segment、单选切换 |
| 边界 | `Haptics.boundary()` | `selectionClick` | 滚动到顶/到底（一般不用，flutter 默认有） |
| 点击 | `Haptics.tap()` | `lightImpact` | 主操作按钮、发送、保存 |
| 事件 | `Haptics.event()` | `mediumImpact` | 长按录音开始、AI 草稿生成、兑换成功 |
| 警告 | `Haptics.warning()` | `heavyImpact` | 上滑取消录音、删除、活力不足 |
| 成功 | `Haptics.success()` | `lightImpact` | 保存成功（与 SnackBar 同时） |
| 失败 | `Haptics.error()` | 双 heavy 间隔 90ms | 仅在严重错误时（一般不用，warning 即可） |
| AI 回复送达 | `Haptics.aiReplyReceived()` | `selectionClick` | LLM continue 模式回复返回 |
| AI 草稿就绪 | `Haptics.aiDraftReady()` | `mediumImpact` | LLM end 模式生成完整日记草稿 |

## 已接入的位点

| 位点 | 文件 | 触发 |
|---|---|---|
| 底部 Tab 切换 | `lib/pages/main_shell.dart` | `Haptics.tabSwitch()` |
| 滑动 segment 切换 | `lib/widgets/sliding_segment.dart` | `Haptics.tabSwitch()`（已内置） |
| 长按麦克风开始 | `lib/widgets/voice_input.dart::_start` | `Haptics.event()` |
| 上滑跨过取消阈值 | `lib/widgets/voice_input.dart::_onMove` | `Haptics.warning()` |
| 文字发送（点击送出按钮 / 回车） | `lib/widgets/voice_input.dart::_submitText` | `Haptics.tap()` |
| AI 回复送达（continue） | `lib/providers/chat_provider.dart::_runChat` | `Haptics.aiReplyReceived()` |
| AI 草稿生成（end） | 同上 | `Haptics.aiDraftReady()` |
| 活力不足 | 同上 | `Haptics.warning()` |
| 通用错误（chat 失败） | 同上 | `Haptics.warning()` |
| 保存日记 — 点击 | `lib/pages/home_page.dart::_DraftCardState._save` | `Haptics.tap()` |
| 保存日记 — 成功 | 同上 | `Haptics.success()` |
| 保存日记 — 失败 | 同上 | `Haptics.warning()` |

## 可以加但还没加的位点（按需）

| 位点 | 推荐 | 理由 |
|---|---|---|
| 删除日记确认 | `Haptics.warning()` | 危险操作 |
| 兑换码兑换成功 | `Haptics.success()` | 庆祝感 |
| 修改密码成功 | `Haptics.success()` | 完成感 |
| 长按消息（如复制） | `Haptics.tap()` | 选中反馈 |
| 注销账户最终确认 | `Haptics.warning()` | 危险操作 |

## 平台行为差异

Flutter 的 `HapticFeedback` 在不同平台行为：

- **iOS**：使用 `UIImpactFeedbackGenerator` / `UISelectionFeedbackGenerator`，触感非常细腻、可感知差异
- **Android**：使用 `View.performHapticFeedback()` + `HapticFeedbackConstants`
  - 部分老设备/部分厂商 ROM 会忽略 `selectionClick`
  - 用户在系统设置里关了"触摸振动"会全部静音
- **Web / Desktop**：自动 no-op，不会报错也不会震，无需平台判断

**安卓权限**：`HapticFeedback.lightImpact / mediumImpact / heavyImpact / selectionClick` 走 `HapticFeedbackConstants`，**不需要 VIBRATE 权限**。我们没有调 `HapticFeedback.vibrate()`（那个才需要权限）。

## 反例

```dart
// ❌ 不要直接调 HapticFeedback
HapticFeedback.lightImpact();
// ✅ 走 Haptics 工具类（语义清晰，便于全局调整强度）
Haptics.tap();

// ❌ 给滚动加震动
ListView(controller: ctrl)
ctrl.addListener(() => HapticFeedback.lightImpact()); // 一秒抖几十次
// ✅ 不加。滚动反馈用视觉（顶部 stretch 效果）就够了

// ❌ 长按手势的每帧 onLongPressMoveUpdate 里都震
onLongPressMoveUpdate: (d) => Haptics.warning();
// ✅ 只在跨过阈值瞬间震一次
if (cancel != _willCancel) {
  if (cancel) Haptics.warning();
}

// ❌ AI 流式输出每个 token 都震
void onToken(String t) => Haptics.aiReplyReceived();
// ✅ 只在整段回复收到时震一次
void onComplete() => Haptics.aiReplyReceived();
```

## 未来扩展

如果以后用户反馈"震太多"或"想关掉震动"：

1. 加一个 `lib/services/preferences.dart::hapticsEnabled` 开关，存 SharedPreferences
2. 改 `Haptics` 工具类的每个方法，调 `HapticFeedback` 之前判断这个开关
3. 在「我的 → 设置」里加 toggle

不要改业务代码 — 业务代码继续调 `Haptics.tap()` 等，工具类内部决定要不要真震。
