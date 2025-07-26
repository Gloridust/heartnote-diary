import { useState, useEffect } from 'react';
import { useIsClient, usePWAStatus } from '../hooks/useClientOnly';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  
  const isClient = useIsClient();
  const isStandalone = usePWAStatus();

  useEffect(() => {
    if (!isClient) return;

    // 检测iOS设备
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // 监听PWA安装事件
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // 延迟显示安装提示，避免干扰用户体验
      setTimeout(() => {
        if (!isStandalone) {
          setShowInstallPrompt(true);
        }
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isClient, isStandalone]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`PWA安装结果: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // 24小时内不再显示
    if (isClient) {
      try {
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
      } catch (error) {
        console.warn('Failed to save install prompt dismissal:', error);
      }
    }
  };

  // 检查是否在24小时内被关闭过
  const wasDismissedRecently = () => {
    if (!isClient) return false;
    
    try {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) return false;
      
      const dismissedTime = parseInt(dismissed);
      const twentyFourHours = 24 * 60 * 60 * 1000;
      return (Date.now() - dismissedTime) < twentyFourHours;
    } catch (error) {
      console.warn('Failed to check install prompt dismissal:', error);
      return false;
    }
  };

  // 如果已经是standalone模式或最近被关闭过，不显示提示
  if (isStandalone || wasDismissedRecently()) {
    return null;
  }

  // iOS设备显示不同的提示
  if (isIOS && showInstallPrompt) {
    return (
      <div className="pwa-install-prompt ios-prompt">
        <div className="prompt-content">
          <div className="prompt-icon">📱</div>
          <div className="prompt-text">
            <h3>安装声命体Memoirai</h3>
            <p>添加到主屏幕以获得更好的体验</p>
            <div className="ios-steps">
              <span>点击</span>
              <span className="share-icon">⬆️</span>
              <span>然后选择&quot;添加到主屏幕&quot;</span>
            </div>
          </div>
          <button onClick={handleDismiss} className="prompt-close">✕</button>
        </div>
        
        <style jsx>{`
          .ios-prompt {
            position: fixed;
            bottom: 80px;
            left: 16px;
            right: 16px;
            background: var(--surface-main);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            animation: slideUp 0.3s ease-out;
          }
          
          .prompt-content {
            display: flex;
            align-items: center;
            padding: 16px;
            gap: 12px;
          }
          
          .prompt-icon {
            font-size: 24px;
          }
          
          .prompt-text h3 {
            margin: 0 0 4px 0;
            font-size: 16px;
            color: var(--text-primary);
          }
          
          .prompt-text p {
            margin: 0 0 8px 0;
            font-size: 14px;
            color: var(--text-secondary);
          }
          
          .ios-steps {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: var(--text-secondary);
          }
          
          .share-icon {
            font-size: 16px;
            background: var(--primary-base);
            color: white;
            padding: 2px 4px;
            border-radius: 4px;
          }
          
          .prompt-close {
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 18px;
            cursor: pointer;
            padding: 4px;
          }
          
          @keyframes slideUp {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    );
  }

  // Android/PWA支持的浏览器
  if (deferredPrompt && showInstallPrompt) {
    return (
      <div className="pwa-install-prompt">
        <div className="prompt-content">
          <div className="prompt-icon">📱</div>
          <div className="prompt-text">
            <h3>安装声命体Memoirai</h3>
            <p>安装应用以获得更好的体验</p>
          </div>
          <div className="prompt-actions">
            <button onClick={handleInstallClick} className="install-btn">
              安装
            </button>
            <button onClick={handleDismiss} className="dismiss-btn">
              暂不
            </button>
          </div>
        </div>
        
        <style jsx>{`
          .pwa-install-prompt {
            position: fixed;
            bottom: 80px;
            left: 16px;
            right: 16px;
            background: var(--surface-main);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            animation: slideUp 0.3s ease-out;
          }
          
          .prompt-content {
            display: flex;
            align-items: center;
            padding: 16px;
            gap: 12px;
          }
          
          .prompt-icon {
            font-size: 24px;
          }
          
          .prompt-text {
            flex: 1;
          }
          
          .prompt-text h3 {
            margin: 0 0 4px 0;
            font-size: 16px;
            color: var(--text-primary);
          }
          
          .prompt-text p {
            margin: 0;
            font-size: 14px;
            color: var(--text-secondary);
          }
          
          .prompt-actions {
            display: flex;
            gap: 8px;
          }
          
          .install-btn {
            background: var(--primary-base);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
            font-weight: 500;
          }
          
          .dismiss-btn {
            background: none;
            border: 1px solid var(--surface-accent);
            color: var(--text-secondary);
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
          }
          
          @keyframes slideUp {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    );
  }

  return null;
} 