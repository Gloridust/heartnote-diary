import 'package:flutter/material.dart';

/// 微光拟物治愈风调色板 — v2
/// 设计原则：
///   1. 底色温暖偏米，营造治愈感（不变）
///   2. 强调色用更深的薰衣草紫，确保按钮/文字/链接对比度 ≥ 4.5:1（WCAG AA）
///   3. 文字三层但最浅一层避免承载关键信息
///   4. iOS 26 Liquid Glass 风格 — 玻璃感只用在卡片边缘、tab、悬浮按钮，
///      不作为主背景，避免长文阅读疲劳
class AppColors {
  // ============ Primary (薰衣草紫，加深以满足 AA 对比度) ============
  /// 主色 — 用于按钮背景、强调标签等大色块
  static const primary = Color(0xFF7A5FB8);
  /// 主色加深 — 用于按钮按下、文字链接、激活状态文字
  static const primaryDark = Color(0xFF5E3FA0);
  /// 主色变浅 — 用于渐变高光端
  static const primaryLight = Color(0xFFA890DD);
  /// 主色超浅 — 用于柔和背景（标签、状态徽标）
  static const primarySoft = Color(0xFFEDE5FA);
  /// 主色背景着色（卡片偏紫淡背景）
  static const primaryTint = Color(0xFFF4EFFC);

  // ============ 背景 ============
  /// 主页面温暖米色底
  static const bgPage = Color(0xFFF7F5EC);
  /// 次级背景（嵌套区域）
  static const bgPageAlt = Color(0xFFF2EFE4);

  // ============ 表面（卡片） ============
  /// 卡片底，偏暖白
  static const surface = Color(0xFFFFFCF4);
  /// 浮起卡片
  static const surfaceElev = Color(0xFFFFFFFF);
  /// 凹陷区（输入框灰底）
  static const surfaceSunk = Color(0xFFEEEAD8);

  // ============ 文字 ============
  /// 主要文字
  static const textPrimary = Color(0xFF1F1B2E);
  /// 次要文字
  static const textSecondary = Color(0xFF5C5670);
  /// 三级文字
  static const textTertiary = Color(0xFF8E889E);
  /// 反白
  static const textInverse = Color(0xFFFFFFFF);

  // ============ 边框 / 分割 ============
  static const border = Color(0xFFEDE8D8);
  static const borderStrong = Color(0xFFD8D0B5);
  static const divider = Color(0x14000000);

  // ============ 心情色（柔和但更饱和，便于一眼识别） ============
  static const mood10 = Color(0xFF5FBE8A); // 😊 很好
  static const mood7  = Color(0xFF8DC9A4); // 🙂 不错
  static const mood5  = Color(0xFFE3C588); // 😐 平静
  static const mood3  = Color(0xFFE39E72); // 😔 低落
  static const mood1  = Color(0xFFD27575); // 😢 难过

  static Color moodColor(int score) {
    if (score >= 8) return mood10;
    if (score >= 6) return mood7;
    if (score >= 4) return mood5;
    if (score >= 2) return mood3;
    return mood1;
  }

  static String moodEmoji(int score) {
    if (score >= 8) return '😊';
    if (score >= 6) return '🙂';
    if (score >= 4) return '😐';
    if (score >= 2) return '😔';
    return '😢';
  }

  // ============ 语义色 ============
  static const success = Color(0xFF4FA374);
  static const danger  = Color(0xFFD15555);
  static const warning = Color(0xFFD68F3F);
}
