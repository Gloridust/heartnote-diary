import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { Message, DiaryEntry } from '../lib/data';
import { saveDiary, formatDateForApi, UserStorage, type DiaryApiRequest } from '../lib/api';
import VoiceInput from '../components/VoiceInput';
import LoadingAnimation from '../components/LoadingAnimation';
import SettingsModal from '../components/SettingsModal';
import PWAInstallPrompt from '../components/PWAInstallPrompt';
import PWAStatus from '../components/PWAStatus';

export default function Home() {
  // 对话状态管理 - 主页面维护完整对话记录
  const [messages, setMessages] = useState<Message[]>([]);
  const [diaryEntry, setDiaryEntry] = useState<DiaryEntry | null>(null);
  const [showDiary, setShowDiary] = useState(false);
  const [showVoiceInput, setShowVoiceInput] = useState(true);
  const [hasStartedConversation, setHasStartedConversation] = useState(false);
  const [showDiaryPreview, setShowDiaryPreview] = useState(false); // 新增：显示日记预览卡片
  
  // 加载状态管理
  const [isSpeechLoading, setIsSpeechLoading] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [tempUserText, setTempUserText] = useState<string>(''); // 临时显示用户文字
  
  // 设置弹窗状态
  const [showSettings, setShowSettings] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  
  // 保存状态
  const [isSaving, setIsSaving] = useState(false);

  // 初始化用户ID
  useEffect(() => {
    const userId = UserStorage.getOrCreateUserId();
    setCurrentUserId(userId);
    console.log('👤 当前用户ID:', userId);
  }, []);

  // 组件渲染时的调试信息
  console.log('🏠 Home组件渲染，当前消息数量:', messages.length);
  console.log('📋 当前消息列表:', messages);
  console.log('🎯 对话是否已开始:', hasStartedConversation);

  // 添加新消息到对话记录
  const addNewMessages = (userText: string, aiText: string, mode?: string) => {
    console.log('📝 添加新消息到对话记录');
    console.log('👤 用户:', userText);
    console.log('🤖 AI:', aiText);
    console.log('🎯 模式:', mode);
    
    const userMessage: Message = {
      id: Date.now(),
      content: userText,
      isUser: true,
      timestamp: new Date().toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
    
    if (mode === 'end-mode') {
      // 特殊处理：只添加用户消息，不添加AI消息（AI内容将通过日记卡片显示）
      console.log('📝 End模式：只添加用户消息，AI消息通过日记卡片显示');
      setMessages(prev => {
        const newMessages = [...prev, userMessage];
        console.log('📋 更新后的对话记录（只含用户消息）:', newMessages);
        return newMessages;
      });
    } else {
      // 正常模式：添加用户和AI消息
      const aiMessage: Message = {
        id: Date.now() + 1,
        content: aiText,
        isUser: false,
        timestamp: new Date().toLocaleTimeString('zh-CN', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      };
      
      setMessages(prev => {
        const newMessages = [...prev, userMessage, aiMessage];
        console.log('📋 更新后的完整对话记录:', newMessages);
        return newMessages;
      });
    }

    // 如果当前显示日记预览，隐藏它，让用户继续对话
    if (showDiaryPreview) {
      console.log('🔄 用户继续对话，隐藏日记预览');
      handleClearDiaryPreview();
    }
  };

  // 处理加载状态变化
  const handleLoadingStates = (speechLoading: boolean, chatLoading: boolean, userText?: string) => {
    console.log('🔄 加载状态更新:', { speechLoading, chatLoading, userText });
    setIsSpeechLoading(speechLoading);
    setIsChatLoading(chatLoading);
    
    if (userText) {
      setTempUserText(userText);
    } else if (!speechLoading && !chatLoading) {
      setTempUserText('');
    }
  };

  // 清除日记预览状态，让用户继续对话
  const handleClearDiaryPreview = () => {
    console.log('🗑️ 清除日记预览状态，用户继续对话');
    setShowDiaryPreview(false);
    setDiaryEntry(null);
  };

  // 初始化对话（添加欢迎消息）
  const initializeConversation = () => {
    if (!hasStartedConversation) {
      console.log('👋 初始化对话，添加欢迎消息');
      const welcomeMessage: Message = {
        id: Date.now(),
        content: '你好！我是信语，你的AI日记助手。今天过得怎么样？有什么想要分享的吗？',
        isUser: false,
        timestamp: new Date().toLocaleTimeString('zh-CN', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      };
      setMessages([welcomeMessage]);
      setHasStartedConversation(true);
    }
  };

  // 处理语音会话结束
  const handleVoiceSessionEnd = () => {
    // 会话结束后可以选择生成日记
  };

  // 生成日记功能
  const generateDiary = (diaryData?: { 
    mode: string; 
    message: string; 
    score?: number; 
    tag?: string; 
    locationWeatherData?: {
      location: {
        latitude: number;
        longitude: number;
        formatted_address: string;
        city: string;
        district: string;
        street: string;
      };
      weather: {
        temperature: number;
        description: string;
        icon: string;
        humidity: number;
        wind_speed: number;
        feels_like: number;
      };
      timestamp: string;
    }
  }) => {
    console.log('📝 生成日记，数据:', diaryData);
    
    let diaryContent = '';
    let diaryTitle = '今日日记';
    let moodScore = 5;
    let diaryTag = 'personal';
    
    if (diaryData && diaryData.mode === 'end') {
      // 来自AI的日记生成 - 显示预览卡片
      diaryContent = diaryData.message;
      moodScore = diaryData.score || 5;
      diaryTag = diaryData.tag || 'personal';
      diaryTitle = getTagTitle(diaryTag);
      
      const diary: DiaryEntry = {
        id: Date.now(),
        date: new Date().toLocaleDateString('zh-CN'),
        title: diaryTitle,
        content: diaryContent,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        generated: true,
        score: moodScore,
        tag: diaryTag,
        location: diaryData?.locationWeatherData?.location,
        weather: diaryData?.locationWeatherData?.weather
      };
      
      console.log('📋 生成的日记预览对象:', diary);
      setDiaryEntry(diary);
      setShowDiaryPreview(true); // 显示预览卡片，不切换界面
      // 保持语音面板可用，用户可以继续修改
    } else {
      // 手动生成日记的后备内容 - 完整页面显示
      diaryContent = `今天是充实而美好的一天。上午，我在常去的咖啡厅工作，他们的拿铁依然是我的最爱，专注的工作让我顺利完成了一个重要项目，这种成就感真的很棒！

下午，我决定去公园散步放松一下。春天的公园里樱花盛开，粉色的花瓣随风飘落，美得像一幅画。我拍了很多照片，还遇到了一只活泼可爱的柯基犬，看它短腿欢快地跑来跑去，心情顿时明朗了许多。

晚上和朋友们在一家新开的泰国餐厅聚餐。菜品的口味很地道，我们边吃边聊，还计划了下个月的旅行，期待着和朋友们一起创造更多美好的回忆！`;
      
      const diary: DiaryEntry = {
        id: Date.now(),
        date: new Date().toLocaleDateString('zh-CN'),
        title: diaryTitle,
        content: diaryContent,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        generated: true,
        score: moodScore,
        tag: diaryTag
      };
      
      console.log('📋 生成的完整日记对象:', diary);
      setDiaryEntry(diary);
      setShowDiary(true);
      setShowVoiceInput(false); // 完整日记页面时隐藏语音面板
    }
  };

  // 保存日记到数据库
  const saveDiaryToDatabase = async () => {
    if (!diaryEntry || !currentUserId) {
      alert('用户ID或日记数据缺失！');
      return;
    }

    setIsSaving(true);
    try {
      console.log('💾 开始保存日记到数据库:', diaryEntry);
      
      // 准备API请求数据
      const apiData: DiaryApiRequest = {
        id: currentUserId,
        title: diaryEntry.title,
        content: diaryEntry.content,
        date: formatDateForApi(new Date()), // 使用当前时间
        score: diaryEntry.score,
        tag: diaryEntry.tag,
        location: diaryEntry.location,
        weather: diaryEntry.weather
      };
      
      // 调用保存API
      const result = await saveDiary(apiData);
      
      if (result.status === 'success') {
        console.log('✅ 日记保存成功:', result);
        alert(`✅ ${result.message || '日记保存成功！'}\n日记ID: ${result.diary_id}`);
        
        // 重置状态，准备下一次对话
        setMessages([]);
        setDiaryEntry(null);
        setShowDiaryPreview(false);
        setShowDiary(false);
        setHasStartedConversation(false);
      } else {
        throw new Error(result.message || '保存失败');
      }
      
    } catch (error) {
      console.error('❌ 保存日记失败:', error);
      let errorMessage = '保存日记失败';
      
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = '❌ 无法连接到服务器';
        } else {
          errorMessage = `❌ ${error.message}`;
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // 获取标签对应的标题
  const getTagTitle = (tag: string): string => {
    const tagTitles: { [key: string]: string } = {
      'work': '工作日记',
      'personal': '个人日记', 
      'travel': '旅行日记',
      'relationships': '人际日记',
      'health': '健康日记',
      'goals': '目标日记',
      'reflection': '反思日记',
      'gratitude': '感恩日记',
      'dreams': '梦想日记',
      'memories': '回忆日记'
    };
    return tagTitles[tag] || '今日日记';
  };

  // 获取心情表情
  const getMoodEmoji = (score: number): string => {
    if (score >= 8) return '😊';
    if (score >= 6) return '🙂';
    if (score >= 4) return '😐';
    if (score >= 2) return '😔';
    return '😢';
  };

  return (
    <>
      <Head>
        <title>信语日记 - AI驱动的对话式日记应用</title>
        <meta name="description" content="信语日记 - AI驱动的对话式日记应用，用语音记录生活点滴" />
      </Head>
      <div style={{ backgroundColor: 'var(--background-page)' }} className="min-h-screen pb-20">
      {/* 头部导航 - 固定在顶部 */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between spacing-standard" style={{ backgroundColor: 'var(--background-page)' }}>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--primary-base)' }}>
            <span style={{ color: 'var(--text-inverse)' }} className="text-lg">📔</span>
          </div>
          <h1 className="text-title" style={{ color: 'var(--text-primary)' }}>信语日记</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/test-audio" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--surface-accent)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>🔧</span>
          </Link>
          <button 
            onClick={() => setShowSettings(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center" 
            style={{ backgroundColor: 'var(--surface-accent)' }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>⚙️</span>
          </button>
          <Link href="/diary" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--surface-accent)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>📖</span>
          </Link>
        </div>
      </header>

      {/* 语音输入组件 */}
      {showVoiceInput && (
        <VoiceInput
          onNewMessages={addNewMessages}
          onInitConversation={initializeConversation}
          onSessionEnd={handleVoiceSessionEnd}
          onGenerateDiary={generateDiary}
          hasMessages={messages.length > 0}
          showDiaryPreview={showDiaryPreview}
          onShowLoadingStates={handleLoadingStates}
          onClearDiaryPreview={handleClearDiaryPreview}
        />
      )}

      {showDiary ? (
        /* 日记显示界面 */
        <div className="spacing-standard max-w-2xl mx-auto content-with-header">
          <div className="diary-preview">
            <div className="diary-preview-header">
              <h2 className="diary-preview-title">{diaryEntry?.title || '今日日记'}</h2>
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getMoodEmoji(diaryEntry?.score || 5)}</span>
                <span className="text-body" style={{ color: 'var(--text-secondary)' }}>
                  {diaryEntry?.score || 5}/10
                </span>
              </div>
            </div>
            
            {/* 标签显示 */}
            {diaryEntry?.tag && (
              <div className="mb-3">
                <span className="inline-block px-3 py-1 text-xs rounded-full" 
                      style={{ 
                        backgroundColor: 'var(--surface-accent)', 
                        color: 'var(--text-primary)' 
                      }}>
                  #{getTagTitle(diaryEntry.tag)}
                </span>
              </div>
            )}
            
            <div className="diary-preview-content whitespace-pre-line">
              {diaryEntry?.content}
            </div>
          </div>
          <div className="button-group">
            <button 
              className="button-primary"
              onClick={() => alert('保存并完成')}
            >
              保存并完成
            </button>
            <button 
              className="button-secondary"
              onClick={() => setShowDiary(false)}
            >
              继续完善
            </button>
            <button 
              className="button-secondary"
              onClick={() => alert('手动编辑')}
            >
              手动编辑
            </button>
          </div>
        </div>
      ) : (
        /* 对话界面 */
        <div className="spacing-standard max-w-2xl mx-auto mb-32 content-with-header">
          {messages.length === 0 ? (
            /* 无对话时的引导界面 */
            <div className="flex flex-col items-center justify-center py-16">
              <div className="text-center space-y-4">
                <div className="text-6xl mb-4">🎤</div>
                <h2 className="text-title" style={{ color: 'var(--text-primary)' }}>开始语音对话</h2>
                <p className="text-body" style={{ color: 'var(--text-secondary)', maxWidth: '300px' }}>
                  点击下方的麦克风按钮，与AI助手开始对话，分享您今天的经历和感受
                </p>
              </div>
            </div>
          ) : (
            /* 显示完整对话记录（包括欢迎消息） */
            <div className="flex flex-col mb-6">
              {/* 显示所有消息（包括欢迎消息作为第一条） */}
              {messages.map((message, index) => {
                console.log(`🗨️ 渲染消息 ${index + 1}:`, message);
                return (
                  <div key={message.id} className={message.isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                    <p>{message.content}</p>
                  </div>
                );
              })}

              {/* 语音转文字加载动画 */}
              {isSpeechLoading && (
                <LoadingAnimation message="正在识别语音..." isUser={false} />
              )}

              {/* 显示临时用户文字 */}
              {tempUserText && !isSpeechLoading && (
                <div className="chat-bubble-user">
                  <p>{tempUserText}</p>
                </div>
              )}

              {/* AI回复加载动画 */}
              {isChatLoading && (
                <LoadingAnimation message="小语正在思考..." isUser={false} />
              )}

              {/* 日记预览卡片 - 显示在对话下方 */}
              {showDiaryPreview && diaryEntry && (
                <div className="mt-6 p-4 rounded-lg border-2 border-dashed" 
                     style={{ 
                       borderColor: 'var(--primary-light)', 
                       backgroundColor: 'var(--surface-main)' 
                     }}>
                  {/* 卡片标题 */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-subtitle font-medium" style={{ color: 'var(--text-primary)' }}>
                      📝 {diaryEntry.title}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getMoodEmoji(diaryEntry.score || 5)}</span>
                      <span className="text-body" style={{ color: 'var(--text-secondary)' }}>
                        {diaryEntry.score || 5}/10
                      </span>
                    </div>
                  </div>

                  {/* 标签显示 */}
                  {diaryEntry.tag && (
                    <div className="mb-3">
                      <span className="inline-block px-2 py-1 text-xs rounded-full" 
                            style={{ 
                              backgroundColor: 'var(--surface-accent)', 
                              color: 'var(--text-primary)' 
                            }}>
                        #{getTagTitle(diaryEntry.tag)}
                      </span>
                    </div>
                  )}

                  {/* 日记内容 */}
                  <div className="text-body mb-4 whitespace-pre-line" 
                       style={{ 
                         color: 'var(--text-secondary)', 
                         lineHeight: '1.6' 
                       }}>
                    {diaryEntry.content}
                  </div>

                  {/* 操作按钮 - 只保留保存 */}
                  <div className="flex justify-center">
                    <button
                      onClick={saveDiaryToDatabase}
                      className="button-primary px-6 py-2"
                      disabled={isSaving}
                      style={{
                        backgroundColor: 'var(--primary-base)',
                        color: 'var(--text-inverse)',
                        borderRadius: '20px',
                        border: 'none',
                        fontSize: 'var(--font-size-body)',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      {isSaving ? '💾 保存中...' : '💾 保存日记'}
                    </button>
                  </div>

                  {/* 提示文字 */}
                  <p className="text-center mt-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    可以继续录音来修改日记内容
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0">
        <div className="nav-bottom">
          <Link href="/" className="nav-item nav-item-active">
            <i>🏠</i>
            <span>首页</span>
          </Link>
          <Link href="/diary" className="nav-item">
            <i>📖</i>
            <span>日记本</span>
          </Link>
        </div>
      </nav>

            {/* 设置弹窗 */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onUserIdChange={(newUserId) => {
          setCurrentUserId(newUserId);
          console.log('👤 用户ID已更新:', newUserId);
        }}
      />

      {/* PWA安装提示 */}
      <PWAInstallPrompt />

      {/* PWA状态显示 */}
      <PWAStatus />
      </div>
    </>
  );
}
