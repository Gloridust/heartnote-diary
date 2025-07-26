import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { DiaryEntry } from '../lib/data';
import { getUserDiaries, UserStorage, convertApiDataToDiaryEntry, extractDateFromApiString, extractTimeFromApiString } from '../lib/api';
import SettingsModal from '../components/SettingsModal';
import DiaryDetailModal from '../components/DiaryDetailModal';

export default function Diary() {
  const [currentMonth, setCurrentMonth] = useState(new Date()); // 使用当前月份
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // 真实数据状态
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [datesWithDiary, setDatesWithDiary] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 日记详情弹窗状态
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDiary, setSelectedDiary] = useState<DiaryEntry | null>(null);

  // 初始化用户ID和加载数据
  useEffect(() => {
    const userId = UserStorage.getOrCreateUserId();
    setCurrentUserId(userId);
    loadUserDiaries(userId);
  }, []);

  // 加载用户日记数据
  const loadUserDiaries = async (userId: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📖 开始加载用户日记:', userId);
      
      const response = await getUserDiaries(userId);
      
      if (response.status === 'success' && response.data) {
        console.log('✅ 日记数据加载成功:', response.data);
        
        // 转换API数据为本地格式，并按日期排序（最新的在前）
        const convertedEntries = response.data
          .map(convertApiDataToDiaryEntry)
          .sort((a, b) => b.date.localeCompare(a.date));
        setDiaryEntries(convertedEntries);
        
        // 提取有日记的日期列表，去重并排序
        const dates = [...new Set(response.data
          .map(entry => extractDateFromApiString(entry.date)))]
          .sort((a, b) => b.localeCompare(a)); // 最新的在前
        setDatesWithDiary(dates);
        
        console.log('📅 有日记的日期:', dates);
        console.log('📊 转换后的日记条目:', convertedEntries);
        console.log('🗓️ 当前查看的月份:', currentMonth.toISOString().substring(0, 7));
        
        // 详细调试信息
        console.log('🔍 详细调试信息:');
        response.data.forEach((entry, index) => {
          console.log(`  ${index + 1}. 原始日期:`, entry.date);
          console.log(`     提取日期:`, extractDateFromApiString(entry.date));
          console.log(`     提取时间:`, extractTimeFromApiString(entry.date));
        });
        
        // 自动跳转到最新有日记的月份并选中日期
        if (dates.length > 0) {
          const latestDiaryDate = dates[0]; // 例如: "2025-07-25" (已按日期降序排列)
          const currentMonthKey = currentMonth.toISOString().substring(0, 7); // 例如: "2025-01"
          const latestDiaryMonth = latestDiaryDate.substring(0, 7); // 例如: "2025-07"
          
          console.log('🗓️ 最新日记的日期:', latestDiaryDate);
          console.log('🗓️ 最新日记的月份:', latestDiaryMonth);
          console.log('🗓️ 当前查看月份:', currentMonthKey);
          
          // 解析最新日记的完整日期
          const [year, month, day] = latestDiaryDate.split('-');
          const latestDiaryFullDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          
          // 如果月份不同，先跳转月份
          if (currentMonthKey !== latestDiaryMonth) {
            const targetMonthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
            console.log('🔄 自动跳转到有日记的月份:', targetMonthDate);
            console.log('📅 跳转前月份:', currentMonthKey, '跳转后月份:', latestDiaryMonth);
            setCurrentMonth(targetMonthDate);
          }
          
          // 自动选中最新日记的日期
          console.log('📅 自动选中最新日记的日期:', latestDiaryFullDate);
          setSelectedDate(latestDiaryFullDate);
          
        } else {
          console.log('ℹ️ 没有日记数据，清除选中日期');
          setSelectedDate(null);
        }
        
      } else if (response.status === 'error') {
        console.log('ℹ️ 用户暂无日记数据:', response.message);
        // 用户不存在或无数据，显示空状态
        setDiaryEntries([]);
        setDatesWithDiary([]);
      }
      
    } catch (error) {
      console.error('❌ 加载日记数据失败:', error);
      let errorMessage = '加载日记数据失败';
      
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = '无法连接到服务器，请确保后端服务正在运行';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 刷新数据
  const refreshData = () => {
    if (currentUserId) {
      console.log('🔄 手动刷新数据，将自动选中最新日记');
      loadUserDiaries(currentUserId);
    }
  };

  // 处理日记点击
  const handleDiaryClick = (diary: DiaryEntry) => {
    console.log('📖 点击查看日记:', diary);
    setSelectedDiary(diary);
    setShowDetailModal(true);
  };

  // 关闭详情弹窗
  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedDiary(null);
  };

  // 处理日记更新
  const handleDiaryUpdated = () => {
    console.log('📝 日记已更新，刷新数据');
    refreshData();
  };

  // 处理日记删除
  const handleDiaryDeleted = () => {
    console.log('🗑️ 日记已删除，刷新数据');
    refreshData();
    // 清除选中的日期，因为可能没有日记了
    setSelectedDate(null);
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // 计算指定日期的平均心情评分
  const getDateAverageMoodScore = (dateKey: string): number | null => {
    const entriesForDate = diaryEntries.filter(entry => entry.date === dateKey);
    if (entriesForDate.length === 0) return null;
    
    const validScores = entriesForDate
      .map(entry => entry.score)
      .filter((score): score is number => score !== undefined && score !== null);
    
    if (validScores.length === 0) return null;
    
    const average = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
    return Math.round(average * 10) / 10; // 保留一位小数
  };

  // 根据心情评分获取对应的颜色 - 新的配色方案
  const getMoodColor = (score: number): { bg: string; bgHover: string; text: string } => {
    if (score >= 8) {
      // 😊 非常开心 - 亮蓝色
      return {
        bg: '#3B82F6', // 亮蓝色
        bgHover: '#2563EB', // 深一点的蓝色
        text: '#FFFFFF'
      };
    } else if (score >= 6) {
      // 🙂 愉快 - 天蓝色
      return {
        bg: '#60A5FA', // 天蓝色
        bgHover: '#3B82F6', // 亮蓝色
        text: '#FFFFFF'
      };
    } else if (score >= 4) {
      // 😐 平静 - 浅灰蓝
      return {
        bg: '#93C5FD', // 浅灰蓝
        bgHover: '#60A5FA', // 天蓝色
        text: '#1F2937' // 深色文字以保证对比度
      };
    } else if (score >= 2) {
      // 😔 低落 - 暗灰蓝
      return {
        bg: '#64748B', // 暗灰蓝
        bgHover: '#475569', // 更深的灰蓝
        text: '#FFFFFF'
      };
    } else {
      // 😢 难过 - 深蓝灰
      return {
        bg: '#334155', // 深蓝灰
        bgHover: '#1E293B', // 最深的蓝灰
        text: '#FFFFFF'
      };
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // 空白日期
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-12 h-12"></div>);
    }

    // 实际日期
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const hasDiary = datesWithDiary.includes(dateKey);
      const isSelected = selectedDate && 
        selectedDate.getDate() === day &&
        selectedDate.getMonth() === currentMonth.getMonth() &&
        selectedDate.getFullYear() === currentMonth.getFullYear();

      // 获取该日期的平均心情评分
      const averageScore = getDateAverageMoodScore(dateKey);
      
      // 调试信息：只在有日记的日期打印
      if (hasDiary) {
        console.log(`📅 日期 ${dateKey} 有日记:`, hasDiary, '平均评分:', averageScore);
      }

            // 计算样式和事件处理器
      let buttonStyle: React.CSSProperties = {};
      let className = 'calendar-day text-sm font-medium ';
      let hoverHandlers: {
        onMouseEnter?: (e: React.MouseEvent<HTMLButtonElement>) => void;
        onMouseLeave?: (e: React.MouseEvent<HTMLButtonElement>) => void;
      } = {};
      
      if (isSelected) {
        // 选中状态优先级最高
        className += 'calendar-day-selected';
      } else if (hasDiary && averageScore !== null) {
        // 有日记且有评分，使用心情颜色
        const moodColor = getMoodColor(averageScore);
        buttonStyle = {
          backgroundColor: moodColor.bg,
          color: moodColor.text,
          transition: 'all 0.2s ease-in-out',
          cursor: 'pointer',
        };
        className += 'calendar-day-mood';
        
        // 添加鼠标悬停事件处理
        hoverHandlers = {
          onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.backgroundColor = moodColor.bgHover;
          },
          onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.backgroundColor = moodColor.bg;
          }
        };
      } else if (hasDiary) {
        // 有日记但没有评分，使用默认样式
        className += 'calendar-day-with-diary';
      } else {
        // 没有日记
        className += 'text-gray-700 hover:bg-gray-100';
      }

      days.push(
        <button
          key={day}
          onClick={() => setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))}
          className={className}
          style={buttonStyle}
          title={hasDiary && averageScore !== null ? `平均心情: ${averageScore}/10` : undefined}
          {...hoverHandlers}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const getSelectedDateEntries = () => {
    if (!selectedDate) return [];
    const dateKey = formatDateKey(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const filteredEntries = diaryEntries.filter(entry => entry.date === dateKey);
    
    console.log('🔍 getSelectedDateEntries 调试:');
    console.log('   选中的日期:', selectedDate);
    console.log('   日期键:', dateKey);
    console.log('   所有日记条目:', diaryEntries);
    console.log('   匹配的条目:', filteredEntries);
    
    return filteredEntries;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  return (
    <>
      <Head>
        <title>日记本 - 声命体MemoirAI</title>
        <meta name="description" content="浏览和管理你的日记记录" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      </Head>
      <div style={{ backgroundColor: 'var(--background-page)' }} className="min-h-screen pb-20">
      {/* 头部导航 - 固定在顶部 */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between spacing-standard" style={{ backgroundColor: 'var(--background-page)' }}>
        <div className="flex items-center space-x-2">
          <h1 className="text-title" style={{ color: 'var(--text-primary)' }}>日记本</h1>
          {currentUserId && (
            <span className="text-body" style={{ color: 'var(--text-secondary)' }}>
              ID: {currentUserId}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={refreshData}
            className="w-10 h-10 rounded-full flex items-center justify-center" 
            style={{ backgroundColor: 'var(--surface-accent)' }}
            disabled={isLoading}
          >
            <span style={{ color: 'var(--text-secondary)' }}>
              {isLoading ? '🔄' : '🔍'}
            </span>
          </button>
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
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">❌ 加载失败</div>
                <div className="text-sm mt-1">{error}</div>
              </div>
              <button
                onClick={refreshData}
                className="ml-4 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
              >
                重试
              </button>
            </div>
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
            <div>📖 正在加载日记数据...</div>
          </div>
        )}

        {/* 日历容器 */}
        <div className="calendar-container">
          {/* 日历头部 */}
          <div className="calendar-header">
            <button onClick={() => navigateMonth('prev')} className="calendar-nav-button">
              <span style={{ color: 'var(--text-secondary)' }}>‹</span>
            </button>
            <div className="flex flex-col items-center">
              <h2 className="calendar-title">
                {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
              </h2>
              {!isLoading && (
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  共 {diaryEntries.length} 篇日记
                  {datesWithDiary.length > 0 && (
                    <span className="ml-2">
                      ({datesWithDiary.length} 天有记录)
                    </span>
                  )}
                </div>
              )}

            </div>
            <button onClick={() => navigateMonth('next')} className="calendar-nav-button">
              <span style={{ color: 'var(--text-secondary)' }}>›</span>
            </button>
          </div>

          {/* 星期标题 */}
          <div className="calendar-weekdays">
            {['日', '一', '二', '三', '四', '五', '六'].map(day => (
              <div key={day} className="calendar-weekday">
                {day}
              </div>
            ))}
          </div>

          {/* 日历网格 */}
          <div className="calendar-grid">
            {renderCalendar()}
          </div>

          {/* 颜色心情说明 */}
          {!isLoading && diaryEntries.some(entry => entry.score !== undefined && entry.score !== null) && (
            <div className="mood-color-legend" style={{ backgroundColor: 'transparent', border: 'none' }}>
              <div className="flex justify-center items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: getMoodColor(9).bg }}
                  ></div>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>😊 非常开心 8-10分</span>
                </div>
                <div className="flex items-center gap-1">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: getMoodColor(7).bg }}
                  ></div>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>🙂 愉快 6-7分</span>
                </div>
                <div className="flex items-center gap-1">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: getMoodColor(5).bg }}
                  ></div>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>😐 平静 4-5分</span>
                </div>
                <div className="flex items-center gap-1">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: getMoodColor(3).bg }}
                  ></div>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>😔 低落 2-3分</span>
                </div>
                <div className="flex items-center gap-1">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: getMoodColor(1).bg }}
                  ></div>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>😢 难过 0-1分</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 选中日期的日记列表 */}
        {selectedDate && !isLoading && (
          <div className="space-y-4 mt-8">
            <h3 className="text-subtitle mb-4" style={{ color: 'var(--text-primary)' }}>
              {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
              {/* <span className="ml-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                📅 自动选中最新日记
              </span> */}
            </h3>
            
            {getSelectedDateEntries().length > 0 ? (
              getSelectedDateEntries().map((entry: DiaryEntry) => (
                <div 
                  key={entry.id} 
                  className="diary-preview cursor-pointer hover:shadow-md transition-all duration-200"
                  onClick={() => handleDiaryClick(entry)}
                >
                  <div className="diary-preview-header">
                    <h4 className="diary-preview-title">{entry.title}</h4>
                    <div className="flex items-center space-x-2">
                      <span className="diary-preview-time">{entry.time}</span>
                      {entry.score && (
                        <div className="flex items-center space-x-1">
                          <span className="text-lg">
                            {entry.score >= 8 ? '😊' : entry.score >= 6 ? '🙂' : entry.score >= 4 ? '😐' : entry.score >= 2 ? '😔' : '😢'}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            {entry.score}/10
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {entry.tag && (
                    <div className="mb-2">
                      <span className="inline-block px-2 py-1 text-xs rounded-full" 
                            style={{ 
                              backgroundColor: 'var(--surface-accent)', 
                              color: 'var(--text-primary)' 
                            }}>
                        #{entry.tag}
                      </span>
                    </div>
                  )}
                  <p className="diary-preview-content">
                    {entry.content}
                  </p>
                  {/* 点击提示 */}
                  <div className="mt-2 text-center">
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      点击查看详情
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                这一天还没有日记记录
              </div>
            )}
          </div>
        )}

        {/* 提示信息：有数据但没有选中日期时 */}
        {!isLoading && !error && diaryEntries.length > 0 && !selectedDate && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📅</div>
            <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
              点击日历上有标记的日期查看日记
            </p>
          </div>
        )}

        {/* 无数据空状态 */}
        {!isLoading && !error && diaryEntries.length === 0 && (
          <div className="empty-state text-center py-16">
            <div className="text-6xl mb-4">📖</div>
            <h3 className="text-subtitle mb-2" style={{ color: 'var(--text-primary)' }}>
              还没有日记记录
            </h3>
            <p className="text-body mb-6" style={{ color: 'var(--text-secondary)' }}>
              开始记录你的第一篇日记吧！
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
      </div>

      {/* 底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0">
      <div className="nav-bottom" style={{ height: "65px", padding: "10px 0" }}>
          <Link href="/" className="nav-item">
            <i>🏠</i>
            <span>记录</span>
          </Link>
          <Link href="/diary" className="nav-item nav-item-active">
            <i>📖</i>
            <span>日记本</span>
          </Link>
          <Link href="/profile" className="nav-item">
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
          console.log('👤 日记页面用户ID已更新:', newUserId);
          setCurrentUserId(newUserId);
          // 清除当前选中的日期，重新加载新用户的数据并自动选中最新日记
          setSelectedDate(null);
          loadUserDiaries(newUserId);
        }}
      />

      {/* 日记详情弹窗 */}
      {currentUserId && (
        <DiaryDetailModal
          isOpen={showDetailModal}
          onClose={handleCloseDetailModal}
          diary={selectedDiary}
          userId={currentUserId}
          onDiaryUpdated={handleDiaryUpdated}
          onDiaryDeleted={handleDiaryDeleted}
        />
      )}
    </div>
    </>
  );
} 