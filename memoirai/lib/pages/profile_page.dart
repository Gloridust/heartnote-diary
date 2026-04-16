import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/diary.dart';
import '../providers/auth_provider.dart';
import '../providers/diary_provider.dart';
import '../providers/vitality_provider.dart';
import '../theme/colors.dart';
import '../widgets/glass_card.dart';
import '../widgets/sliding_segment.dart';
import 'settings_page.dart';
import 'vitality_page.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});
  @override State<ProfilePage> createState() => _ProfilePageState();
}

enum _Range { d3, d7, d30 }

class _ProfilePageState extends State<ProfilePage> {
  _Range _range = _Range.d7;

  int get _days => switch (_range) {
    _Range.d3 => 3, _Range.d7 => 7, _Range.d30 => 30,
  };

  List<DiaryEntry> _filtered(List<DiaryEntry> all) {
    final cutoff = DateTime.now().subtract(Duration(days: _days));
    return all.where((e) => e.date.isAfter(cutoff)).toList();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final diary = context.watch<DiaryProvider>();
    final vitality = context.watch<VitalityProvider>();
    final filtered = _filtered(diary.entries);

    return SafeArea(
      bottom: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // === 固定标题栏 ===
          Padding(
            padding: const EdgeInsets.fromLTRB(22, 14, 22, 8),
            child: Row(children: [
              const Expanded(
                child: Text('我的声迹',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary)),
              ),
              _RoundIconButton(
                icon: Icons.settings_outlined,
                onTap: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const SettingsPage())),
              ),
            ]),
          ),

          // === 滚动内容 ===
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 140),
              children: [
                _ProfileHeader(
                  name: auth.user?.nickname ?? '—',
                  uid: auth.user?.id ?? 0,
                ),
                const SizedBox(height: 14),
                _VitalityCard(
                  balance: vitality.balance,
                  onTap: () => Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const VitalityPage())),
                ),
                const SizedBox(height: 22),
                _RangeTabs(current: _range, onChange: (r) => setState(() => _range = r)),
                const SizedBox(height: 14),
                _StatsGrid(entries: filtered, total: diary.entries.length),
                const SizedBox(height: 18),
                _MoodTrend(entries: filtered),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _RoundIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _RoundIconButton({required this.icon, required this.onTap});
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40, height: 40,
        decoration: BoxDecoration(
          color: AppColors.surface,
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.border),
          boxShadow: const [
            BoxShadow(color: Color(0x0A000000), blurRadius: 8, offset: Offset(0, 2)),
          ],
        ),
        child: Icon(icon, size: 20, color: AppColors.textSecondary),
      ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  final String name;
  final int uid;
  const _ProfileHeader({required this.name, required this.uid});

  @override
  Widget build(BuildContext context) {
    // 不用 GlassCard — 直接 Container 模拟同样视觉，避免 ListView 头部位置潜在 sizing 异常
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border, width: 1),
        boxShadow: const [
          BoxShadow(color: Color(0x14000000), blurRadius: 22, offset: Offset(0, 8)),
          BoxShadow(color: Color(0x08000000), blurRadius: 4, offset: Offset(0, 1)),
        ],
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
        // 头像
        Container(
          width: 60, height: 60,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [AppColors.primaryLight, AppColors.primary],
              begin: Alignment.topLeft, end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: .3),
              blurRadius: 14, offset: const Offset(0, 5))],
          ),
          child: Center(
            child: Text(name.isEmpty ? '—' : name.characters.first,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700,
                color: Colors.white)),
          ),
        ),
        const SizedBox(width: 14),
        Expanded(child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700,
              color: AppColors.textPrimary), maxLines: 1, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: AppColors.primarySoft,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                const Icon(Icons.tag_rounded, size: 12, color: AppColors.primaryDark),
                const SizedBox(width: 2),
                Text('$uid', style: const TextStyle(fontSize: 11,
                  fontWeight: FontWeight.w600, color: AppColors.primaryDark)),
              ]),
            ),
          ])),
      ]),
    );
  }
}

class _VitalityCard extends StatelessWidget {
  final int balance;
  final VoidCallback onTap;
  const _VitalityCard({required this.balance, required this.onTap});
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 16, 16, 16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFFD9C9F2), Color(0xFFB19CD9)],
            begin: Alignment.topLeft, end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: .3),
            blurRadius: 16, offset: const Offset(0, 6))],
        ),
        child: Row(children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: .25),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.bolt_rounded, color: Colors.white, size: 26),
          ),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('活力值',
                style: TextStyle(fontSize: 13, color: Colors.white70,
                  fontWeight: FontWeight.w500)),
              const SizedBox(height: 2),
              Text('$balance',
                style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w700,
                  color: Colors.white, height: 1.1)),
            ])),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: .25),
              borderRadius: BorderRadius.circular(999),
            ),
            child: const Row(mainAxisSize: MainAxisSize.min, children: [
              Text('查看 / 充值',
                style: TextStyle(fontSize: 12, color: Colors.white,
                  fontWeight: FontWeight.w600)),
              SizedBox(width: 2),
              Icon(Icons.chevron_right_rounded, color: Colors.white, size: 16),
            ]),
          ),
        ]),
      ),
    );
  }
}

class _RangeTabs extends StatelessWidget {
  final _Range current;
  final ValueChanged<_Range> onChange;
  const _RangeTabs({required this.current, required this.onChange});
  @override
  Widget build(BuildContext context) {
    return SlidingSegment<_Range>(
      value: current,
      onChanged: onChange,
      trackColor: AppColors.surface,
      items: const [
        SlidingSegmentItem(value: _Range.d3, label: '3 天'),
        SlidingSegmentItem(value: _Range.d7, label: '7 天'),
        SlidingSegmentItem(value: _Range.d30, label: '30 天'),
      ],
    );
  }
}

class _StatsGrid extends StatelessWidget {
  final List<DiaryEntry> entries;
  final int total;
  const _StatsGrid({required this.entries, required this.total});

  @override
  Widget build(BuildContext context) {
    final withScore = entries.where((e) => e.score != null).toList();
    final avg = withScore.isEmpty ? 0.0
      : withScore.map((e) => e.score!).reduce((a,b)=>a+b) / withScore.length;
    final totalWords = entries.fold<int>(0, (a, e) => a + e.content.length);
    final tagCount = <String, int>{};
    for (final e in entries) {
      if (e.tag != null) tagCount[e.tag!] = (tagCount[e.tag!] ?? 0) + 1;
    }
    String favTag = '—';
    if (tagCount.isNotEmpty) {
      final top = tagCount.entries.reduce((a, b) => a.value >= b.value ? a : b);
      favTag = DiaryEntry.tagTitles[top.key] ?? top.key;
    }
    final streak = _calcStreak(entries);

    final items = <_StatItem>[
      _StatItem(Icons.edit_note_rounded,        const Color(0xFFB19CD9), '$total', '总日记数'),
      _StatItem(Icons.favorite_rounded,         const Color(0xFFE89AB6), avg.toStringAsFixed(1), '平均心情'),
      _StatItem(Icons.local_fire_department_rounded, const Color(0xFFE8A87C), '$streak', '连续天数'),
      _StatItem(Icons.local_offer_rounded,      const Color(0xFF9DC4D9), favTag, '常见标签'),
      _StatItem(Icons.text_snippet_rounded,     const Color(0xFFA8C7A0), _kCompact(totalWords), '总字数'),
      _StatItem(Icons.calendar_month_rounded,   const Color(0xFFC9B89A), '${entries.length}', '本时段'),
    ];

    return GridView.count(
      crossAxisCount: 3,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: .92,
      children: items.map((it) => GlassCard(
        padding: const EdgeInsets.fromLTRB(10, 14, 10, 12),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Container(
            width: 38, height: 38,
            decoration: BoxDecoration(
              color: it.color.withValues(alpha: .15),
              shape: BoxShape.circle,
            ),
            child: Icon(it.icon, color: it.color, size: 20),
          ),
          const SizedBox(height: 8),
          Text(it.value, maxLines: 1, overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700,
              color: AppColors.textPrimary)),
          const SizedBox(height: 2),
          Text(it.label,
            style: const TextStyle(fontSize: 11, color: AppColors.textTertiary)),
        ]),
      )).toList(),
    );
  }

  static String _kCompact(int n) {
    if (n >= 10000) return '${(n / 1000).toStringAsFixed(1)}k';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}k';
    return '$n';
  }

  int _calcStreak(List<DiaryEntry> all) {
    if (all.isEmpty) return 0;
    final keys = all.map((e) => e.dateKey).toSet();
    int streak = 0;
    var d = DateTime.now();
    while (true) {
      final k = '${d.year}-${d.month.toString().padLeft(2,'0')}-${d.day.toString().padLeft(2,'0')}';
      if (keys.contains(k)) { streak++; d = d.subtract(const Duration(days: 1)); }
      else break;
    }
    return streak;
  }
}

class _StatItem {
  final IconData icon;
  final Color color;
  final String value;
  final String label;
  _StatItem(this.icon, this.color, this.value, this.label);
}

class _MoodTrend extends StatelessWidget {
  final List<DiaryEntry> entries;
  const _MoodTrend({required this.entries});

  @override
  Widget build(BuildContext context) {
    final pts = entries.where((e) => e.score != null).toList()
      ..sort((a, b) => a.date.compareTo(b.date));
    return GlassCard(
      padding: const EdgeInsets.all(18),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 32, height: 32,
            decoration: BoxDecoration(
              color: AppColors.primarySoft,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.show_chart_rounded,
              color: AppColors.primaryDark, size: 18),
          ),
          const SizedBox(width: 10),
          const Text('心情趋势',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700,
              color: AppColors.textPrimary)),
        ]),
        const SizedBox(height: 14),
        SizedBox(height: 180, child: pts.length < 2
          ? Center(child: Text(pts.isEmpty ? '暂无数据' : '至少 2 条才能画趋势',
              style: const TextStyle(color: AppColors.textTertiary, fontSize: 13)))
          : LineChart(LineChartData(
              minY: 0, maxY: 10,
              gridData: const FlGridData(show: false),
              titlesData: FlTitlesData(
                leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                bottomTitles: AxisTitles(sideTitles: SideTitles(
                  showTitles: true, reservedSize: 22,
                  interval: (pts.length / 4).clamp(1, 100).toDouble(),
                  getTitlesWidget: (v, _) {
                    final i = v.toInt();
                    if (i < 0 || i >= pts.length) return const SizedBox();
                    return Text('${pts[i].date.month}/${pts[i].date.day}',
                      style: const TextStyle(fontSize: 10, color: AppColors.textTertiary));
                  },
                )),
              ),
              borderData: FlBorderData(show: false),
              lineBarsData: [LineChartBarData(
                isCurved: true, curveSmoothness: .3,
                barWidth: 3, color: AppColors.primary,
                dotData: FlDotData(show: true, getDotPainter: (spot, _, __, ___) {
                  return FlDotCirclePainter(
                    radius: 3.5, color: AppColors.moodColor(spot.y.round()),
                    strokeColor: Colors.white, strokeWidth: 1.5);
                }),
                belowBarData: BarAreaData(show: true, gradient: LinearGradient(
                  begin: Alignment.topCenter, end: Alignment.bottomCenter,
                  colors: [AppColors.primary.withValues(alpha: .3),
                    AppColors.primary.withValues(alpha: 0)])),
                spots: [for (int i = 0; i < pts.length; i++)
                  FlSpot(i.toDouble(), pts[i].score!.toDouble())],
              )],
            ))),
      ]),
    );
  }
}
