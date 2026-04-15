import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/message.dart';
import '../providers/auth_provider.dart';
import '../providers/chat_provider.dart';
import '../providers/diary_provider.dart';
import '../theme/colors.dart';
import '../widgets/chat_bubble.dart';
import '../widgets/glass_card.dart';
import '../widgets/voice_input.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});
  @override State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ChatProvider>().seedWelcome();
    });
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

        // 底部输入栏
        VoiceInputBar(
          busy: chat.thinking,
          hasDraft: chat.draft != null,
          onSubmitText: (t) => chat.sendUserText(t),
          onRequestFinish: () => chat.requestFinish(),
        ),
      ]),
    );
  }

  void _confirmReset(BuildContext context, ChatProvider chat) {
    showDialog(context: context, builder: (_) => AlertDialog(
      title: const Text('重新开始对话？'),
      content: const Text('当前对话内容将被清除。'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('取消')),
        TextButton(onPressed: () {
          Navigator.pop(context);
          chat.reset();
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

class _DraftCard extends StatefulWidget {
  final DiaryDraft draft;
  const _DraftCard({required this.draft});
  @override State<_DraftCard> createState() => _DraftCardState();
}

class _DraftCardState extends State<_DraftCard> {
  bool _saving = false;

  Future<void> _save() async {
    setState(() => _saving = true);
    final chat = context.read<ChatProvider>();
    final diary = context.read<DiaryProvider>();
    try {
      await diary.save(
        title: widget.draft.title, content: widget.draft.content,
        date: DateTime.now(),
        score: widget.draft.score, tag: widget.draft.tag,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('✓ 已保存到日记本')));
      chat.reset();
      chat.seedWelcome();
    } catch (e) {
      if (!mounted) return;
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
              child: Text('${AppColors.moodEmoji(d.score)} ${d.score}/10',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.primarySoft,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text('#${d.tag}',
                style: const TextStyle(fontSize: 12, color: AppColors.primaryDark,
                  fontWeight: FontWeight.w600)),
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
