import 'dart:async';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/context.dart';
import '../models/diary.dart';
import '../models/message.dart';
import '../models/user.dart';
import '../models/vitality.dart';
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
    // 不抛 4xx 让我们自己处理错误码
    validateStatus: (s) => s != null && s < 500,
  ))..interceptors.add(InterceptorsWrapper(
    onRequest: (opts, handler) async {
      if (_token != null) {
        opts.headers['Authorization'] = 'Bearer $_token';
      }
      handler.next(opts);
    },
    onResponse: (resp, handler) {
      final data = resp.data;
      // 401 + auth_invalid → 全局登出
      if (resp.statusCode == 401 && data is Map &&
          (data['code'] == 'auth_invalid' || data['code'] == 'forbidden')) {
        _onAuthInvalid?.call(data['message']?.toString() ?? '登录已过期');
      }
      handler.next(resp);
    },
  ));

  String? _token;
  static const _kToken = 'auth_token';

  /// app 启动时由 AuthProvider 注册：当后端返回 401 时全局登出
  void Function(String reason)? _onAuthInvalid;
  void onAuthInvalid(void Function(String reason) cb) => _onAuthInvalid = cb;

  String? get token => _token;

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

  /// 改密成功后服务端会签发新 token，旧 token 失效。返回新的 user。
  Future<AppUser> changePassword(String oldPwd, String newPwd) async {
    final r = await _dio.post('/api/auth/change-password',
      data: {'old_password': oldPwd, 'new_password': newPwd});
    _check(r.data);
    await _saveToken(r.data['data']['token'] as String);
    return AppUser.fromJson(r.data['data']['user']);
  }

  Future<AppUser> updateNickname(String nickname) async {
    final r = await _dio.patch('/api/auth/profile', data: {'nickname': nickname});
    _check(r.data);
    return AppUser.fromJson(r.data['data']);
  }

  /// 注销账号 — 后端实际只是禁用 + 释放手机号 + 失效 token。
  Future<void> deleteAccount(String password) async {
    final r = await _dio.post('/api/auth/delete-account',
      data: {'password': password});
    _check(r.data);
    await _saveToken(null);
  }

  /// 隐私政策页面 URL（如需用浏览器/WebView 打开）
  String get privacyUrl => '$baseUrl/legal/privacy';

  /// 拉取 Markdown 形态的隐私政策（前端自渲染）
  Future<({String content, String? updatedAt})> fetchPrivacy() async {
    final r = await _dio.get('/legal/privacy.json');
    final d = r.data['data'] as Map<String, dynamic>;
    return (
      content: d['content'] as String? ?? '',
      updatedAt: d['updated_at'] as String?,
    );
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
    LocationInfo? location, WeatherInfo? weather,
  }) async {
    final r = await _dio.post('/api/diary', data: {
      if (diaryId != null) 'diary_id': diaryId,
      'title': title, 'content': content,
      'date': date.toUtc().toIso8601String(),
      if (score != null) 'score': score,
      if (tag != null) 'tag': tag,
      if (location != null) 'location': location.toJson(),
      if (weather != null) 'weather': weather.toJson(),
    });
    _check(r.data);
    return r.data['diary_id'] as int;
  }

  Future<void> deleteDiary(int diaryId) async {
    final r = await _dio.delete('/api/diary/$diaryId');
    _check(r.data);
  }

  // ========== Chat ==========

  /// 返回 {content: {...}, vitality: int}
  Future<Map<String, dynamic>> chat(List<ChatMessage> history,
      {String? weather, String? location}) async {
    final r = await _dio.post('/api/chat', data: {
      'messages': history.map((m) => m.toApi()).toList(),
      if (weather != null) 'weather': weather,
      if (location != null) 'location': location,
    });
    final data = r.data;
    if (data['success'] != true) {
      if (data['code'] == 'vitality_insufficient') {
        throw VitalityInsufficient();
      }
      throw ApiError(data['error'] ?? '对话服务异常');
    }
    return {
      'content': data['content'] as Map<String, dynamic>,
      'vitality': data['vitality'] as int? ?? 0,
    };
  }

  // ========== Vitality ==========

  Future<int> vitalityBalance() async {
    final r = await _dio.get('/api/vitality/balance');
    _check(r.data);
    return r.data['balance'] as int;
  }

  Future<List<VitalityDay>> vitalityHistory() async {
    final r = await _dio.get('/api/vitality/history');
    _check(r.data);
    final list = (r.data['data'] as List).cast<Map<String, dynamic>>();
    return list.map(VitalityDay.fromJson).toList();
  }

  /// 兑换码兑换。返回 (新余额, 获得的活力)
  Future<(int balance, int gained)> redeemCode(String code) async {
    final r = await _dio.post('/api/vitality/redeem', data: {'code': code});
    _check(r.data);
    return (r.data['vitality'] as int, r.data['gained'] as int);
  }

  // ========== Public settings (云控) ==========

  Future<Map<String, bool>> publicSettings() async {
    final r = await _dio.get('/api/settings/public');
    if (r.data['status'] != 'success') return {};
    final m = (r.data['data'] as Map).cast<String, dynamic>();
    return m.map((k, v) => MapEntry(k, v == true));
  }

  // ========== Geo + Weather ==========

  Future<AppContext?> fetchGeoContext(double lat, double lon) async {
    try {
      final r = await _dio.get('/api/geo/context',
        queryParameters: {'lat': lat, 'lon': lon});
      if (r.data['status'] != 'success') return null;
      return AppContext.fromJson(r.data['data'] as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
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
      final code = data['code']?.toString();
      final msg = data['message'] as String? ?? '请求失败';
      if (code == 'rate_limited' || code == 'account_locked') {
        throw RateLimited(msg);
      }
      throw ApiError(msg);
    }
  }
}

class ApiError implements Exception {
  final String message;
  ApiError(this.message);
  @override String toString() => message;
}

class RateLimited implements Exception {
  final String message;
  RateLimited(this.message);
  @override String toString() => message;
}

class VitalityInsufficient implements Exception {
  VitalityInsufficient();
  @override String toString() => '活力不足，请充值后继续';
}
