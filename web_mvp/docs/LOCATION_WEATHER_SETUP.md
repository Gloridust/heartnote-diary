# 位置和天气功能设置指南

本文档将指导你如何配置位置获取和天气API功能。

## 📋 功能概述

位置和天气功能可以：
- 🌍 自动获取用户GPS坐标
- 📍 通过OpenStreetMap逆地理编码获取详细地址（精确到街道）
- 🌤️ 通过OpenWeatherMap获取当前天气信息
- 🤖 将天气信息集成到AI对话中
- 💾 在数据库中记录位置和天气信息
- 📖 在日记详情页展示环境信息

## 🔑 申请OpenWeatherMap API密钥

### 步骤 1: 注册账户

1. 访问 [OpenWeatherMap](https://openweathermap.org/)
2. 点击右上角 "Sign Up"
3. 填写注册信息（邮箱、用户名、密码）
4. 验证邮箱

### 步骤 2: 获取API密钥

1. 登录后访问 [API Keys页面](https://home.openweathermap.org/api_keys)
2. 在 "Create key" 部分输入密钥名称（如：heartnote-diary）
3. 点击 "Generate" 
4. 复制生成的API密钥（格式类似：`abc123def456ghi789jkl012mno345pq`）

### 步骤 3: 验证API密钥

可以通过以下URL测试你的API密钥：
```
https://api.openweathermap.org/data/2.5/weather?q=Beijing&appid=YOUR_API_KEY&units=metric&lang=zh_cn
```

如果返回JSON格式的天气数据，说明API密钥有效。

## ⚙️ 配置环境变量

在项目根目录的 `.env.local` 文件中添加：

```bash
# OpenWeatherMap 天气API配置
NEXT_PUBLIC_OPENWEATHER_API_KEY=your_api_key_here
```

替换 `your_api_key_here` 为你的实际API密钥。

## 📱 浏览器权限设置

### GPS位置权限

用户首次使用时，浏览器会请求位置权限：

#### Chrome (桌面/手机)
1. 点击地址栏左侧的🔒或ℹ️图标
2. 将"位置"设置为"允许"
3. 刷新页面

#### Safari (桌面/手机)
1. Safari > 偏好设置 > 网站 > 位置服务
2. 找到你的网站，设置为"允许"
3. 或在地址栏点击位置图标，选择"允许"

#### Firefox
1. 点击地址栏左侧的盾牌图标
2. 在"权限"部分允许位置访问

## 🔄 功能流程

1. **用户开始录音**
2. **系统自动获取GPS坐标**（如果用户允许）
3. **并行调用两个API**：
   - OpenStreetMap: 获取详细地址
   - OpenWeatherMap: 获取当前天气
4. **AI对话集成**：天气和位置信息自动添加到system prompt
5. **数据存储**：位置和天气信息保存到数据库
6. **前端展示**：日记详情页显示环境信息

## 🌍 地址格式示例

### 输入：GPS坐标
```
纬度: 30.6598
经度: 104.0633
```

### 输出：格式化地址
```
四川省成都市成华区龙潭街道
```

## 🌤️ 天气信息示例

### API返回数据
```json
{
  "temperature": 25,
  "description": "晴",
  "icon": "01d",
  "humidity": 60,
  "wind_speed": 3.5,
  "feels_like": 27
}
```

### 前端显示
```
🌤️ 25℃，晴
```

### AI Prompt集成
```
当前天气：25℃，晴
当前位置：四川省成都市成华区龙潭街道
```

## 🔧 故障排除

### 无法获取位置
- 检查浏览器权限设置
- 确保使用HTTPS协议
- 在隐私浏览模式下可能被阻止

### 天气API错误
- 检查API密钥是否正确
- 确认API密钥已激活（可能需要等待几分钟）
- 检查网络连接

### 地址解析失败
- OpenStreetMap服务可能暂时不可用
- 检查GPS坐标是否有效
- 位置可能在偏远地区，地址信息有限

## 📊 数据库存储格式

### location字段（JSONB）
```json
{
  "latitude": 30.6598,
  "longitude": 104.0633,
  "formatted_address": "四川省成都市成华区龙潭街道",
  "city": "成都市",
  "district": "成华区",
  "street": "龙潭街道"
}
```

### weather字段（JSONB）
```json
{
  "temperature": 25,
  "description": "晴",
  "icon": "01d",
  "humidity": 60,
  "wind_speed": 3.5,
  "feels_like": 27
}
```

## 🔐 隐私说明

- 位置信息仅在用户同意后获取
- 数据仅用于改善日记体验
- 不会与第三方分享位置信息
- 用户可以随时在浏览器中撤销位置权限

## 🆓 免费额度

### OpenWeatherMap免费计划
- 每分钟最多60次调用
- 每月最多100万次调用
- 对于个人日记应用完全够用

### OpenStreetMap
- 完全免费
- 建议合理使用，避免过于频繁的请求

## 🚀 部署注意事项

在 Vercel 部署时，确保在环境变量中设置：
```
NEXT_PUBLIC_OPENWEATHER_API_KEY=your_api_key
```

注意：`NEXT_PUBLIC_` 前缀表示这个变量会暴露给客户端，这对于OpenWeatherMap的免费API密钥是安全的。 