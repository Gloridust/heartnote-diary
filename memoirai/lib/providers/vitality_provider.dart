import 'package:flutter/foundation.dart';
import '../models/vitality.dart';
import '../services/api_service.dart';

class VitalityProvider extends ChangeNotifier {
  int _balance = 0;
  List<VitalityDay> _history = [];
  bool _loading = false;
  String? _error;

  int get balance => _balance;
  List<VitalityDay> get history => _history;
  bool get loading => _loading;
  String? get error => _error;

  /// 仅刷新余额（聊天/保存日记后调用，便宜）
  Future<void> refreshBalance() async {
    try {
      _balance = await ApiService.instance.vitalityBalance();
      notifyListeners();
    } catch (_) {}
  }

  /// 拉余额 + 历史（充值页 / 详情页）
  Future<void> loadAll() async {
    _loading = true; _error = null; notifyListeners();
    try {
      final results = await Future.wait([
        ApiService.instance.vitalityBalance(),
        ApiService.instance.vitalityHistory(),
      ]);
      _balance = results[0] as int;
      _history = results[1] as List<VitalityDay>;
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false; notifyListeners();
    }
  }

  /// 本地直接设置余额（chat 接口已返回最新值，避免再发一次请求）
  void setBalance(int v) {
    if (v == _balance) return;
    _balance = v;
    notifyListeners();
  }

  Future<int> redeem(String code) async {
    final (newBalance, gained) = await ApiService.instance.redeemCode(code);
    _balance = newBalance;
    notifyListeners();
    // 顺便刷历史
    loadAll();
    return gained;
  }

  void clear() {
    _balance = 0; _history = []; notifyListeners();
  }
}
