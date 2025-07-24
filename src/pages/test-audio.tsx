import { useState, useEffect } from 'react';
import Link from 'next/link';

interface TestResult {
  test: string;
  result: 'pass' | 'fail' | 'testing';
  details: string;
}

export default function TestAudio() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTestingAudio, setIsTestingAudio] = useState(false);

  useEffect(() => {
    runCompatibilityTests();
  }, []);

  const updateTestResult = (test: string, result: 'pass' | 'fail' | 'testing', details: string) => {
    setTestResults(prev => {
      const updated = prev.filter(t => t.test !== test);
      return [...updated, { test, result, details }];
    });
  };

  const runCompatibilityTests = async () => {
    // 1. 基础环境检查
    updateTestResult('基础环境', 'testing', '检查中...');
    
    const userAgent = navigator.userAgent;
    const isHTTPS = location.protocol === 'https:' || location.hostname === 'localhost';
    const hasMediaDevices = !!navigator.mediaDevices;
    const hasGetUserMedia = !!navigator.mediaDevices?.getUserMedia;
    const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
    
    if (isHTTPS && hasMediaDevices && hasGetUserMedia && hasMediaRecorder) {
      updateTestResult('基础环境', 'pass', `协议: ${location.protocol}, 浏览器支持完整`);
    } else {
      updateTestResult('基础环境', 'fail', 
        `HTTPS: ${isHTTPS}, MediaDevices: ${hasMediaDevices}, getUserMedia: ${hasGetUserMedia}, MediaRecorder: ${hasMediaRecorder}`);
    }

    // 2. 浏览器检测
    updateTestResult('浏览器检测', 'testing', '检测中...');
    
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isChrome = /Chrome/.test(userAgent);
    
    updateTestResult('浏览器检测', 'pass', 
      `Safari: ${isSafari}, iOS: ${isIOS}, Android: ${isAndroid}, Chrome: ${isChrome}`);

    // 3. 音频格式支持检查
    updateTestResult('音频格式', 'testing', '检查中...');
    
    const formats = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/aac',
      'audio/wav'
    ];
    
    const supportedFormats = formats.filter(format => 
      hasMediaRecorder && MediaRecorder.isTypeSupported(format)
    );
    
    if (supportedFormats.length > 0) {
      updateTestResult('音频格式', 'pass', `支持: ${supportedFormats.join(', ')}`);
    } else {
      updateTestResult('音频格式', 'fail', '无支持的音频格式');
    }

    // 4. 权限检查
    updateTestResult('权限检查', 'testing', '检查中...');
    
    try {
      const permissionStatus = await navigator.permissions?.query({ name: 'microphone' as PermissionName });
      if (permissionStatus) {
        updateTestResult('权限检查', 'pass', `权限状态: ${permissionStatus.state}`);
      } else {
        updateTestResult('权限检查', 'pass', '无法查询权限状态（正常）');
      }
    } catch (error) {
      updateTestResult('权限检查', 'pass', '权限API不可用（正常）');
    }
  };

  const testActualRecording = async () => {
    setIsTestingAudio(true);
    updateTestResult('录音测试', 'testing', '请允许麦克风权限...');

    try {
      // 尝试获取音频流
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      updateTestResult('录音测试', 'pass', '麦克风访问成功');

      // 尝试创建MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      updateTestResult('MediaRecorder', 'pass', `格式: ${mediaRecorder.mimeType || '默认'}`);

      // 简短录音测试
      const audioChunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks);
        updateTestResult('录音数据', 'pass', `录制了 ${audioBlob.size} 字节数据`);
      };

      mediaRecorder.start();
      setTimeout(() => {
        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());
      }, 2000);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? `${error.name} - ${error.message}` : '未知错误';
      updateTestResult('录音测试', 'fail', `错误: ${errorMessage}`);
    } finally {
      setIsTestingAudio(false);
    }
  };

  const getResultIcon = (result: 'pass' | 'fail' | 'testing') => {
    switch (result) {
      case 'pass': return '✅';
      case 'fail': return '❌';
      case 'testing': return '🔄';
    }
  };

  const getResultColor = (result: 'pass' | 'fail' | 'testing') => {
    switch (result) {
      case 'pass': return 'text-green-600';
      case 'fail': return 'text-red-600';
      case 'testing': return 'text-blue-600';
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--background-page)' }} className="min-h-screen pb-20">
      {/* 头部导航 */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between spacing-standard" 
              style={{ backgroundColor: 'var(--background-page)' }}>
        <div className="flex items-center space-x-2">
          <Link href="/" className="text-2xl">←</Link>
          <h1 className="text-title" style={{ color: 'var(--text-primary)' }}>音频兼容性测试</h1>
        </div>
      </header>

      <div className="spacing-standard max-w-2xl mx-auto pt-20">
        {/* 测试结果 */}
        <div className="space-y-4">
          <div style={{ backgroundColor: 'var(--surface-main)' }} 
               className="p-4 rounded-lg">
            <h2 className="text-subtitle mb-4" style={{ color: 'var(--text-primary)' }}>
              兼容性检测结果
            </h2>
            
            <div className="space-y-3">
              {testResults.map((test, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded border"
                     style={{ 
                       backgroundColor: test.result === 'fail' ? '#fef2f2' : 
                                      test.result === 'pass' ? '#f0fdf4' : '#eff6ff',
                       borderColor: test.result === 'fail' ? '#fecaca' : 
                                   test.result === 'pass' ? '#bbf7d0' : '#bfdbfe'
                     }}>
                  <span className="text-lg">{getResultIcon(test.result)}</span>
                  <div className="flex-1">
                    <h3 className={`font-medium ${getResultColor(test.result)}`}>
                      {test.test}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{test.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 实际录音测试 */}
          <div style={{ backgroundColor: 'var(--surface-main)' }} 
               className="p-4 rounded-lg">
            <h3 className="text-subtitle mb-3" style={{ color: 'var(--text-primary)' }}>
              实际录音测试
            </h3>
            <p className="text-body mb-4" style={{ color: 'var(--text-secondary)' }}>
              点击下方按钮进行真实的录音测试（需要麦克风权限）
            </p>
            
            <button
              onClick={testActualRecording}
              disabled={isTestingAudio}
              className="button-primary px-6 py-3"
              style={{
                backgroundColor: isTestingAudio ? '#d1d5db' : 'var(--primary-base)',
                color: 'var(--text-inverse)',
                borderRadius: '8px',
                border: 'none',
                cursor: isTestingAudio ? 'not-allowed' : 'pointer'
              }}
            >
              {isTestingAudio ? '测试中...' : '开始录音测试'}
            </button>
          </div>

          {/* 帮助信息 */}
          <div style={{ backgroundColor: 'var(--surface-main)' }} 
               className="p-4 rounded-lg">
            <h3 className="text-subtitle mb-3" style={{ color: 'var(--text-primary)' }}>
              常见问题解决
            </h3>
            
            <div className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <div>
                <h4 className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  🍎 Safari (iOS/macOS)
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>需要 iOS 14.3+ 或 macOS Big Sur+</li>
                  <li>必须使用 HTTPS 协议</li>
                  <li>首次需要用户主动点击允许权限</li>
                  <li>在设置 → Safari → 网站设置中检查麦克风权限</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  🤖 Android Chrome
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>需要 Chrome 60+</li>
                  <li>在地址栏点击麦克风图标设置权限</li>
                  <li>在 Chrome 设置 → 网站设置 → 麦克风中管理权限</li>
                  <li>确保系统设置中Chrome有麦克风权限</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 返回按钮 */}
        <div className="mt-8 text-center">
          <Link href="/" className="button-secondary px-6 py-3">
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
} 