import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from "react";

export default function App({ Component, pageProps }: AppProps) {
  // 注册 Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✅ Service Worker 注册成功:', registration);
        })
        .catch((error) => {
          console.log('❌ Service Worker 注册失败:', error);
        });
    }
  }, []);

  return <Component {...pageProps} />;
}
