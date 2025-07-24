import { useState } from 'react';
import Link from 'next/link';
import { Message, DiaryEntry } from '../lib/data';
import VoiceInput from '../components/VoiceInput';
import { VoiceMessage } from '../hooks/useVoiceChat';

export default function Home() {
  // 对话状态管理
  const [messages, setMessages] = useState<Message[]>([]);
  const [diaryEntry, setDiaryEntry] = useState<DiaryEntry | null>(null);
  const [showDiary, setShowDiary] = useState(false);
  const [showVoiceInput, setShowVoiceInput] = useState(true);

  // 处理语音消息接收
  const handleVoiceMessagesReceived = (voiceMessages: VoiceMessage[]) => {
    // 将语音消息转换为Message格式
    const convertedMessages: Message[] = voiceMessages.map(vm => ({
      id: vm.id,
      content: vm.content,
      isUser: vm.isUser,
      timestamp: vm.timestamp
    }));
    
    setMessages(convertedMessages);
    // 不自动隐藏语音输入面板，让用户选择操作
  };

  // 处理语音会话结束
  const handleVoiceSessionEnd = () => {
    // 会话结束后可以选择生成日记
  };

  // 生成日记功能

  const generateDiary = () => {
    const diary: DiaryEntry = {
      id: Date.now(),
      date: new Date().toLocaleDateString('zh-CN'),
      title: '今日日记',
      content: `今天是充实而美好的一天。上午，我在常去的咖啡厅工作，他们的拿铁依然是我的最爱，专注的工作让我顺利完成了一个重要项目，这种成就感真的很棒！

下午，我决定去公园散步放松一下。春天的公园里樱花盛开，粉色的花瓣随风飘落，美得像一幅画。我拍了很多照片，还遇到了一只活泼可爱的柯基犬，看它短腿欢快地跑来跑去，心情顿时明朗了许多。

晚上和朋友们在一家新开的泰国餐厅聚餐。菜品的口味很地道，我们边吃边聊，还计划了下个月的旅行，期待着和朋友们一起创造更多美好的回忆！`,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      generated: true
    };
    setDiaryEntry(diary);
    setShowDiary(true);
    setShowVoiceInput(false); // 生成日记后隐藏语音面板
  };

  return (
    <div style={{ backgroundColor: 'var(--background-page)' }} className="min-h-screen pb-20">
      {/* 头部导航 */}
      <header className="flex items-center justify-between spacing-standard" style={{ backgroundColor: 'var(--background-page)' }}>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--primary-base)' }}>
            <span style={{ color: 'var(--text-inverse)' }} className="text-lg">📔</span>
          </div>
          <h1 className="text-title" style={{ color: 'var(--text-primary)' }}>信语日记</h1>
        </div>
        <Link href="/diary" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--surface-accent)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>👤</span>
        </Link>
      </header>

      {/* 语音输入组件 */}
      {showVoiceInput && (
        <VoiceInput
          onMessagesReceived={handleVoiceMessagesReceived}
          onSessionEnd={handleVoiceSessionEnd}
          onGenerateDiary={generateDiary}
          hasMessages={messages.length > 0}
        />
      )}

      {showDiary ? (
        /* 日记显示界面 */
        <div className="spacing-standard max-w-2xl mx-auto">
          <div className="diary-preview">
            <div className="diary-preview-header">
              <h2 className="diary-preview-title">今日日记</h2>
            </div>
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
        <div className="spacing-standard max-w-2xl mx-auto mb-32">
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
            /* 有对话记录时的界面 */
            <div className="flex flex-col mb-6">
              {/* 聊天消息 */}
              {messages.map((message) => (
                <div key={message.id} className={message.isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                  <p>{message.content}</p>
                </div>
              ))}
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
    </div>
  );
}
