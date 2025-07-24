import { useState, useEffect, useRef } from 'react';

interface DiaryData {
  mode: string;
  message: string;
  score?: number;
  tag?: string;
}

interface VoiceInputProps {
  onNewMessages: (userText: string, aiText: string) => void;
  onInitConversation: () => void;
  onSessionEnd: () => void;
  onGenerateDiary?: (diaryData?: DiaryData) => void;
  hasMessages?: boolean;
  showDiaryPreview?: boolean; // 新增：是否正在显示日记预览
  className?: string;
}

export default function VoiceInput({ onNewMessages, onInitConversation, onSessionEnd, onGenerateDiary, hasMessages = false, showDiaryPreview = false, className = '' }: VoiceInputProps) {
  // 录音状态
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  // 录音相关refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatHistoryRef = useRef<Array<{role: 'user' | 'assistant', content: string}>>([]);

  // 录音计时器
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (!isRecording) {
        setRecordingTime(0);
      }
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording, isPaused]);

  // 处理录音开始
  const handleStartRecording = async () => {
    try {
      console.log('🎤 开始录音...');
      setError(null);
      
      // 如果是第一次录音，初始化对话
      if (!hasMessages) {
        console.log('👋 首次录音，初始化对话');
        onInitConversation();
      }
      
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

      mediaRecorder.start(1000);
      setIsRecording(true);
      setIsConnected(true);
      setIsPaused(false);
      
      console.log('🎤 录音已开始');

    } catch (error) {
      console.error('Failed to start recording:', error);
      setError('无法访问麦克风，请检查权限设置');
    }
  };

  // 停止录音
  const handleStopRecording = () => {
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
  };

  // 暂停会话
  const handlePause = () => {
    if (isRecording) {
      handleStopRecording();
    }
    setIsPaused(true);
  };

  // 恢复会话
  const handleResume = async () => {
    if (isPaused) {
      setIsPaused(false);
      await handleStartRecording();
    }
  };

  // 结束会话
  const handleEndSession = async () => {
    try {
      if (isRecording) {
        handleStopRecording();
      }
      setIsConnected(false);
      setIsPaused(false);
      onSessionEnd();
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  // 处理音频数据
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
      
      // 3. 调用语音转文字API
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

      // 4. 调用LLM获取回复
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

      // 5. 解析AI回复的JSON格式
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(aiText);
        console.log('📊 解析后的AI回复:', parsedResponse);
      } catch (parseError) {
        console.error('❌ JSON解析失败，使用原文本:', parseError);
        parsedResponse = {
          mode: 'continue',
          message: aiText
        };
      }

      // 6. 更新对话历史（使用原始JSON文本）
      chatHistoryRef.current.push({
        role: 'assistant',
        content: aiText
      });
      console.log('📚 更新后的对话历史:', chatHistoryRef.current);

      // 7. 根据mode处理不同类型的回复
      if (parsedResponse.mode === 'end') {
        console.log('📝 AI请求结束对话并生成日记');
        // 通知主页面显示日记
        if (onGenerateDiary) {
          onGenerateDiary(parsedResponse);
        }
        // 结束会话
        handleEndSession();
      } else {
        console.log('💬 继续对话模式');
        // 通知主页面添加新消息（只显示message内容）
        onNewMessages(userText, parsedResponse.message || aiText);
      }

      // 清理音频数据
      audioChunksRef.current = [];
      console.log('🧹 音频数据清理完成');

    } catch (error) {
      console.error('Process audio error:', error);
      throw error;
    }
  };

  // Base64转换工具函数
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

  // 清除错误
  const clearError = () => {
    setError(null);
  };

  // 格式化录音时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 清理effect
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className={`voice-input-container ${className}`}>
      {/* 错误提示 */}
      {error && (
        <div className="error-message" style={{ 
          backgroundColor: 'var(--surface-accent)', 
          color: 'var(--text-primary)',
          padding: 'var(--spacing-compact)',
          borderRadius: 'var(--radius-medium)',
          marginBottom: 'var(--spacing-compact)'
        }}>
          <span>{error}</span>
          <button onClick={clearError} className="ml-2 text-red-600">✕</button>
        </div>
      )}

      {/* 主要控制区域 */}
      <div className="voice-controls" style={{
        backgroundColor: 'var(--surface-main)',
        borderRadius: 'var(--radius-medium)',
        padding: 'var(--spacing-standard)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
      }}>
        {!isConnected ? (
          /* 未连接状态 - 显示开始按钮 */
          <div className="flex flex-col items-center space-y-4">
                          <button
                onClick={handleStartRecording}
                className="voice-record-button"
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-base)',
                  color: 'var(--text-inverse)',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '28px',
                  transition: 'all 0.2s ease-in-out',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                🎤
              </button>
            <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
              点击开始语音对话
            </p>
          </div>
        ) : (
          /* 已连接状态 - 显示控制界面 */
          <div className="flex flex-col space-y-4">
            {/* 录音状态指示 */}
            <div className="flex items-center justify-center space-x-4">
              <div className={`recording-indicator ${isRecording && !isPaused ? 'active' : ''}`} 
                   style={{
                     width: '12px',
                     height: '12px',
                     borderRadius: '50%',
                     backgroundColor: isRecording && !isPaused ? '#ef4444' : 'var(--text-tertiary)'
                   }} />
              <span className="text-subtitle" style={{ color: 'var(--text-primary)' }}>
                {isProcessing ? '处理中...' : isPaused ? '已暂停' : isRecording ? '正在录音' : '等待中'}
              </span>
              <span className="text-body" style={{ color: 'var(--text-secondary)' }}>
                {formatTime(recordingTime)}
              </span>
            </div>

            {/* 控制按钮组 */}
            <div className="flex justify-center space-x-4">
              {!isPaused ? (
                <button
                  onClick={handlePause}
                  className="control-button"
                  style={{
                    backgroundColor: 'var(--surface-accent)',
                    color: 'var(--text-primary)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '50px',
                    height: '50px',
                    cursor: 'pointer',
                    fontSize: '20px'
                  }}
                >
                  ⏸️
                </button>
              ) : (
                <button
                  onClick={handleResume}
                  className="control-button"
                  style={{
                    backgroundColor: 'var(--primary-base)',
                    color: 'var(--text-inverse)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '50px',
                    height: '50px',
                    cursor: 'pointer',
                    fontSize: '20px'
                  }}
                >
                  ▶️
                </button>
              )}

              <button
                onClick={handleEndSession}
                className="control-button"
                style={{
                  backgroundColor: '#ef4444',
                  color: 'var(--text-inverse)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '50px',
                  height: '50px',
                  cursor: 'pointer',
                  fontSize: '20px'
                }}
              >
                🛑
              </button>
            </div>

            {/* 对话操作按钮 */}
            {hasMessages && isPaused && !showDiaryPreview && (
              <div className="flex justify-center space-x-3">
                {onGenerateDiary && (
                  <button
                    onClick={() => onGenerateDiary?.()}
                    className="diary-action-button"
                    style={{
                      backgroundColor: 'var(--primary-base)',
                      color: 'var(--text-inverse)',
                      border: 'none',
                      borderRadius: '20px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontSize: 'var(--font-size-body)',
                      fontWeight: '500'
                    }}
                  >
                    生成日记
                  </button>
                )}
                <button
                  onClick={handleResume}
                  className="diary-action-button"
                  style={{
                    backgroundColor: 'var(--surface-accent)',
                    color: 'var(--text-primary)',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontSize: 'var(--font-size-body)',
                    fontWeight: '500'
                  }}
                >
                  继续对话
                </button>
              </div>
            )}

            {/* 日记预览状态下的提示 */}
            {showDiaryPreview && isPaused && (
              <div className="flex justify-center">
                <button
                  onClick={handleResume}
                  className="diary-action-button"
                  style={{
                    backgroundColor: 'var(--primary-light)',
                    color: 'var(--text-primary)',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontSize: 'var(--font-size-body)',
                    fontWeight: '500'
                  }}
                >
                  🎤 继续修改
                </button>
              </div>
            )}

            {/* 提示文本 */}
            <div className="text-center">
              <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
                {isPaused 
                  ? hasMessages ? '选择生成日记或继续对话' : '对话已暂停，可以继续录音'
                  : '正在与AI对话中...'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 样式定义 */}
      <style jsx>{`
        .voice-record-button:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }

        .voice-record-button:active {
          transform: scale(0.95);
        }

        .control-button:hover {
          transform: scale(1.1);
        }

        .control-button:active {
          transform: scale(0.9);
        }

        .diary-action-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .diary-action-button:active {
          transform: translateY(0);
        }

        .recording-indicator.active {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }

        .voice-input-container {
          position: fixed;
                        bottom: 120px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          width: 90%;
          max-width: 400px;
        }

        @media (max-width: 640px) {
          .voice-input-container {
                            bottom: 110px;
            width: 95%;
          }
        }
      `}</style>
    </div>
  );
}