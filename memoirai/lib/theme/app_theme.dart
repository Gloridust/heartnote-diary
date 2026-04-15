import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'colors.dart';

class AppTheme {
  static ThemeData light() {
    final base = ThemeData.light(useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: AppColors.bgPage,
      colorScheme: const ColorScheme.light(
        primary: AppColors.primary,
        onPrimary: Colors.white,
        secondary: AppColors.primaryDark,
        surface: AppColors.surface,
        onSurface: AppColors.textPrimary,
      ),
      textTheme: GoogleFonts.notoSansScTextTheme(base.textTheme).copyWith(
        headlineMedium: GoogleFonts.notoSerifSc(
          fontSize: 24, fontWeight: FontWeight.w600, color: AppColors.textPrimary,
        ),
        titleLarge: GoogleFonts.notoSansSc(
          fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.textPrimary,
        ),
        bodyLarge: const TextStyle(
          fontSize: 16, height: 1.6, color: AppColors.textPrimary,
        ),
        bodyMedium: const TextStyle(
          fontSize: 14, height: 1.5, color: AppColors.textSecondary,
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        iconTheme: IconThemeData(color: AppColors.textPrimary),
        titleTextStyle: TextStyle(
          color: AppColors.textPrimary, fontSize: 18, fontWeight: FontWeight.w600,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.border, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
        hintStyle: const TextStyle(color: AppColors.textTertiary),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}

/// 微光拟物通用阴影 — 上提层
class Shadows {
  static const List<BoxShadow> soft = [
    BoxShadow(color: Color(0x0D000000), blurRadius: 20, offset: Offset(0, 6)),
    BoxShadow(color: Color(0x08000000), blurRadius: 4,  offset: Offset(0, 1)),
  ];

  /// 微光高光（顶部亮斑，营造温润感）
  static const List<BoxShadow> glow = [
    BoxShadow(color: Color(0xFFFFFFFF), blurRadius: 0, offset: Offset(0, -1), spreadRadius: 0),
    BoxShadow(color: Color(0x14000000), blurRadius: 24, offset: Offset(0, 8)),
  ];

  /// 凹陷（按钮按下 / 输入区）
  static const List<BoxShadow> sunk = [
    BoxShadow(color: Color(0x0A000000), blurRadius: 6, offset: Offset(0, 2), spreadRadius: -2),
  ];
}
