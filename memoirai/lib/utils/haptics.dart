import 'package:flutter/services.dart';

/// 震动反馈中央调度。统一所有触感反馈的语义和强度，
/// 业务代码只关心"做了什么动作"，不必记 light/medium/heavy 该选哪个。
///
/// 设计原则：
///   1. 节制 — 治愈风应用不该让手一直在抖。仅在用户的主动动作或重要的系统反馈时触发。
///   2. 强度递进 — 切换 < 点击 < 状态变更 < 警告
///   3. 桌面/Web 平台 Flutter 自动 no-op，不需要平台判断
class Haptics {
  Haptics._();

  // ====== 切换类（最轻） ======
  /// Tab 切换、segment 切换、单选项选中等
  static void tabSwitch() => HapticFeedback.selectionClick();

  /// 列表/页面滚动到边界等"到位"反馈
  static void boundary() => HapticFeedback.selectionClick();

  // ====== 点击类（轻） ======
  /// 普通按钮点击、发送消息、保存日记、点击 chip 等
  static void tap() => HapticFeedback.lightImpact();

  // ====== 状态变更（中） ======
  /// 长按录音开始、AI 生成日记草稿完成、兑换成功等"事件发生"
  static void event() => HapticFeedback.mediumImpact();

  // ====== 警告 / 撤销（重） ======
  /// 录音上滑取消、删除确认、错误反馈
  static void warning() => HapticFeedback.heavyImpact();

  // ====== 复合：成功 / 失败 ======
  /// 一次轻击表示"完成"，配合 SnackBar 用
  static void success() => HapticFeedback.lightImpact();

  /// 双击重击表示"失败 / 拒绝"
  static Future<void> error() async {
    await HapticFeedback.heavyImpact();
    await Future.delayed(const Duration(milliseconds: 90));
    await HapticFeedback.heavyImpact();
  }

  // ====== AI 专属 ======
  /// LLM 一段对话回复送达 — 用最轻的 selectionClick 提示用户"AI 说完了"
  static void aiReplyReceived() => HapticFeedback.selectionClick();

  /// AI 生成完整日记草稿出现 — 比普通回复更重要，用 medium
  static void aiDraftReady() => HapticFeedback.mediumImpact();
}
