import { useState, useEffect } from 'react';
import { DiaryEntry } from '../lib/data';
import { saveDiary, deleteDiary, formatDateForApi, createDateFromDateAndTime, type DiaryApiRequest } from '../lib/api';

interface DiaryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  diary: DiaryEntry | null;
  userId: number;
  onDiaryUpdated?: () => void;
  onDiaryDeleted?: () => void;
}

export default function DiaryDetailModal({ 
  isOpen, 
  onClose, 
  diary, 
  userId, 
  onDiaryUpdated, 
  onDiaryDeleted 
}: DiaryDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDiary, setEditedDiary] = useState<DiaryEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 当弹窗打开时，初始化编辑状态
  useEffect(() => {
    if (isOpen && diary) {
      setEditedDiary({ ...diary });
      setIsEditing(false);
      setMessage(null);
    }
  }, [isOpen, diary]);

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

  // 处理编辑
  const handleEdit = () => {
    setIsEditing(true);
    setMessage(null);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedDiary(diary ? { ...diary } : null);
    setMessage(null);
  };

  // 保存编辑
  const handleSave = async () => {
    if (!editedDiary) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const apiData: DiaryApiRequest = {
        id: userId,
        diary_id: editedDiary.id,
        title: editedDiary.title,
        content: editedDiary.content,
        date: formatDateForApi(createDateFromDateAndTime(editedDiary.date, editedDiary.time)),
        score: editedDiary.score,
        tag: editedDiary.tag
      };

      const result = await saveDiary(apiData);
      
      if (result.status === 'success') {
        setMessage({ type: 'success', text: '日记保存成功！' });
        setIsEditing(false);
        
        if (onDiaryUpdated) {
          onDiaryUpdated();
        }
        
        setTimeout(() => {
          onClose();
          setMessage(null);
        }, 2000);
      } else {
        throw new Error(result.message || '保存失败');
      }
    } catch (error) {
      console.error('❌ 保存日记失败:', error);
      let errorMessage = '保存失败';
      
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = '无法连接到服务器，请检查网络连接';
        } else {
          errorMessage = error.message;
        }
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  // 删除日记
  const handleDelete = async () => {
    if (!diary || !window.confirm('确定要删除这篇日记吗？删除后无法恢复。')) {
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    try {
      console.log('🗑️ 删除日记:', diary.id);
      
      const result = await deleteDiary(diary.id, userId);
      
      if (result.status === 'success') {
        setMessage({ type: 'success', text: '日记删除成功！' });
        
        if (onDiaryDeleted) {
          onDiaryDeleted();
        }
        
        setTimeout(() => {
          onClose();
          setMessage(null);
        }, 1000);
      } else {
        throw new Error(result.message || '删除失败');
      }
      
    } catch (error) {
      console.error('❌ 删除日记失败:', error);
      let errorMessage = '删除失败，请重试';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsDeleting(false);
    }
  };

  // 处理输入变化
  const handleInputChange = (field: keyof DiaryEntry, value: string | number) => {
    if (!editedDiary) return;
    
    setEditedDiary({
      ...editedDiary,
      [field]: value
    });
  };

  if (!isOpen || !diary) return null;

  const currentDiary = isEditing ? editedDiary : diary;
  if (!currentDiary) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content diary-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* 弹窗头部 */}
        <div className="modal-header">
          <div className="flex items-center space-x-2">
            <h2 className="modal-title">
              {isEditing ? '✏️ 编辑日记' : '📖 日记详情'}
            </h2>
            {currentDiary.score && (
              <div className="flex items-center space-x-1">
                <span className="text-lg">{getMoodEmoji(currentDiary.score)}</span>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {currentDiary.score}/10
                </span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="modal-close-button">✕</button>
        </div>

        {/* 弹窗内容 */}
        <div className="modal-body">
          {/* 消息提示 */}
          {message && (
            <div className={`message ${message.type} mb-4`}>
              <span>{message.text}</span>
              <button onClick={() => setMessage(null)} className="message-close">✕</button>
            </div>
          )}

          {/* 日记标题 */}
          <div className="diary-field mb-4">
            {/* <label className="field-label">📝 标题</label> */}
            {isEditing ? (
              <input
                type="text"
                value={currentDiary.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="field-input"
                placeholder="请输入日记标题"
              />
            ) : (
              <h3 className="diary-title">{currentDiary.title}</h3>
            )}
          </div>
          {/* 日记元数据 - 时间、日期、标签、心情在同一行 */}
          <div className="diary-metadata mb-6">
            <div className="metadata-row">
              {/* 日期时间 */}
              <div className="meta-group">
                <div className="meta-item">
                  <span className="meta-icon">📅</span>
                  <span className="meta-text">{currentDiary.date}</span>
                </div>
              </div>

              {/* 时间 */}
              <div className="meta-group">
                <div className="meta-item">
                  <span className="meta-icon">🕐</span>
                  <span className="meta-text">{currentDiary.time}</span>
                </div>
              </div>

              {/* 标签 */}
              <div className="meta-group">
                {isEditing ? (
                  <select
                    value={currentDiary.tag || 'personal'}
                    onChange={(e) => handleInputChange('tag', e.target.value)}
                    className="compact-tag-select"
                  >
                    <option value="personal">个人日记</option>
                    <option value="work">工作日记</option>
                    <option value="travel">旅行日记</option>
                    <option value="relationships">人际日记</option>
                    <option value="health">健康日记</option>
                    <option value="goals">目标日记</option>
                    <option value="reflection">反思日记</option>
                    <option value="gratitude">感恩日记</option>
                    <option value="dreams">梦想日记</option>
                    <option value="memories">回忆日记</option>
                  </select>
                ) : (
                  <div className="meta-item">
                    <span className="meta-icon">🏷️</span>
                    <span className="tag-badge">{getTagTitle(currentDiary.tag || 'personal')}</span>
                  </div>
                )}
              </div>

              {/* 心情评分 */}
              <div className="meta-group">
                {isEditing ? (
                  <div className="score-editor">
                    <span className="meta-icon">😊</span>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={currentDiary.score || 5}
                      onChange={(e) => handleInputChange('score', parseInt(e.target.value))}
                      className="compact-score-slider"
                    />
                    <span className="score-value">{currentDiary.score || 5}</span>
                  </div>
                ) : (
                  <div className="meta-item">
                    <span className="meta-icon">{getMoodEmoji(currentDiary.score || 5)}</span>
                    <span className="score-badge">{currentDiary.score || 5}/10</span>
                  </div>
                )}
              </div>
            </div>

            {/* 位置和天气信息（如果有的话，显示在第二行） */}
            {(currentDiary.location || currentDiary.weather) && (
              <div className="environment-row">
                {currentDiary.weather && (
                  <div className="meta-item">
                    <span className="meta-icon">🌤️</span>
                    <span className="meta-text">
                      {currentDiary.weather.temperature}℃ {currentDiary.weather.description}
                    </span>
                  </div>
                )}
                {currentDiary.location && (
                  <div className="meta-item">
                    <span className="meta-icon">📍</span>
                    <span className="meta-text location-text">
                      {currentDiary.location.formatted_address}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 日记内容 - 主体区域 */}
          <div className="diary-content-section">
            <div className="content-header">
              <h3 className="content-title">📝 日记内容</h3>
              {!isEditing && (
                <div className="content-stats">
                  {currentDiary.content.length} 字
                </div>
              )}
            </div>
            {isEditing ? (
              <textarea
                value={currentDiary.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                className="content-editor"
                placeholder="请输入日记内容..."
                rows={12}
              />
            ) : (
              <div className="content-display">
                {currentDiary.content}
              </div>
            )}
          </div>
        </div>

        {/* 弹窗底部 */}
        <div className="modal-footer">
          {isEditing ? (
            <>
              <button onClick={handleCancelEdit} className="button-secondary" disabled={isSaving}>
                取消
              </button>
              <button onClick={handleSave} className="button-primary" disabled={isSaving}>
                {isSaving ? '保存中...' : '💾 保存'}
              </button>
            </>
          ) : (
            <>
              <button onClick={handleDelete} className="button-danger" disabled={isDeleting}>
                {isDeleting ? '删除中...' : '🗑️ 删除'}
              </button>
              <button onClick={handleEdit} className="button-secondary">
                ✏️ 编辑
              </button>
              <button onClick={onClose} className="button-primary">
                关闭
              </button>
            </>
          )}
        </div>
      </div>

      {/* 样式定义 */}
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 1rem;
        }

        .diary-detail-modal {
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-content {
          background-color: var(--surface-main);
          border-radius: var(--radius-medium);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 
                      0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-standard);
          border-bottom: 1px solid var(--surface-dark);
        }

        .modal-title {
          font-size: var(--font-size-title);
          font-weight: 500;
          color: var(--text-primary);
          margin: 0;
        }

        .modal-close-button {
          background: none;
          border: none;
          font-size: 1.2rem;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 50%;
          width: 2rem;
          height: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .modal-close-button:hover {
          background-color: var(--surface-accent);
          color: var(--text-primary);
        }

        .modal-body {
          padding: var(--spacing-standard);
        }

        .diary-field {
          margin-bottom: 1rem;
        }

        .field-label {
          display: block;
          font-size: var(--font-size-subtitle);
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .diary-title {
          font-size: var(--font-size-title);
          font-weight: 500;
          color: var(--text-primary);
          margin: 0;
        }

        .field-input,
        .field-textarea,
        .tag-select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--surface-dark);
          border-radius: var(--radius-small);
          font-size: var(--font-size-body);
          background-color: var(--surface-light);
          color: var(--text-primary);
          transition: border-color 0.2s ease;
          resize: vertical;
        }

        .field-input:focus,
        .field-textarea:focus,
        .tag-select:focus {
          outline: none;
          border-color: var(--primary-base);
          box-shadow: 0 0 0 2px rgba(177, 156, 217, 0.2);
        }

        /* 日记内容主体区域样式 */
        .diary-content-section {
          background-color: var(--surface-main);
          border-radius: var(--radius-medium);
          border: 2px solid var(--primary-light);
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .content-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          background: linear-gradient(135deg, var(--primary-light) 0%, var(--surface-accent) 100%);
          border-bottom: 1px solid var(--surface-dark);
        }

        .content-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .content-stats {
          font-size: 0.75rem;
          color: var(--text-tertiary);
          background-color: var(--surface-light);
          padding: 0.25rem 0.5rem;
          border-radius: 8px;
          border: 1px solid var(--surface-dark);
        }

        .content-display {
          padding: 1.5rem;
          white-space: pre-wrap;
          line-height: 1.7;
          color: var(--text-primary);
          font-size: 1rem;
          min-height: 250px;
          background-color: var(--surface-main);
        }

        .content-editor {
          width: 100%;
          padding: 1.5rem;
          border: none;
          font-size: 1rem;
          background-color: var(--surface-main);
          color: var(--text-primary);
          line-height: 1.7;
          resize: vertical;
          min-height: 250px;
          font-family: inherit;
        }

        .content-editor:focus {
          outline: none;
          background-color: var(--surface-light);
        }

        .content-editor::placeholder {
          color: var(--text-tertiary);
          opacity: 0.7;
        }

        /* 新的元数据布局样式 */
        .diary-metadata {
          background-color: var(--surface-accent);
          border-radius: var(--radius-medium);
          padding: 1rem;
          border: 1px solid var(--surface-dark);
        }

        .metadata-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .environment-row {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--surface-dark);
          flex-wrap: wrap;
        }

        .meta-group {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-shrink: 0;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .meta-icon {
          font-size: 1rem;
          opacity: 0.8;
        }

        .meta-text {
          font-size: 0.875rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .location-text {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .tag-badge,
        .score-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          background-color: var(--primary-light);
          color: var(--text-primary);
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.025em;
        }

        .score-badge {
          background-color: var(--surface-light);
          border: 1px solid var(--surface-dark);
        }

        .compact-tag-select {
          padding: 0.25rem 0.5rem;
          border: 1px solid var(--surface-dark);
          border-radius: 8px;
          font-size: 0.75rem;
          background-color: var(--surface-light);
          color: var(--text-primary);
          min-width: 120px;
        }

        .score-editor {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .compact-score-slider {
          width: 80px;
          height: 4px;
          border-radius: 2px;
          background: var(--surface-dark);
          outline: none;
          -webkit-appearance: none;
        }

        .compact-score-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--primary-base);
          cursor: pointer;
        }

        .score-value {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-primary);
          min-width: 20px;
        }

        .message {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          border-radius: var(--radius-small);
          font-size: var(--font-size-body);
        }

        .message.success {
          background-color: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .message.error {
          background-color: #fee2e2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .message-close {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          padding: 0;
          margin-left: 0.5rem;
          opacity: 0.7;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: var(--spacing-standard);
          border-top: 1px solid var(--surface-dark);
        }

        .button-primary,
        .button-secondary,
        .button-danger {
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius-small);
          font-size: var(--font-size-body);
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
        }

        .button-primary {
          background-color: var(--primary-base);
          color: var(--text-inverse);
        }

        .button-primary:hover:not(:disabled) {
          background-color: var(--primary-dark);
        }

        .button-secondary {
          background-color: var(--surface-light);
          color: var(--text-primary);
          border: 1px solid var(--surface-dark);
        }

        .button-secondary:hover:not(:disabled) {
          background-color: var(--surface-dark);
        }

        .button-danger {
          background-color: #ef4444;
          color: white;
        }

        .button-danger:hover:not(:disabled) {
          background-color: #dc2626;
        }

        .button-primary:disabled,
        .button-secondary:disabled,
        .button-danger:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (prefers-color-scheme: dark) {
          .modal-content {
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          
          .message.success {
            background-color: rgba(16, 185, 129, 0.1);
            color: #34d399;
            border-color: rgba(16, 185, 129, 0.3);
          }

          .message.error {
            background-color: rgba(239, 68, 68, 0.1);
            color: #f87171;
            border-color: rgba(239, 68, 68, 0.3);
          }
          
          .field-input,
          .field-textarea,
          .tag-select {
            border-color: rgba(255, 255, 255, 0.2);
          }
          
          .button-secondary {
            border-color: rgba(255, 255, 255, 0.2);
          }

          .diary-content {
            border-color: rgba(255, 255, 255, 0.2);
          }
        }
        
        .environment-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .env-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .env-icon {
          font-size: 16px;
          min-width: 20px;
        }
        
        .env-text {
          font-size: 13px;
          line-height: 1.4;
        }

        @media (max-width: 640px) {
          .diary-detail-modal {
            max-width: 100%;
            margin: 0.5rem;
          }
          
          .metadata-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .meta-group {
            justify-content: flex-start;
            width: 100%;
          }

          .environment-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .location-text {
            max-width: 100%;
          }

          .content-header {
            padding: 0.75rem 1rem;
          }

          .content-title {
            font-size: 1rem;
          }

          .content-display,
          .content-editor {
            padding: 1rem;
            font-size: 0.9rem;
          }
          
          .modal-footer {
            flex-wrap: wrap;
            gap: 0.5rem;
          }
          
          .button-primary,
          .button-secondary,
          .button-danger {
            flex: 1;
            min-width: 120px;
          }
        }
      `}</style>
    </div>
  );
} 