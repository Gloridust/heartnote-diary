import 'package:flutter/material.dart';
import '../theme/colors.dart';
import '../utils/haptics.dart';

/// 通用色块滑动 Tab：背景色块用 AnimatedAlign 平滑滑到目标位置。
/// 用法：
/// ```
/// SlidingSegment<int>(
///   value: idx,
///   onChanged: (v) => setState(() => idx = v),
///   items: [
///     SlidingSegmentItem(value: 0, label: '登录'),
///     SlidingSegmentItem(value: 1, label: '注册'),
///   ],
/// )
/// ```
class SlidingSegment<T> extends StatelessWidget {
  final T value;
  final ValueChanged<T> onChanged;
  final List<SlidingSegmentItem<T>> items;

  /// 高度（不含 padding）
  final double height;
  /// 外圈背景
  final Color trackColor;
  /// 滑动色块的渐变
  final Gradient? thumbGradient;
  /// 选中文字颜色
  final Color selectedColor;
  /// 未选中文字颜色
  final Color unselectedColor;
  final TextStyle? textStyle;

  const SlidingSegment({
    super.key,
    required this.value,
    required this.onChanged,
    required this.items,
    this.height = 44,
    this.trackColor = AppColors.bgPage,
    this.thumbGradient,
    this.selectedColor = Colors.white,
    this.unselectedColor = AppColors.textSecondary,
    this.textStyle,
  });

  @override
  Widget build(BuildContext context) {
    final idx = items.indexWhere((e) => e.value == value);
    final selected = idx < 0 ? 0 : idx;
    final ts = textStyle ?? const TextStyle(fontSize: 14, fontWeight: FontWeight.w600);

    return Container(
      height: height + 8,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: trackColor,
        borderRadius: BorderRadius.circular(999),
      ),
      child: LayoutBuilder(
        builder: (_, c) {
          final thumbW = c.maxWidth / items.length;
          return Stack(children: [
            // 滑动色块（绝对定位 + 缓出曲线）
            AnimatedPositioned(
              duration: const Duration(milliseconds: 360),
              curve: Curves.easeOutCubic,
              left: thumbW * selected,
              top: 0,
              width: thumbW,
              height: height,
              child: Container(
                decoration: BoxDecoration(
                  gradient: thumbGradient ?? const LinearGradient(
                    colors: [AppColors.primaryLight, AppColors.primary],
                    begin: Alignment.topLeft, end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(999),
                  boxShadow: [BoxShadow(
                    color: AppColors.primary.withValues(alpha: .25),
                    blurRadius: 10, offset: const Offset(0, 3)),
                  ],
                ),
              ),
            ),
            // 透明文字层
            Row(children: [
              for (int i = 0; i < items.length; i++) Expanded(child:
                _SegmentLabel(
                  item: items[i],
                  active: i == selected,
                  selectedColor: selectedColor,
                  unselectedColor: unselectedColor,
                  textStyle: ts,
                  onTap: () {
                    if (items[i].value != value) {
                      Haptics.tabSwitch();
                      onChanged(items[i].value);
                    }
                  },
                )),
            ]),
          ]);
        },
      ),
    );
  }
}

class SlidingSegmentItem<T> {
  final T value;
  final String label;
  final IconData? icon;
  const SlidingSegmentItem({required this.value, required this.label, this.icon});
}

class _SegmentLabel<T> extends StatelessWidget {
  final SlidingSegmentItem<T> item;
  final bool active;
  final Color selectedColor;
  final Color unselectedColor;
  final TextStyle textStyle;
  final VoidCallback onTap;
  const _SegmentLabel({
    required this.item, required this.active,
    required this.selectedColor, required this.unselectedColor,
    required this.textStyle, required this.onTap,
  });
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Center(
        child: AnimatedDefaultTextStyle(
          duration: const Duration(milliseconds: 240),
          curve: Curves.easeOut,
          style: textStyle.copyWith(color: active ? selectedColor : unselectedColor),
          child: Row(mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (item.icon != null) ...[
                Icon(item.icon, size: 16, color: active ? selectedColor : unselectedColor),
                const SizedBox(width: 4),
              ],
              Text(item.label),
            ]),
        ),
      ),
    );
  }
}
