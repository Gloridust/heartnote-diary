import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';
import '../services/api_service.dart';
import '../theme/colors.dart';
import '../utils/haptics.dart';

/// 底部输入条
/// - 永远显示圆角胶囊文本框（语音 = 转文字，所以不切换形态）
/// - 右侧按钮：空内容 = 麦克风（按住说话，松开 STT 自动填到输入框）
///                  有内容 = 紫色发送按钮
/// - 麦克风长按时全屏中央有录音浮层，上滑超过阈值变红 = 松开取消
class VoiceInputBar extends StatefulWidget {
  final bool busy;
  final ValueChanged<String> onSubmitText;

  const VoiceInputBar({super.key, required this.busy, required this.onSubmitText});

  @override
  State<VoiceInputBar> createState() => _VoiceInputBarState();
}

class _VoiceInputBarState extends State<VoiceInputBar> {
  final _recorder = AudioRecorder();
  final _ctrl = TextEditingController();
  final _focus = FocusNode();
  final _GlobalOverlay _overlay = _GlobalOverlay();

  bool _hasText = false;

  // 录音
  bool _recording = false;
  bool _willCancel = false;
  bool _transcribing = false;          // STT 进行中
  int _seconds = 0;
  Timer? _timer;
  String? _path;
  Offset? _pressStart;
  static const double _cancelDistance = 80;

  @override
  void initState() {
    super.initState();
    _ctrl.addListener(() {
      final v = _ctrl.text.trim().isNotEmpty;
      if (v != _hasText) setState(() => _hasText = v);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _recorder.dispose();
    _ctrl.dispose();
    _focus.dispose();
    _overlay.hide();
    super.dispose();
  }

  // ===== 录音 =====

  Future<void> _start(Offset globalPosition) async {
    if (widget.busy || _transcribing) return;
    final ok = await Permission.microphone.request();
    if (!ok.isGranted) {
      _snack('需要麦克风权限');
      return;
    }
    // 收起键盘，避免遮挡浮层
    _focus.unfocus();

    final dir = await getTemporaryDirectory();
    final path = '${dir.path}/memoirai_${DateTime.now().millisecondsSinceEpoch}.m4a';
    try {
      await _recorder.start(
        const RecordConfig(encoder: AudioEncoder.aacLc, bitRate: 64000, sampleRate: 16000),
        path: path,
      );
    } catch (e) {
      _snack('录音启动失败：$e');
      return;
    }
    _path = path;
    _seconds = 0;
    _pressStart = globalPosition;
    _willCancel = false;
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() => _seconds++);
      _overlay.update(seconds: _seconds, willCancel: _willCancel);
      if (_seconds >= 60) _stop(cancel: false);
    });
    setState(() => _recording = true);
    _overlay.show(context, seconds: _seconds, willCancel: false);
    Haptics.event(); // 录音开始的"开始事件"反馈
  }

  void _onMove(Offset globalPosition) {
    if (!_recording || _pressStart == null) return;
    final dy = _pressStart!.dy - globalPosition.dy;
    final cancel = dy > _cancelDistance;
    if (cancel != _willCancel) {
      setState(() => _willCancel = cancel);
      _overlay.update(seconds: _seconds, willCancel: cancel);
      // 只在"进入取消区"时震一下，离开取消区不震（避免来回滑动一直抖）
      if (cancel) Haptics.warning();
    }
  }

  Future<void> _stop({required bool cancel}) async {
    if (!_recording) return;
    _timer?.cancel();
    _overlay.hide();
    final path = await _recorder.stop().catchError((_) => null);
    final shouldCancel = cancel || _willCancel || path == null;
    setState(() { _recording = false; _willCancel = false; });

    if (shouldCancel) {
      if (path != null) { try { await File(path).delete(); } catch (_) {} }
      return;
    }
    if (_seconds < 1) {
      _snack('说话时间太短');
      try { await File(path).delete(); } catch (_) {}
      return;
    }

    setState(() => _transcribing = true);
    try {
      final f = File(path);
      final bytes = await f.readAsBytes();
      final b64 = base64Encode(bytes);
      final text = await ApiService.instance.recognizeSpeech(b64);
      if (text.isNotEmpty && mounted) {
        // 把识别文字追加到输入框（不直接发送，让用户可以编辑）
        final cur = _ctrl.text;
        _ctrl.text = cur.isEmpty ? text : '$cur $text';
        _ctrl.selection = TextSelection.fromPosition(
          TextPosition(offset: _ctrl.text.length));
      }
      f.delete().catchError((_) => f);
    } catch (e) {
      _snack('识别失败：$e');
    } finally {
      if (mounted) setState(() => _transcribing = false);
    }
  }

  // ===== 文本提交 =====

  void _submitText() {
    final t = _ctrl.text.trim();
    if (t.isEmpty) return;
    Haptics.tap();
    widget.onSubmitText(t);
    _ctrl.clear();
  }

  void _snack(String m) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(m),
      duration: const Duration(seconds: 2),
      behavior: SnackBarBehavior.floating,
    ));
  }

  // ===== UI =====

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 6, 14, 10),
        child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
          // 圆角胶囊文本框（永远显示）
          Expanded(child: _buildTextField()),
          const SizedBox(width: 8),
          // 末端按钮
          _buildTrailing(),
        ]),
      ),
    );
  }

  Widget _buildTextField() {
    final input = TextField(
      controller: _ctrl,
      focusNode: _focus,
      enabled: !widget.busy && !_transcribing,
      minLines: 1,
      maxLines: 5,
      textInputAction: TextInputAction.send,
      onSubmitted: (_) => _submitText(),
      style: const TextStyle(
        fontSize: 15, height: 1.45, color: AppColors.textPrimary),
      decoration: InputDecoration(
        hintText: _transcribing ? '正在识别…' : '说点什么…',
        hintStyle: const TextStyle(color: AppColors.textTertiary),
        filled: true,
        fillColor: Colors.transparent,
        border: InputBorder.none,
        enabledBorder: InputBorder.none,
        focusedBorder: InputBorder.none,
        disabledBorder: InputBorder.none,
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
      ),
    );

    return Container(
      constraints: const BoxConstraints(minHeight: 48, maxHeight: 140),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        boxShadow: const [
          BoxShadow(color: Color(0x14000000), blurRadius: 14, offset: Offset(0, 4)),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: .82),
              borderRadius: BorderRadius.circular(28),
              border: Border.all(
                color: Colors.white.withValues(alpha: .85), width: 1),
            ),
            child: input,
          ),
        ),
      ),
    );
  }

  Widget _buildTrailing() {
    if (_hasText && !widget.busy) {
      // 发送
      return _CircleButton(
        size: 48,
        gradient: const LinearGradient(
          colors: [AppColors.primaryLight, AppColors.primary],
          begin: Alignment.topLeft, end: Alignment.bottomRight,
        ),
        icon: Icons.arrow_upward_rounded,
        iconColor: Colors.white,
        onTap: _submitText,
      );
    }
    if (_transcribing) {
      // STT 进行中
      return Container(
        width: 48, height: 48,
        decoration: const BoxDecoration(
          color: AppColors.surface, shape: BoxShape.circle,
        ),
        child: const Center(
          child: SizedBox(
            width: 18, height: 18,
            child: CircularProgressIndicator(strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation(AppColors.primary)),
          ),
        ),
      );
    }
    // 长按麦克风录音
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onLongPressStart: (d) => _start(d.globalPosition),
      onLongPressMoveUpdate: (d) => _onMove(d.globalPosition),
      onLongPressEnd: (_) => _stop(cancel: false),
      onLongPressCancel: () => _stop(cancel: true),
      // 单击给个提示
      onTap: () => _snack('长按按钮说话'),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        width: 48, height: 48,
        decoration: BoxDecoration(
          gradient: _recording
            ? LinearGradient(colors: _willCancel
                ? [AppColors.danger, const Color(0xFFC85050)]
                : [AppColors.primaryLight, AppColors.primary])
            : null,
          color: _recording ? null : AppColors.surface,
          shape: BoxShape.circle,
          border: _recording ? null : Border.all(color: AppColors.border),
          boxShadow: _recording
            ? [BoxShadow(
                color: (_willCancel ? AppColors.danger : AppColors.primary).withValues(alpha: .35),
                blurRadius: 14, offset: const Offset(0, 5))]
            : const [BoxShadow(color: Color(0x0F000000), blurRadius: 8, offset: Offset(0, 2))],
        ),
        child: Icon(
          _recording ? (_willCancel ? Icons.delete_outline_rounded : Icons.mic_rounded)
            : Icons.mic_none_rounded,
          color: _recording ? Colors.white : AppColors.textSecondary,
          size: 22,
        ),
      ),
    );
  }
}

class _CircleButton extends StatelessWidget {
  final double size;
  final Gradient gradient;
  final IconData icon;
  final Color iconColor;
  final VoidCallback onTap;
  const _CircleButton({
    required this.size, required this.gradient,
    required this.icon, required this.iconColor, required this.onTap,
  });
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: size, height: size,
        decoration: BoxDecoration(
          gradient: gradient,
          shape: BoxShape.circle,
          boxShadow: [BoxShadow(
            color: AppColors.primary.withValues(alpha: .35),
            blurRadius: 12, offset: const Offset(0, 4)),
          ],
        ),
        child: Icon(icon, color: iconColor, size: 22),
      ),
    );
  }
}

// ============================================================
// 录音浮层
// ============================================================
class _GlobalOverlay {
  OverlayEntry? _entry;
  final ValueNotifier<_OverlayState> _state =
    ValueNotifier(_OverlayState(seconds: 0, willCancel: false));

  void show(BuildContext ctx, {required int seconds, required bool willCancel}) {
    if (_entry != null) return;
    _state.value = _OverlayState(seconds: seconds, willCancel: willCancel);
    _entry = OverlayEntry(builder: (_) => _RecordingOverlay(state: _state));
    Overlay.of(ctx, rootOverlay: true).insert(_entry!);
  }

  void update({required int seconds, required bool willCancel}) {
    _state.value = _OverlayState(seconds: seconds, willCancel: willCancel);
  }

  void hide() {
    _entry?.remove();
    _entry = null;
  }
}

class _OverlayState {
  final int seconds;
  final bool willCancel;
  _OverlayState({required this.seconds, required this.willCancel});
}

class _RecordingOverlay extends StatelessWidget {
  final ValueNotifier<_OverlayState> state;
  const _RecordingOverlay({required this.state});

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: IgnorePointer(
        ignoring: true,
        child: ColoredBox(
          color: Colors.black.withValues(alpha: .15),
          child: Center(
            child: ValueListenableBuilder<_OverlayState>(
              valueListenable: state,
              builder: (_, s, __) {
                final cancel = s.willCancel;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  width: 180, height: 180,
                  decoration: BoxDecoration(
                    color: cancel ? AppColors.danger : AppColors.primaryDark.withValues(alpha: .92),
                    borderRadius: BorderRadius.circular(28),
                    boxShadow: [BoxShadow(
                      color: (cancel ? AppColors.danger : AppColors.primary).withValues(alpha: .35),
                      blurRadius: 30, offset: const Offset(0, 10),
                    )],
                  ),
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Icon(
                      cancel ? Icons.delete_outline_rounded : Icons.mic_rounded,
                      size: 54, color: Colors.white),
                    const SizedBox(height: 14),
                    if (!cancel) _Wave(seconds: s.seconds),
                    if (!cancel) const SizedBox(height: 12),
                    Text(
                      cancel ? '松开取消' : '${s.seconds}s / 60s',
                      style: const TextStyle(color: Colors.white, fontSize: 13,
                        fontWeight: FontWeight.w600)),
                  ]),
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}

class _Wave extends StatefulWidget {
  final int seconds;
  const _Wave({required this.seconds});
  @override State<_Wave> createState() => _WaveState();
}

class _WaveState extends State<_Wave> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this, duration: const Duration(milliseconds: 900))..repeat();
  @override void dispose() { _c.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (_, __) {
        return Row(mainAxisSize: MainAxisSize.min, children: List.generate(7, (i) {
          final h = 4.0 + 16.0 *
            ((math.sin((_c.value * 2 - i * .15) * math.pi) + 1) / 2);
          return Container(
            margin: const EdgeInsets.symmetric(horizontal: 2),
            width: 3, height: h,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(2)),
          );
        }));
      },
    );
  }
}

