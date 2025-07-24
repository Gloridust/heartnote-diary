import { useState } from 'react';
import Link from 'next/link';
import { mockData, DiaryEntry } from '../lib/data';

export default function Diary() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2023, 10)); // 2023年11月
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // 使用模拟数据
  const diaryEntries = mockData.diaryEntries;
  const datesWithDiary = mockData.datesWithDiary;

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
        <h1 className="text-title" style={{ color: 'var(--text-primary)' }}>日记本</h1>
        <div className="flex items-center space-x-2">
          <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--surface-accent)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>🔍</span>
          </button>
          <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--surface-accent)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>⚙️</span>
          </button>
        </div>
      </header>

      <div className="spacing-standard max-w-2xl mx-auto mb-24 content-with-header">
        {/* 日历容器 */}
        <div className="calendar-container">
          {/* 日历头部 */}
          <div className="calendar-header">
            <button onClick={() => navigateMonth('prev')} className="calendar-nav-button">
              <span style={{ color: 'var(--text-secondary)' }}>‹</span>
            </button>
            <h2 className="calendar-title">
              {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
            </h2>
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
        {selectedDate && (
          <div className="space-y-4">
            <h3 className="text-subtitle mb-4" style={{ color: 'var(--text-primary)' }}>
              {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
            </h3>
            
            {getSelectedDateEntries().length > 0 ? (
              getSelectedDateEntries().map((entry) => (
                <div key={entry.id} className="diary-preview cursor-pointer">
                  <div className="diary-preview-header">
                    <h4 className="diary-preview-title">{entry.title}</h4>
                    <span className="diary-preview-time">{entry.time}</span>
                  </div>
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
    </div>
  );
} 