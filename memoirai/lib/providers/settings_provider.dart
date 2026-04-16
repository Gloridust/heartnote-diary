import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

/// 云控开关。客户端启动时拉一次；UI 监听变化即时反应。
class SettingsProvider extends ChangeNotifier {
  Map<String, bool> _flags = {
    'redeem_code_enabled': false,
    'iap_enabled': true,
  };
  bool _loaded = false;

  bool get loaded => _loaded;
  bool flag(String key, {bool defaultValue = false}) =>
    _flags[key] ?? defaultValue;

  bool get redeemCodeEnabled => flag('redeem_code_enabled');
  bool get iapEnabled => flag('iap_enabled', defaultValue: true);

  Future<void> refresh() async {
    try {
      final m = await ApiService.instance.publicSettings();
      if (m.isNotEmpty) _flags = {..._flags, ...m};
      _loaded = true;
      notifyListeners();
    } catch (_) {
      _loaded = true;
      notifyListeners();
    }
  }
}
