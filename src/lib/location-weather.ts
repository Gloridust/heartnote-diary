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
// OpenWeather API密钥现在在服务器端使用，前端不再需要

/**
 * 获取用户当前位置
 */
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('浏览器不支持地理位置服务'));
      return;
    }

    console.log('📱 检测设备类型:', {
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      isStandalone: window.matchMedia('(display-mode: standalone)').matches,
      userAgent: navigator.userAgent
    });

    // iOS Safari 需要特殊处理
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const timeout = isIOS ? 15000 : 10000; // iOS需要更长超时时间
    const maximumAge = isIOS ? 60000 : 300000; // iOS使用更短缓存

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('📍 GPS位置获取成功:', position.coords);
        console.log('🕐 位置时间戳:', new Date(position.timestamp));
        resolve(position);
      },
      (error) => {
        console.error('❌ GPS位置获取失败:', error);
        console.log('🔍 错误详情:', {
          code: error.code,
          message: error.message,
          isIOS,
          timestamp: new Date().toISOString()
        });
        
        let errorMessage = '获取位置失败';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = isIOS ? 
              'iOS设备需要在Safari设置中允许位置访问，并在页面权限中允许此网站' : 
              '用户拒绝了位置权限请求';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = isIOS ? 
              'iOS位置服务不可用，请确保GPS已开启并允许Safari访问位置' :
              '位置信息不可用';
            break;
          case error.TIMEOUT:
            errorMessage = isIOS ? 
              'iOS位置获取超时，请确保网络连接良好并重试' :
              '获取位置超时';
            break;
          default:
            errorMessage = `未知的位置错误 (代码: ${error.code})`;
            break;
        }
        
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: timeout,
        maximumAge: maximumAge
      }
    );
  });
}

/**
 * 使用Next.js API代理进行逆地理编码（iOS兼容）
 */
export async function getAddressFromCoordinates(
  latitude: number, 
  longitude: number
): Promise<LocationInfo> {
  try {
    console.log('🗺️ 开始逆地理编码 (通过Next.js API):', latitude, longitude);
    
    const response = await fetch(
      `/api/geocoding?lat=${latitude}&lon=${longitude}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`地理编码API请求失败: ${response.status}`);
    }

    const result = await response.json();
    console.log('🏠 地理编码API响应:', result);

    if (result.status !== 'success' || !result.data) {
      throw new Error(result.message || '地理编码失败');
    }

    const locationInfo: LocationInfo = {
      latitude,
      longitude,
      address: result.data.address,
      city: result.data.city,
      district: result.data.district,
      street: result.data.street,
      country: result.data.country,
      formatted_address: result.data.formatted_address
    };

    console.log('📍 格式化的位置信息:', locationInfo);
    return locationInfo;

  } catch (error) {
    console.error('❌ 逆地理编码失败:', error);
    throw error;
  }
}

/**
 * 格式化中文地址 - 市+精确位置（已弃用，现在使用API代理）
 */
function formatChineseAddress(address: {
  state?: string;
  city?: string;
  town?: string;
  village?: string;
  suburb?: string;
  district?: string;
  county?: string;
  road?: string;
  pedestrian?: string;
  house_number?: string;
  amenity?: string;
  shop?: string;
  building?: string;
  display_name?: string;
}): string {
  const city = address.city || address.town || address.village || '';
  const preciseLocation = [];
  
  // 收集精确位置信息：区/街道/建筑
  if (address.suburb || address.district || address.county) {
    preciseLocation.push(address.suburb || address.district || address.county);
  }
  if (address.road || address.pedestrian) {
    preciseLocation.push(address.road || address.pedestrian);
  }
  if (address.house_number) {
    preciseLocation.push(address.house_number + '号');
  }
  if (address.amenity || address.shop || address.building) {
    preciseLocation.push(address.amenity || address.shop || address.building);
  }
  
  // 格式：市+精确位置
  if (city && preciseLocation.length > 0) {
    return city + preciseLocation.join('');
  } else if (city) {
    return city;
  } else if (preciseLocation.length > 0) {
    return preciseLocation.join('');
  }
  
  return address.display_name || '位置未知';
}

/**
 * 使用Next.js API代理获取天气信息（iOS兼容）
 */
export async function getWeatherFromCoordinates(
  latitude: number, 
  longitude: number
): Promise<WeatherInfo> {
  try {
    console.log('🌤️ 开始获取天气信息 (通过Next.js API):', latitude, longitude);
    
    const response = await fetch(
      `/api/weather?lat=${latitude}&lon=${longitude}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`天气API请求失败: ${response.status}`);
    }

    const result = await response.json();
    console.log('🌦️ 天气API响应:', result);

    if (result.status !== 'success' || !result.data) {
      throw new Error(result.message || '天气信息获取失败');
    }

    const weatherInfo: WeatherInfo = {
      temperature: result.data.temperature,
      description: result.data.description,
      icon: result.data.icon,
      humidity: result.data.humidity,
      wind_speed: result.data.wind_speed,
      feels_like: result.data.feels_like
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

    // 2. 并行获取地址和天气信息，天气失败不影响位置
    const [locationResult, weatherResult] = await Promise.allSettled([
      getAddressFromCoordinates(latitude, longitude),
      getWeatherFromCoordinates(latitude, longitude)
    ]);

    // 处理地址信息
    let location: LocationInfo;
    if (locationResult.status === 'fulfilled') {
      location = locationResult.value;
    } else {
      console.warn('⚠️ 地址获取失败，使用默认值:', locationResult.reason);
      location = {
        latitude,
        longitude,
        address: '位置未知',
        city: '',
        district: '',
        street: '',
        country: '',
        formatted_address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
      };
    }

    // 处理天气信息
    let weather: WeatherInfo;
    if (weatherResult.status === 'fulfilled') {
      weather = weatherResult.value;
    } else {
      console.warn('⚠️ 天气获取失败，使用默认值:', weatherResult.reason);
      weather = {
        temperature: 0,
        description: '天气信息获取失败',
        icon: '01d',
        humidity: 0,
        wind_speed: 0,
        feels_like: 0
      };
    }

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