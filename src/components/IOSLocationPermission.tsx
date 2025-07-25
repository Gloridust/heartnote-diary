import { useState } from 'react';
import { getLocationAndWeather, type LocationWeatherData } from '../lib/location-weather';

interface IOSLocationPermissionProps {
  onLocationGranted: (data: LocationWeatherData) => void;
  onLocationDenied: (error: string) => void;
}

export default function IOSLocationPermission({ onLocationGranted, onLocationDenied }: IOSLocationPermissionProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);

  // 检测是否为iOS设备
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // 如果不是iOS设备，不显示组件
  if (!isIOS) return null;

  const handleRequestLocation = async () => {
    setIsRequesting(true);
    
    try {
      console.log('📱 iOS用户手动请求位置权限...');
      const data = await getLocationAndWeather();
      console.log('✅ iOS位置权限已授予，数据获取成功:', data);
      
      onLocationGranted(data);
      setShowPrompt(false);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '位置获取失败';
      console.error('❌ iOS位置权限被拒绝或获取失败:', errorMessage);
      onLocationDenied(errorMessage);
      
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSkip = () => {
    console.log('⏭️ iOS用户跳过位置权限');
    onLocationDenied('用户跳过位置权限');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="ios-location-permission-overlay">
      <div className="ios-location-permission-modal">
        <div className="ios-permission-icon">📍</div>
        
        <h3 className="ios-permission-title">
          获取位置和天气信息
        </h3>
        
        <p className="ios-permission-description">
          为了提供更好的日记体验，我们需要获取您的位置和当前天气信息。
          这些信息将用于AI对话和日记记录中。
        </p>

        <div className="ios-permission-requirements">
          <div className="ios-requirement-item">
            <span className="ios-requirement-icon">✅</span>
            <span>请确保已在设置中开启位置服务</span>
          </div>
          <div className="ios-requirement-item">
            <span className="ios-requirement-icon">🔐</span>
            <span>需要在HTTPS安全连接下使用</span>
          </div>
          <div className="ios-requirement-item">
            <span className="ios-requirement-icon">📶</span>
            <span>确保网络连接正常</span>
          </div>
        </div>
        
        <div className="ios-permission-buttons">
          <button
            onClick={handleRequestLocation}
            disabled={isRequesting}
            className="ios-permission-allow"
          >
            {isRequesting ? (
              <>
                <span className="ios-loading-spinner">⏳</span>
                获取中...
              </>
            ) : (
              '允许并获取位置'
            )}
          </button>
          
          <button
            onClick={handleSkip}
            disabled={isRequesting}
            className="ios-permission-skip"
          >
            暂时跳过
          </button>
        </div>

        <p className="ios-permission-note">
          如果获取失败，您仍可以正常使用日记功能
        </p>
      </div>

      <style jsx>{`
        .ios-location-permission-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .ios-location-permission-modal {
          background: var(--surface-main);
          border-radius: 16px;
          padding: 24px;
          max-width: 340px;
          width: 100%;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .ios-permission-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .ios-permission-title {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 12px 0;
        }

        .ios-permission-description {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0 0 20px 0;
        }

        .ios-permission-requirements {
          text-align: left;
          margin: 20px 0;
          padding: 16px;
          background: var(--surface-accent);
          border-radius: 8px;
        }

        .ios-requirement-item {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .ios-requirement-item:last-child {
          margin-bottom: 0;
        }

        .ios-requirement-icon {
          font-size: 16px;
          min-width: 16px;
        }

        .ios-permission-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin: 24px 0 16px 0;
        }

        .ios-permission-allow {
          background: var(--primary-base);
          color: var(--text-inverse);
          border: none;
          border-radius: 12px;
          padding: 14px 20px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .ios-permission-allow:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139, 123, 107, 0.3);
        }

        .ios-permission-allow:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .ios-permission-skip {
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid var(--surface-accent);
          border-radius: 12px;
          padding: 12px 20px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .ios-permission-skip:hover:not(:disabled) {
          background: var(--surface-accent);
        }

        .ios-permission-skip:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .ios-permission-note {
          font-size: 12px;
          color: var(--text-tertiary);
          margin: 0;
          line-height: 1.4;
        }

        .ios-loading-spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
} 