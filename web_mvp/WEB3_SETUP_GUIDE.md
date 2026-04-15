# Web3 奖励系统设置指南

## 🎯 系统概述

本项目集成了基于Injective EVM测试网的Web3奖励机制，新用户注册时会自动获得INJ原生代币奖励。

## 🔧 环境变量配置

在 `.env.local` 文件中添加以下配置：

```bash
# Web3 奖励系统配置 (Injective EVM Testnet)
WEB3_PRIVATE_KEY=0x1234567890abcdef...  # 钱包私钥（64位十六进制）
WEB3_RPC_URL=https://testnet.sentry.tm.injective.network:443  # RPC端点
WEB3_REWARD_CONTRACT_ADDRESS=0xabcd...  # 奖励合约地址
```

### RPC端点选项

如果默认RPC端点不可用，可以尝试以下端点：

```bash
# 选项1: Injective官方测试网
WEB3_RPC_URL=https://testnet.sentry.tm.injective.network:443

# 选项2: Injective EVM兼容端点
WEB3_RPC_URL=https://testnet-evm.injective.network

# 选项3: 公共RPC端点
WEB3_RPC_URL=https://injective-testnet-rpc.polkachu.com

# 选项4: 如果使用主网（生产环境）
# WEB3_RPC_URL=https://sentry.tm.injective.network:443
```

### 环境变量说明

- **`WEB3_PRIVATE_KEY`**: 
  - 用于发放奖励的钱包私钥
  - 格式: `0x` 开头的64位十六进制字符串
  - ⚠️ **重要**: 这是私钥，绝对不能泄露，仅在服务器端使用

- **`WEB3_RPC_URL`**: 
  - Injective EVM测试网RPC端点
  - 建议先测试连接性再使用

- **`WEB3_REWARD_CONTRACT_ADDRESS`**: 
  - MemoiraiMVPBalanced 奖励合约地址
  - 格式: `0x` 开头的42位十六进制地址

## 🔧 RPC连接测试

测试RPC端点是否可用：

```bash
# 使用curl测试
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  https://testnet.sentry.tm.injective.network:443

# 期望返回类似:
# {"jsonrpc":"2.0","id":1,"result":"0x28"} # 0x28 = 40 (Injective EVM Testnet)
```

## 🚀 合约部署

1. **编译合约**
   ```bash
   # 使用Hardhat或Remix编译 MemoiraiMVPBalanced.sol
   ```

2. **部署到Injective EVM测试网**
   ```bash
   # 确保钱包中有测试网INJ用于gas费
   # 部署完成后记录合约地址
   ```

3. **资助合约**
   ```bash
   # 向合约地址转入INJ作为奖励池
   # 建议至少转入1 INJ用于测试
   ```

## 💰 奖励机制

### 奖励类型
- **新用户奖励**: 0.001 INJ (DAILY_REWARD)
- **连续7天**: 0.005 INJ (WEEK_REWARD)  
- **连续14天**: 0.01 INJ (TWO_WEEK_REWARD)
- **连续30天**: 0.05 INJ (MONTH_REWARD)

### 触发条件
- 用户首次设置用户ID
- 填写有效的钱包地址
- 数据库中无该用户的历史记录

### 防重复机制
- 合约内置防重复发放功能
- 每个钱包地址只能领取一次相同类型的奖励
- 使用用户ID作为唯一标识符

## 🔍 故障排除

### 常见错误及解决方案

1. **JsonRpcProvider failed to detect network**
   ```bash
   # 解决方案: 更换RPC端点
   WEB3_RPC_URL=https://testnet-evm.injective.network
   ```

2. **missing revert data / CALL_EXCEPTION**
   ```bash
   # 可能原因:
   # 1. 合约地址不正确
   # 2. 合约未部署或已暂停
   # 3. 钱包权限不足
   # 4. 网络连接问题
   ```

3. **insufficient funds**
   ```bash
   # 解决方案:
   # 1. 向钱包转入INJ用于gas费
   # 2. 向合约转入INJ用于奖励发放
   ```

### 调试步骤

1. **检查网络连接**
   ```javascript
   const network = await provider.getNetwork();
   console.log('Chain ID:', network.chainId); // 应该是 40
   ```

2. **检查钱包余额**
   ```javascript
   const balance = await provider.getBalance(walletAddress);
   console.log('Wallet balance:', ethers.formatEther(balance), 'INJ');
   ```

3. **检查合约状态**
   ```javascript
   const isPaused = await contract.paused();
   const contractBalance = await contract.getContractBalance();
   console.log('Contract paused:', isPaused);
   console.log('Contract balance:', ethers.formatEther(contractBalance), 'INJ');
   ```

## 📊 监控建议

1. **合约余额监控**
   ```javascript
   // 定期检查合约余额
   const balance = await rewardContract.getContractBalance();
   ```

2. **交易状态监控**
   - 记录成功/失败的奖励发放
   - 监控Gas费用使用情况

3. **用户行为分析**
   - 统计新用户注册数量
   - 分析奖励领取率

## 🔗 相关链接

- [Injective 官方文档](https://docs.injective.network/)
- [Injective EVM 测试网](https://testnet.sentry.tm.injective.network)
- [MetaMask 设置指南](https://docs.injective.network/develop/tools/wallets/metamask)
- [Injective Explorer](https://testnet.explorer.injective.network/) 