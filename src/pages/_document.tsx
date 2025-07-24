import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="zh-CN">
      <Head>
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* iOS WebApp Meta Tags - 优化Safari支持 */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="信语日记" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* PWA Theme Color - 改为背景色 */}
        <meta name="theme-color" content="#F7F7EC" />
        <meta name="msapplication-TileColor" content="#F7F7EC" />
        <meta name="msapplication-navbutton-color" content="#F7F7EC" />
        
        {/* Viewport for mobile - 优化iOS支持 */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, shrink-to-fit=no, user-scalable=no, viewport-fit=cover" />
        
        {/* PWA Icons - 使用实际的PNG文件 */}
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/favicon.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/favicon.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/favicon.png" />
        <link rel="apple-touch-icon" sizes="114x114" href="/favicon.png" />
        <link rel="apple-touch-icon" sizes="76x76" href="/favicon.png" />
        <link rel="apple-touch-icon" sizes="72x72" href="/favicon.png" />
        <link rel="apple-touch-icon" sizes="60x60" href="/favicon.png" />
        <link rel="apple-touch-icon" sizes="57x57" href="/favicon.png" />
        
        {/* iOS启动画面 - 使用背景色 */}
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-startup-image" href="/favicon.png" />
        
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
