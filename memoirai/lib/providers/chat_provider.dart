import 'package:flutter/foundation.dart';
import '../models/message.dart';
import '../services/api_service.dart';

class ChatProvider extends ChangeNotifier {
  final List<ChatMessage> _messages = [];
  DiaryDraft? _draft;
  bool _thinking = false;
  String? _error;

  List<ChatMessage> get messages => List.unmodifiable(_messages);
  DiaryDraft? get draft => _draft;
  bool get thinking => _thinking;
  String? get error => _error;
  bool get hasStarted => _messages.isNotEmpty;

  void reset() {
    _messages.clear();
    _draft = null;
    _error = null;
    notifyListeners();
  }

  /// 首次开启对话的欢迎语（本地直接给出，省一次 LLM 调用）
  void seedWelcome() {
    if (_messages.isEmpty) {
      _messages.add(ChatMessage(
        content: '你好，我是小语。今天过得怎么样？有什么想和我聊聊的吗？',
        isUser: false,
      ));
      notifyListeners();
    }
  }

  /// 用户发来一段文字（可能是文本输入或 STT 结果）
  Future<void> sendUserText(String text) async {
    final t = text.trim();
    if (t.isEmpty) return;
    _messages.add(ChatMessage(content: t, isUser: true));
    // 清空之前的日记草稿（用户继续说话意味着要修改）
    if (_draft != null) _draft = null;
    _thinking = true; _error = null;
    notifyListeners();

    try {
      final reply = await ApiService.instance.chat(_messages);
      final mode = reply['mode'];
      if (mode == 'end') {
        _draft = DiaryDraft.fromJson(reply);
        // end 模式不把 AI 原回复塞进对话流，改由预览卡片展示
      } else {
        final msg = (reply['message'] as String?)?.trim() ?? '嗯，我在听呢。';
        _messages.add(ChatMessage(content: msg, isUser: false));
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _thinking = false;
      notifyListeners();
    }
  }

  /// 强制请求一次日记生成（点击"生成日记"按钮时使用）
  Future<void> requestFinish() async {
    _messages.add(ChatMessage(content: '帮我把今天的内容整理成日记吧。', isUser: true));
    _thinking = true; _error = null;
    notifyListeners();
    try {
      final reply = await ApiService.instance.chat(_messages);
      if (reply['mode'] == 'end') {
        _draft = DiaryDraft.fromJson(reply);
      } else {
        _messages.add(ChatMessage(
          content: (reply['message'] as String?) ?? '稍等，让我再问你一下。',
          isUser: false,
        ));
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _thinking = false;
      notifyListeners();
    }
  }

  void dismissDraft() { _draft = null; notifyListeners(); }
}
