import { useState, useEffect } from 'react';
import { UserStorage } from '../lib/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserIdChange?: (userId: number) => void;
}

export default function SettingsModal({ isOpen, onClose, onUserIdChange }: SettingsModalProps) {
  const [userId, setUserId] = useState<string>('');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isClaimingReward, setIsClaimingReward] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // 加载当前用户ID
  useEffect(() => {
    if (isOpen) {
      const currentUserId = UserStorage.getCurrentUserId();
      if (currentUserId) {
        setUserId(currentUserId.toString());
      } else {
        // 如果没有用户ID，生成一个
        const newUserId = UserStorage.generateUserId();
        setUserId(newUserId.toString());
      }
    }
  }, [isOpen]);

  // 验证钱包地址格式
  const isValidWalletAddress = (address: string): boolean => {
    // 检查是否为有效的以太坊地址格式 (42字符，以0x开头)
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // 保存用户ID和钱包地址
  const handleSave = async () => {
    const userIdNum = parseInt(userId, 10);
    
    if (!userId.trim()) {
      setMessage({ type: 'error', text: '请输入用户ID' });
      return;
    }
    
    if (isNaN(userIdNum) || userIdNum <= 0) {
      setMessage({ type: 'error', text: '请输入有效的用户ID (正整数)' });
      return;
    }

    // 验证钱包地址格式（如果填写了）
    if (walletAddress.trim() && !isValidWalletAddress(walletAddress.trim())) {
      setMessage({ type: 'error', text: '请输入有效的钱包地址格式 (0x开头的42位地址)' });
      return;
    }

    setIsLoading(true);
    try {
      const currentUserId = UserStorage.getCurrentUserId();
      const isNewUser = !currentUserId || currentUserId !== userIdNum;
      
      // 保存用户ID
      UserStorage.setUserId(userIdNum);
      
      // 保存钱包地址到localStorage
      if (walletAddress.trim()) {
        localStorage.setItem('wallet_address', walletAddress.trim());
      } else {
        localStorage.removeItem('wallet_address');
      }
      
      // 通知父组件用户ID已改变
      if (onUserIdChange) {
        onUserIdChange(userIdNum);
      }
      
      setMessage({ type: 'success', text: '设置保存成功！' });
      
      // 如果是新用户且填写了钱包地址，尝试发放奖励
      if (isNewUser && walletAddress.trim()) {
        await handleClaimNewUserReward(userIdNum, walletAddress.trim());
      }
      
      // 2秒后关闭弹窗
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 2000);
      
    } catch (error) {
      console.error('保存设置失败:', error);
      setMessage({ type: 'error', text: '保存失败，请重试' });
    } finally {
      setIsLoading(false);
    }
  };

  // 处理新用户奖励发放
  const handleClaimNewUserReward = async (userId: number, walletAddr: string) => {
    setIsClaimingReward(true);
    try {
      console.log('🎁 检查新用户奖励资格...');
      
      const response = await fetch('/api/web3/claim-reward', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          walletAddress: walletAddr
        })
      });

      const result = await response.json();
      
      if (result.success) {
        if (result.claimed) {
          setMessage({ 
            type: 'success', 
            text: `🎉 恭喜！您获得了新用户奖励！\n交易哈希: ${result.txHash?.slice(0, 10)}...` 
          });
        } else {
          setMessage({ 
            type: 'info', 
            text: result.message || '您已经领取过新用户奖励了' 
          });
        }
      } else {
        console.warn('新用户奖励发放失败:', result.message);
        setMessage({ 
          type: 'error', 
          text: `奖励发放失败: ${result.message}` 
        });
      }
    } catch (error) {
      console.error('新用户奖励发放错误:', error);
      setMessage({ 
        type: 'error', 
        text: '奖励发放失败，请稍后重试' 
      });
    } finally {
      setIsClaimingReward(false);
    }
  };

  // 生成新的随机用户ID
  const handleGenerateNewId = () => {
    const newUserId = UserStorage.generateUserId();
    setUserId(newUserId.toString());
    setMessage({ type: 'success', text: `已生成新的用户ID: ${newUserId}` });
  };

  // 清除消息
  const clearMessage = () => {
    setMessage(null);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* 弹窗头部 */}
        <div className="modal-header">
          <h2 className="modal-title">⚙️ 设置</h2>
          <button 
            onClick={onClose}
            className="modal-close-button"
          >
            ✕
          </button>
        </div>

        {/* 弹窗内容 */}
        <div className="modal-body">
          {/* 用户ID设置 */}
          <div className="setting-section">
            <label className="setting-label">
              👤 用户ID
            </label>
            <p className="setting-description">
              每个用户都有唯一的ID来区分日记数据。请妥善保管您的用户ID。
            </p>
            
            <div className="input-group">
              <input
                type="number"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="输入用户ID"
                className="user-id-input"
                disabled={isLoading}
              />
              <button
                onClick={handleGenerateNewId}
                className="generate-button"
                disabled={isLoading}
              >
                🎲 随机生成
              </button>
            </div>

            {/* 提示信息 */}
            {message && (
              <div className={`message ${message.type}`}>
                <span style={{ whiteSpace: 'pre-line' }}>{message.text}</span>
                <button onClick={clearMessage} className="message-close">✕</button>
              </div>
            )}
          </div>

          {/* 钱包地址设置 */}
          <div className="setting-section">
            <label className="setting-label">
              💰 钱包地址 (可选)
            </label>
            <p className="setting-description">
              填写您的Injective EVM钱包地址，新用户可获得INJ原生代币奖励。支持MetaMask等钱包。
            </p>
            
            <div className="input-group">
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x..."
                className="wallet-input"
                disabled={isLoading || isClaimingReward}
              />
            </div>
            
            {isClaimingReward && (
              <div className="claiming-status">
                <span className="loading-spinner">⏳</span>
                <span>正在检查奖励资格...</span>
              </div>
            )}
          </div>

          {/* 用户ID说明 */}
          <div className="info-section">
            <h3 className="info-title">💡 用户ID说明</h3>
            <ul className="info-list">
              <li>• 用户ID用于识别和保存您的日记数据</li>
              <li>• 请记住您的用户ID，换设备时需要手动输入</li>
              <li>• 建议使用6位数字，方便记忆</li>
              <li>• 如果忘记ID，可以联系管理员恢复数据</li>
            </ul>
          </div>

          {/* 奖励系统说明 */}
          <div className="info-section">
            <h3 className="info-title">🎁 新用户奖励</h3>
            <ul className="info-list">
              <li>• 首次设置用户ID并填写钱包地址可获得代币奖励</li>
              <li>• 钱包地址必须是有效的以太坊格式 (0x开头42位)</li>
              <li>• 支持Injective EVM测试网，建议使用MetaMask</li>
              <li>• 每个用户只能领取一次新用户奖励</li>
              <li>• 奖励将自动发送到您提供的钱包地址</li>
            </ul>
          </div>
        </div>

        {/* 弹窗底部 */}
        <div className="modal-footer">
          <button
            onClick={onClose}
            className="button-secondary"
            disabled={isLoading}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="button-primary"
            disabled={isLoading}
          >
            {isLoading ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>

      {/* 样式定义 */}
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 1rem;
        }

        .modal-content {
          background-color: var(--surface-main);
          border-radius: var(--radius-medium);
          width: 100%;
          max-width: 400px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 
                      0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-standard);
          border-bottom: 1px solid var(--surface-dark);
        }

        .modal-title {
          font-size: var(--font-size-title);
          font-weight: 500;
          color: var(--text-primary);
          margin: 0;
        }

        .modal-close-button {
          background: none;
          border: none;
          font-size: 1.2rem;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 50%;
          width: 2rem;
          height: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .modal-close-button:hover {
          background-color: var(--surface-accent);
          color: var(--text-primary);
        }

        .modal-body {
          padding: var(--spacing-standard);
        }

        .setting-section {
          margin-bottom: 1.5rem;
        }

        .setting-label {
          display: block;
          font-size: var(--font-size-subtitle);
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .setting-description {
          font-size: var(--font-size-body);
          color: var(--text-secondary);
          margin-bottom: 1rem;
          line-height: 1.5;
        }

        .input-group {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .user-id-input {
          flex: 1;
          padding: 0.75rem;
          border: 1px solid var(--surface-dark);
          border-radius: var(--radius-small);
          font-size: var(--font-size-body);
          background-color: var(--surface-light);
          color: var(--text-primary);
          transition: border-color 0.2s ease;
        }

        .user-id-input:focus {
          outline: none;
          border-color: var(--primary-base);
          box-shadow: 0 0 0 2px rgba(177, 156, 217, 0.2);
        }

        .user-id-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .generate-button {
          padding: 0.75rem 1rem;
          background-color: var(--surface-accent);
          color: var(--text-primary);
          border: 1px solid var(--surface-dark);
          border-radius: var(--radius-small);
          font-size: var(--font-size-body);
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .generate-button:hover:not(:disabled) {
          background-color: var(--primary-light);
        }

        .generate-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .wallet-input {
          flex: 1;
          padding: 0.75rem;
          border: 1px solid var(--surface-dark);
          border-radius: var(--radius-small);
          font-size: var(--font-size-body);
          background-color: var(--surface-light);
          color: var(--text-primary);
          transition: border-color 0.2s ease;
        }

        .wallet-input:focus {
          outline: none;
          border-color: var(--primary-base);
          box-shadow: 0 0 0 2px rgba(177, 156, 217, 0.2);
        }

        .wallet-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .message {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          border-radius: var(--radius-small);
          font-size: var(--font-size-body);
          margin-bottom: 1rem;
        }

        .message.success {
          background-color: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .message.error {
          background-color: #fee2e2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .message-close {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          padding: 0;
          margin-left: 0.5rem;
          opacity: 0.7;
        }

        .message-close:hover {
          opacity: 1;
        }

        .claiming-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
          color: var(--text-secondary);
          font-size: var(--font-size-body);
        }

        .loading-spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .info-section {
          background-color: var(--surface-accent);
          padding: 1rem;
          border-radius: var(--radius-small);
        }

        .info-title {
          font-size: var(--font-size-subtitle);
          font-weight: 500;
          color: var(--text-primary);
          margin: 0 0 0.75rem 0;
        }

        .info-list {
          margin: 0;
          padding-left: 0;
          list-style: none;
          color: var(--text-secondary);
          font-size: var(--font-size-body);
          line-height: 1.6;
        }

        .info-list li {
          margin-bottom: 0.5rem;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: var(--spacing-standard);
          border-top: 1px solid var(--surface-dark);
        }

        .button-primary,
        .button-secondary {
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius-small);
          font-size: var(--font-size-body);
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
        }

        .button-primary {
          background-color: var(--primary-base);
          color: var(--text-inverse);
        }

        .button-primary:hover:not(:disabled) {
          background-color: var(--primary-dark);
        }

        .button-secondary {
          background-color: var(--surface-light);
          color: var(--text-primary);
          border: 1px solid var(--surface-dark);
        }

        .button-secondary:hover:not(:disabled) {
          background-color: var(--surface-dark);
        }

        .button-primary:disabled,
        .button-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* 深色模式适配 */
        @media (prefers-color-scheme: dark) {
          .modal-content {
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          
          .message.success {
            background-color: rgba(16, 185, 129, 0.1);
            color: #34d399;
            border-color: rgba(16, 185, 129, 0.3);
          }

          .message.error {
            background-color: rgba(239, 68, 68, 0.1);
            color: #f87171;
            border-color: rgba(239, 68, 68, 0.3);
          }
          
          .user-id-input {
            border-color: rgba(255, 255, 255, 0.2);
          }
          
          .user-id-input:focus {
            border-color: var(--primary-base);
            box-shadow: 0 0 0 2px rgba(196, 163, 232, 0.2);
          }
          
          .generate-button {
            border-color: rgba(255, 255, 255, 0.2);
          }
          
          .wallet-input {
            border-color: rgba(255, 255, 255, 0.2);
          }
          
          .wallet-input:focus {
            border-color: var(--primary-base);
            box-shadow: 0 0 0 2px rgba(196, 163, 232, 0.2);
          }
          
          .button-secondary {
            border-color: rgba(255, 255, 255, 0.2);
          }
        }
      `}</style>
    </div>
  );
} 