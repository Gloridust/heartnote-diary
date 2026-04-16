import 'dart:ui';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/colors.dart';

/// 微光拟物卡片 — Liquid Glass 风
/// 关键三层（用嵌套 Container 替代 Stack，避免 ListView 里 sizing 失效）：
///   1. 主体垂直渐变（从亮到稍暗，模拟玻璃光散射）
///   2. 内层 1px 白色高光描边
///   3. 双层阴影（顶部 1px 高光 + 底部柔阴影）
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
    final base = color ?? AppColors.surface;
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter, end: Alignment.bottomCenter,
          colors: [
            base,
            Color.lerp(base, AppColors.bgPageAlt, .15)!,
          ],
        ),
        borderRadius: BorderRadius.circular(radius),
        // 边框：用 borderStrong（米色调）而不是纯白，
        // 因为纯白在米色背景上会"融"看不清
        border: Border.all(color: AppColors.border, width: 1),
        boxShadow: glow ? Shadows.glow : Shadows.soft,
      ),
      child: Padding(padding: padding, child: child),
    );
  }
}

/// iOS 26 风格悬浮毛玻璃 Tab Bar — 选中色块平滑滑到目标位置
class FrostedTabBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;
  final List<FrostedTab> tabs;

  const FrostedTabBar({
    super.key, required this.currentIndex, required this.onTap, required this.tabs,
  });

  @override
  Widget build(BuildContext context) {
    final selected = currentIndex.clamp(0, tabs.length - 1);
    const barHeight = 68.0;
    const innerPad = 7.0;
    final thumbHeight = barHeight - innerPad * 2;

    return Padding(
      padding: EdgeInsets.only(
        left: 18, right: 18,
        bottom: MediaQuery.of(context).padding.bottom + 12,
      ),
      child: SizedBox(
        height: barHeight,
        child: Stack(clipBehavior: Clip.none, children: [
          // 毛玻璃外壳
          Positioned.fill(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: .72),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: Colors.white.withValues(alpha: .7), width: 1),
                    boxShadow: const [
                      BoxShadow(color: Color(0x1A000000), blurRadius: 28, offset: Offset(0, 10)),
                    ],
                  ),
                ),
              ),
            ),
          ),
          // 内层：内边距 + 滑块 + 文字
          Padding(
            padding: const EdgeInsets.all(innerPad),
            child: LayoutBuilder(
              builder: (_, c) {
                final thumbW = c.maxWidth / tabs.length;
                return Stack(clipBehavior: Clip.none, children: [
                  // 滑动色块（垂直居中、固定 thumbHeight）
                  AnimatedPositioned(
                    duration: const Duration(milliseconds: 360),
                    curve: Curves.easeOutCubic,
                    left: thumbW * selected,
                    top: 0,
                    bottom: 0,
                    width: thumbW,
                    child: Container(
                      height: thumbHeight,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft, end: Alignment.bottomRight,
                          colors: [AppColors.primaryLight, AppColors.primary],
                        ),
                        borderRadius: BorderRadius.circular(999),
                        boxShadow: [
                          BoxShadow(color: AppColors.primary.withValues(alpha: .35),
                            blurRadius: 14, offset: const Offset(0, 5)),
                        ],
                      ),
                    ),
                  ),
                  // 文字层
                  Positioned.fill(
                    child: Row(children: List.generate(tabs.length, (i) {
                      final active = i == selected;
                      final color = active ? Colors.white : AppColors.textSecondary;
                      return Expanded(child: GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTap: () => onTap(i),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            TweenAnimationBuilder<Color?>(
                              duration: const Duration(milliseconds: 280),
                              curve: Curves.easeOut,
                              tween: ColorTween(end: color),
                              builder: (_, c, __) => Icon(tabs[i].icon, size: 22, color: c),
                            ),
                            const SizedBox(height: 2),
                            AnimatedDefaultTextStyle(
                              duration: const Duration(milliseconds: 280),
                              style: TextStyle(
                                fontSize: 11, fontWeight: FontWeight.w600,
                                color: color,
                              ),
                              child: Text(tabs[i].label),
                            ),
                          ],
                        ),
                      ));
                    })),
                  ),
                ]);
              },
            ),
          ),
        ]),
      ),
    );
  }
}

class FrostedTab {
  final IconData icon;
  final String label;
  const FrostedTab(this.icon, this.label);
}
