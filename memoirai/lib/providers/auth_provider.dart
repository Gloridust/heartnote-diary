import 'package:flutter/foundation.dart';
import '../models/user.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  AppUser? _user;
  bool _loading = false;

  AppUser? get user => _user;
  bool get loading => _loading;
  bool get isAuthed => _user != null;

  /// 收到 401 / 403 时被 ApiService 调用
  String? lastForceLogoutReason;
  bool get hadForceLogout => lastForceLogoutReason != null;
  void clearForceLogout() { lastForceLogoutReason = null; notifyListeners(); }

  Future<void> bootstrap() async {
    await ApiService.instance.init();
    ApiService.instance.onAuthInvalid((reason) async {
      // 服务端宣告令牌失效（改密/重置/禁用）
      lastForceLogoutReason = reason;
      _user = null;
      await ApiService.instance.logout();
      notifyListeners();
    });
    if (ApiService.instance.isAuthed) {
      try {
        _user = await ApiService.instance.me();
        notifyListeners();
      } catch (_) {
        await ApiService.instance.logout();
      }
    }
  }

  Future<void> login(String identifier, String password) async {
    _loading = true; notifyListeners();
    try {
      _user = await ApiService.instance.login(identifier: identifier, password: password);
    } finally {
      _loading = false; notifyListeners();
    }
  }

  Future<void> register(String phone, String password, {String? nickname}) async {
    _loading = true; notifyListeners();
    try {
      _user = await ApiService.instance.register(
        phone: phone, password: password, nickname: nickname);
    } finally {
      _loading = false; notifyListeners();
    }
  }

  Future<void> logout() async {
    await ApiService.instance.logout();
    _user = null;
    notifyListeners();
  }

  Future<void> refresh() async {
    _user = await ApiService.instance.me();
    notifyListeners();
  }

  void setUser(AppUser u) {
    _user = u;
    notifyListeners();
  }
}
