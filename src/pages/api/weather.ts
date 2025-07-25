import { NextApiRequest, NextApiResponse } from 'next';

interface WeatherResponse {
  status: 'success' | 'error';
  message?: string;
  data?: {
    temperature: number;
    description: string;
    icon: string;
    humidity: number;
    wind_speed: number;
    feels_like: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WeatherResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ 
      status: 'error', 
      message: `Method ${req.method} Not Allowed` 
    });
  }

  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        status: 'error',
        message: '缺少必需的lat和lon参数'
      });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        status: 'error',
        message: 'lat和lon必须是有效的数字'
      });
    }

    const OPENWEATHER_API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
    
    if (!OPENWEATHER_API_KEY) {
      return res.status(500).json({
        status: 'error',
        message: 'OpenWeatherMap API密钥未配置'
      });
    }

    console.log('🌤️ 服务器端获取天气信息:', latitude, longitude);

    // 使用OpenWeatherMap API
    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=zh_cn`
    );

    if (!weatherResponse.ok) {
      throw new Error(`天气API请求失败: ${weatherResponse.status}`);
    }

    const weatherData = await weatherResponse.json();
    console.log('☀️ OpenWeatherMap响应:', weatherData);

    if (!weatherData || !weatherData.main) {
      throw new Error('未找到天气信息');
    }

    const result = {
      temperature: Math.round(weatherData.main.temp),
      description: weatherData.weather?.[0]?.description || '未知',
      icon: weatherData.weather?.[0]?.icon || '01d',
      humidity: weatherData.main.humidity || 0,
      wind_speed: weatherData.wind?.speed || 0,
      feels_like: Math.round(weatherData.main.feels_like || weatherData.main.temp)
    };

    console.log('✅ 天气信息获取成功:', result);

    res.status(200).json({
      status: 'success',
      data: result
    });

  } catch (error) {
    console.error('❌ 天气API错误:', error);
    
    let errorMessage = '获取天气信息失败';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    res.status(500).json({
      status: 'error',
      message: errorMessage
    });
  }
} 