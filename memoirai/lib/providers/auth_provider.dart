import 'package:flutter/foundation.dart';
import '../models/user.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  AppUser? _user;
  bool _loading = false;

  AppUser? get user => _user;
  bool get loading => _loading;
  bool get isAuthed => _user != null;

  Future<void> bootstrap() async {
    await ApiService.instance.init();
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
