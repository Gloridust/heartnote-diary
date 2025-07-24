import { useState, useRef, useCallback, useEffect } from 'react';

export interface VoiceMessage {
  id: number;
  content: string;
  isUser: boolean;
  timestamp: string;
  audioUrl?: string;
}

export interface VoiceChatState {
  isRecording: boolean;
  isPaused: boolean;
  isConnected: boolean;
  messages: VoiceMessage[];
  error: string | null;
}

export interface VoiceChatActions {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => Promise<VoiceMessage[]>;
  clearError: () => void;
}

export function useVoiceChat(): VoiceChatState & VoiceChatActions {
  const [state, setState] = useState<VoiceChatState>({
    isRecording: false,
    isPaused: false,
    isConnected: false,
    messages: [],
    error: null
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const sessionIdRef = useRef<string>('');

  // 生成会话ID
  const generateSessionId = useCallback(() => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // 开始录音
  const startRecording = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));

      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          // 这里可以实时发送音频数据到服务器
          sendAudioChunk(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };

      // 开始会话
      sessionIdRef.current = generateSessionId();
      await startSession(sessionIdRef.current);

      mediaRecorder.start(1000); // 每秒发送一次数据

      setState(prev => ({ 
        ...prev, 
        isRecording: true, 
        isConnected: true,
        isPaused: false
      }));

    } catch (error) {
      console.error('Error starting recording:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : '录音启动失败'
      }));
    }
  }, []);

  // 停止录音
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      setState(prev => ({ 
        ...prev, 
        isRecording: false
      }));
    }
  }, [state.isRecording]);

  // 暂停会话
  const pauseSession = useCallback(async () => {
    try {
      await fetch('/api/realtime-dialog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pause_session',
          sessionId: sessionIdRef.current
        })
      });

      setState(prev => ({ ...prev, isPaused: true }));
    } catch (error) {
      console.error('Error pausing session:', error);
    }
  }, []);

  // 恢复会话
  const resumeSession = useCallback(async () => {
    try {
      await fetch('/api/realtime-dialog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resume_session',
          sessionId: sessionIdRef.current
        })
      });

      setState(prev => ({ ...prev, isPaused: false }));
    } catch (error) {
      console.error('Error resuming session:', error);
    }
  }, []);

  // 结束会话
  const endSession = useCallback(async (): Promise<VoiceMessage[]> => {
    try {
      stopRecording();

      const response = await fetch('/api/realtime-dialog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'end_session',
          sessionId: sessionIdRef.current
        })
      });

      const data = await response.json();
      
      if (data.success && data.messages) {
        const voiceMessages: VoiceMessage[] = data.messages.map((msg: any, index: number) => ({
          id: index + 1,
          content: msg.content,
          isUser: msg.role === 'user',
          timestamp: new Date(msg.timestamp).toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        }));

        setState(prev => ({ 
          ...prev, 
          messages: voiceMessages,
          isConnected: false,
          isPaused: false
        }));

        return voiceMessages;
      }

      return [];
    } catch (error) {
      console.error('Error ending session:', error);
      setState(prev => ({ 
        ...prev, 
        error: '结束会话失败',
        isConnected: false
      }));
      return [];
    }
  }, [stopRecording]);

  // 清除错误
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // 开始会话
  const startSession = async (sessionId: string) => {
    try {
      const response = await fetch('/api/realtime-dialog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_session',
          sessionId
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || '会话启动失败');
      }
    } catch (error) {
      throw error;
    }
  };

  // 发送音频块
  const sendAudioChunk = async (audioBlob: Blob) => {
    try {
      // 将音频转换为base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        
        await fetch('/api/realtime-dialog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_audio',
            sessionId: sessionIdRef.current,
            audioData: base64Audio.split(',')[1] // 移除data:audio/webm;base64,前缀
          })
        });
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Error sending audio chunk:', error);
    }
  };

  // 清理资源
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && state.isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [state.isRecording]);

  return {
    ...state,
    startRecording,
    stopRecording,
    pauseSession,
    resumeSession,
    endSession,
    clearError
  };
}