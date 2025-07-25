import { NextApiRequest, NextApiResponse } from 'next';

interface GeocodingResponse {
  status: 'success' | 'error';
  message?: string;
  data?: {
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    district: string;
    street: string;
    country: string;
    formatted_address: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GeocodingResponse>
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

    console.log('🗺️ 服务器端逆地理编码:', latitude, longitude);

    // 使用OpenStreetMap Nominatim API
    const nominatimResponse = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=zh-CN,zh`,
      {
        headers: {
          'User-Agent': 'HeartnoteApp/1.0 (https://heartnote.app)'
        }
      }
    );

    if (!nominatimResponse.ok) {
      throw new Error(`逆地理编码请求失败: ${nominatimResponse.status}`);
    }

    const nominatimData = await nominatimResponse.json();
    console.log('🏠 Nominatim响应:', nominatimData);

    if (!nominatimData || !nominatimData.address) {
      throw new Error('未找到地址信息');
    }

    const address = nominatimData.address;

    // 格式化中文地址
    const formatChineseAddress = () => {
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
      
      return parts.join('') || nominatimData.display_name || '位置未知';
    };

    const locationData = {
      latitude,
      longitude,
      address: nominatimData.display_name || '',
      city: address.city || address.town || address.village || '',
      district: address.suburb || address.district || address.county || '',
      street: address.road || address.pedestrian || '',
      country: address.country || '',
      formatted_address: formatChineseAddress()
    };

    console.log('✅ 地理编码成功:', locationData);

    res.status(200).json({
      status: 'success',
      data: locationData
    });

  } catch (error) {
    console.error('❌ 地理编码API错误:', error);
    
    let errorMessage = '逆地理编码失败';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    res.status(500).json({
      status: 'error',
      message: errorMessage
    });
  }
} 