// 地理位置和天气服务

export interface LocationInfo {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  district: string;
  street: string;
  country: string;
  formatted_address: string;
}

export interface WeatherInfo {
  temperature: number;
  description: string;
  icon: string;
  humidity: number;
  wind_speed: number;
  feels_like: number;
}

export interface LocationWeatherData {
  location: LocationInfo;
  weather: WeatherInfo;
  timestamp: string;
}

// OpenWeatherMap API 密钥 - 客户端环境变量
const OPENWEATHER_API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;

/**
 * 获取用户当前位置
 */
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('浏览器不支持地理位置服务'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('📍 GPS位置获取成功:', position.coords);
        resolve(position);
      },
      (error) => {
        console.error('❌ GPS位置获取失败:', error);
        let errorMessage = '获取位置失败';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '用户拒绝了位置权限请求';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = '位置信息不可用';
            break;
          case error.TIMEOUT:
            errorMessage = '获取位置超时';
            break;
          default:
            errorMessage = '未知的位置错误';
            break;
        }
        
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5分钟缓存
      }
    );
  });
}

/**
 * 使用OpenStreetMap逆地理编码获取详细地址
 */
export async function getAddressFromCoordinates(
  latitude: number, 
  longitude: number
): Promise<LocationInfo> {
  try {
    console.log('🗺️ 开始逆地理编码:', latitude, longitude);
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=zh-CN,zh`,
      {
        headers: {
          'User-Agent': 'HeartnoteApp/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`逆地理编码请求失败: ${response.status}`);
    }

    const data = await response.json();
    console.log('🏠 逆地理编码结果:', data);

    if (!data || !data.address) {
      throw new Error('未找到地址信息');
    }

    const address = data.address;
    
    // 构建详细地址信息
    const locationInfo: LocationInfo = {
      latitude,
      longitude,
      address: data.display_name || '',
      city: address.city || address.town || address.village || '',
      district: address.suburb || address.district || address.county || '',
      street: address.road || address.pedestrian || '',
      country: address.country || '',
      formatted_address: formatChineseAddress(address)
    };

    console.log('📍 格式化的位置信息:', locationInfo);
    return locationInfo;

  } catch (error) {
    console.error('❌ 逆地理编码失败:', error);
    throw error;
  }
}

/**
 * 格式化中文地址
 */
function formatChineseAddress(address: {
  state?: string;
  city?: string;
  town?: string;
  suburb?: string;
  district?: string;
  county?: string;
  road?: string;
  pedestrian?: string;
  display_name?: string;
}): string {
  const parts = [];
  
  // 按照中文地址习惯组织：省市区街道
  if (address.state) parts.push(address.state);
  if (address.city || address.town) parts.push(address.city || address.town);
  if (address.suburb || address.district || address.county) {
    parts.push(address.suburb || address.district || address.county);
  }
  if (address.road || address.pedestrian) {
    parts.push(address.road || address.pedestrian);
  }
  
  return parts.join('') || address.display_name || '位置未知';
}

/**
 * 使用OpenWeatherMap获取天气信息
 */
export async function getWeatherFromCoordinates(
  latitude: number, 
  longitude: number
): Promise<WeatherInfo> {
  if (!OPENWEATHER_API_KEY) {
    throw new Error('OpenWeatherMap API密钥未配置。请在 .env.local 文件中设置 NEXT_PUBLIC_OPENWEATHER_API_KEY 并重启开发服务器');
  }

  try {
    console.log('🌤️ 开始获取天气信息:', latitude, longitude);
    
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=zh_cn`
    );

    if (!response.ok) {
      throw new Error(`天气API请求失败: ${response.status}`);
    }

    const data = await response.json();
    console.log('🌦️ 天气API结果:', data);

    const weatherInfo: WeatherInfo = {
      temperature: Math.round(data.main.temp),
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      humidity: data.main.humidity,
      wind_speed: data.wind?.speed || 0,
      feels_like: Math.round(data.main.feels_like)
    };

    console.log('🌡️ 格式化的天气信息:', weatherInfo);
    return weatherInfo;

  } catch (error) {
    console.error('❌ 获取天气失败:', error);
    throw error;
  }
}

/**
 * 获取完整的位置和天气信息
 */
export async function getLocationAndWeather(): Promise<LocationWeatherData> {
  try {
    console.log('🌍 开始获取位置和天气信息...');
    
    // 1. 获取GPS坐标
    const position = await getCurrentPosition();
    const { latitude, longitude } = position.coords;

    // 2. 并行获取地址和天气信息
    const [location, weather] = await Promise.all([
      getAddressFromCoordinates(latitude, longitude),
      getWeatherFromCoordinates(latitude, longitude)
    ]);

    const result: LocationWeatherData = {
      location,
      weather,
      timestamp: new Date().toISOString()
    };

    console.log('✅ 位置和天气信息获取完成:', result);
    return result;

  } catch (error) {
    console.error('❌ 获取位置和天气信息失败:', error);
    throw error;
  }
}

/**
 * 格式化天气信息为可读字符串
 */
export function formatWeatherForPrompt(weather: WeatherInfo): string {
  return `${weather.temperature}℃，${weather.description}`;
}

/**
 * 格式化位置信息为可读字符串
 */
export function formatLocationForPrompt(location: LocationInfo): string {
  return location.formatted_address;
} 