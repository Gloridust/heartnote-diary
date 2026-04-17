import 'dart:async';

/// 简单的"快速重复点击拦截"工具。
/// 用法：
/// ```dart
/// final _tap = TapGuard();
/// onPressed: () => _tap.run(() async { ... });
/// ```
/// 在异步任务期间或冷却期内，再次调用直接被忽略。
class TapGuard {
  final Duration cooldown;
  bool _busy = false;
  DateTime? _lastDoneAt;

  TapGuard({this.cooldown = const Duration(milliseconds: 600)});

  /// 真正阻塞调用本身（同步 fn 也支持），返回是否实际执行。
  Future<bool> run(FutureOr<void> Function() fn) async {
    if (_busy) return false;
    final last = _lastDoneAt;
    if (last != null && DateTime.now().difference(last) < cooldown) {
      return false;
    }
    _busy = true;
    try {
      await fn();
    } finally {
      _busy = false;
      _lastDoneAt = DateTime.now();
    }
    return true;
  }

  bool get busy => _busy;
}
