interface LoadingAnimationProps {
  message?: string;
  isUser?: boolean;
}

export default function LoadingAnimation({ message = "正在思考...", isUser = false }: LoadingAnimationProps) {
  return (
    <div className={isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}>
      <div className="flex items-center space-x-2">
        {/* 加载小球动画 */}
        <div className="flex space-x-1">
          <div 
            className="w-2 h-2 rounded-full"
            style={{ 
              backgroundColor: isUser ? 'rgba(255, 255, 255, 0.8)' : 'var(--text-secondary)',
              animation: 'bounce 1.4s ease-in-out infinite both',
              animationDelay: '0s'
            }}
          />
          <div 
            className="w-2 h-2 rounded-full"
            style={{ 
              backgroundColor: isUser ? 'rgba(255, 255, 255, 0.8)' : 'var(--text-secondary)',
              animation: 'bounce 1.4s ease-in-out infinite both',
              animationDelay: '0.16s'
            }}
          />
          <div 
            className="w-2 h-2 rounded-full"
            style={{ 
              backgroundColor: isUser ? 'rgba(255, 255, 255, 0.8)' : 'var(--text-secondary)',
              animation: 'bounce 1.4s ease-in-out infinite both',
              animationDelay: '0.32s'
            }}
          />
        </div>
        
        {/* 可选的文字提示 */}
        {message && (
          <span className="text-xs opacity-60 ml-2">
            {message}
          </span>
        )}
      </div>

      {/* CSS动画定义 */}
      <style jsx>{`
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1.2);
            opacity: 1;
          }
        }
        
        /* 更柔和的跳动效果 */
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
} 