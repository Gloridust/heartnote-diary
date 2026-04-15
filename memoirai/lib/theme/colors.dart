import 'package:flutter/material.dart';

/// 微光拟物治愈风调色板
/// 主色：柔和紫 / 暖米白，强调温度与呼吸感
class AppColors {
  // Primary - 薰衣草紫
  static const primary = Color(0xFFB19CD9);
  static const primaryLight = Color(0xFFD4C7E8);
  static const primaryDark = Color(0xFF9B7FC7);
  static const primarySoft = Color(0xFFE8E0F7);

  // 背景 - 米白偏暖
  static const bgPage = Color(0xFFF7F5EC);
  static const bgPageAlt = Color(0xFFF2EFE4);

  // 表面
  static const surface = Color(0xFFFFFCF4);
  static const surfaceElev = Color(0xFFFFFFFF);
  static const surfaceSunk = Color(0xFFEEEAD8);

  // 文字
  static const textPrimary = Color(0xFF2D2A3A);
  static const textSecondary = Color(0xFF7A7788);
  static const textTertiary = Color(0xFFB3B0BD);
  static const textInverse = Color(0xFFFFFFFF);

  // 边框 / 分割
  static const border = Color(0xFFEDE8D8);
  static const divider = Color(0x14000000);

  // 心情色（柔和版）
  static const mood10 = Color(0xFF7DD3A8); // 😊 很好
  static const mood7  = Color(0xFFA8D5BA); // 🙂 不错
  static const mood5  = Color(0xFFEAD5A8); // 😐 平静
  static const mood3  = Color(0xFFE8B48D); // 😔 低落
  static const mood1  = Color(0xFFD99292); // 😢 难过

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

  // 语义
  static const success = Color(0xFF7DB89A);
  static const danger  = Color(0xFFE57373);
  static const warning = Color(0xFFE5B97D);
}
