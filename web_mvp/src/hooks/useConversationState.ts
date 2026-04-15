import { useState, useEffect, useCallback } from 'react';
import { Message, DiaryEntry } from '../lib/data';
import { useIsClient } from './useClientOnly';

// AI聊天消息格式
export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ConversationState {
  messages: Message[];
  diaryEntry: DiaryEntry | null;
  hasStartedConversation: boolean;
  showDiaryPreview: boolean;
  aiChatHistory: AIChatMessage[]; // 新增：AI对话历史
  timestamp: string;
}

const CONVERSATION_STORAGE_KEY = 'heartnote_conversation_state';
const CONVERSATION_TIMEOUT = 24 * 60 * 60 * 1000; // 24小时后过期

export function useConversationState() {
  const isClient = useIsClient();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [diaryEntry, setDiaryEntry] = useState<DiaryEntry | null>(null);
  const [hasStartedConversation, setHasStartedConversation] = useState(false);
  const [showDiaryPreview, setShowDiaryPreview] = useState(false);
  const [aiChatHistory, setAiChatHistory] = useState<AIChatMessage[]>([]);

  // 从localStorage加载对话状态
  const loadConversationState = useCallback(() => {
    if (!isClient) return;

    try {
      const savedState = localStorage.getItem(CONVERSATION_STORAGE_KEY);
      if (!savedState) return;

      const parsedState: ConversationState = JSON.parse(savedState);
      
      // 检查是否过期
      const timeDiff = Date.now() - new Date(parsedState.timestamp).getTime();
      if (timeDiff > CONVERSATION_TIMEOUT) {
        console.log('💭 对话状态已过期，清除缓存');
        localStorage.removeItem(CONVERSATION_STORAGE_KEY);
        return;
      }

      // 恢复对话状态
      console.log('💭 恢复对话状态:', parsedState);
      setMessages(parsedState.messages || []);
      setDiaryEntry(parsedState.diaryEntry || null);
      setHasStartedConversation(parsedState.hasStartedConversation || false);
      setShowDiaryPreview(parsedState.showDiaryPreview || false);
      setAiChatHistory(parsedState.aiChatHistory || []);
      
    } catch (error) {
      console.error('❌ 加载对话状态失败:', error);
      localStorage.removeItem(CONVERSATION_STORAGE_KEY);
    }
  }, [isClient]);

  // 保存对话状态到localStorage
  const saveConversationState = useCallback(() => {
    if (!isClient) return;

    try {
      const stateToSave: ConversationState = {
        messages,
        diaryEntry,
        hasStartedConversation,
        showDiaryPreview,
        aiChatHistory,
        timestamp: new Date().toISOString()
      };

      localStorage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(stateToSave));
      console.log('💾 对话状态已保存');
    } catch (error) {
      console.error('❌ 保存对话状态失败:', error);
    }
  }, [isClient, messages, diaryEntry, hasStartedConversation, showDiaryPreview]);

  // 清除对话状态
  const clearConversationState = useCallback(() => {
    if (!isClient) return;

    try {
      localStorage.removeItem(CONVERSATION_STORAGE_KEY);
      setMessages([]);
      setDiaryEntry(null);
      setHasStartedConversation(false);
      setShowDiaryPreview(false);
      setAiChatHistory([]);
      console.log('🗑️ 对话状态已清除');
    } catch (error) {
      console.error('❌ 清除对话状态失败:', error);
    }
  }, [isClient]);

  // 组件挂载时加载状态
  useEffect(() => {
    loadConversationState();
  }, [loadConversationState]);

  // 状态变化时自动保存
  useEffect(() => {
    if (isClient && (messages.length > 0 || diaryEntry || hasStartedConversation || aiChatHistory.length > 0)) {
      saveConversationState();
    }
  }, [isClient, messages, diaryEntry, hasStartedConversation, showDiaryPreview, aiChatHistory, saveConversationState]);

  // 页面卸载前保存状态
  useEffect(() => {
    if (!isClient) return;

    const handleBeforeUnload = () => {
      saveConversationState();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveConversationState();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isClient, saveConversationState]);

  return {
    // 状态
    messages,
    diaryEntry,
    hasStartedConversation,
    showDiaryPreview,
    aiChatHistory,
    
    // 状态更新函数
    setMessages,
    setDiaryEntry,
    setHasStartedConversation,
    setShowDiaryPreview,
    setAiChatHistory,
    
    // 持久化操作
    saveConversationState,
    clearConversationState,
    loadConversationState
  };
} 