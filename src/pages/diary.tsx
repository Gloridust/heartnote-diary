import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DiaryEntry } from '../lib/data';
import { getUserDiaries, UserStorage, convertApiDataToDiaryEntry, extractDateFromApiString } from '../lib/api';
import SettingsModal from '../components/SettingsModal';

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
        
        // 转换API数据为本地格式
        const convertedEntries = response.data.map(convertApiDataToDiaryEntry);
        setDiaryEntries(convertedEntries);
        
        // 提取有日记的日期列表
        const dates = response.data.map(entry => extractDateFromApiString(entry.date));
        setDatesWithDiary(dates);
        
        console.log('📅 有日记的日期:', dates);
        
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
      loadUserDiaries(currentUserId);
    }
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

      days.push(
        <button
          key={day}
          onClick={() => setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))}
          className={`calendar-day text-sm font-medium ${
            hasDiary 
              ? 'calendar-day-with-diary' 
              : isSelected
              ? 'calendar-day-selected'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
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
    return diaryEntries.filter(entry => entry.date === dateKey);
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
        </div>

        {/* 选中日期的日记列表 */}
        {selectedDate && !isLoading && (
          <div className="space-y-4">
            <h3 className="text-subtitle mb-4" style={{ color: 'var(--text-primary)' }}>
              {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
            </h3>
            
            {getSelectedDateEntries().length > 0 ? (
              getSelectedDateEntries().map((entry: DiaryEntry) => (
                <div key={entry.id} className="diary-preview cursor-pointer">
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
                </div>
              ))
            ) : (
              <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                这一天还没有日记记录
              </div>
            )}
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
        <div className="nav-bottom">
          <Link href="/" className="nav-item">
            <i>🏠</i>
            <span>首页</span>
          </Link>
          <Link href="/diary" className="nav-item nav-item-active">
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
          console.log('👤 日记页面用户ID已更新:', newUserId);
          setCurrentUserId(newUserId);
          loadUserDiaries(newUserId); // 重新加载新用户的数据
        }}
      />
    </div>
  );
} 