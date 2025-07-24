// 信语日记 PWA Service Worker
const CACHE_NAME = 'heartnote-diary-v2';
const urlsToCache = [
  '/',
  '/diary',
  '/test-audio',
  '/manifest.json',
  '/favicon.png',
  '/favicon.ico'
];

// 安装事件
self.addEventListener('install', function(event) {
  console.log('🔧 Service Worker 安装中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('📦 缓存文件中...');
        return cache.addAll(urlsToCache);
      })
  );
  // 强制激活新的 service worker
  self.skipWaiting();
});

// 激活事件
self.addEventListener('activate', function(event) {
  console.log('🚀 Service Worker 激活中...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ 清理旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // 立即控制所有客户端
  self.clients.claim();
});

// 请求拦截
self.addEventListener('fetch', function(event) {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') {
    return;
  }

  // 跳过 API 请求和外部资源
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('http') && !event.request.url.includes(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // 如果缓存中有，直接返回
        if (response) {
          return response;
        }

        // 否则请求网络
        return fetch(event.request).then(function(response) {
          // 检查是否收到有效响应
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // 克隆响应进行缓存
          var responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
  );
});

// PWA 安装提示
self.addEventListener('beforeinstallprompt', function(event) {
  console.log('📱 PWA 安装提示准备显示');
  event.preventDefault();
});

// 消息处理
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
}); 