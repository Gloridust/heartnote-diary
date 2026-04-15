import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/diary.dart';
import '../models/message.dart';
import '../models/user.dart';
import 'env.dart';

/// 单例 API 客户端
class ApiService {
  ApiService._();
  static final ApiService instance = ApiService._();

  late final Dio _dio = Dio(BaseOptions(
    baseUrl: Env.apiBaseUrl,
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 60),
    headers: {'Content-Type': 'application/json'},
  ))..interceptors.add(InterceptorsWrapper(
    onRequest: (opts, handler) async {
      if (_token != null) {
        opts.headers['Authorization'] = 'Bearer $_token';
      }
      handler.next(opts);
    },
  ));

  String? _token;
  static const _kToken = 'auth_token';

  Future<void> init() async {
    final sp = await SharedPreferences.getInstance();
    _token = sp.getString(_kToken);
  }

  String get baseUrl => _dio.options.baseUrl;

  bool get isAuthed => _token != null;

  Future<void> _saveToken(String? token) async {
    _token = token;
    final sp = await SharedPreferences.getInstance();
    if (token == null) {
      await sp.remove(_kToken);
    } else {
      await sp.setString(_kToken, token);
    }
  }

  // ========== Auth ==========

  Future<AppUser> register({required String phone, required String password, String? nickname}) async {
    final r = await _dio.post('/api/auth/register', data: {
      'phone': phone, 'password': password,
      if (nickname != null && nickname.isNotEmpty) 'nickname': nickname,
    });
    _check(r.data);
    await _saveToken(r.data['data']['token'] as String);
    return AppUser.fromJson(r.data['data']['user']);
  }

  Future<AppUser> login({required String identifier, required String password}) async {
    final r = await _dio.post('/api/auth/login', data: {
      'identifier': identifier, 'password': password,
    });
    _check(r.data);
    await _saveToken(r.data['data']['token'] as String);
    return AppUser.fromJson(r.data['data']['user']);
  }

  Future<AppUser> me() async {
    final r = await _dio.get('/api/auth/me');
    _check(r.data);
    return AppUser.fromJson(r.data['data']);
  }

  Future<void> logout() async { await _saveToken(null); }

  Future<void> changePassword(String oldPwd, String newPwd) async {
    final r = await _dio.post('/api/auth/change-password',
      data: {'old_password': oldPwd, 'new_password': newPwd});
    _check(r.data);
  }

  Future<AppUser> updateNickname(String nickname) async {
    final r = await _dio.patch('/api/auth/profile', data: {'nickname': nickname});
    _check(r.data);
    return AppUser.fromJson(r.data['data']);
  }

  // ========== Diary ==========

  Future<List<DiaryEntry>> listDiaries() async {
    final r = await _dio.get('/api/diary');
    _check(r.data);
    final list = (r.data['data'] as List).cast<Map<String, dynamic>>();
    return list.map(DiaryEntry.fromJson).toList();
  }

  Future<int> saveDiary({
    int? diaryId, required String title, required String content,
    required DateTime date, int? score, String? tag,
  }) async {
    final r = await _dio.post('/api/diary', data: {
      if (diaryId != null) 'diary_id': diaryId,
      'title': title, 'content': content,
      'date': date.toUtc().toIso8601String(),
      if (score != null) 'score': score,
      if (tag != null) 'tag': tag,
    });
    _check(r.data);
    return r.data['diary_id'] as int;
  }

  Future<void> deleteDiary(int diaryId) async {
    final r = await _dio.delete('/api/diary/$diaryId');
    _check(r.data);
  }

  // ========== Chat ==========

  Future<Map<String, dynamic>> chat(List<ChatMessage> history,
      {String? weather, String? location}) async {
    final r = await _dio.post('/api/chat', data: {
      'messages': history.map((m) => m.toApi()).toList(),
      if (weather != null) 'weather': weather,
      if (location != null) 'location': location,
    });
    if (r.data['success'] != true) {
      throw ApiError(r.data['error'] ?? '对话服务异常');
    }
    return r.data['content'] as Map<String, dynamic>;
  }

  // ========== Speech ==========

  Future<String> recognizeSpeech(String audioBase64) async {
    final r = await _dio.post('/api/speech/recognize', data: {'audio_base64': audioBase64});
    if (r.data['success'] != true) {
      throw ApiError(r.data['error'] ?? '语音识别失败');
    }
    return r.data['text'] as String;
  }

  // ==========

  void _check(dynamic data) {
    if (data is Map && data['status'] == 'error') {
      throw ApiError(data['message'] as String? ?? '请求失败');
    }
  }
}

class ApiError implements Exception {
  final String message;
  ApiError(this.message);
  @override String toString() => message;
}
