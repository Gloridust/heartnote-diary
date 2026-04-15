import { useState, useEffect } from 'react';
import { useIsClient, usePWAStatus } from '../hooks/useClientOnly';

interface DebugInfo {
  userAgent: string;
  isIOS: boolean;
  isInStandaloneMode: boolean;
  isNavigatorStandalone: boolean;
  protocol: string;
  host: string;
  manifestSupport: boolean;
  serviceWorkerSupport: boolean;
  beforeInstallPromptSupport: boolean;
  isSecureContext: boolean;
  manifestLink: string | null;
  appleIcons: Array<{ href: string | null; sizes: string | null }>;
  timestamp: string;
}

export default function PWADebugInfo() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const isClient = useIsClient();
  const isPWA = usePWAStatus();

  useEffect(() => {
    if (!isClient) return;

    const info: DebugInfo = {
      userAgent: navigator.userAgent,
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      isInStandaloneMode: window.matchMedia('(display-mode: standalone)').matches,
      isNavigatorStandalone: !!(window.navigator as Navigator & { standalone?: boolean }).standalone,
      protocol: window.location.protocol,
      host: window.location.host,
      manifestSupport: 'serviceWorker' in navigator,
      serviceWorkerSupport: 'serviceWorker' in navigator,
      beforeInstallPromptSupport: 'onbeforeinstallprompt' in window,
      isSecureContext: window.isSecureContext,
      manifestLink: document.querySelector('link[rel="manifest"]')?.getAttribute('href') || null,
      appleIcons: Array.from(document.querySelectorAll('link[rel="apple-touch-icon"]')).map(link => ({
        href: link.getAttribute('href'),
        sizes: link.getAttribute('sizes')
      })),
      timestamp: new Date().toISOString()
    };

    setDebugInfo(info);
    console.log('🔍 PWA调试信息:', info);
  }, [isClient]);

  if (!isClient || !debugInfo) {
    return null;
  }

  return (
    <div className="pwa-debug-info" style={{
      position: 'fixed',
      bottom: '100px',
      left: '10px',
      right: '10px',
      background: '#000',
      color: '#fff',
      padding: '10px',
      borderRadius: '8px',
      fontSize: '12px',
      zIndex: 9999,
      maxHeight: '200px',
      overflow: 'auto'
    }}>
      <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
        🔍 PWA调试信息
      </div>
      
      <div>设备类型: {debugInfo.isIOS ? 'iOS' : '其他'}</div>
      <div>协议: {debugInfo.protocol}</div>
      <div>安全上下文: {debugInfo.isSecureContext ? '✅' : '❌'}</div>
      <div>Standalone模式: {debugInfo.isInStandaloneMode ? '✅' : '❌'}</div>
      <div>Navigator.standalone: {debugInfo.isNavigatorStandalone ? '✅' : '❌'}</div>
      <div>Manifest链接: {debugInfo.manifestLink || '❌'}</div>
      <div>ServiceWorker支持: {debugInfo.serviceWorkerSupport ? '✅' : '❌'}</div>
      <div>BeforeInstallPrompt支持: {debugInfo.beforeInstallPromptSupport ? '✅' : '❌'}</div>
      <div>Apple图标数量: {debugInfo.appleIcons?.length || 0}</div>
      
      {debugInfo.isIOS && (
        <div style={{ marginTop: '8px', padding: '8px', background: '#333', borderRadius: '4px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>📱 iOS说明:</div>
          <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
            1. 在Safari中打开网站<br/>
            2. 点击分享按钮 (□↑)<br/>
                         3. 选择&quot;添加到主屏幕&quot;<br/>
            4. 确认添加<br/>
            5. 需要HTTPS协议
          </div>
        </div>
      )}
    </div>
  );
} 