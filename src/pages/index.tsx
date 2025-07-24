import { useState } from 'react';
import Link from 'next/link';
import { Message, DiaryEntry } from '../lib/data';

export default function Home() {
  // 硬编码完整对话记录
  const [messages] = useState<Message[]>([
    {
      id: 1,
      content: "嗨，今天过得怎么样？有什么想要分享的吗？我很想听听你今天的故事～",
      isUser: false,
      timestamp: "19:30"
    },
    {
      id: 2,
      content: "今天过得还不错！上午在咖啡厅完成了工作，下午去公园散步，晚上和朋友聚餐，感觉很充实。",
      isUser: true,
      timestamp: "19:32"
    },
    {
      id: 3,
      content: "听起来是个很充实的一天呢！在咖啡厅工作感觉如何？是你常去的那家吗？",
      isUser: false,
      timestamp: "19:33"
    },
    {
      id: 4,
      content: "是的，是我常去的那家咖啡厅。他们的拿铁很香，环境也很安静，很适合工作。今天还遇到了一只很可爱的小猫。",
      isUser: true,
      timestamp: "19:35"
    },
    {
      id: 5,
      content: "听起来是个充满美食和期待的一天！你今天有什么特别的感受或者想法吗？",
      isUser: false,
      timestamp: "19:36"
    },
    {
      id: 6,
      content: "嗯，感觉今天特别珍惜和朋友相处的时光，我们聊了很多未来的计划，让我对生活更有期待了。",
      isUser: true,
      timestamp: "19:38"
    }
  ]);
  const [diaryEntry, setDiaryEntry] = useState<DiaryEntry | null>(null);
  const [showDiary, setShowDiary] = useState(false);

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
  };

  return (
    <div style={{ backgroundColor: 'var(--background-page)' }} className="min-h-screen">
      {/* 头部导航 */}
      <header className="flex items-center justify-between spacing-standard" style={{ backgroundColor: 'var(--surface-light)' }}>
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
        <div className="spacing-standard max-w-2xl mx-auto">
          {/* 聊天消息 */}
          <div className="flex flex-col mb-6">
            {messages.map((message) => (
              <div key={message.id} className={message.isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                <p>{message.content}</p>
              </div>
            ))}
            {/* AI提示生成日记 */}
            <div className="chat-bubble-ai">
              <p className="mb-3">
                听起来是个充满美食和期待的一天！根据我们的对话，我已经为你生成了今天的日记草稿，你可以看看哦～
              </p>
              <button 
                onClick={generateDiary}
                className="button-primary"
              >
                查看日记
              </button>
            </div>
          </div>
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
