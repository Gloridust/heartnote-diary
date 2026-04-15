import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/diary.dart';
import '../providers/diary_provider.dart';
import '../theme/colors.dart';
import '../widgets/glass_card.dart';

class DiaryDetailPage extends StatelessWidget {
  final DiaryEntry entry;
  const DiaryDetailPage({super.key, required this.entry});

  Future<void> _delete(BuildContext context) async {
    final ok = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
      title: const Text('删除这篇日记？'),
      content: const Text('删除后无法恢复。'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('取消')),
        TextButton(onPressed: () => Navigator.pop(context, true),
          child: const Text('删除', style: TextStyle(color: AppColors.danger))),
      ],
    ));
    if (ok != true) return;
    try {
      await context.read<DiaryProvider>().remove(entry.id);
      if (context.mounted) Navigator.pop(context);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('删除失败：$e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPage,
      appBar: AppBar(
        title: const Text('日记详情'),
        actions: [
          IconButton(icon: const Icon(Icons.delete_outline_rounded, color: AppColors.danger),
            onPressed: () => _delete(context)),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
        children: [
          GlassCard(
            padding: const EdgeInsets.all(22),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(DateFormat('yyyy 年 M 月 d 日  HH:mm').format(entry.date),
                style: const TextStyle(fontSize: 12, color: AppColors.textTertiary)),
              const SizedBox(height: 10),
              Text(entry.title,
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary)),
              const SizedBox(height: 12),
              Wrap(spacing: 8, children: [
                if (entry.score != null) Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.moodColor(entry.score!).withValues(alpha: .25),
                    borderRadius: BorderRadius.circular(999)),
                  child: Text('${AppColors.moodEmoji(entry.score!)} ${entry.score}/10',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                ),
                if (entry.tag != null) Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: AppColors.primarySoft,
                    borderRadius: BorderRadius.circular(999)),
                  child: Text('#${entry.tagTitle}',
                    style: const TextStyle(fontSize: 12, color: AppColors.primaryDark,
                      fontWeight: FontWeight.w600)),
                ),
              ]),
              const SizedBox(height: 18),
              Text(entry.content,
                style: const TextStyle(fontSize: 15, height: 1.8,
                  color: AppColors.textPrimary)),
            ]),
          ),
        ],
      ),
    );
  }
}
