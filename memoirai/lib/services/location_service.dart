import 'package:geolocator/geolocator.dart';
import 'api_service.dart';
import '../models/context.dart';

/// 定位 + 天气获取服务
/// 流程：geolocator 拿 lat/lon → 打后端 `/api/geo/context` → 返回结构化结果
class LocationService {
  LocationService._();
  static final LocationService instance = LocationService._();

  /// 拉取当前位置+天气。失败时返回 null（不向用户报错，静默降级）。
  /// [timeout] 秒数，默认 8s；真机网络慢可设长一些。
  Future<AppContext?> fetch({int timeout = 8}) async {
    try {
      final granted = await _ensurePermission();
      if (!granted) return null;
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: LocationSettings(
          accuracy: LocationAccuracy.low,
          timeLimit: Duration(seconds: timeout),
        ),
      ).timeout(Duration(seconds: timeout + 2));

      final ctx = await ApiService.instance.fetchGeoContext(pos.latitude, pos.longitude);
      return ctx;
    } catch (_) {
      return null;
    }
  }

  Future<bool> _ensurePermission() async {
    final enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) return false;
    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    return perm == LocationPermission.always ||
           perm == LocationPermission.whileInUse;
  }
}
