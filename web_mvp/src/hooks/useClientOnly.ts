import { useState, useEffect } from 'react';

// 检查是否在客户端环境
export function useIsClient() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}

// PWA状态检测hook
export function usePWAStatus() {
  const [isPWA, setIsPWA] = useState(false);
  const isClient = useIsClient();

  useEffect(() => {
    if (!isClient) return;

    const checkPWAStatus = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          !!(window.navigator as Navigator & { standalone?: boolean }).standalone ||
                          document.referrer.includes('android-app://');
      setIsPWA(isStandalone);
    };

    checkPWAStatus();

    // 监听display-mode变化
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const listener = () => checkPWAStatus();
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', listener);
    } else {
      // 兼容旧版浏览器
      mediaQuery.addListener(listener);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', listener);
      } else {
        mediaQuery.removeListener(listener);
      }
    };
  }, [isClient]);

  return isPWA;
}

// 网络状态检测hook
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const isClient = useIsClient();

  useEffect(() => {
    if (!isClient) return;

    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    updateOnlineStatus();

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [isClient]);

  return isOnline;
}

// localStorage安全访问hook
export function useLocalStorage(key: string, initialValue: string = '') {
  const [value, setValue] = useState(initialValue);
  const isClient = useIsClient();

  useEffect(() => {
    if (!isClient) return;

    try {
      const item = localStorage.getItem(key);
      if (item) {
        setValue(item);
      }
    } catch (error) {
      console.warn(`Failed to read localStorage key "${key}":`, error);
    }
  }, [key, isClient]);

  const setStoredValue = (newValue: string) => {
    try {
      setValue(newValue);
      if (isClient) {
        localStorage.setItem(key, newValue);
      }
    } catch (error) {
      console.warn(`Failed to set localStorage key "${key}":`, error);
    }
  };

  const removeStoredValue = () => {
    try {
      setValue(initialValue);
      if (isClient) {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`Failed to remove localStorage key "${key}":`, error);
    }
  };

  return [value, setStoredValue, removeStoredValue] as const;
} 