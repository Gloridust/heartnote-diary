import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  
  // 环境变量配置
  env: {
    // 外部数据库服务器地址（服务端使用）
    EXTERNAL_API_BASE_URL: process.env.EXTERNAL_API_BASE_URL || 'http://127.0.0.1:5000',
  },
  
  // PWA 支持
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
