// 数据类型定义
export interface Message {
  id: number;
  content: string;
  isUser: boolean;
  timestamp: string;
}

export interface DiaryEntry {
  id: number;
  date: string;
  title: string;
  content: string;
  time: string;
  generated?: boolean;
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
}

export interface ConversationSession {
  id: number;
  date: string;
  messages: Message[];
  diaryEntry?: DiaryEntry;
}

// 模拟数据存储
const conversations: ConversationSession[] = [];
const diaryEntries: DiaryEntry[] = [
  {
    id: 1,
    date: '2023-11-16',
    title: '我的心情日记',
    content: '今天是个特别的日子，早上醒来看到窗外阳光明媚，心情也变得格外愉悦。决定给自己放个假，去了那家一直想去的咖啡馆...',
    time: '10:30'
  },
  {
    id: 2,
    date: '2023-11-16',
    title: '与AI聊天记录',
    content: '你能给我推荐一些放松心情的方法吗？当然可以！以下是几种有效的放松方法：1.深呼吸练习；2.听一些轻柔的音乐；3.短暂散步；4.冥想5分钟；5.喝杯热茶...',
    time: '15:45'
  },
  {
    id: 3,
    date: '2023-11-16',
    title: '今日总结',
    content: '回顾这一天，完成了工作任务，尝试了新的放松技巧，整体感觉不错。明天计划早起去晨跑，然后...',
    time: '22:10'
  }
];

// API接口预留 - 对话相关
export const conversationAPI = {
  // 开始新对话
  startConversation: async (): Promise<ConversationSession> => {
    // TODO: 实际的API调用
    const newSession: ConversationSession = {
      id: Date.now(),
      date: new Date().toISOString(),
      messages: []
    };
    conversations.push(newSession);
    return newSession;
  },

  // 发送消息
  sendMessage: async (sessionId: number, message: string): Promise<Message> => {
    // TODO: 实际的API调用到LLM服务
    const newMessage: Message = {
      id: Date.now(),
      content: message,
      isUser: true,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    };
    return newMessage;
  },

  // 获取AI回复
  getAIResponse: async (sessionId: number, userMessage: string): Promise<Message> => {
    // TODO: 实际的API调用到LLM服务
    // 这里可以集成OpenAI、Claude或其他LLM API
    const response: Message = {
      id: Date.now() + 1,
      content: "这是AI的回复", // 将由实际LLM生成
      isUser: false,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    };
    return response;
  },

  // 生成日记
  generateDiary: async (sessionId: number): Promise<DiaryEntry> => {
    // TODO: 基于对话内容生成日记的API调用
    const diary: DiaryEntry = {
      id: Date.now(),
      date: new Date().toLocaleDateString('zh-CN'),
      title: '今日日记',
      content: '基于对话生成的日记内容...', // 将由LLM生成
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      generated: true
    };
    return diary;
  }
};

// API接口预留 - 日记相关
export const diaryAPI = {
  // 获取所有日记
  getAllDiaries: async (): Promise<DiaryEntry[]> => {
    // TODO: 实际的API调用
    return diaryEntries;
  },

  // 根据日期获取日记
  getDiariesByDate: async (date: string): Promise<DiaryEntry[]> => {
    // TODO: 实际的API调用
    return diaryEntries.filter(entry => entry.date === date);
  },

  // 保存日记
  saveDiary: async (diary: DiaryEntry): Promise<DiaryEntry> => {
    // TODO: 实际的API调用
    diaryEntries.push(diary);
    return diary;
  },

  // 更新日记
  updateDiary: async (id: number, updates: Partial<DiaryEntry>): Promise<DiaryEntry> => {
    // TODO: 实际的API调用
    const index = diaryEntries.findIndex(d => d.id === id);
    if (index !== -1) {
      diaryEntries[index] = { ...diaryEntries[index], ...updates };
      return diaryEntries[index];
    }
    throw new Error('日记未找到');
  },

  // 删除日记
  deleteDiary: async (id: number): Promise<void> => {
    // TODO: 实际的API调用
    const index = diaryEntries.findIndex(d => d.id === id);
    if (index !== -1) {
      diaryEntries.splice(index, 1);
    }
  },

  // 获取有日记的日期列表
  getDatesWithDiaries: async (): Promise<string[]> => {
    // TODO: 实际的API调用
    return Array.from(new Set(diaryEntries.map(entry => entry.date)));
  }
};

// 用户设置类型定义
export interface UserSettings {
  theme: string;
  language: string;
  notifications: boolean;
}

// 用户配置相关API预留
export const userAPI = {
  // 获取用户设置
  getUserSettings: async (): Promise<UserSettings> => {
    // TODO: 实际的API调用
    return {
      theme: 'purple',
      language: 'zh-CN',
      notifications: true
    };
  },

  // 更新用户设置
  updateUserSettings: async (settings: UserSettings): Promise<UserSettings> => {
    // TODO: 实际的API调用
    return settings;
  }
};

// 导出模拟数据供开发使用
export const mockData = {
  diaryEntries,
  datesWithDiary: ['2023-11-07', '2023-11-10', '2023-11-13', '2023-11-15', '2023-11-16']
}; 