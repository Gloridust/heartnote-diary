import 'dart:io';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/vitality.dart';
import '../providers/settings_provider.dart';
import '../providers/vitality_provider.dart';
import '../theme/colors.dart';
import '../widgets/glass_card.dart';
import 'recharge_page.dart';

class VitalityPage extends StatefulWidget {
  const VitalityPage({super.key});
  @override State<VitalityPage> createState() => _VitalityPageState();
}

class _VitalityPageState extends State<VitalityPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<VitalityProvider>().loadAll();
    });
  }

  @override
  Widget build(BuildContext context) {
    final v = context.watch<VitalityProvider>();
    final s = context.watch<SettingsProvider>();

    // iOS 上才显示 IAP；安卓只看 redeem_code_enabled
    final showIap = Platform.isIOS && s.iapEnabled;
    final showRedeem = s.redeemCodeEnabled;
    final canRecharge = showIap || showRedeem;

    return Scaffold(
      appBar: AppBar(title: const Text('活力值')),
      body: RefreshIndicator(
        onRefresh: () => v.loadAll(),
        color: AppColors.primary,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 30),
          children: [
            // 大余额卡
            Container(
              padding: const EdgeInsets.fromLTRB(22, 24, 22, 22),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFD9C9F2), Color(0xFFB19CD9)],
                  begin: Alignment.topLeft, end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: .3),
                  blurRadius: 18, offset: const Offset(0, 8))],
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                const Text('当前余额',
                  style: TextStyle(color: Colors.white70, fontSize: 13,
                    fontWeight: FontWeight.w500)),
                const SizedBox(height: 6),
                Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Text('${v.balance}',
                    style: const TextStyle(fontSize: 44, fontWeight: FontWeight.w800,
                      color: Colors.white, height: 1)),
                  const SizedBox(width: 4),
                  const Padding(padding: EdgeInsets.only(bottom: 8),
                    child: Icon(Icons.bolt_rounded, size: 24, color: Colors.white)),
                ]),
                const SizedBox(height: 18),
                if (canRecharge)
                  ElevatedButton(
                    onPressed: () => Navigator.push(context,
                      MaterialPageRoute(builder: (_) => const RechargePage())),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: AppColors.primaryDark,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(999)),
                    ),
                    child: const Text('充 值',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700,
                        letterSpacing: 2)),
                  )
                else
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    alignment: Alignment.center,
                    child: const Text('暂未开放充值',
                      style: TextStyle(color: Colors.white70, fontSize: 12)),
                  ),
              ]),
            ),

            const SizedBox(height: 22),
            const Padding(
              padding: EdgeInsets.fromLTRB(6, 0, 6, 10),
              child: Text('使用记录',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary)),
            ),

            if (v.loading && v.history.isEmpty)
              const Padding(padding: EdgeInsets.all(40),
                child: Center(child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation(AppColors.primary)))),
            if (!v.loading && v.history.isEmpty)
              const Padding(padding: EdgeInsets.all(40), child: Center(
                child: Column(children: [
                  Icon(Icons.bolt_rounded, size: 56, color: AppColors.textTertiary),
                  SizedBox(height: 8),
                  Text('暂无记录', style: TextStyle(color: AppColors.textSecondary)),
                ]))),
            for (final d in v.history) _DayRow(day: d),
          ],
        ),
      ),
    );
  }
}

class _DayRow extends StatelessWidget {
  final VitalityDay day;
  const _DayRow({required this.day});
  @override
  Widget build(BuildContext context) {
    final dt = DateTime.tryParse(day.day);
    final label = dt == null ? day.day : DateFormat('M月d日').format(dt);
    final today = DateTime.now();
    final isToday = dt != null
      && dt.year == today.year && dt.month == today.month && dt.day == today.day;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: GlassCard(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        child: Row(children: [
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Text(label, style: const TextStyle(fontSize: 14,
                fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
              if (isToday) Container(
                margin: const EdgeInsets.only(left: 6),
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(color: AppColors.primarySoft,
                  borderRadius: BorderRadius.circular(4)),
                child: const Text('今天', style: TextStyle(fontSize: 10,
                  color: AppColors.primaryDark, fontWeight: FontWeight.w600)),
              ),
            ]),
            const SizedBox(height: 4),
            Text('${day.records} 条记录',
              style: const TextStyle(fontSize: 11, color: AppColors.textTertiary)),
          ]),
          const Spacer(),
          if (day.gained > 0) _Tag(label: '+${day.gained}', positive: true),
          if (day.gained > 0 && day.spent > 0) const SizedBox(width: 6),
          if (day.spent > 0) _Tag(label: '-${day.spent}', positive: false),
        ]),
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  final String label;
  final bool positive;
  const _Tag({required this.label, required this.positive});
  @override
  Widget build(BuildContext context) {
    final c = positive ? AppColors.success : AppColors.danger;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: c.withValues(alpha: .12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.bolt_rounded, size: 12, color: c),
        Text(label,
          style: TextStyle(fontSize: 12, color: c, fontWeight: FontWeight.w700)),
      ]),
    );
  }
}
