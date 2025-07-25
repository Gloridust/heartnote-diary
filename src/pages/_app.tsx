import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from "react";
import { checkEnvironmentVariables } from "../lib/env-check";

export default function App({ Component, pageProps }: AppProps) {
  // 环境变量检查和 Service Worker 注册
  useEffect(() => {
    // 检查环境变量配置
    checkEnvironmentVariables();
    
    // 注册 Service Worker
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
