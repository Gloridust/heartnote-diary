/// 环境配置 — 编译期注入，UI 层不暴露服务端地址设置。
///
/// 本地调试：`flutter run --dart-define=ENV=dev`
/// 构建云端：`flutter build apk --dart-define=ENV=cloud`（或不传，默认 cloud）
///
/// 如需覆盖本地后端地址：`--dart-define=DEV_API=http://192.168.1.10:5000`
class Env {
  static const String mode = String.fromEnvironment('ENV', defaultValue: 'cloud');

  /// 本地开发后端
  /// - Android 模拟器：10.0.2.2 映射到宿主机 localhost
  /// - iOS 模拟器 / 桌面 / Web：localhost 即可
  /// 真机调试时用 --dart-define=DEV_API=... 覆盖
  static const String _devDefault = String.fromEnvironment(
    'DEV_API', defaultValue: 'http://10.0.2.2:5000');

  /// 生产/云端后端（部署后改这里；或用 --dart-define=CLOUD_API=... 覆盖）
  static const String _cloudDefault = String.fromEnvironment(
    'CLOUD_API', defaultValue: 'https://api.memoirai.example.com');

  static bool get isDev => mode == 'dev';
  static String get apiBaseUrl => isDev ? _devDefault : _cloudDefault;
  static String get label => isDev ? 'DEV' : 'CLOUD';
}
