import { useState, useEffect, useRef } from 'react';
import { formatWeatherForPrompt, formatLocationForPrompt, type LocationWeatherData } from '../lib/location-weather';
import { type AIChatMessage } from '../hooks/useConversationState';

interface DiaryData {
  mode: string;
  title?: string;
  message: string;
  score?: number;
  tag?: string;
}

interface VoiceInputProps {
  onNewMessages: (userText: string, aiText: string, mode?: string) => void;
  onInitConversation: () => void;
  onSessionEnd: () => void;
  onGenerateDiary?: (diaryData?: DiaryData) => void;
  hasMessages?: boolean;
  showDiaryPreview?: boolean; // 新增：是否正在显示日记预览
  className?: string;
  onShowLoadingStates?: (speechLoading: boolean, chatLoading: boolean, userText?: string) => void;
  onClearDiaryPreview?: () => void; // 新增：清除日记预览状态
  locationWeatherData?: LocationWeatherData | null; // 新增：位置天气数据
  aiChatHistory?: AIChatMessage[]; // 新增：AI对话历史
  onUpdateAiChatHistory?: (history: AIChatMessage[]) => void; // 新增：更新AI对话历史
}

export default function VoiceInput({ onNewMessages, onInitConversation, onSessionEnd, onGenerateDiary, hasMessages = false, showDiaryPreview = false, className = '', onShowLoadingStates, onClearDiaryPreview, locationWeatherData, aiChatHistory = [], onUpdateAiChatHistory }: VoiceInputProps) {
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
  // 移除本地chatHistoryRef，改为使用传入的aiChatHistory
  
  // 移除本地位置天气状态，改为通过props接收

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
      
      // 位置天气数据现在通过props传入，无需在此获取
      
      // === 移动端Safari和Chrome兼容性检查 ===
      
      // 1. 检查HTTPS要求
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        throw new Error('录音功能需要HTTPS协议，请使用https://访问');
      }
      
      // 2. 检查浏览器兼容性
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('您的浏览器不支持录音功能，请更新浏览器');
      }
      
      // 3. 检查MediaRecorder支持
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('您的浏览器不支持录音API，请更新浏览器或使用其他浏览器');
      }

      // 4. 检测浏览器类型和版本
      const userAgent = navigator.userAgent;
      const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(userAgent);
      const isAndroid = /Android/.test(userAgent);
      const isMobile = isIOS || isAndroid;
      
      console.log('🔍 浏览器检测:', {
        isSafari,
        isIOS,
        isAndroid,
        isMobile,
        userAgent: userAgent.substring(0, 100)
      });

      // === 获取麦克风权限 - 移动设备优化 ===
      let audioConstraints: MediaStreamConstraints['audio'];
      
      if (isSafari || isIOS) {
        // Safari/iOS 使用最简配置
        audioConstraints = {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        };
        console.log('🍎 使用Safari/iOS兼容配置');
      } else if (isAndroid) {
        // Android Chrome 使用中等配置
        audioConstraints = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        };
        console.log('🤖 使用Android Chrome配置');
      } else {
        // 桌面设备使用完整配置
        audioConstraints = {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        };
        console.log('💻 使用桌面设备配置');
      }

      console.log('🎤 请求麦克风权限...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: audioConstraints
      });

      console.log('✅ 麦克风权限获取成功');

      // === 创建MediaRecorder - 移动设备兼容性处理 ===
      const mediaRecorderOptions: MediaRecorderOptions = {};
      
      // Safari和iOS的音频格式兼容性处理
      if (isSafari || isIOS) {
        // Safari优先级：mp4 > webm > 默认
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mediaRecorderOptions.mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mediaRecorderOptions.mimeType = 'audio/webm';
        }
        console.log('🍎 Safari音频格式:', mediaRecorderOptions.mimeType || 'default');
      } else if (isAndroid) {
        // Android Chrome优先级：webm > mp4 > 默认
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mediaRecorderOptions.mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mediaRecorderOptions.mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mediaRecorderOptions.mimeType = 'audio/mp4';
        }
        console.log('🤖 Android音频格式:', mediaRecorderOptions.mimeType || 'default');
      } else {
        // 桌面设备完整检测
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mediaRecorderOptions.mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mediaRecorderOptions.mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mediaRecorderOptions.mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/aac')) {
          mediaRecorderOptions.mimeType = 'audio/aac';
        }
        console.log('💻 桌面音频格式:', mediaRecorderOptions.mimeType || 'default');
      }

      const mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('📦 收到音频数据块:', event.data.size, 'bytes');
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

      mediaRecorder.onerror = (event) => {
        console.error('📼 MediaRecorder错误:', event);
        setError('录音设备出现错误，请重试');
      };

      // Safari需要更短的时间间隔
      const timeSlice = isSafari || isIOS ? 500 : 1000;
      mediaRecorder.start(timeSlice);
      
      setIsRecording(true);
      setIsConnected(true);
      setIsPaused(false);
      
      console.log('🎤 录音已开始，时间片:', timeSlice, 'ms');

    } catch (error: unknown) {
      console.error('Failed to start recording:', error);
      
      // 根据错误类型提供更详细的提示
      let errorMessage = '无法访问麦克风';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = '🚫 麦克风权限被拒绝\n\n📱 移动设备解决方法：\n1. 点击地址栏左侧的🔒或🔐图标\n2. 选择"麦克风" → "允许"\n3. 刷新页面重试\n\n💡 或在浏览器设置中允许此网站使用麦克风';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMessage = '🎤 未找到麦克风设备\n请确保设备已连接且未被其他应用占用';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMessage = '📱 麦克风被占用\n请关闭其他正在使用麦克风的应用或标签页';
                  } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
            // 尝试降级录音模式
            console.log('🔄 尝试降级录音模式...');
            setTimeout(() => startFallbackRecording(), 1000);
            errorMessage = '⚙️ 正在尝试兼容模式...';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = '🚫 浏览器不支持录音\n\n建议使用：\n📱 iOS: Safari 14.3+\n🤖 Android: Chrome 60+\n💻 桌面: Chrome/Firefox最新版';
        } else if (error.name === 'SecurityError' || error.message.includes('https')) {
          errorMessage = '🔒 需要安全连接\n请使用 https:// 访问此页面';
        } else if (error.message) {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
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
      // 如果当前显示日记预览，清除它
      if (showDiaryPreview && onClearDiaryPreview) {
        console.log('🔄 用户选择继续对话，清除日记预览状态');
        onClearDiaryPreview();
      }
      
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

    // 声明对话历史变量，用于整个函数
    let updatedHistory: AIChatMessage[] = [];

    try {
      // === 阶段1: 语音转文字加载状态 ===
      onShowLoadingStates?.(true, false);
      
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

      // === 阶段2: 显示用户文字，开始AI回复加载 ===
      onShowLoadingStates?.(false, true, userText);

      // 4. 调用LLM获取回复
      const newUserMessage: AIChatMessage = {
        role: 'user',
        content: userText
      };
      updatedHistory = [...aiChatHistory, newUserMessage];
      onUpdateAiChatHistory?.(updatedHistory); // 立即保存用户消息
      console.log('📚 当前对话历史:', updatedHistory);

      console.log('🤖 开始LLM对话...');
      
      // 准备聊天请求数据，包含位置和天气信息
      const chatRequestData: {
        messages: Array<{role: 'user' | 'assistant', content: string}>;
        weather?: string;
        location?: string;
      } = {
        messages: updatedHistory
      };
      
      if (locationWeatherData) {
        chatRequestData.weather = formatWeatherForPrompt(locationWeatherData.weather);
        chatRequestData.location = formatLocationForPrompt(locationWeatherData.location);
        console.log('🌍 附加环境信息到聊天请求:', {
          weather: chatRequestData.weather,
          location: chatRequestData.location
        });
      }
      
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatRequestData)
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
      
      const parseAIResponse = (text: string) => {
        console.log('🧹 原始AI回复:', text);
        
        // 步骤1: 清理控制字符
        const cleanedText = text
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // 移除控制字符
          .replace(/[\r\n\t]/g, ' ') // 替换换行符和制表符
          .replace(/\s+/g, ' ') // 合并多个空格
          .trim();

        console.log('✨ 清理后文本:', cleanedText);

        // 步骤2: 提取JSON部分
        let jsonText = cleanedText;
        
        // 尝试多种JSON提取模式
        const extractPatterns = [
          /```json\s*([\s\S]*?)\s*```/i,  // ```json ... ```
          /```\s*([\s\S]*?)\s*```/,       // ``` ... ```  
          /\{[^{}]*"mode"[^{}]*\}/,       // 包含mode字段的JSON
          /\{[\s\S]*?\}/                   // 任何JSON对象
        ];
        
        for (const pattern of extractPatterns) {
          const match = jsonText.match(pattern);
          if (match) {
            jsonText = (match[1] || match[0]).trim();
            console.log('📦 提取的JSON:', jsonText);
            break;
          }
        }

        // 步骤3: 修复常见JSON问题
        jsonText = jsonText
          .replace(/,\s*}/g, '}')         // 移除尾随逗号
          .replace(/,\s*]/g, ']')         // 移除数组尾随逗号
          .replace(/"\s*:\s*"/g, '":"')   // 修复冒号前后空格
          .replace(/\\n/g, ' ')           // 转义的换行符
          .replace(/\\t/g, ' ')           // 转义的制表符
          .replace(/\\\\/g, '\\');        // 双重转义

        console.log('🔧 修复后JSON:', jsonText);
        
        try {
          return JSON.parse(jsonText);
        } catch (error) {
          console.error('❌ JSON解析仍然失败:', error);
          throw error;
        }
      };

      try {
        parsedResponse = parseAIResponse(aiText);
        console.log('📊 解析成功的AI回复:', parsedResponse);
        
        // 验证必要字段
        if (!parsedResponse.mode) {
          parsedResponse.mode = 'continue';
        }
        if (!parsedResponse.message) {
          parsedResponse.message = '让我们继续聊聊吧！';
        }
        
      } catch (parseError) {
        console.error('❌ 所有JSON解析尝试都失败了:', parseError);
        console.error('❌ 原始文本:', aiText);
        
        // 最后的fallback：智能提取关键信息
        let fallbackMessage = '让我们继续聊聊吧！';
        let fallbackMode = 'continue';
        let fallbackTitle = '今日回忆';
        
        // 检测结束模式的关键词
        if (/结束|生成日记|写日记|完成|总结/.test(aiText)) {
          fallbackMode = 'end';
          fallbackMessage = aiText.slice(0, 200); // 截取前200字符作为日记内容
          fallbackTitle = '今日日记'; // 默认标题
        } else {
          // 提取可能的对话内容
          const messagePatterns = [
            /"message"\s*:\s*"([^"]+)"/,    // 标准JSON message字段
            /(?:message|内容)[：:]\s*([^，。！？\n]+)/,  // message: 内容
            /[。！？]\s*([^。！？\n]{10,})/,    // 句号后的内容
            /^([^{]*?)(?:\{|$)/              // 开头的非JSON部分
          ];
          
          for (const pattern of messagePatterns) {
            const match = aiText.match(pattern);
            if (match && match[1]) {
              fallbackMessage = match[1].trim();
              break;
            }
          }
        }
        
        parsedResponse = {
          mode: fallbackMode,
          title: fallbackTitle,
          message: fallbackMessage,
          score: 5,
          tag: 'personal'
        };
        
        console.log('🔄 使用fallback响应:', parsedResponse);
      }

      // === 阶段3: 关闭加载状态，显示完整内容 ===
      onShowLoadingStates?.(false, false);

      // 6. 更新对话历史（使用原始JSON文本）
      const newAssistantMessage: AIChatMessage = {
        role: 'assistant',
        content: aiText
      };
      const finalHistory = [...updatedHistory, newAssistantMessage];
      onUpdateAiChatHistory?.(finalHistory);
      console.log('📚 更新后的对话历史:', finalHistory);

      // 7. 根据mode处理不同类型的回复
      if (parsedResponse.mode === 'end') {
        console.log('📝 AI请求结束对话并生成日记');
        
        // 重要：只添加用户消息到聊天记录，不添加AI的end消息（避免与日记卡片重复）
        console.log('📝 只添加用户消息到聊天记录，AI的end消息将通过日记卡片显示');
        
        // 通过特殊参数标识这是end模式，只添加用户消息
        onNewMessages(userText, '', 'end-mode');
        
        // 稍微延迟后显示日记，确保对话记录先更新
        setTimeout(() => {
          if (onGenerateDiary) {
            // 将位置和天气信息附加到日记数据中
            const diaryDataWithLocation = {
              ...parsedResponse,
              locationWeatherData
            };
            onGenerateDiary(diaryDataWithLocation);
          }
          // 结束会话
          handleEndSession();
        }, 100);
        
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
      // 出错时也要关闭加载状态
      onShowLoadingStates?.(false, false);
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

  // 降级录音模式 - Safari兼容性
  const startFallbackRecording = async () => {
    try {
      console.log('🔄 启动降级录音模式...');
      setError(null);
      
      // 使用最基础的音频配置
      const fallbackConstraints: MediaStreamConstraints = {
        audio: true  // 最简配置，让浏览器自行决定
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
      
      // 使用默认MediaRecorder配置
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('📦 降级模式收到音频数据:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('🛑 降级模式录音停止');
        try {
          await processAudioChunks();
        } catch (error) {
          console.error('❌ 降级模式音频处理错误:', error);
          setError('语音处理失败，请重试');
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setIsConnected(true);
      setIsPaused(false);
      
      console.log('✅ 降级录音模式启动成功');
      
    } catch (error) {
      console.error('❌ 降级录音模式也失败:', error);
      setError('录音功能不可用，请检查设备权限或尝试其他浏览器');
    }
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

  // 直接结束对话并生成日记的函数
  const handleQuickEndConversation = async () => {
    try {
      console.log('⚡ 快速结束对话，生成日记');
      
      // 如果当前没有开始对话，先初始化
      if (!hasMessages) {
        console.log('👋 首次操作，初始化对话');
        onInitConversation();
      }

      // 模拟用户发送结束对话的文本
      const endText = "今天的日记就是这些，帮我总结日记吧！";
      
      // 显示加载状态
      onShowLoadingStates?.(false, true, endText);

      // 更新AI对话历史
      const newUserMessage: AIChatMessage = {
        role: 'user',
        content: endText
      };
      const updatedHistory = [...aiChatHistory, newUserMessage];
      onUpdateAiChatHistory?.(updatedHistory);
      console.log('📚 快速结束对话历史:', updatedHistory);

      // 准备聊天请求数据
      const chatRequestData: {
        messages: Array<{role: 'user' | 'assistant', content: string}>;
        weather?: string;
        location?: string;
      } = {
        messages: updatedHistory
      };
      
      if (locationWeatherData) {
        chatRequestData.weather = formatWeatherForPrompt(locationWeatherData.weather);
        chatRequestData.location = formatLocationForPrompt(locationWeatherData.location);
      }
      
      // 调用LLM API
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatRequestData)
      });

      if (!chatResponse.ok) {
        throw new Error('AI对话失败');
      }

      const chatResult = await chatResponse.json();
      
      if (!chatResult.success) {
        throw new Error(chatResult.error || 'AI对话失败');
      }

      const aiText = chatResult.content;
      console.log('🤖 AI快速回复:', aiText);

      // 解析AI回复（复用现有的解析逻辑）
      let parsedResponse;
      try {
        // 简化版JSON解析
        const cleanedText = aiText.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
        const jsonMatch = cleanedText.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found');
        }
             } catch (parseError) {
         // 强制设置为end模式
         parsedResponse = {
           mode: 'end',
           title: '今日总结',
           message: aiText.slice(0, 500), // 取前500字符作为日记
           score: 5,
           tag: 'personal'
         };
       }

      // 确保是end模式
      parsedResponse.mode = 'end';

      // 关闭加载状态
      onShowLoadingStates?.(false, false);

      // 更新完整的对话历史
      const newAssistantMessage: AIChatMessage = {
        role: 'assistant',
        content: aiText
      };
      const finalHistory = [...updatedHistory, newAssistantMessage];
      onUpdateAiChatHistory?.(finalHistory);

      // 添加用户消息到对话记录（end模式）
      onNewMessages(endText, '', 'end-mode');

      // 延迟显示日记
      setTimeout(() => {
        if (onGenerateDiary) {
          const diaryDataWithLocation = {
            ...parsedResponse,
            locationWeatherData
          };
          onGenerateDiary(diaryDataWithLocation);
        }
      }, 100);

    } catch (error) {
      console.error('❌ 快速结束对话失败:', error);
      onShowLoadingStates?.(false, false);
      setError('结束对话失败，请重试');
    }
  };

  return (
    <div className={`voice-input-container ${className}`}>
      {/* 快速结束对话按钮 - 仅在有对话时显示 */}
      {hasMessages && !isConnected && !showDiaryPreview && (
        <div className="quick-end-bubble">
          <button
            onClick={handleQuickEndConversation}
            className="quick-end-button"
            title="直接结束对话并生成今日日记"
          >
            <span className="bubble-text">结束对话</span>
            <span className="bubble-icon">📝</span>
          </button>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="error-message" style={{ 
          backgroundColor: '#fef2f2', 
          color: '#dc2626',
          padding: 'var(--spacing-compact)',
          borderRadius: 'var(--radius-medium)',
          marginBottom: 'var(--spacing-compact)',
          border: '1px solid #fecaca'
        }}>
          <div className="flex items-start space-x-2">
            <span className="text-lg">⚠️</span>
            <div className="flex-1">
              <div className="text-sm font-medium mb-2 whitespace-pre-line">{error}</div>
              {(error.includes('权限') || error.includes('🚫')) && (
                <div className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                  <p className="font-semibold mb-2">🔧 解决方法：</p>
                  <div className="space-y-2">
                    <div>
                      <p className="font-medium">📱 Safari (iPhone/iPad):</p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li>点击地址栏左侧的 🔒 图标</li>
                        <li>点击&quot;麦克风&quot;选择&quot;允许&quot;</li>
                        <li>刷新页面</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium">🤖 Chrome (Android):</p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li>点击地址栏右侧的 🎤 图标</li>
                        <li>选择&quot;始终允许&quot;</li>
                        <li>或者：设置 → 网站设置 → 麦克风</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              {error.includes('https') && (
                <div className="text-xs text-gray-600 mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                  <p className="font-semibold text-yellow-800">🔒 安全提醒：</p>
                  <p className="text-yellow-700">录音功能需要安全连接，请确保网址以 https:// 开头</p>
                </div>
              )}
            </div>
            <button 
              onClick={clearError} 
              className="text-red-600 hover:text-red-800 font-bold text-lg"
              style={{ lineHeight: '1' }}
            >
              ✕
            </button>
          </div>
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
                <svg xmlns="http://www.w3.org/2000/svg" height="36" viewBox="0 -960 960 960" width="36" fill="currentColor" style={{ fontWeight: 'bold' }}><path d="M480-423q-43 0-72-30.917-29-30.916-29-75.083v-251q0-41.667 29.441-70.833Q437.882-880 479.941-880t71.559 29.167Q581-821.667 581-780v251q0 44.167-29 75.083Q523-423 480-423Zm0-228Zm-30 531v-136q-106-11-178-89t-72-184h60q0 91 64.288 153t155.5 62Q571-314 635.5-376 700-438 700-529h60q0 106-72 184t-178 89v136h-60Zm30-363q18 0 29.5-13.5T521-529v-251q0-17-11.788-28.5Q497.425-820 480-820q-17.425 0-29.212 11.5Q439-797 439-780v251q0 19 11.5 32.5T480-483Z" stroke="currentColor" strokeWidth="2"/></svg>
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
              <div className="flex justify-center space-x-3">
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
                  🎤 继续修改日记
                </button>
                <button
                  onClick={() => {
                    if (onClearDiaryPreview) {
                      onClearDiaryPreview();
                    }
                  }}
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
                  ❌ 取消日记
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

        .quick-end-bubble {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: 16px;
          animation: floatIn 0.3s ease-out;
        }

        .quick-end-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 25px;
          padding: 12px 20px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
          transition: all 0.3s ease;
          white-space: nowrap;
          position: relative;
          overflow: hidden;
        }

        .quick-end-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s;
        }

        .quick-end-button:hover::before {
          left: 100%;
        }

        .quick-end-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
          background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
        }

        .quick-end-button:active {
          transform: translateY(0);
          box-shadow: 0 2px 10px rgba(102, 126, 234, 0.4);
        }

        .bubble-text {
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .bubble-icon {
          font-size: 16px;
          animation: bounce 2s infinite;
        }

        @keyframes floatIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-3px);
          }
          60% {
            transform: translateY(-2px);
          }
        }

        @media (max-width: 640px) {
          .voice-input-container {
            bottom: 110px;
            width: 95%;
          }
          
          .quick-end-button {
            padding: 10px 16px;
            font-size: 13px;
          }
          
          .quick-end-bubble {
            margin-bottom: 12px;
          }
        }
      `}</style>
    </div>
  );
}