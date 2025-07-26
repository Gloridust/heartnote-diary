# 录音时间限制功能

## 功能概述

为语音录音组件添加了100秒时间限制功能，确保用户不会无限制地录音，同时提供清晰的视觉反馈。

## 实现的功能

### 1. 时间限制设置
- **限制时长**: 100秒（1分40秒）
- **配置位置**: `src/components/VoiceInput.tsx` 中的 `RECORDING_TIME_LIMIT` 常量
- **易于修改**: 只需修改常量值即可调整时间限制

### 2. 倒计时显示
- **位置**: 麦克风按钮上方，录音时显示
- **内容**: 
  - 正常状态：显示"⏱️ 剩余时间"和倒计时
  - 最后10秒：显示"⚠️ 即将结束"和倒计时，变为红色警告样式
- **格式**: MM:SS 格式显示时间

### 3. 视觉效果
- **正常状态**: 浅紫色背景，常规边框
- **警告状态**: 红色背景，警告边框，脉冲动画效果
- **响应式设计**: 小屏幕设备上字体和间距自动调整

### 4. 自动结束机制
- **触发条件**: 录音时间达到100秒
- **自动操作**: 
  1. 自动停止录音
  2. 自动处理录制的音频
  3. 继续正常的语音转文字和AI回复流程
- **用户感知**: 无缝体验，用户不需要手动操作

### 5. 用户提示
- **预警提示**: 录音开始时显示"录音将在1分40秒后自动结束"
- **状态提示**: 录音过程中实时显示剩余时间
- **警告提示**: 最后10秒红色警告提示

## 技术实现细节

### 核心代码位置
```typescript
// 时间限制常量
const RECORDING_TIME_LIMIT = 100;

// 计时器逻辑
useEffect(() => {
  let interval: NodeJS.Timeout;
  
  if (isRecording && !isPaused) {
    interval = setInterval(() => {
      setRecordingTime(prev => {
        const newTime = prev + 1;
        
        // 检查是否达到时间限制
        if (newTime >= RECORDING_TIME_LIMIT) {
          setTimeout(() => {
            handleStopRecording();
          }, 100);
        }
        
        return newTime;
      });
    }, 1000);
  }
  
  return () => clearInterval(interval);
}, [isRecording, isPaused, RECORDING_TIME_LIMIT]);
```

### 倒计时显示组件
```typescript
// 计算剩余时间
const getRemainingTime = () => {
  return Math.max(0, RECORDING_TIME_LIMIT - recordingTime);
};

// 判断是否即将结束
const isNearEnd = () => {
  return getRemainingTime() <= 10 && getRemainingTime() > 0;
};

// 格式化倒计时
const formatCountdown = (remainingSeconds: number) => {
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
```

### 样式动画
```css
@keyframes countdownPulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.3);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 12px rgba(239, 68, 68, 0.5);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.3);
  }
}
```

## 用户体验

### 录音流程
1. **开始录音**: 点击麦克风按钮
2. **倒计时显示**: 立即显示剩余时间倒计时
3. **持续录音**: 倒计时实时更新
4. **最后10秒**: 红色警告提示，脉冲动画
5. **自动结束**: 时间到达后自动停止并处理

### 视觉反馈
- ✅ 清晰的时间显示
- ✅ 颜色变化警告
- ✅ 动画效果增强提醒
- ✅ 响应式设计适配移动端

### 交互体验
- ✅ 无需用户干预的自动结束
- ✅ 平滑的状态过渡
- ✅ 明确的时间感知
- ✅ 友好的提示信息

## 配置和自定义

### 修改时间限制
```typescript
// 在 src/components/VoiceInput.tsx 中修改
const RECORDING_TIME_LIMIT = 120; // 改为120秒（2分钟）
```

### 修改警告阈值
```typescript
// 修改 isNearEnd 函数
const isNearEnd = () => {
  return getRemainingTime() <= 15 && getRemainingTime() > 0; // 改为最后15秒警告
};
```

### 自定义警告样式
```typescript
// 修改倒计时显示的样式条件
backgroundColor: isNearEnd() ? '#fff3cd' : 'var(--surface-accent)', // 改为黄色警告
color: isNearEnd() ? '#856404' : 'var(--text-primary)',
```

## 测试建议

1. **正常录音测试**: 录音30秒左右手动停止，确认正常流程
2. **时间限制测试**: 让录音自然进行到100秒，确认自动停止
3. **警告状态测试**: 录音到90秒以上，确认红色警告效果
4. **响应式测试**: 在不同屏幕尺寸下测试显示效果
5. **多次录音测试**: 连续多次录音，确认计时器正确重置

## 未来优化建议

1. **可配置时限**: 允许用户在设置中自定义录音时间限制
2. **声音提醒**: 在最后几秒添加声音提示
3. **分段保存**: 长录音自动分段处理
4. **进度条**: 添加可视化的时间进度条
5. **暂停计时**: 暂停录音时同时暂停倒计时 