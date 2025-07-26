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
  const [isiOSSafari, setIsiOSSafari] = useState(false);
  
  const isClient = useIsClient();
  const isStandalone = usePWAStatus();

  useEffect(() => {
    if (!isClient) return;

    // 更精确的iOS设备检测
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isiOSSafariApp = iOS && isSafari;
    
    setIsIOS(iOS);
    setIsiOSSafari(isiOSSafariApp);

    console.log('🔍 PWA环境检测:', {
      iOS,
      isSafari,
      isiOSSafariApp,
      isStandalone,
      userAgent: navigator.userAgent.slice(0, 100)
    });

    // 监听PWA安装事件（主要针对Android Chrome）
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      console.log('📱 检测到PWA安装提示事件');
      
      // 延迟显示安装提示，避免干扰用户体验
      setTimeout(() => {
        if (!isStandalone && !wasDismissedRecently()) {
          console.log('🎯 显示Android PWA安装提示');
          setShowInstallPrompt(true);
        }
      }, 5000);
    };

    // iOS Safari需要特殊处理
    if (isiOSSafariApp && !isStandalone) {
      setTimeout(() => {
        if (!wasDismissedRecently()) {
          console.log('🍎 显示iOS Safari安装引导');
          setShowInstallPrompt(true);
        }
      }, 3000);
    }

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
    console.log('❌ 用户关闭PWA安装提示');
    setShowInstallPrompt(false);
    // 24小时内不再显示
    if (isClient) {
      try {
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
        console.log('💾 已保存PWA安装提示关闭状态');
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

  // iOS设备显示详细的安装引导
  if (isIOS && showInstallPrompt) {
    return (
      <div className="pwa-install-prompt ios-prompt">
        <div className="prompt-header">
          <div className="prompt-icon">📱</div>
          <div className="prompt-title">
            <h3>安装声命体MemoirAI</h3>
            <p>获得原生应用体验</p>
          </div>
          <button onClick={handleDismiss} className="prompt-close">✕</button>
        </div>
        
        <div className="ios-benefits">
          <div className="benefit-item">
            <span className="benefit-icon">⚡</span>
            <span>更快的启动速度</span>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">📴</span>
            <span>离线访问支持</span>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">🔔</span>
            <span>推送通知提醒</span>
          </div>
        </div>
        
        <div className="ios-instructions">
          <div className="instruction-title">📋 安装步骤：</div>
          <div className="instruction-steps">
            <div className="step">
              <span className="step-number">1</span>
              <span className="step-text">点击底部</span>
              <span className="share-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92S19.61 16.08 18 16.08z"/>
                </svg>
              </span>
              <span className="step-text">分享按钮</span>
            </div>
                         <div className="step">
               <span className="step-number">2</span>
               <span className="step-text">选择&quot;添加到主屏幕&quot;</span>
               <span className="add-icon">📲</span>
             </div>
             <div className="step">
               <span className="step-number">3</span>
               <span className="step-text">点击&quot;添加&quot;完成安装</span>
               <span className="check-icon">✅</span>
             </div>
          </div>
        </div>
        
        <div className="ios-tip">
          💡 安装后可从主屏幕直接打开，体验如同原生应用
        </div>
        
        <style jsx>{`
          .ios-prompt {
            position: fixed;
            bottom: 80px;
            left: 16px;
            right: 16px;
            background: var(--surface-main);
            border-radius: 16px;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
            z-index: 1000;
            animation: slideUp 0.4s ease-out;
            border: 1px solid var(--surface-dark);
            max-height: 70vh;
            overflow-y: auto;
          }
          
          .prompt-header {
            display: flex;
            align-items: center;
            padding: 20px 20px 16px 20px;
            gap: 12px;
            border-bottom: 1px solid var(--surface-dark);
          }
          
          .prompt-icon {
            font-size: 28px;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
          }
          
          .prompt-title {
            flex: 1;
          }
          
          .prompt-title h3 {
            margin: 0 0 4px 0;
            font-size: 18px;
            font-weight: 600;
            color: var(--text-primary);
          }
          
          .prompt-title p {
            margin: 0;
            font-size: 14px;
            color: var(--text-secondary);
          }
          
          .prompt-close {
            background: var(--surface-accent);
            border: none;
            color: var(--text-secondary);
            font-size: 16px;
            cursor: pointer;
            padding: 8px;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          }
          
          .prompt-close:hover {
            background: var(--surface-dark);
            color: var(--text-primary);
          }
          
          .ios-benefits {
            padding: 16px 20px;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          
          .benefit-item {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 14px;
            color: var(--text-primary);
          }
          
          .benefit-icon {
            font-size: 16px;
            width: 24px;
            text-align: center;
          }
          
          .ios-instructions {
            padding: 16px 20px;
            border-top: 1px solid var(--surface-dark);
            background: var(--surface-light);
          }
          
          .instruction-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 12px;
          }
          
          .instruction-steps {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          
          .step {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            color: var(--text-secondary);
          }
          
          .step-number {
            background: var(--primary-base);
            color: white;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 600;
            flex-shrink: 0;
          }
          
          .step-text {
            color: var(--text-primary);
          }
          
          .share-icon {
            background: var(--primary-base);
            color: white;
            padding: 4px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .add-icon, .check-icon {
            font-size: 16px;
          }
          
          .ios-tip {
            padding: 16px 20px;
            font-size: 12px;
            color: var(--text-tertiary);
            text-align: center;
            background: var(--surface-accent);
            border-top: 1px solid var(--surface-dark);
            line-height: 1.4;
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
            <h3>安装声命体MemoirAI</h3>
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