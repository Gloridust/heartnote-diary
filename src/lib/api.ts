// API接口封装
import { DiaryEntry } from './data';

// 使用本地Next.js API路由，直接连接Supabase
const API_BASE_URL = '/api';

// 日记数据接口
export interface DiaryApiRequest {
  id: number;           // 用户ID
  diary_id?: number;    // 日记ID (可选，更新时使用)
  title: string;        // 日记标题
  content: string;      // 日记内容
  date: string;         // 日期时间 (YYYY-MM-DD HH:MM:SS)
  score?: number;       // 心情评分 (1-10)
  tag?: string;         // 标签
  location?: {          // 位置信息
    latitude: number;
    longitude: number;
    formatted_address: string;
    city: string;
    district: string;
    street: string;
  };
  weather?: {           // 天气信息
    temperature: number;
    description: string;
    icon: string;
    humidity: number;
    wind_speed: number;
    feels_like: number;
  };
}

export interface DiaryApiResponse {
  status: 'success' | 'error';
  message: string;
  diary_id?: number;
  user_id?: number;
  action?: string;
}

export interface DiaryListResponse {
  status: 'success' | 'error';
  message?: string;
  user_id?: number;
  total?: number;
  data?: {
    diary_id: number;
    title: string;
    content: string;
    date: string;
    score?: number;
    tag?: string;
  }[];
}

// 保存/更新日记
export async function saveDiary(diaryData: DiaryApiRequest): Promise<DiaryApiResponse> {
  try {
    console.log('📝 保存日记到数据库:', diaryData);
    
    const response = await fetch(`${API_BASE_URL}/diary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(diaryData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: DiaryApiResponse = await response.json();
    console.log('✅ 日记保存成功:', result);
    
    return result;
  } catch (error) {
    console.error('❌ 保存日记失败:', error);
    throw error;
  }
}

// 获取用户所有日记
export async function getUserDiaries(userId: number): Promise<DiaryListResponse> {
  try {
    console.log('📖 获取用户日记:', userId);
    
    const response = await fetch(`${API_BASE_URL}/diary?userId=${userId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          status: 'error',
          message: `用户 ${userId} 不存在`,
        };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: DiaryListResponse = await response.json();
    console.log('✅ 获取日记成功:', result);
    
    return result;
  } catch (error) {
    console.error('❌ 获取日记失败:', error);
    throw error;
  }
}

// 格式化日期为API要求的格式
export function formatDateForApi(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 从API日期字符串解析为Date对象
export function parseDateFromApi(dateString: string): Date {
  return new Date(dateString);
}

// 格式化日期为日历显示格式 (YYYY-MM-DD)
export function formatDateForCalendar(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 从API日期字符串提取日期部分 (YYYY-MM-DD)
export function extractDateFromApiString(apiDateString: string): string {
  // 处理两种格式：ISO格式 '2025-07-25T00:15:39+00:00' 和旧格式 '2025-07-25 23:49:23'
  if (apiDateString.includes('T')) {
    // ISO格式：取T前面的日期部分
    return apiDateString.split('T')[0];
  } else {
    // 旧格式：取空格前的日期部分
    return apiDateString.split(' ')[0];
  }
}

// 从API日期字符串提取时间部分 (HH:MM)
export function extractTimeFromApiString(apiDateString: string): string {
  try {
    // 处理两种格式：ISO格式和旧格式
    if (apiDateString.includes('T')) {
      // ISO格式：解析为Date对象，然后格式化时间
      const date = new Date(apiDateString);
      return date.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } else {
      // 旧格式：取空格后的时间部分
      const timePart = apiDateString.split(' ')[1];
      if (timePart) {
        return timePart.substring(0, 5); // 只取HH:MM部分
      }
    }
  } catch (error) {
    console.error('解析时间失败:', apiDateString, error);
  }
  return '00:00';
}

// API数据转换为本地DiaryEntry格式
export function convertApiDataToDiaryEntry(apiData: {
  diary_id: number;
  title: string;
  content: string;
  date: string;
  score?: number;
  tag?: string;
  location?: {
    latitude: number;
    longitude: number;
    formatted_address: string;
    city: string;
    district: string;
    street: string;
  };
  weather?: {
    temperature: number;
    description: string;
    icon: string;
    humidity: number;
    wind_speed: number;
    feels_like: number;
  };
}): DiaryEntry {
  return {
    id: apiData.diary_id,
    date: extractDateFromApiString(apiData.date),
    title: apiData.title,
    content: apiData.content,
    time: extractTimeFromApiString(apiData.date),
    generated: true, // 从数据库来的都标记为已生成
    score: apiData.score || 5,
    tag: apiData.tag || 'personal',
    location: apiData.location,
    weather: apiData.weather
  };
}

// 用户ID管理
export const UserStorage = {
  // 获取当前用户ID
  getCurrentUserId(): number | null {
    if (typeof window === 'undefined') return null;
    
    const userId = localStorage.getItem('heartnote_user_id');
    return userId ? parseInt(userId, 10) : null;
  },

  // 设置用户ID
  setUserId(userId: number): void {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem('heartnote_user_id', userId.toString());
    console.log('👤 用户ID已设置:', userId);
  },

  // 清除用户ID
  clearUserId(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem('heartnote_user_id');
    console.log('👤 用户ID已清除');
  },

  // 生成随机用户ID (如果没有设置)
  generateUserId(): number {
    const randomId = Math.floor(Math.random() * 900000) + 100000; // 6位随机数
    this.setUserId(randomId);
    return randomId;
  },

  // 获取或创建用户ID
  getOrCreateUserId(): number {
    let userId = this.getCurrentUserId();
    if (!userId) {
      userId = this.generateUserId();
    }
    return userId;
  }
}; 