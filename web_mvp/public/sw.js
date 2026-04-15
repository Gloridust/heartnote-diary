// 声命体MemoirAI PWA Service Worker
const CACHE_NAME = 'heartnote-diary-v3';
const STATIC_CACHE = 'static-v3';
const RUNTIME_CACHE = 'runtime-v3';

// 静态资源缓存列表
const urlsToCache = [
  '/',
  '/diary',
  '/test-audio',
  '/manifest.json',
  '/browserconfig.xml',
  '/favicon.png',
  '/favicon.ico'
];

// 运行时缓存策略
const runtimeCacheStrategies = {
  // 图片资源 - 缓存优先
  images: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  // 字体资源 - 缓存优先
  fonts: /\.(?:woff|woff2|ttf|eot)$/,
  // CSS/JS - 网络优先，缓存备用
  static: /\.(?:js|css)$/,
  // API请求 - 网络优先
  api: /\/api\//
};

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

// 请求拦截 - 智能缓存策略
self.addEventListener('fetch', function(event) {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  
  // 跳过外部资源（除了字体和CDN资源）
  if (url.origin !== self.location.origin && 
      !runtimeCacheStrategies.fonts.test(url.pathname) &&
      !url.hostname.includes('fonts.googleapis.com') &&
      !url.hostname.includes('fonts.gstatic.com')) {
    return;
  }

  // API请求 - 网络优先策略
  if (runtimeCacheStrategies.api.test(url.pathname)) {
    event.respondWith(networkFirst(event.request, RUNTIME_CACHE));
    return;
  }

  // 图片和字体 - 缓存优先策略
  if (runtimeCacheStrategies.images.test(url.pathname) || 
      runtimeCacheStrategies.fonts.test(url.pathname)) {
    event.respondWith(cacheFirst(event.request, RUNTIME_CACHE));
    return;
  }

  // CSS/JS - 网络优先，缓存备用
  if (runtimeCacheStrategies.static.test(url.pathname)) {
    event.respondWith(networkFirst(event.request, RUNTIME_CACHE));
    return;
  }

  // 页面请求 - 网络优先，离线时显示缓存
  event.respondWith(networkFirst(event.request, STATIC_CACHE));
});

// 缓存优先策略
function cacheFirst(request, cacheName) {
  return caches.open(cacheName).then(function(cache) {
    return cache.match(request).then(function(response) {
      if (response) {
        return response;
      }
      
      return fetch(request).then(function(networkResponse) {
        if (networkResponse && networkResponse.status === 200) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(function() {
        // 网络失败时返回离线页面或默认资源
        return cache.match('/');
      });
    });
  });
}

// 网络优先策略
function networkFirst(request, cacheName) {
  return fetch(request).then(function(response) {
    if (response && response.status === 200) {
      const responseClone = response.clone();
      caches.open(cacheName).then(function(cache) {
        cache.put(request, responseClone);
      });
    }
    return response;
  }).catch(function() {
    return caches.open(cacheName).then(function(cache) {
      return cache.match(request);
    });
  });
}

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