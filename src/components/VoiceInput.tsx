import { useState, useEffect } from 'react';
import { useVoiceChat, VoiceMessage } from '../hooks/useVoiceChat';

interface VoiceInputProps {
  onMessagesReceived: (messages: VoiceMessage[]) => void;
  onSessionEnd: () => void;
  onGenerateDiary?: () => void;
  hasMessages?: boolean;
  className?: string;
}

export default function VoiceInput({ onMessagesReceived, onSessionEnd, onGenerateDiary, hasMessages = false, className = '' }: VoiceInputProps) {
  const {
    isRecording,
    isPaused,
    isConnected,
    error,
    startRecording,
    stopRecording,
    pauseSession,
    resumeSession,
    endSession,
    clearError
  } = useVoiceChat();

  const [recordingTime, setRecordingTime] = useState(0);

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
      await startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  // 处理会话暂停
  const handlePause = () => {
    pauseSession();
  };

  // 处理会话恢复
  const handleResume = () => {
    resumeSession();
  };

  // 处理会话结束
  const handleEndSession = async () => {
    const messages = await endSession();
    onMessagesReceived(messages);
    onSessionEnd();
  };

  // 格式化录音时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
                {isPaused ? '已暂停' : isRecording ? '正在录音' : '等待中'}
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
            {hasMessages && isPaused && onGenerateDiary && (
              <div className="flex justify-center space-x-3">
                <button
                  onClick={onGenerateDiary}
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
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          width: 90%;
          max-width: 400px;
        }

        @media (max-width: 640px) {
          .voice-input-container {
            bottom: 90px;
            width: 95%;
          }
        }
      `}</style>
    </div>
  );
}