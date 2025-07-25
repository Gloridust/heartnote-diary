import { useState, useEffect } from 'react';

interface ConversationRestoreNoticeProps {
  show: boolean;
  messageCount: number;
}

export default function ConversationRestoreNotice({ show, messageCount }: ConversationRestoreNoticeProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show && messageCount > 0) {
      setVisible(true);
      // 3秒后自动隐藏
      const timer = setTimeout(() => {
        setVisible(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [show, messageCount]);

  if (!visible) {
    return null;
  }

  return (
    <div className="conversation-restore-notice">
      <div className="notice-content">
        <span className="notice-icon">💭</span>
        <span className="notice-text">
          对话已恢复 ({messageCount} 条消息)
        </span>
        <button 
          onClick={() => setVisible(false)}
          className="notice-close"
        >
          ✕
        </button>
      </div>

      <style jsx>{`
        .conversation-restore-notice {
          position: fixed;
          top: calc(var(--safe-area-inset-top, 0px) + 80px);
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          animation: slideDown 0.3s ease-out;
        }

        .notice-content {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--surface-main);
          padding: 12px 16px;
          border-radius: 24px;
          border: 1px solid var(--surface-accent);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          backdrop-filter: blur(10px);
          font-size: 14px;
        }

        .notice-icon {
          font-size: 16px;
        }

        .notice-text {
          color: var(--text-primary);
          font-weight: 500;
        }

        .notice-close {
          background: none;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          padding: 0;
          margin-left: 4px;
          font-size: 12px;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .notice-close:hover {
          opacity: 1;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translate(-50%, -20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        /* PWA模式下的特殊样式 */
        @media all and (display-mode: standalone) {
          .conversation-restore-notice {
            top: calc(var(--safe-area-inset-top, 0px) + 90px);
          }
        }
      `}</style>
    </div>
  );
} 