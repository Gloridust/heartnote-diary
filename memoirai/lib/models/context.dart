/// 位置 / 天气上下文模型（随日记一起存，也喂给 LLM）
class LocationInfo {
  final double latitude;
  final double longitude;
  final String formattedAddress;
  final String city;
  final String district;
  final String street;

  LocationInfo({
    required this.latitude, required this.longitude,
    required this.formattedAddress,
    required this.city, required this.district, required this.street,
  });

  factory LocationInfo.fromJson(Map<String, dynamic> j) => LocationInfo(
    latitude: (j['latitude'] as num).toDouble(),
    longitude: (j['longitude'] as num).toDouble(),
    formattedAddress: j['formatted_address'] as String? ?? '',
    city: j['city'] as String? ?? '',
    district: j['district'] as String? ?? '',
    street: j['street'] as String? ?? '',
  );

  Map<String, dynamic> toJson() => {
    'latitude': latitude, 'longitude': longitude,
    'formatted_address': formattedAddress,
    'city': city, 'district': district, 'street': street,
  };

  /// 喂给 LLM 用的简短文本
  String toPromptLabel() {
    if (formattedAddress.isNotEmpty) return formattedAddress;
    final bits = [city, district, street].where((s) => s.isNotEmpty).join('');
    return bits.isEmpty ? '未知位置' : bits;
  }
}

class WeatherInfo {
  final int temperature;
  final int feelsLike;
  final String description;
  final String icon;
  final int humidity;
  final String windDirection;
  final String windPower;

  WeatherInfo({
    required this.temperature, required this.feelsLike,
    required this.description, required this.icon,
    required this.humidity,
    required this.windDirection, required this.windPower,
  });

  factory WeatherInfo.fromJson(Map<String, dynamic> j) => WeatherInfo(
    temperature: (j['temperature'] as num?)?.toInt() ?? 0,
    feelsLike: (j['feels_like'] as num?)?.toInt() ?? 0,
    description: j['description'] as String? ?? '',
    icon: j['icon'] as String? ?? 'unknown',
    humidity: (j['humidity'] as num?)?.toInt() ?? 0,
    windDirection: j['wind_direction'] as String? ?? '',
    windPower: j['wind_power'] as String? ?? '',
  );

  Map<String, dynamic> toJson() => {
    'temperature': temperature, 'feels_like': feelsLike,
    'description': description, 'icon': icon,
    'humidity': humidity,
    'wind_direction': windDirection, 'wind_power': windPower,
  };

  String get iconEmoji {
    switch (icon) {
      case 'sunny':   return '☀️';
      case 'cloudy':  return '⛅';
      case 'rain':    return '🌧️';
      case 'thunder': return '⛈️';
      case 'snow':    return '❄️';
      case 'fog':     return '🌫️';
      default:        return '🌡️';
    }
  }

  /// 喂给 LLM 的简短文本
  String toPromptLabel() => '$description ${temperature}°C';
}

class AppContext {
  final LocationInfo? location;
  final WeatherInfo? weather;
  AppContext({this.location, this.weather});

  bool get hasAny => location != null || weather != null;

  factory AppContext.fromJson(Map<String, dynamic> j) => AppContext(
    location: j['location'] == null ? null : LocationInfo.fromJson(j['location']),
    weather: j['weather'] == null ? null : WeatherInfo.fromJson(j['weather']),
  );

  Map<String, dynamic> toJson() => {
    if (location != null) 'location': location!.toJson(),
    if (weather != null) 'weather': weather!.toJson(),
  };
}
