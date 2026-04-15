import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';
import '../services/api_service.dart';
import '../theme/colors.dart';

/// 底部悬浮的语音输入条：
/// - 主按钮长按录音，松开发送到服务端转文字
/// - 右侧文本框可以直接打字发送
class VoiceInputBar extends StatefulWidget {
  final bool busy;
  final ValueChanged<String> onSubmitText;
  final VoidCallback onRequestFinish;
  final bool hasDraft;

  const VoiceInputBar({
    super.key,
    required this.busy,
    required this.onSubmitText,
    required this.onRequestFinish,
    required this.hasDraft,
  });

  @override
  State<VoiceInputBar> createState() => _VoiceInputBarState();
}

class _VoiceInputBarState extends State<VoiceInputBar> with SingleTickerProviderStateMixin {
  final _recorder = AudioRecorder();
  final _ctrl = TextEditingController();
  bool _recording = false;
  int _seconds = 0;
  Timer? _timer;
  String? _path;

  @override
  void dispose() {
    _timer?.cancel();
    _recorder.dispose();
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    final ok = await Permission.microphone.request();
    if (!ok.isGranted) {
      _snack('需要麦克风权限');
      return;
    }
    final dir = await getTemporaryDirectory();
    final path = '${dir.path}/memoirai_${DateTime.now().millisecondsSinceEpoch}.m4a';
    await _recorder.start(const RecordConfig(encoder: AudioEncoder.aacLc, bitRate: 64000, sampleRate: 16000), path: path);
    _path = path;
    _seconds = 0;
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() => _seconds++);
      if (_seconds >= 60) _stop(); // 60s 上限
    });
    setState(() => _recording = true);
  }

  Future<void> _stop({bool cancel = false}) async {
    _timer?.cancel();
    final path = await _recorder.stop();
    setState(() => _recording = false);
    if (cancel || path == null) return;
    try {
      final f = File(path);
      final bytes = await f.readAsBytes();
      final b64 = base64Encode(bytes);
      final text = await ApiService.instance.recognizeSpeech(b64);
      if (text.isNotEmpty && mounted) {
        widget.onSubmitText(text);
      }
      await f.delete().catchError((_) => f);
    } catch (e) {
      _snack('识别失败：$e');
    }
  }

  void _snack(String m) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_recording) _RecordingIndicator(seconds: _seconds),
            const SizedBox(height: 8),
            Row(children: [
              // 文本框
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: AppColors.border),
                    boxShadow: const [
                      BoxShadow(color: Color(0x0F000000), blurRadius: 10, offset: Offset(0, 3)),
                    ],
                  ),
                  child: TextField(
                    controller: _ctrl,
                    enabled: !widget.busy && !_recording,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (v) {
                      if (v.trim().isEmpty) return;
                      widget.onSubmitText(v.trim());
                      _ctrl.clear();
                    },
                    decoration: const InputDecoration(
                      hintText: '说点什么，或按住右侧按钮说话…',
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      contentPadding: EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              // 语音按钮（长按录音）
              GestureDetector(
                onLongPressStart: (_) { if (!widget.busy) _start(); },
                onLongPressEnd: (_) { if (_recording) _stop(); },
                child: Container(
                  width: 52, height: 52,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft, end: Alignment.bottomRight,
                      colors: _recording
                        ? [AppColors.danger, const Color(0xFFC85050)]
                        : [AppColors.primaryLight, AppColors.primary],
                    ),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: (_recording ? AppColors.danger : AppColors.primary).withValues(alpha: .35),
                        blurRadius: 14, offset: const Offset(0, 5)),
                    ],
                  ),
                  child: Icon(_recording ? Icons.stop_rounded : Icons.mic_rounded,
                    color: Colors.white, size: 26),
                ),
              ),
            ]),
            const SizedBox(height: 8),
            // 生成日记按钮
            if (!widget.hasDraft)
              Align(
                alignment: Alignment.center,
                child: TextButton.icon(
                  onPressed: widget.busy ? null : widget.onRequestFinish,
                  icon: const Icon(Icons.auto_awesome_rounded, size: 18, color: AppColors.primaryDark),
                  label: const Text('帮我整理成日记',
                    style: TextStyle(color: AppColors.primaryDark, fontWeight: FontWeight.w600)),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _RecordingIndicator extends StatefulWidget {
  final int seconds;
  const _RecordingIndicator({required this.seconds});
  @override State<_RecordingIndicator> createState() => _RecordingIndicatorState();
}

class _RecordingIndicatorState extends State<_RecordingIndicator> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this, duration: const Duration(milliseconds: 900))..repeat(reverse: true);

  @override void dispose() { _c.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.danger.withValues(alpha: .08),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        AnimatedBuilder(
          animation: _c,
          builder: (_, __) => Container(
            width: 10, height: 10,
            decoration: BoxDecoration(
              color: AppColors.danger.withValues(alpha: .4 + .6 * _c.value),
              shape: BoxShape.circle,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text('录音中 ${widget.seconds}s / 60s',
          style: const TextStyle(color: AppColors.danger, fontWeight: FontWeight.w600)),
        const SizedBox(width: 10),
        // 小波形
        Row(mainAxisSize: MainAxisSize.min, children: List.generate(5, (i) {
          return AnimatedBuilder(
            animation: _c,
            builder: (_, __) {
              final h = 6.0 + 14.0 * ((math.sin((_c.value * 2 - i * .2) * math.pi) + 1) / 2);
              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 1.5),
                width: 3, height: h,
                decoration: BoxDecoration(
                  color: AppColors.danger,
                  borderRadius: BorderRadius.circular(2)),
              );
            },
          );
        })),
      ]),
    );
  }
}
