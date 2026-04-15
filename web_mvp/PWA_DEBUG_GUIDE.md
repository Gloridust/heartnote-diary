# PWA 安装提示调试指南

## 问题排查步骤

### 1. 📱 检查设备和浏览器环境

在iPad Safari中打开开发者工具控制台，查看以下日志：

```
🔍 PWA环境检测: {iOS: true, isSafari: true, isiOSSafariApp: true, isStandalone: false}
```

**预期结果**:
- `iOS: true` - 检测到iOS设备
- `isSafari: true` - 检测到Safari浏览器  
- `isiOSSafariApp: true` - 确认是iOS Safari
- `isStandalone: false` - 确认未安装PWA

### 2. 🔧 使用调试URL参数

#### 强制显示安装提示
```
http://localhost:3000?debug_pwa=true
```

#### 清除关闭记录
```  
http://localhost:3000?clear_pwa=true
```

### 3. 📋 检查控制台日志

查看以下关键日志信息：

#### 环境检测日志
```
🔍 PWA环境检测: {iOS: true, isSafari: true, isiOSSafariApp: true, isStandalone: false}
```

#### 显示条件检查
```
📝 iOS Safari条件满足，准备显示安装引导
🔍 检查关闭状态: {wasDismissed: false}
🍎 显示iOS Safari安装引导
```

#### 关闭记录检查
```
🆕 没有关闭记录，可以显示
或
📅 关闭记录检查: {dismissedTime: "2024/1/1 下午2:00:00", isRecent: true, hoursAgo: 2}
```

#### 调试信息
```
🔧 PWA安装提示调试信息: {
  isStandalone: false,
  wasDismissedRecently: false,
  shouldForceShow: false,
  showInstallPrompt: true,
  isIOS: true,
  isiOSSafari: true
}
```

### 4. 🚨 常见问题排查

#### 问题1: 显示`❌ iOS Safari条件不满足`
**原因**: 设备或浏览器检测失败
**解决**: 
1. 确认在iPad Safari中访问（不是Chrome）
2. 检查User Agent字符串
3. 确认不是在WebView中

#### 问题2: 显示`⏰ 24小时内被关闭过，跳过显示`
**原因**: localStorage中存在关闭记录
**解决**: 
1. 使用`?clear_pwa=true`清除记录
2. 或手动清除localStorage
3. 或等待24小时后重试

#### 问题3: 显示`🚫 跳过显示PWA安装提示`
**原因**: 检测到standalone模式或最近被关闭
**解决**:
1. 检查是否已从主屏幕启动应用
2. 使用`?debug_pwa=true`强制显示
3. 清除浏览器数据重试

### 5. 🔍 手动检查方法

#### 在Safari控制台中运行:

```javascript
// 检查PWA状态
console.log('Standalone:', window.matchMedia('(display-mode: standalone)').matches);

// 检查设备信息
console.log('User Agent:', navigator.userAgent);
console.log('iOS:', /iPad|iPhone|iPod/.test(navigator.userAgent));
console.log('Safari:', /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent));

// 检查localStorage
console.log('Dismissed:', localStorage.getItem('pwa-install-dismissed'));

// 清除关闭记录
localStorage.removeItem('pwa-install-dismissed');
console.log('Cleared dismissal record');
```

### 6. 🎯 预期显示时机

**正常流程**:
1. 页面加载
2. 检测到iOS Safari + 非standalone
3. 等待3秒延迟
4. 检查未被最近关闭
5. 显示安装引导卡片

**时间线**:
- `0s`: 页面加载，开始环境检测
- `1s`: 完成设备和浏览器检测
- `3s`: 显示安装引导（如果条件满足）

### 7. 🛠️ 手动触发显示

如果自动显示失败，可以在控制台手动触发：

```javascript
// 1. 清除关闭记录
localStorage.removeItem('pwa-install-dismissed');

// 2. 刷新页面
location.reload();

// 或直接设置状态（需要在React组件中）
// setShowInstallPrompt(true);
```

### 8. 📊 完整的调试检查清单

- [ ] 确认在iPad Safari中访问
- [ ] 确认不是从主屏幕图标启动
- [ ] 检查控制台是否有环境检测日志
- [ ] 检查是否有"iOS Safari条件满足"日志
- [ ] 检查是否有关闭记录
- [ ] 尝试使用调试URL参数
- [ ] 检查3秒延迟后是否有显示日志
- [ ] 确认没有JavaScript错误

### 9. 🔧 应急解决方案

如果以上步骤都无效，可以临时修改代码强制显示：

```typescript
// 在PWAInstallPrompt.tsx中临时添加
useEffect(() => {
  if (isClient && isIOS) {
    setTimeout(() => {
      console.log('🚀 强制显示安装提示');
      setShowInstallPrompt(true);
    }, 2000);
  }
}, [isClient, isIOS]);
```

### 10. 📞 技术支持信息

如果问题仍然存在，请提供以下信息：
- iPad型号和iOS版本
- Safari版本
- 完整的控制台日志
- 是否使用了调试参数
- 访问的具体URL 