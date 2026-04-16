import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/colors.dart';
import '../widgets/glass_card.dart';

class PrivacyPage extends StatefulWidget {
  const PrivacyPage({super.key});
  @override State<PrivacyPage> createState() => _PrivacyPageState();
}

class _PrivacyPageState extends State<PrivacyPage> {
  String? _content;
  String? _updated;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final r = await ApiService.instance.fetchPrivacy();
      if (!mounted) return;
      setState(() { _content = r.content; _updated = r.updatedAt; });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPage,
      appBar: AppBar(title: const Text('隐私政策')),
      body: _content == null
        ? Center(child: _error != null
            ? Text(_error!, style: const TextStyle(color: AppColors.danger))
            : const CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation(AppColors.primary)))
        : ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 30),
            children: [
              GlassCard(
                padding: const EdgeInsets.all(20),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_updated != null) Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: Text('最近更新：$_updated',
                        style: const TextStyle(fontSize: 12,
                          color: AppColors.textTertiary)),
                    ),
                    ..._renderMarkdown(_content!),
                  ]),
              ),
            ],
          ),
    );
  }

  /// 极简 Markdown：# / ## / ### / - / **bold**
  List<Widget> _renderMarkdown(String md) {
    final widgets = <Widget>[];
    final lines = md.split('\n');
    final listBuf = <String>[];
    void flushList() {
      if (listBuf.isEmpty) return;
      widgets.add(Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start,
          children: listBuf.map((l) => Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Padding(padding: EdgeInsets.only(top: 8, right: 8),
                child: SizedBox(width: 4, height: 4,
                  child: DecoratedBox(decoration: BoxDecoration(
                    color: AppColors.primary, shape: BoxShape.circle)))),
              Expanded(child: _RichLine(l, baseStyle: _bodyStyle)),
            ]),
          )).toList()),
      ));
      listBuf.clear();
    }

    for (final raw in lines) {
      final line = raw.trimRight();
      if (line.isEmpty) { flushList(); continue; }
      if (line.startsWith('# ')) {
        flushList();
        widgets.add(Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Text(line.substring(2),
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700,
              color: AppColors.textPrimary)),
        ));
      } else if (line.startsWith('## ')) {
        flushList();
        widgets.add(Padding(
          padding: const EdgeInsets.only(top: 16, bottom: 6),
          child: Text(line.substring(3),
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700,
              color: AppColors.primaryDark)),
        ));
      } else if (line.startsWith('### ')) {
        flushList();
        widgets.add(Padding(
          padding: const EdgeInsets.only(top: 10, bottom: 4),
          child: Text(line.substring(4),
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700,
              color: AppColors.textPrimary)),
        ));
      } else if (line.trimLeft().startsWith('- ')) {
        listBuf.add(line.trimLeft().substring(2));
      } else {
        flushList();
        widgets.add(Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: _RichLine(line, baseStyle: _bodyStyle),
        ));
      }
    }
    flushList();
    return widgets;
  }

  static const _bodyStyle = TextStyle(
    fontSize: 14, height: 1.7, color: AppColors.textPrimary);
}

/// 处理行内 **粗体**
class _RichLine extends StatelessWidget {
  final String text;
  final TextStyle baseStyle;
  const _RichLine(this.text, {required this.baseStyle});
  @override
  Widget build(BuildContext context) {
    final spans = <TextSpan>[];
    final reg = RegExp(r'\*\*(.+?)\*\*');
    int last = 0;
    for (final m in reg.allMatches(text)) {
      if (m.start > last) {
        spans.add(TextSpan(text: text.substring(last, m.start)));
      }
      spans.add(TextSpan(text: m.group(1),
        style: const TextStyle(fontWeight: FontWeight.w700)));
      last = m.end;
    }
    if (last < text.length) spans.add(TextSpan(text: text.substring(last)));
    return RichText(text: TextSpan(style: baseStyle, children: spans));
  }
}
