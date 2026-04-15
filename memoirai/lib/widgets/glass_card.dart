import 'dart:ui';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/colors.dart';

/// 微光拟物卡片：柔和高光 + 深色阴影，带细微渐变
class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final Color? color;
  final bool glow;

  const GlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.radius = 20,
    this.color,
    this.glow = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft, end: Alignment.bottomRight,
          colors: [
            (color ?? AppColors.surface).withValues(alpha: 1),
            (color ?? AppColors.surface).withValues(alpha: .92),
          ],
        ),
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: Colors.white.withValues(alpha: .7), width: 1),
        boxShadow: glow ? Shadows.glow : Shadows.soft,
      ),
      child: child,
    );
  }
}

/// iOS 26 风格悬浮毛玻璃 Tab Bar
class FrostedTabBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;
  final List<FrostedTab> tabs;

  const FrostedTabBar({
    super.key, required this.currentIndex, required this.onTap, required this.tabs,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 18, right: 18,
        bottom: MediaQuery.of(context).padding.bottom + 12,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(999),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
          child: Container(
            height: 64,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: .72),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: Colors.white.withValues(alpha: .7), width: 1),
              boxShadow: const [
                BoxShadow(color: Color(0x1A000000), blurRadius: 28, offset: Offset(0, 10)),
              ],
            ),
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
            child: Row(
              children: List.generate(tabs.length, (i) {
                final active = i == currentIndex;
                return Expanded(
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => onTap(i),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 240),
                      curve: Curves.easeOutCubic,
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      decoration: BoxDecoration(
                        gradient: active
                          ? const LinearGradient(
                              begin: Alignment.topLeft, end: Alignment.bottomRight,
                              colors: [AppColors.primaryLight, AppColors.primary],
                            )
                          : null,
                        borderRadius: BorderRadius.circular(999),
                        boxShadow: active ? const [
                          BoxShadow(color: Color(0x33B19CD9), blurRadius: 12, offset: Offset(0, 4)),
                        ] : null,
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(tabs[i].icon, size: 22,
                            color: active ? Colors.white : AppColors.textSecondary),
                          const SizedBox(height: 2),
                          Text(tabs[i].label,
                            style: TextStyle(
                              fontSize: 11, fontWeight: FontWeight.w600,
                              color: active ? Colors.white : AppColors.textSecondary,
                            )),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }
}

class FrostedTab {
  final IconData icon;
  final String label;
  const FrostedTab(this.icon, this.label);
}
