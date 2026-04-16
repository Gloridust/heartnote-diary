import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/context.dart';
import '../models/message.dart';
import '../providers/auth_provider.dart';
import '../providers/chat_provider.dart';
import '../providers/diary_provider.dart';
import '../providers/vitality_provider.dart';
import '../services/location_service.dart';
import '../theme/colors.dart';
import '../utils/haptics.dart';
import '../widgets/chat_bubble.dart';
import '../widgets/glass_card.dart';
import '../widgets/voice_input.dart';
import 'recharge_page.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});
  @override State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final _scroll = ScrollController();
  bool _locating = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final chat = context.read<ChatProvider>();
      final vitality = context.read<VitalityProvider>();
      // chat 成功后回写最新余额到 VitalityProvider
      chat.onVitalityUpdate = vitality.setBalance;
      if (!chat.hasStarted) chat.seedWelcome();
      _fetchContext();
    });
  }

  Future<void> _fetchContext({bool force = false}) async {
    final chat = context.read<ChatProvider>();
    if (!force && chat.hasContext) return;
    setState(() => _locating = true);
    final ctx = await LocationService.instance.fetch();
    if (!mounted) return;
    if (ctx != null) chat.setContext(ctx);
    setState(() => _locating = false);
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(_scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 260), curve: Curves.easeOut);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final chat = context.watch<ChatProvider>();
    final user = context.watch<AuthProvider>().user;
    _scrollToEnd();

    return SafeArea(
      bottom: false,
      child: Column(children: [
        // 顶栏
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 6),
          child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('你好，${user?.nickname ?? ""}',
                  style: const TextStyle(
                    fontSize: 20, fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary)),
                const SizedBox(height: 2),
                const Text('今天，想和我聊聊什么？',
                  style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
              ])),
            if (chat.hasStarted)
              _RoundIcon(Icons.refresh_rounded,
                onTap: () => _confirmReset(context, chat)),
          ]),
        ),

        // 位置 + 天气徽标
        _ContextBanner(
          context: chat.context,
          loading: _locating,
          onRetry: () => _fetchContext(force: true),
        ),

        // 对话恢复提示
        if (chat.restored)
          _RestoreNotice(
            at: chat.restoredAt,
            onDismiss: () => chat.dismissRestoredHint(),
            onReset: () => _confirmReset(context, chat),
          ),

        // 活力不足提示
        if (chat.outOfVitality)
          _OutOfVitalityNotice(
            onDismiss: chat.clearOutOfVitality,
            onRecharge: () {
              chat.clearOutOfVitality();
              Navigator.push(context, MaterialPageRoute(
                builder: (_) => const RechargePage()));
            },
          ),

        // 对话列表
        Expanded(
          child: ListView(
            controller: _scroll,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 140),
            children: [
              for (final m in chat.messages)
                ChatBubble(text: m.content, isUser: m.isUser),
              if (chat.thinking) const TypingBubble(),
              if (chat.draft != null) _DraftCard(draft: chat.draft!),
              if (chat.error != null) Padding(
                padding: const EdgeInsets.all(10),
                child: Text(chat.error!,
                  style: const TextStyle(color: AppColors.danger, fontSize: 12)),
              ),
            ],
          ),
        ),

        // 「整理成日记」 — 浮在输入框上方
        if (!chat.thinking && chat.draft == null && chat.hasStarted)
          Padding(
            padding: const EdgeInsets.only(bottom: 4, top: 2),
            child: _FinishPill(onTap: () => chat.requestFinish()),
          ),
        VoiceInputBar(
          busy: chat.thinking,
          onSubmitText: (t) => chat.sendUserText(t),
        ),
      ]),
    );
  }

  void _confirmReset(BuildContext ctx, ChatProvider chat) {
    showDialog(context: ctx, builder: (_) => AlertDialog(
      title: const Text('重新开始对话？'),
      content: const Text('当前对话内容将被清除。'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('取消')),
        TextButton(onPressed: () async {
          Navigator.pop(ctx);
          await chat.reset();
          chat.seedWelcome();
        }, child: const Text('确定', style: TextStyle(color: AppColors.danger))),
      ],
    ));
  }
}

class _RoundIcon extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _RoundIcon(this.icon, {required this.onTap});
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
          boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 8, offset: Offset(0, 2))],
        ),
        child: Icon(icon, size: 20, color: AppColors.textSecondary),
      ),
    );
  }
}

/// 顶部位置/天气小徽标：失败时不打扰用户（只在明确已拿到或正在拉时显示）
class _ContextBanner extends StatelessWidget {
  final AppContext? context;
  final bool loading;
  final VoidCallback onRetry;
  const _ContextBanner({
    required this.context, required this.loading, required this.onRetry,
  });

  @override
  Widget build(BuildContext _) {
    if (!loading && (context == null || !context!.hasAny)) {
      return const SizedBox.shrink();
    }
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 2, 20, 6),
      child: Row(children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: .65),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: Colors.white.withValues(alpha: .8)),
                boxShadow: const [BoxShadow(color: Color(0x0F000000), blurRadius: 10, offset: Offset(0, 3))],
              ),
              child: loading
                ? const Row(mainAxisSize: MainAxisSize.min, children: [
                    SizedBox(width: 12, height: 12,
                      child: CircularProgressIndicator(strokeWidth: 1.5,
                        valueColor: AlwaysStoppedAnimation(AppColors.primaryDark))),
                    SizedBox(width: 8),
                    Text('定位中…',
                      style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                  ])
                : _buildChip(context!),
            ),
          ),
        ),
      ]),
    );
  }

  Widget _buildChip(AppContext c) {
    final w = c.weather;
    final l = c.location;
    return Row(mainAxisSize: MainAxisSize.min, children: [
      if (w != null) ...[
        Icon(w.iconData, size: 14, color: AppColors.primaryDark),
        const SizedBox(width: 4),
        Text('${w.temperature}° ${w.description}',
          style: const TextStyle(fontSize: 12, color: AppColors.textPrimary,
            fontWeight: FontWeight.w600)),
      ],
      if (w != null && l != null) const SizedBox(width: 8),
      if (w != null && l != null) Container(
        width: 3, height: 3,
        decoration: const BoxDecoration(color: AppColors.textTertiary, shape: BoxShape.circle),
      ),
      if (w != null && l != null) const SizedBox(width: 8),
      if (l != null) ...[
        const Icon(Icons.location_on_rounded, size: 13,
          color: AppColors.textTertiary),
        const SizedBox(width: 2),
        Flexible(
          child: Text(
            l.city.isNotEmpty
              ? (l.district.isNotEmpty ? '${l.city}·${l.district}' : l.city)
              : l.formattedAddress,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
          ),
        ),
      ],
    ]);
  }
}

class _RestoreNotice extends StatelessWidget {
  final DateTime? at;
  final VoidCallback onDismiss;
  final VoidCallback onReset;
  const _RestoreNotice({required this.at, required this.onDismiss, required this.onReset});

  String _timeLabel() {
    if (at == null) return '';
    final diff = DateTime.now().difference(at!);
    if (diff.inMinutes < 1) return '刚刚';
    if (diff.inMinutes < 60) return '${diff.inMinutes} 分钟前';
    if (diff.inHours < 24) return '${diff.inHours} 小时前';
    return DateFormat('M/d HH:mm').format(at!);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
      child: Container(
        padding: const EdgeInsets.fromLTRB(14, 10, 10, 10),
        decoration: BoxDecoration(
          color: AppColors.primarySoft,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.primaryLight.withValues(alpha: .5)),
        ),
        child: Row(children: [
          const Icon(Icons.history_rounded, size: 18, color: AppColors.primaryDark),
          const SizedBox(width: 8),
          Expanded(child: Text('已恢复 ${_timeLabel()} 未完成的对话',
            style: const TextStyle(fontSize: 13, color: AppColors.primaryDark,
              fontWeight: FontWeight.w600))),
          TextButton(
            onPressed: onReset,
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: const Text('开新对话',
              style: TextStyle(fontSize: 12, color: AppColors.danger)),
          ),
          IconButton(
            onPressed: onDismiss,
            icon: const Icon(Icons.close_rounded, size: 18),
            color: AppColors.textSecondary,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
          ),
        ]),
      ),
    );
  }
}

class _FinishPill extends StatelessWidget {
  final VoidCallback onTap;
  const _FinishPill({required this.onTap});
  @override
  Widget build(BuildContext context) {
    return Center(
      child: GestureDetector(
        onTap: onTap,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: .55),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: Colors.white.withValues(alpha: .65)),
                boxShadow: [BoxShadow(
                  color: AppColors.primary.withValues(alpha: .12),
                  blurRadius: 14, offset: const Offset(0, 4)),
                ],
              ),
              child: const Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.auto_awesome_rounded, size: 16, color: AppColors.primaryDark),
                SizedBox(width: 6),
                Text('帮我整理成日记',
                  style: TextStyle(color: AppColors.primaryDark,
                    fontSize: 13, fontWeight: FontWeight.w600)),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

class _OutOfVitalityNotice extends StatelessWidget {
  final VoidCallback onDismiss;
  final VoidCallback onRecharge;
  const _OutOfVitalityNotice({
    required this.onDismiss, required this.onRecharge,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
      child: Container(
        padding: const EdgeInsets.fromLTRB(14, 10, 10, 10),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [AppColors.danger.withValues(alpha: .15),
                     AppColors.warning.withValues(alpha: .15)]),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.danger.withValues(alpha: .3)),
        ),
        child: Row(children: [
          const Icon(Icons.bolt_rounded, color: AppColors.danger, size: 18),
          const SizedBox(width: 6),
          const Expanded(child: Text('活力不足，充值后继续畅聊',
            style: TextStyle(fontSize: 13, color: AppColors.textPrimary,
              fontWeight: FontWeight.w600))),
          TextButton(onPressed: onRecharge, child: const Text('去充值',
            style: TextStyle(color: AppColors.primaryDark, fontWeight: FontWeight.w700))),
          IconButton(onPressed: onDismiss,
            icon: const Icon(Icons.close_rounded, size: 18),
            color: AppColors.textSecondary,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 28, minHeight: 28)),
        ]),
      ),
    );
  }
}

class _DraftCard extends StatefulWidget {
  final DiaryDraft draft;
  const _DraftCard({required this.draft});
  @override State<_DraftCard> createState() => _DraftCardState();
}

class _DraftCardState extends State<_DraftCard> {
  bool _saving = false;

  Future<void> _save() async {
    setState(() => _saving = true);
    Haptics.tap();
    final chat = context.read<ChatProvider>();
    final diary = context.read<DiaryProvider>();
    try {
      await diary.save(
        title: widget.draft.title, content: widget.draft.content,
        date: DateTime.now(),
        score: widget.draft.score, tag: widget.draft.tag,
        location: chat.context?.location,
        weather: chat.context?.weather,
      );
      if (!mounted) return;
      Haptics.success();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('✓ 已保存到日记本')));
      await chat.reset();
      chat.seedWelcome();
    } catch (e) {
      if (!mounted) return;
      Haptics.warning();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('保存失败：$e')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final d = widget.draft;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: GlassCard(
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.moodColor(d.score).withValues(alpha: .25),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Text(AppColors.moodEmoji(d.score),
                  style: const TextStyle(fontSize: 12)),
                const SizedBox(width: 4),
                Text('${d.score} / 10',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              ]),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.primarySoft,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                const Icon(Icons.local_offer_rounded, size: 11,
                  color: AppColors.primaryDark),
                const SizedBox(width: 3),
                Text(d.tag,
                  style: const TextStyle(fontSize: 12, color: AppColors.primaryDark,
                    fontWeight: FontWeight.w600)),
              ]),
            ),
          ]),
          const SizedBox(height: 12),
          Text(d.title,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700,
              color: AppColors.textPrimary)),
          const SizedBox(height: 10),
          Text(d.content,
            style: const TextStyle(fontSize: 14, height: 1.7,
              color: AppColors.textPrimary)),
          const SizedBox(height: 14),
          Row(children: [
            Expanded(
              child: OutlinedButton(
                onPressed: _saving ? null : () => context.read<ChatProvider>().dismissDraft(),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  side: const BorderSide(color: AppColors.border),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                ),
                child: const Text('继续修改', style: TextStyle(color: AppColors.textSecondary)),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: ElevatedButton(
                onPressed: _saving ? null : _save,
                child: _saving
                  ? const SizedBox(height: 18, width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('保存日记'),
              ),
            ),
          ]),
        ]),
      ),
    );
  }
}
