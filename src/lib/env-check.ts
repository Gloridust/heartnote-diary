// 环境变量检查工具

export function checkEnvironmentVariables() {
  const missingVars: string[] = [];
  
  // 检查必需的环境变量
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];
  
  // 检查可选的环境变量
  const optionalVars = [
    'NEXT_PUBLIC_OPENWEATHER_API_KEY',
    'ARK_API_KEY',
    'BYTEDANCE_APP_KEY',
    'BYTEDANCE_ACCESS_TOKEN',
    'DOUBAO_MODEL'
  ];
  
  // 检查必需变量
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });
  
  // 输出检查结果
  console.log('🔧 环境变量检查结果:');
  
  requiredVars.forEach(varName => {
    const status = process.env[varName] ? '✅' : '❌';
    console.log(`  ${status} ${varName}: ${process.env[varName] ? '已配置' : '未配置'}`);
  });
  
  optionalVars.forEach(varName => {
    const status = process.env[varName] ? '✅' : '⚠️';
    console.log(`  ${status} ${varName}: ${process.env[varName] ? '已配置' : '未配置 (可选)'}`);
  });
  
  if (missingVars.length > 0) {
    console.error('❌ 以下必需的环境变量未配置:', missingVars.join(', '));
    console.error('请在 .env.local 文件中配置这些变量并重启开发服务器');
  } else {
    console.log('✅ 所有必需的环境变量都已配置');
  }
  
  return missingVars.length === 0;
}

// 特定功能检查
export function checkLocationWeatherConfig(): { 
  canUseWeather: boolean; 
  message: string; 
} {
  const hasOpenWeatherKey = !!process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
  
  if (!hasOpenWeatherKey) {
    return {
      canUseWeather: false,
      message: '天气功能未启用：NEXT_PUBLIC_OPENWEATHER_API_KEY 未配置'
    };
  }
  
  return {
    canUseWeather: true,
    message: '天气功能已启用'
  };
} 