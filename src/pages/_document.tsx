import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="zh-CN">
      <Head>
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* iOS WebApp Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="信语日记" />
        
        {/* PWA Theme Color */}
        <meta name="theme-color" content="#B19CD9" />
        <meta name="msapplication-TileColor" content="#B19CD9" />
        
        {/* Viewport for mobile */}
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, user-scalable=no, viewport-fit=cover" />
        
        {/* iOS Splash Screen - Simple fallback */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* PWA Icons */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Crect width='180' height='180' rx='40' fill='%23B19CD9'/%3E%3Ctext x='90' y='115' text-anchor='middle' font-size='75'%3E📔%3C/text%3E%3C/svg%3E" />
        
        {/* SEO Meta Tags */}
        <meta name="description" content="信语日记 - AI驱动的对话式日记应用，用语音记录生活点滴" />
        <meta name="keywords" content="日记,AI,语音,记录,生活" />
        <meta name="author" content="信语日记" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
