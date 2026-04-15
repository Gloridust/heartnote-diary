import { useState, useEffect } from 'react';
import { getLocationAndWeather, type LocationWeatherData } from '../lib/location-weather';
import { useIsClient } from '../hooks/useClientOnly';

interface LocationWeatherStatusProps {
  onDataUpdate?: (data: LocationWeatherData | null) => void;
}

export default function LocationWeatherStatus({ onDataUpdate }: LocationWeatherStatusProps) {
  const [locationWeatherData, setLocationWeatherData] = useState<LocationWeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const isClient = useIsClient();

  const fetchLocationWeather = async () => {
    if (!isClient) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🌍 手动获取位置和天气信息...');
      const data = await getLocationAndWeather();
      setLocationWeatherData(data);
      setLastUpdate(new Date());
      onDataUpdate?.(data);
      console.log('✅ 位置和天气信息获取成功:', data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取失败';
      setError(errorMessage);
      onDataUpdate?.(null);
      console.error('❌ 位置和天气信息获取失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 自动获取一次
    if (isClient && !locationWeatherData) {
      fetchLocationWeather();
    }
  }, [isClient]);

  if (!isClient) {
    return null;
  }

  return (
    <div className="location-weather-status">
      <div className="status-header">
        <h4>🌍 位置和天气状态</h4>
        <button 
          onClick={fetchLocationWeather} 
          disabled={isLoading}
          className="refresh-btn"
        >
          {isLoading ? '🔄' : '🔍'}
        </button>
      </div>

      {/* 状态显示 */}
      <div className="status-content">
        {isLoading && (
          <div className="status-item loading">
            <span className="status-icon">⏳</span>
            <span>正在获取位置和天气信息...</span>
          </div>
        )}

        {error && (
          <div className="status-item error">
            <span className="status-icon">❌</span>
            <span>错误: {error}</span>
          </div>
        )}

        {locationWeatherData && (
          <>
            <div className="status-item success">
              <span className="status-icon">📍</span>
              <span>{locationWeatherData.location.formatted_address}</span>
            </div>
            
            <div className="status-item success">
              <span className="status-icon">🌤️</span>
              <span>
                {locationWeatherData.weather.temperature}℃，
                {locationWeatherData.weather.description}
              </span>
            </div>

            {lastUpdate && (
              <div className="status-item time">
                <span className="status-icon">🕐</span>
                <span>
                  更新时间: {lastUpdate.toLocaleTimeString('zh-CN', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </span>
              </div>
            )}
          </>
        )}

        {!isLoading && !error && !locationWeatherData && (
          <div className="status-item warning">
            <span className="status-icon">⚠️</span>
            <span>暂无位置和天气信息</span>
          </div>
        )}
      </div>

      <style jsx>{`
        .location-weather-status {
          background: var(--surface-main);
          border: 1px solid var(--surface-accent);
          border-radius: 8px;
          padding: 12px;
          margin: 8px 0;
          font-size: 12px;
        }

        .status-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .status-header h4 {
          margin: 0;
          font-size: 13px;
          color: var(--text-primary);
        }

        .refresh-btn {
          background: none;
          border: 1px solid var(--surface-accent);
          border-radius: 4px;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .status-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 2px 0;
        }

        .status-icon {
          font-size: 14px;
          min-width: 16px;
        }

        .status-item.loading {
          color: var(--text-secondary);
        }

        .status-item.error {
          color: #ff6b6b;
        }

        .status-item.success {
          color: var(--text-primary);
        }

        .status-item.warning {
          color: #ffa726;
        }

        .status-item.time {
          color: var(--text-tertiary);
          font-size: 11px;
        }
      `}</style>
    </div>
  );
} 