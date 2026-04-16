import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/context.dart';
import '../models/message.dart';
import '../services/api_service.dart';
import '../utils/haptics.dart';

/// 由 HomePage 在初始化时注入：每次 chat 成功后回写最新活力值
typedef VitalityUpdater = void Function(int newBalance);

class ChatProvider extends ChangeNotifier {
  final List<ChatMessage> _messages = [];
  DiaryDraft? _draft;
  bool _thinking = false;
  String? _error;

  /// 当前位置+天气（由 HomePage 在启动时写入）
  AppContext? _context;

  /// 活力不足时设为 true，UI 监听弹充值
  bool _outOfVitality = false;
  bool get outOfVitality => _outOfVitality;
  void clearOutOfVitality() { _outOfVitality = false; notifyListeners(); }

  /// 由 HomePage 注入：用于回写活力余额到 VitalityProvider
  VitalityUpdater? _onVitalityUpdate;
  set onVitalityUpdate(VitalityUpdater? cb) => _onVitalityUpdate = cb;

  /// 恢复提示：本次启动首次加载到旧对话时设为 true
  bool _restored = false;
  DateTime? _restoredAt;

  static const _kStore = 'chat_state_v1';
  static const _ttl = Duration(hours: 24);

  List<ChatMessage> get messages => List.unmodifiable(_messages);
  DiaryDraft? get draft => _draft;
  bool get thinking => _thinking;
  String? get error => _error;
  bool get hasStarted => _messages.isNotEmpty;
  AppContext? get context => _context;
  bool get hasContext => _context?.hasAny == true;

  bool get restored => _restored;
  DateTime? get restoredAt => _restoredAt;

  /// 启动时调用：从 SharedPreferences 恢复对话（若未过期）
  Future<void> bootstrap() async {
    final sp = await SharedPreferences.getInstance();
    final raw = sp.getString(_kStore);
    if (raw == null) return;
    try {
      final j = jsonDecode(raw) as Map<String, dynamic>;
      final ts = DateTime.tryParse(j['timestamp'] as String? ?? '');
      if (ts == null || DateTime.now().difference(ts) > _ttl) {
        await sp.remove(_kStore);
        return;
      }
      _messages.clear();
      for (final m in (j['messages'] as List? ?? [])) {
        final mm = m as Map<String, dynamic>;
        _messages.add(ChatMessage(
          content: mm['content'] as String? ?? '',
          isUser: mm['isUser'] as bool? ?? false,
          time: DateTime.tryParse(mm['time'] as String? ?? '') ?? DateTime.now(),
        ));
      }
      if (j['draft'] != null) {
        _draft = DiaryDraft(
          title: j['draft']['title'] ?? '',
          content: j['draft']['content'] ?? '',
          score: (j['draft']['score'] as num?)?.toInt() ?? 5,
          tag: j['draft']['tag'] ?? 'personal',
        );
      }
      if (_messages.isNotEmpty) {
        _restored = true;
        _restoredAt = ts;
      }
      notifyListeners();
    } catch (_) {
      await sp.remove(_kStore);
    }
  }

  Future<void> _persist() async {
    final sp = await SharedPreferences.getInstance();
    if (_messages.isEmpty && _draft == null) {
      await sp.remove(_kStore);
      return;
    }
    final j = {
      'timestamp': DateTime.now().toIso8601String(),
      'messages': _messages.map((m) => {
        'content': m.content, 'isUser': m.isUser,
        'time': m.time.toIso8601String(),
      }).toList(),
      if (_draft != null) 'draft': {
        'title': _draft!.title, 'content': _draft!.content,
        'score': _draft!.score, 'tag': _draft!.tag,
      },
    };
    await sp.setString(_kStore, jsonEncode(j));
  }

  void setContext(AppContext? ctx) {
    _context = ctx;
    notifyListeners();
  }

  void dismissRestoredHint() {
    _restored = false;
    notifyListeners();
  }

  Future<void> reset() async {
    _messages.clear();
    _draft = null;
    _error = null;
    _restored = false;
    _restoredAt = null;
    notifyListeners();
    await _persist();
  }

  void seedWelcome() {
    if (_messages.isEmpty) {
      _messages.add(ChatMessage(
        content: '你好，我是小语。今天过得怎么样？有什么想和我聊聊的吗？',
        isUser: false,
      ));
      notifyListeners();
      _persist();
    }
  }

  Future<void> sendUserText(String text) async {
    final t = text.trim();
    if (t.isEmpty) return;
    _messages.add(ChatMessage(content: t, isUser: true));
    if (_draft != null) _draft = null;
    _thinking = true; _error = null;
    _restored = false;
    notifyListeners();

    await _runChat();
  }

  Future<void> requestFinish() async {
    _messages.add(ChatMessage(content: '帮我把今天的内容整理成日记吧。', isUser: true));
    _thinking = true; _error = null;
    _restored = false;
    notifyListeners();
    await _runChat(forceFinishHint: true);
  }

  Future<void> _runChat({bool forceFinishHint = false}) async {
    try {
      final reply = await ApiService.instance.chat(_messages,
        weather: _context?.weather?.toPromptLabel(),
        location: _context?.location?.toPromptLabel(),
      );
      final content = reply['content'] as Map<String, dynamic>;
      final newBalance = reply['vitality'] as int? ?? 0;
      _onVitalityUpdate?.call(newBalance);

      final mode = content['mode'];
      if (mode == 'end') {
        _draft = DiaryDraft.fromJson(content);
        Haptics.aiDraftReady(); // 日记草稿生成 — 重要事件
      } else {
        final msg = (content['message'] as String?)?.trim()
          ?? (forceFinishHint ? '稍等，让我再问你一下。' : '嗯，我在听呢。');
        _messages.add(ChatMessage(content: msg, isUser: false));
        Haptics.aiReplyReceived(); // 一段对话回复送达 — 轻提示
      }
    } on VitalityInsufficient catch (_) {
      _outOfVitality = true;
      _error = null; // UI 用顶部红条提示，不在消息区重复
      Haptics.warning();
    } catch (e) {
      _error = e.toString();
      Haptics.warning();
    } finally {
      _thinking = false;
      notifyListeners();
      await _persist();
    }
  }

  Future<void> dismissDraft() async {
    _draft = null;
    notifyListeners();
    await _persist();
  }
}
