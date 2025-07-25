import { usePWAStatus, useOnlineStatus } from '../hooks/useClientOnly';

export default function PWAStatus() {
  const isPWA = usePWAStatus();
  const isOnline = useOnlineStatus();

  // 只有在PWA模式或离线状态时才显示
  if (!isPWA && isOnline) {
    return null;
  }

  return (
    <div className="pwa-status">
      {isPWA && (
        <div className="status-item">
          <span className="status-icon">📱</span>
          <span className="status-text">PWA模式</span>
        </div>
      )}
      
      {!isOnline && (
        <div className="status-item offline">
          <span className="status-icon">📡</span>
          <span className="status-text">离线模式</span>
        </div>
      )}

      <style jsx>{`
        .pwa-status {
          position: fixed;
          top: calc(var(--safe-area-inset-top, 0px) + 60px);
          right: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 999;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--surface-main);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          border: 1px solid var(--surface-accent);
          backdrop-filter: blur(10px);
          animation: fadeIn 0.3s ease-out;
        }

        .status-item.offline {
          background: #ff6b6b;
          color: white;
          border-color: #ff5252;
        }

        .status-icon {
          font-size: 14px;
        }

        .status-text {
          font-weight: 500;
          color: var(--text-primary);
        }

        .offline .status-text {
          color: white;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        /* PWA模式下的特殊样式 */
        @media all and (display-mode: standalone) {
          .pwa-status {
            top: calc(var(--safe-area-inset-top, 0px) + 70px);
          }
        }
      `}</style>
    </div>
  );
} 