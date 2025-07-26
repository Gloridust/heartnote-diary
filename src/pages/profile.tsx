import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { DiaryEntry } from '../lib/data';
import { getUserDiaries, UserStorage, convertApiDataToDiaryEntry, extractDateFromApiString } from '../lib/api';
import SettingsModal from '../components/SettingsModal';
import MoodChart from '../components/MoodChart';

interface MoodTrendData {
  date: string;
  score: number;
  title: string;
}

interface StatsData {
  totalDiaries: number;
  averageMood: number;
  streakDays: number;
  favoriteTag: string;
  totalWords: number;
  thisWeekDiaries: number;
}

type FilterPeriod = '3days' | '7days' | '30days';

export default function Profile() {
  const [showSettings, setShowSettings] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('7days');
  
  // 数据状态
  const [allDiaryEntries, setAllDiaryEntries] = useState<DiaryEntry[]>([]); // 存储所有数据
  const [filteredEntries, setFilteredEntries] = useState<DiaryEntry[]>([]); // 过滤后的数据
  const [moodTrend, setMoodTrend] = useState<MoodTrendData[]>([]);
  const [stats, setStats] = useState<StatsData>({
    totalDiaries: 0,
    averageMood: 0,
    streakDays: 0,
    favoriteTag: '',
    totalWords: 0,
    thisWeekDiaries: 0
  });

  // 初始化用户ID和加载数据
  useEffect(() => {
    const userId = UserStorage.getOrCreateUserId();
    setCurrentUserId(userId);
    loadUserData(userId);
  }, []);

  // 当过滤条件改变时，重新应用过滤器
  useEffect(() => {
    if (allDiaryEntries.length > 0) {
      applyFilter(allDiaryEntries, filterPeriod);
    }
  }, [filterPeriod, allDiaryEntries]);

  // 应用时间过滤器
  const applyFilter = (entries: DiaryEntry[], period: FilterPeriod) => {
    const now = new Date();
    let cutoffDate: Date;

    switch (period) {
      case '3days':
        cutoffDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        break;
      case '7days':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // 过滤数据
    const filtered = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= cutoffDate;
    });

    setFilteredEntries(filtered);

    // 计算心情趋势数据
    const trendData = filtered
      .filter(entry => entry.score !== undefined)
      .slice(0, 30) // 最近30条记录
      .reverse()
      .map(entry => ({
        date: entry.date,
        score: entry.score || 5,
        title: entry.title
      }));
    setMoodTrend(trendData);
    
    // 计算统计数据
    const statsData = calculateStats(filtered);
    setStats(statsData);
  };

  // 加载用户数据
  const loadUserData = async (userId: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await getUserDiaries(userId);
      
      if (response.status === 'success' && response.data) {
        const convertedEntries = response.data
          .map(convertApiDataToDiaryEntry)
          .sort((a, b) => b.date.localeCompare(a.date));
        
        setAllDiaryEntries(convertedEntries);
        
        // 应用过滤器
        applyFilter(convertedEntries, filterPeriod);
        
      } else {
        setAllDiaryEntries([]);
        setFilteredEntries([]);
        setMoodTrend([]);
      }
      
    } catch (error) {
      console.error('❌ 加载用户数据失败:', error);
      setError('加载数据失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 计算统计数据
  const calculateStats = (entries: DiaryEntry[]): StatsData => {
    if (entries.length === 0) {
      return {
        totalDiaries: 0,
        averageMood: 0,
        streakDays: 0,
        favoriteTag: '',
        totalWords: 0,
        thisWeekDiaries: 0
      };
    }

    // 总日记数
    const totalDiaries = entries.length;

    // 平均心情
    const validScores = entries
      .map(entry => entry.score)
      .filter((score): score is number => score !== undefined && score !== null);
    const averageMood = validScores.length > 0 
      ? Math.round((validScores.reduce((sum, score) => sum + score, 0) / validScores.length) * 10) / 10
      : 0;

    // 连续记录天数（基于全部数据计算更准确）
    const streakDays = calculateStreak(allDiaryEntries.length > 0 ? allDiaryEntries : entries) + 1;

    // 最常用标签（基于过滤后的数据）
    const tagCounts: { [key: string]: number } = {};
    entries.forEach(entry => {
      if (entry.tag) {
        tagCounts[entry.tag] = (tagCounts[entry.tag] || 0) + 1;
      }
    });
    const favoriteTag = Object.keys(tagCounts).reduce((a, b) => 
      tagCounts[a] > tagCounts[b] ? a : b, '');

    // 总字数（基于过滤后的数据）
    const totalWords = entries.reduce((sum, entry) => sum + entry.content.length, 0);

    // 时间段内的平均每日日记数
    const timeSpanDays = Math.max(1, Math.ceil((new Date().getTime() - new Date(entries[entries.length - 1]?.date || new Date()).getTime()) / (1000 * 60 * 60 * 24)));
    const avgDiariesPerDay = entries.length > 0 ? Math.round((entries.length / timeSpanDays) * 10) / 10 : 0;
    const thisWeekDiaries = avgDiariesPerDay;

    return {
      totalDiaries,
      averageMood,
      streakDays,
      favoriteTag,
      totalWords,
      thisWeekDiaries
    };
  };

  // 计算连续记录天数
  const calculateStreak = (entries: DiaryEntry[]): number => {
    if (entries.length === 0) return 0;

    const dates = [...new Set(entries.map(entry => entry.date))].sort((a, b) => b.localeCompare(a));
    let streak = 0;
    let currentDate = new Date();
    
    for (const dateStr of dates) {
      const entryDate = new Date(dateStr);
      const diffDays = Math.floor((currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === streak) {
        streak++;
        currentDate = entryDate;
      } else {
        break;
      }
    }
    
    return streak;
  };

  // 获取心情表情
  const getMoodEmoji = (score: number): string => {
    if (score >= 8) return '😊';
    if (score >= 6) return '🙂';
    if (score >= 4) return '😐';
    if (score >= 2) return '😔';
    return '😢';
  };

  // 获取标签显示名称
  const getTagTitle = (tag: string): string => {
    const tagTitles: { [key: string]: string } = {
      'work': '工作',
      'personal': '个人', 
      'travel': '旅行',
      'relationships': '人际',
      'health': '健康',
      'goals': '目标',
      'reflection': '反思',
      'gratitude': '感恩',
      'dreams': '梦想',
      'memories': '回忆'
    };
    return tagTitles[tag] || tag;
  };

  // 获取过滤周期显示名称
  const getFilterPeriodText = (period: FilterPeriod): string => {
    switch (period) {
      case '3days': return '3天';
      case '7days': return '7天';
      case '30days': return '30天';
      default: return '7天';
    }
  };



  return (
    <>
      <Head>
        <title>个人档案 - 声命体MemoirAI</title>
        <meta name="description" content="查看你的日记统计和心情趋势" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      </Head>
      <div style={{ backgroundColor: 'var(--background-page)' }} className="min-h-screen pb-20">
        {/* 头部导航 */}
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between spacing-standard" style={{ backgroundColor: 'var(--background-page)' }}>
          <div className="flex items-center space-x-2">
            <h1 className="text-title" style={{ color: 'var(--text-primary)' }}>个人档案</h1>
            {currentUserId && (
              <span className="text-body" style={{ color: 'var(--text-secondary)' }}>
                ID: {currentUserId}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setShowSettings(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center" 
              style={{ backgroundColor: 'var(--surface-accent)' }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>⚙️</span>
            </button>
          </div>
        </header>

        <div className="spacing-standard max-w-2xl mx-auto mb-24 content-with-header">
          {/* 错误提示 */}
          {error && (
            <div className="error-message mb-4" style={{
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              padding: 'var(--spacing-standard)',
              borderRadius: 'var(--radius-medium)',
              border: '1px solid #fecaca'
            }}>
              ❌ {error}
            </div>
          )}

          {/* 加载状态 */}
          {isLoading && (
            <div className="loading-message mb-4" style={{
              backgroundColor: 'var(--surface-accent)',
              color: 'var(--text-primary)',
              padding: 'var(--spacing-standard)',
              borderRadius: 'var(--radius-medium)',
              textAlign: 'center'
            }}>
              📊 正在加载统计数据...
            </div>
          )}

          {!isLoading && !error && (
            <>
              {/* 时间过滤器 */}
              <div className="filter-container mb-6">
                <div className="filter-header">
                  <h3 className="filter-title">📊 统计时间范围</h3>
                </div>
                <div className="filter-buttons">
                  <button
                    onClick={() => setFilterPeriod('3days')}
                    className={`filter-button ${filterPeriod === '3days' ? 'filter-button-active' : ''}`}
                  >
                    近3天
                  </button>
                  <button
                    onClick={() => setFilterPeriod('7days')}
                    className={`filter-button ${filterPeriod === '7days' ? 'filter-button-active' : ''}`}
                  >
                    近7天
                  </button>
                  <button
                    onClick={() => setFilterPeriod('30days')}
                    className={`filter-button ${filterPeriod === '30days' ? 'filter-button-active' : ''}`}
                  >
                    近30天
                  </button>
                </div>
              </div>
              {/* 心情趋势图 */}
              {moodTrend.length > 0 && (
                <div className="trend-card mb-6">
                  <div className="card-header">
                    <h3 className="card-title">📈 心情趋势</h3>
                    <span className="card-subtitle">近{getFilterPeriodText(filterPeriod)} · {moodTrend.length} 条记录</span>
                  </div>
                  <div className="chart-wrapper">
                    <MoodChart data={moodTrend} width={320} height={140} />
                  </div>
                </div>
              )}

              {/* 统计卡片网格 */}
              <div className="stats-grid mb-6">
                {/* 总日记数 */}
                <div className="stat-card">
                  <div className="stat-icon">📖</div>
                  <div className="stat-value">{stats.totalDiaries}</div>
                  <div className="stat-label">总日记</div>
                </div>

                {/* 平均心情 */}
                <div className="stat-card">
                  <div className="stat-icon">{getMoodEmoji(stats.averageMood)}</div>
                  <div className="stat-value">{stats.averageMood}</div>
                  <div className="stat-label">平均心情</div>
                </div>

                {/* 连续天数 */}
                <div className="stat-card">
                  <div className="stat-icon">🔥</div>
                  <div className="stat-value">{stats.streakDays}</div>
                  <div className="stat-label">连续天数</div>
                </div>

                {/* 平均频率 */}
                <div className="stat-card">
                  <div className="stat-icon">📅</div>
                  <div className="stat-value">{stats.thisWeekDiaries}</div>
                  <div className="stat-label">日均篇数</div>
                </div>
              </div>

              {/* 详细统计 */}
              <div className="detail-cards">
                <div className="detail-card">
                  <div className="detail-header">
                    <span className="detail-icon">🏷️</span>
                    <span className="detail-title">最爱标签</span>
                  </div>
                  <div className="detail-value">
                    {stats.favoriteTag ? getTagTitle(stats.favoriteTag) : '暂无'}
                  </div>
                </div>

                <div className="detail-card">
                  <div className="detail-header">
                    <span className="detail-icon">✍️</span>
                    <span className="detail-title">总字数</span>
                  </div>
                  <div className="detail-value">
                    {stats.totalWords.toLocaleString()} 字
                  </div>
                </div>
              </div>

              {/* 空状态 */}
              {allDiaryEntries.length === 0 && (
                <div className="empty-state text-center py-16">
                  <div className="text-6xl mb-4">📊</div>
                  <h3 className="text-subtitle mb-2" style={{ color: 'var(--text-primary)' }}>
                    还没有数据统计
                  </h3>
                  <p className="text-body mb-6" style={{ color: 'var(--text-secondary)' }}>
                    开始记录你的第一篇日记，查看个性化统计！
                  </p>
                  <Link 
                    href="/" 
                    className="inline-block px-6 py-3 rounded-full text-white font-medium"
                    style={{ backgroundColor: 'var(--primary-base)' }}
                  >
                    📝 开始写日记
                  </Link>
                </div>
              )}

              {/* 过滤结果为空的状态 */}
              {allDiaryEntries.length > 0 && filteredEntries.length === 0 && (
                <div className="empty-state text-center py-16">
                  <div className="text-6xl mb-4">📅</div>
                  <h3 className="text-subtitle mb-2" style={{ color: 'var(--text-primary)' }}>
                    这个时间段没有日记
                  </h3>
                  <p className="text-body mb-6" style={{ color: 'var(--text-secondary)' }}>
                    试试选择更长的时间范围，或者去写一篇新日记！
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* 底部导航 */}
        <nav className="fixed bottom-0 left-0 right-0">
          <div className="nav-bottom" style={{ height: "65px", padding: "10px 0" }}>
            <Link href="/" className="nav-item">
              <i>🏠</i>
              <span>记录</span>
            </Link>
            <Link href="/diary" className="nav-item">
              <i>📖</i>
              <span>日记本</span>
            </Link>
            <Link href="/profile" className="nav-item nav-item-active">
              <i>👤</i>
              <span>档案</span>
            </Link>
          </div>
        </nav>

        {/* 设置弹窗 */}
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onUserIdChange={(newUserId) => {
            setCurrentUserId(newUserId);
            loadUserData(newUserId);
          }}
        />

        {/* 样式定义 */}
        <style jsx>{`
          .filter-container {
            background-color: var(--surface-main);
            border-radius: var(--radius-medium);
            border: 1px solid var(--surface-dark);
            overflow: hidden;
          }

          .filter-header {
            padding: 1rem 1.25rem;
            border-bottom: 1px solid var(--surface-dark);
            background: linear-gradient(135deg, var(--surface-light) 0%, var(--surface-accent) 100%);
          }

          .filter-title {
            font-size: 1rem;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0;
          }

          .filter-buttons {
            display: flex;
            padding: 1rem;
            gap: 0.75rem;
            justify-content: center;
          }

          .filter-button {
            padding: 0.5rem 1rem;
            border: 1px solid var(--surface-dark);
            border-radius: 20px;
            background-color: var(--surface-light);
            color: var(--text-secondary);
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            min-width: 80px;
          }

          .filter-button:hover {
            background-color: var(--surface-accent);
            color: var(--text-primary);
            transform: translateY(-1px);
          }

          .filter-button-active {
            background-color: var(--primary-base);
            color: var(--text-inverse);
            border-color: var(--primary-base);
            box-shadow: 0 2px 4px rgba(177, 156, 217, 0.3);
          }

          .filter-button-active:hover {
            background-color: var(--primary-dark);
            border-color: var(--primary-dark);
            color: var(--text-inverse);
            transform: translateY(-1px);
          }

          .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }

          .stat-card {
            background-color: var(--surface-main);
            padding: 1.5rem;
            border-radius: var(--radius-medium);
            text-align: center;
            border: 1px solid var(--surface-dark);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }

          .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }

          .stat-icon {
            font-size: 2rem;
            margin-bottom: 0.5rem;
          }

          .stat-value {
            font-size: 2rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.25rem;
          }

          .stat-label {
            font-size: 0.875rem;
            color: var(--text-secondary);
            font-weight: 500;
          }

          .trend-card {
            background-color: var(--surface-main);
            border-radius: var(--radius-medium);
            border: 1px solid var(--surface-dark);
            overflow: hidden;
          }

          .card-header {
            padding: 1.25rem;
            border-bottom: 1px solid var(--surface-dark);
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .card-title {
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0;
          }

          .card-subtitle {
            font-size: 0.875rem;
            color: var(--text-tertiary);
          }

          .chart-wrapper {
            padding: 0;
            background: transparent;
          }

          .detail-cards {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }

          .detail-card {
            background-color: var(--surface-main);
            padding: 1.25rem;
            border-radius: var(--radius-medium);
            border: 1px solid var(--surface-dark);
          }

          .detail-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.75rem;
          }

          .detail-icon {
            font-size: 1.25rem;
          }

          .detail-title {
            font-size: 0.875rem;
            color: var(--text-secondary);
            font-weight: 500;
          }

          .detail-value {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
          }

          @media (prefers-color-scheme: dark) {
            .stat-card,
            .trend-card,
            .detail-card {
              border-color: rgba(255, 255, 255, 0.1);
            }
            
            .stat-card:hover,
            .trend-card:hover,
            .detail-card:hover {
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }
          }

          @media (max-width: 640px) {
            .filter-buttons {
              flex-direction: column;
              align-items: stretch;
              gap: 0.5rem;
            }

            .filter-button {
              min-width: auto;
            }

            .stats-grid,
            .detail-cards {
              grid-template-columns: 1fr;
            }
            
            .stat-card,
            .detail-card {
              padding: 1rem;
            }
            
            .card-header {
              padding: 1rem;
              flex-direction: column;
              align-items: flex-start;
              gap: 0.25rem;
            }
          }
        `}</style>
      </div>
    </>
  );
} 