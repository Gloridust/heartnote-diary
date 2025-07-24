import { useState, useRef, useCallback, useEffect } from 'react';

export interface VoiceMessage {
  id: number;
  content: string;
  isUser: boolean;
  timestamp: number;
}

export interface VoiceChatState {
  isRecording: boolean;
  isPaused: boolean;
  isConnected: boolean;
  error: string | null;
  isProcessing: boolean;
  messages: VoiceMessage[];
}

export interface VoiceChatActions {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => Promise<VoiceMessage[]>;
  clearError: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function useVoiceChat(): VoiceChatState & VoiceChatActions {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatHistoryRef = useRef<ChatMessage[]>([]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // 获取麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      // 创建MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('🛑 录音已停止，开始处理...');
        try {
          await processAudioChunks();
          console.log('✅ 音频处理完成');
        } catch (error) {
          console.error('❌ 音频处理错误:', error);
          setError('语音处理失败，请重试');
        } finally {
          setIsProcessing(false);
          console.log('🔄 处理状态已重置');
        }
      };

      // 如果是第一次开始录音，添加欢迎消息
      if (messages.length === 0) {
        const welcomeMessage: VoiceMessage = {
          id: Date.now(),
          content: '你好！我是信语，你的AI日记助手。今天过得怎么样？有什么想要分享的吗？',
          isUser: false,
          timestamp: Date.now()
        };
        console.log('👋 添加欢迎消息:', welcomeMessage);
        setMessages([welcomeMessage]);
      } else {
        console.log('📝 继续现有对话，当前消息数:', messages.length);
      }

      mediaRecorder.start(1000); // 每秒收集一次数据
      setIsRecording(true);
      setIsConnected(true);
      setIsPaused(false);
      
      console.log('🎤 录音已开始，当前消息数量:', messages.length);
      console.log('📋 录音开始时的消息列表:', messages);

    } catch (error) {
      console.error('Failed to start recording:', error);
      setError('无法访问麦克风，请检查权限设置');
    }
  }, []);

  const stopRecording = useCallback(() => {
    console.log('🔴 准备停止录音...');
    if (mediaRecorderRef.current && isRecording) {
      console.log('⏹️ 停止录音中...');
      setIsProcessing(true);
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // 停止所有音频轨道
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      console.log('🎤 麦克风已关闭');
    } else {
      console.log('⚠️ 录音器未运行或不存在');
    }
  }, [isRecording]);

  const pauseSession = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
    setIsPaused(true);
  }, [isRecording, stopRecording]);

  const resumeSession = useCallback(async () => {
    if (isPaused) {
      setIsPaused(false);
      await startRecording();
    }
  }, [isPaused, startRecording]);

  const endSession = useCallback(async (): Promise<VoiceMessage[]> => {
    if (isRecording) {
      stopRecording();
    }
    
    setIsConnected(false);
    setIsPaused(false);
    
    const finalMessages = [...messages];
    
    // 清理状态
    setMessages([]);
    chatHistoryRef.current = [];
    
    return finalMessages;
  }, [isRecording, stopRecording]);

  const processAudioChunks = async () => {
    console.log('🎤 开始处理音频数据...');
    if (audioChunksRef.current.length === 0) {
      console.error('❌ 没有录制到音频数据');
      setError('没有录制到音频数据');
      return;
    }

    try {
      // 1. 将音频数据转换为blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      console.log('📁 音频Blob创建成功:', audioBlob.size, 'bytes');
      
      // 2. 转换为base64
      console.log('🔄 开始转换为base64...');
      const base64Audio = await blobToBase64(audioBlob);
      console.log('✅ Base64转换完成，长度:', base64Audio.length);
      
      // 3. 直接调用语音转文字API（极速版）
      console.log('🗣️ 开始语音识别...');
      const speechResponse = await fetch('/api/speech-to-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioData: base64Audio
        })
      });

      if (!speechResponse.ok) {
        console.error('❌ 语音识别请求失败:', speechResponse.status, speechResponse.statusText);
        throw new Error('语音识别失败');
      }

      const speechResult = await speechResponse.json();
      console.log('📝 语音识别结果:', speechResult);
      
      if (!speechResult.success) {
        console.error('❌ 语音识别失败:', speechResult.error);
        throw new Error(speechResult.error || '语音识别失败');
      }

      const userText = speechResult.text;
      console.log('👤 用户说话内容:', userText);
      
      // 4. 添加用户消息
      const userMessage: VoiceMessage = {
        id: Date.now(),
        content: userText,
        isUser: true,
        timestamp: Date.now()
      };
      console.log('💬 创建用户消息:', userMessage);
      
      // 5. 调用LLM获取回复
      chatHistoryRef.current.push({
        role: 'user',
        content: userText
      });
      console.log('📚 当前对话历史:', chatHistoryRef.current);

      console.log('🤖 开始LLM对话...');
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: chatHistoryRef.current
        })
      });

      if (!chatResponse.ok) {
        console.error('❌ LLM对话请求失败:', chatResponse.status, chatResponse.statusText);
        throw new Error('AI对话失败');
      }

      const chatResult = await chatResponse.json();
      console.log('🎯 LLM对话结果:', chatResult);
      
      if (!chatResult.success) {
        console.error('❌ LLM对话失败:', chatResult.error);
        throw new Error(chatResult.error || 'AI对话失败');
      }

      const aiText = chatResult.content;
      console.log('🤖 AI回复内容:', aiText);
      
      // 6. 添加AI回复消息
      const aiMessage: VoiceMessage = {
        id: Date.now() + 1,
        content: aiText,
        isUser: false,
        timestamp: Date.now()
      };
      console.log('🤖 创建AI消息:', aiMessage);
      
      // 更新消息列表 - 重要：基于当前完整对话记录添加新消息
      console.log('📝 更新消息列表，添加用户和AI消息...');
      setMessages(currentMessages => {
        console.log('🔄 processAudioChunks中的当前消息状态:', currentMessages);
        console.log('📊 当前消息列表长度:', currentMessages.length);
        const newMessages = [...currentMessages, userMessage, aiMessage];
        console.log('📋 新的完整消息列表:', newMessages);
        console.log('✅ 消息更新完成，新长度:', newMessages.length);
        return newMessages;
      });
      
      chatHistoryRef.current.push({
        role: 'assistant',
        content: aiText
      });
      console.log('📚 更新后的对话历史:', chatHistoryRef.current);

      // 清理音频数据
      audioChunksRef.current = [];
      console.log('🧹 音频数据清理完成');

    } catch (error) {
      console.error('Process audio error:', error);
      throw error;
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // 清理effect
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    isRecording,
    isPaused,
    isConnected,
    error,
    isProcessing,
    messages,
    startRecording,
    stopRecording,
    pauseSession,
    resumeSession,
    endSession,
    clearError
  };
}