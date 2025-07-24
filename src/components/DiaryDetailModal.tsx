import { useState, useEffect } from 'react';
import { DiaryEntry } from '../lib/data';
import { saveDiary, formatDateForApi, type DiaryApiRequest } from '../lib/api';

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
        date: formatDateForApi(new Date(editedDiary.date + ' ' + editedDiary.time)),
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
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage({ type: 'success', text: '日记删除成功！' });
      
      if (onDiaryDeleted) {
        onDiaryDeleted();
      }
      
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 1000);
      
    } catch (error) {
      console.error('❌ 删除日记失败:', error);
      setMessage({ type: 'error', text: '删除失败，请重试' });
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
            <label className="field-label">📝 标题</label>
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

          {/* 日期和时间 */}
          <div className="diary-meta mb-4">
            <div className="meta-item">
              <span className="meta-label">📅 日期</span>
              <span className="meta-value">{currentDiary.date}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">🕐 时间</span>
              <span className="meta-value">{currentDiary.time}</span>
            </div>
          </div>

          {/* 标签和评分 */}
          <div className="diary-tags mb-4">
            <div className="tag-score-row">
              {/* 标签 */}
              <div className="tag-section">
                <label className="field-label">🏷️ 标签</label>
                {isEditing ? (
                  <select
                    value={currentDiary.tag || 'personal'}
                    onChange={(e) => handleInputChange('tag', e.target.value)}
                    className="tag-select"
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
                  <span className="tag-display">
                    #{getTagTitle(currentDiary.tag || 'personal')}
                  </span>
                )}
              </div>

              {/* 心情评分 */}
              <div className="score-section">
                <label className="field-label">😊 心情</label>
                {isEditing ? (
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={currentDiary.score || 5}
                    onChange={(e) => handleInputChange('score', parseInt(e.target.value))}
                    className="score-slider"
                  />
                ) : (
                  <span className="score-display">
                    {currentDiary.score || 5}/10
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 日记内容 */}
          <div className="diary-field">
            <label className="field-label">📄 内容</label>
            {isEditing ? (
              <textarea
                value={currentDiary.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                className="field-textarea"
                placeholder="请输入日记内容"
                rows={10}
              />
            ) : (
              <div className="diary-content">
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

        .diary-content {
          background-color: var(--surface-light);
          padding: 1rem;
          border-radius: var(--radius-small);
          border: 1px solid var(--surface-dark);
          white-space: pre-wrap;
          line-height: 1.6;
          color: var(--text-primary);
          min-height: 200px;
        }

        .diary-meta {
          display: flex;
          gap: 2rem;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .meta-label {
          font-size: var(--font-size-body);
          color: var(--text-secondary);
          font-weight: 500;
        }

        .meta-value {
          font-size: var(--font-size-body);
          color: var(--text-primary);
        }

        .tag-score-row {
          display: flex;
          gap: 2rem;
          align-items: flex-start;
        }

        .tag-section,
        .score-section {
          flex: 1;
        }

        .tag-display,
        .score-display {
          display: inline-block;
          padding: 0.5rem 1rem;
          background-color: var(--surface-accent);
          color: var(--text-primary);
          border-radius: var(--radius-small);
          font-size: var(--font-size-body);
        }

        .score-slider {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: var(--surface-dark);
          outline: none;
          -webkit-appearance: none;
        }

        .score-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--primary-base);
          cursor: pointer;
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

        @media (max-width: 640px) {
          .diary-detail-modal {
            max-width: 100%;
            margin: 0.5rem;
          }
          
          .diary-meta {
            flex-direction: column;
            gap: 1rem;
          }
          
          .tag-score-row {
            flex-direction: column;
            gap: 1rem;
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