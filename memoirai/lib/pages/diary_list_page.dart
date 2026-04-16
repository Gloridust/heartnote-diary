import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/diary.dart';
import '../providers/diary_provider.dart';
import '../theme/colors.dart';
import '../widgets/glass_card.dart';
import 'diary_detail_page.dart';

class DiaryListPage extends StatefulWidget {
  const DiaryListPage({super.key});
  @override State<DiaryListPage> createState() => _DiaryListPageState();
}

class _DiaryListPageState extends State<DiaryListPage> {
  DateTime _month = DateTime.now();
  DateTime? _selected;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final p = context.read<DiaryProvider>();
      if (p.entries.isEmpty) p.load();
    });
  }

  void _prev() => setState(() => _month = DateTime(_month.year, _month.month - 1));
  void _next() => setState(() => _month = DateTime(_month.year, _month.month + 1));

  @override
  Widget build(BuildContext context) {
    final diary = context.watch<DiaryProvider>();

    // 初次进入自动选中最新有日记的那天
    if (_selected == null && diary.entries.isNotEmpty) {
      _selected = diary.entries.first.date;
      _month = DateTime(_selected!.year, _selected!.month);
    }

    return SafeArea(
      bottom: false,
      child: RefreshIndicator(
        onRefresh: () => diary.load(),
        color: AppColors.primary,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 120),
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(6, 4, 6, 14),
              child: Text('日记本',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary)),
            ),
            GlassCard(
              padding: const EdgeInsets.fromLTRB(14, 16, 14, 14),
              child: Column(children: [
                Row(children: [
                  IconButton(onPressed: _prev,
                    icon: const Icon(Icons.chevron_left_rounded, color: AppColors.textSecondary)),
                  Expanded(child: Center(child: Text(
                    DateFormat('yyyy 年 MM 月', 'zh').format(_month),
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary)))),
                  IconButton(onPressed: _next,
                    icon: const Icon(Icons.chevron_right_rounded, color: AppColors.textSecondary)),
                ]),
                const SizedBox(height: 4),
                _Weekdays(),
                const SizedBox(height: 8),
                _MonthGrid(
                  month: _month, selected: _selected,
                  diary: diary,
                  onTap: (d) => setState(() => _selected = d),
                ),
                if (diary.entries.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  _MoodLegend(),
                ],
              ]),
            ),
            const SizedBox(height: 18),
            if (_selected != null) _buildDayList(diary),
            if (diary.entries.isEmpty && !diary.loading) _EmptyState(),
          ],
        ),
      ),
    );
  }

  Widget _buildDayList(DiaryProvider diary) {
    final day = _selected!;
    final items = diary.onDate(day);
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(6, 0, 6, 10),
        child: Text(DateFormat('yyyy 年 M 月 d 日').format(day),
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600,
            color: AppColors.textPrimary)),
      ),
      if (items.isEmpty)
        Padding(
          padding: const EdgeInsets.all(24),
          child: Center(child: Text('这一天没有日记',
            style: TextStyle(color: AppColors.textTertiary, fontSize: 13))),
        )
      else
        for (final e in items) _DiaryCard(entry: e),
    ]);
  }
}

class _Weekdays extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    return Row(children: days.map((d) => Expanded(
      child: Center(child: Text(d,
        style: const TextStyle(fontSize: 12, color: AppColors.textTertiary,
          fontWeight: FontWeight.w600))),
    )).toList());
  }
}

class _MonthGrid extends StatelessWidget {
  final DateTime month;
  final DateTime? selected;
  final DiaryProvider diary;
  final ValueChanged<DateTime> onTap;

  const _MonthGrid({
    required this.month, required this.selected,
    required this.diary, required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final firstWeekday = DateTime(month.year, month.month, 1).weekday % 7; // Sun=0
    final daysInMonth = DateTime(month.year, month.month + 1, 0).day;
    final cells = <Widget>[];
    for (int i = 0; i < firstWeekday; i++) cells.add(const SizedBox());
    for (int d = 1; d <= daysInMonth; d++) {
      final date = DateTime(month.year, month.month, d);
      final avg = diary.averageScoreOn(date);
      final isSelected = selected != null &&
        selected!.year == date.year && selected!.month == date.month && selected!.day == date.day;

      Color? bg;
      Color textColor = AppColors.textPrimary;
      if (avg != null) {
        bg = AppColors.moodColor(avg.round());
        textColor = Colors.white;
      }

      cells.add(GestureDetector(
        onTap: () => onTap(date),
        behavior: HitTestBehavior.opaque,
        child: Center(
          child: Container(
            margin: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              color: bg,
              shape: BoxShape.circle,
              border: isSelected ? Border.all(color: AppColors.primaryDark, width: 2) : null,
              boxShadow: bg != null ? [BoxShadow(
                color: bg.withValues(alpha: .4), blurRadius: 8, offset: const Offset(0, 2))] : null,
            ),
            alignment: Alignment.center,
            child: Text('$d',
              style: TextStyle(
                fontSize: 13, fontWeight: FontWeight.w600,
                color: bg != null ? textColor : AppColors.textPrimary)),
          ),
        ),
      ));
    }
    return GridView.count(
      crossAxisCount: 7,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1,
      children: cells,
    );
  }
}

class _MoodLegend extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    const items = [
      (9, '😊 很好'),
      (7, '🙂 不错'),
      (5, '😐 平静'),
      (3, '😔 低落'),
      (1, '😢 难过'),
    ];
    return Wrap(spacing: 10, runSpacing: 6, alignment: WrapAlignment.center,
      children: items.map((it) => Row(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 10, height: 10, decoration: BoxDecoration(
          color: AppColors.moodColor(it.$1), shape: BoxShape.circle)),
        const SizedBox(width: 5),
        Text(it.$2, style: const TextStyle(fontSize: 11, color: AppColors.textTertiary)),
      ])).toList(),
    );
  }
}

class _DiaryCard extends StatelessWidget {
  final DiaryEntry entry;
  const _DiaryCard({required this.entry});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GestureDetector(
        onTap: () => Navigator.push(context, MaterialPageRoute(
          builder: (_) => DiaryDetailPage(entry: entry))),
        child: GlassCard(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text(entry.title,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary), maxLines: 1, overflow: TextOverflow.ellipsis)),
              Text(entry.timeLabel,
                style: const TextStyle(fontSize: 12, color: AppColors.textTertiary)),
            ]),
            const SizedBox(height: 8),
            Row(children: [
              if (entry.score != null) ...[
                Text(AppColors.moodEmoji(entry.score!),
                  style: const TextStyle(fontSize: 13)),
                const SizedBox(width: 4),
                Text('${entry.score} / 10',
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                const SizedBox(width: 8),
              ],
              if (entry.tag != null) Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.primarySoft, borderRadius: BorderRadius.circular(999)),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.local_offer_rounded, size: 10,
                    color: AppColors.primaryDark),
                  const SizedBox(width: 3),
                  Text(entry.tagTitle,
                    style: const TextStyle(fontSize: 11, color: AppColors.primaryDark,
                      fontWeight: FontWeight.w600)),
                ]),
              ),
            ]),
            const SizedBox(height: 8),
            Text(entry.content,
              maxLines: 3, overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, height: 1.6,
                color: AppColors.textSecondary)),
          ]),
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 40),
      child: Column(children: [
        const Icon(Icons.menu_book_rounded, size: 56, color: AppColors.textTertiary),
        const SizedBox(height: 12),
        const Text('还没有日记',
          style: TextStyle(fontSize: 15, color: AppColors.textSecondary)),
        const SizedBox(height: 4),
        const Text('去"对话"页和小语聊聊，生成第一篇吧',
          style: TextStyle(fontSize: 12, color: AppColors.textTertiary)),
      ]),
    );
  }
}
