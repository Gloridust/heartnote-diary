import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { supabase } from '../../../lib/supabase';

// 简化的合约ABI，只包含需要的函数
const REWARD_CONTRACT_ABI = [
  "function payDailyReward(address userAddress, uint256 dayId) external",
  "function getContractBalance() external view returns (uint256)",
  "function getRewardAmount(uint8 rewardType) external pure returns (uint256)",
  "function paused() external view returns (bool)"
];

interface ClaimRewardRequest {
  userId: string;
  walletAddress: string;
}

interface ClaimRewardResponse {
  success: boolean;
  claimed: boolean;
  message: string;
  transactionHash?: string;
  rewardAmount?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ClaimRewardResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      claimed: false,
      message: 'Method not allowed',
      error: 'Method not allowed'
    });
  }

  try {
    const { userId, walletAddress }: ClaimRewardRequest = req.body;

    // 验证输入参数
    if (!userId || !walletAddress) {
      return res.status(400).json({
        success: false,
        claimed: false,
        message: '缺少必要参数',
        error: '缺少必要参数'
      });
    }

    // 验证钱包地址格式
    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        claimed: false,
        message: '无效的钱包地址格式',
        error: '无效的钱包地址格式'
      });
    }

    console.log(`🎁 处理用户 ${userId} 的奖励申请，钱包地址: ${walletAddress}`);

    // 检查环境变量
    const {
      WEB3_PRIVATE_KEY,
      WEB3_RPC_URL,
      WEB3_REWARD_CONTRACT_ADDRESS
    } = process.env;

    if (!WEB3_PRIVATE_KEY || !WEB3_RPC_URL || !WEB3_REWARD_CONTRACT_ADDRESS) {
      console.error('❌ Web3环境变量未配置完整');
      return res.status(500).json({
        success: false,
        claimed: false,
        message: 'Web3服务配置不完整',
        error: 'Web3服务配置不完整'
      });
    }

    // 验证和清理私钥格式
    let cleanPrivateKey = WEB3_PRIVATE_KEY.trim();
    
    // 检查私钥是否包含非法字符（如URL）
    if (cleanPrivateKey.includes('http') || cleanPrivateKey.includes('://')) {
      console.error('❌ 私钥格式错误，包含URL内容');
      return res.status(500).json({
        success: false,
        claimed: false,
        message: 'Web3私钥配置错误，请检查环境变量',
        error: 'Web3私钥配置错误，请检查环境变量'
      });
    }
    
    // 确保私钥以0x开头
    if (!cleanPrivateKey.startsWith('0x')) {
      cleanPrivateKey = '0x' + cleanPrivateKey;
    }
    
    // 验证私钥长度（应该是64个十六进制字符 + 0x前缀 = 66字符）
    if (cleanPrivateKey.length !== 66) {
      console.error('❌ 私钥长度错误，应该是66个字符（包含0x前缀）');
      return res.status(500).json({
        success: false,
        claimed: false,
        message: 'Web3私钥格式错误，请检查环境变量',
        error: 'Web3私钥格式错误，请检查环境变量'
      });
    }

    console.log('✅ 私钥格式验证通过');

    // 检查用户是否已经存在于数据库（验证是否为新用户）
    const { data: existingDiaries, error: checkError } = await supabase
      .from('diaries')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (checkError) {
      console.error('❌ 检查用户数据失败:', checkError);
      return res.status(500).json({
        success: false,
        claimed: false,
        message: '检查用户数据失败',
        error: '检查用户数据失败'
      });
    }

    // 如果用户已经有日记记录，说明不是新用户
    if (existingDiaries && existingDiaries.length > 0) {
      console.log(`ℹ️ 用户 ${userId} 已有日记记录，不符合新用户奖励条件`);
      return res.status(200).json({
        success: true,
        claimed: false,
        message: '您已经是老用户了，不符合新用户奖励条件'
      });
    }

    console.log(`✅ 用户 ${userId} 验证通过，符合新用户奖励条件`);

    // 初始化Web3连接
    console.log('🔗 连接到Injective EVM测试网...');
    
    // 为Injective EVM配置provider
    const provider = new ethers.JsonRpcProvider(WEB3_RPC_URL, {
      chainId: 1439, // Injective EVM Testnet的正确Chain ID
      name: 'injective-testnet'
    });
    
    // 测试连接
    try {
      const network = await provider.getNetwork();
      console.log('✅ 网络连接成功:', network.name, 'Chain ID:', network.chainId);
    } catch (networkError) {
      console.error('❌ 网络连接失败:', networkError);
      return res.status(500).json({
        success: false,
        claimed: false,
        message: 'Injective网络连接失败，请检查RPC配置',
        error: 'Injective网络连接失败，请检查RPC配置'
      });
    }
    
    const wallet = new ethers.Wallet(cleanPrivateKey, provider);
    
    // 连接到奖励合约
    const rewardContract = new ethers.Contract(
      WEB3_REWARD_CONTRACT_ADDRESS,
      REWARD_CONTRACT_ABI,
      wallet
    );

    console.log(`📋 合约地址: ${WEB3_REWARD_CONTRACT_ADDRESS}`);
    console.log(`👛 发送者钱包: ${wallet.address}`);

    // 检查合约是否暂停
    try {
      const isPaused = await rewardContract.paused();
      if (isPaused) {
        console.log('⏸️ 合约当前处于暂停状态');
        return res.status(503).json({
          success: false,
          claimed: false,
          message: '奖励系统暂时维护中，请稍后再试',
          error: '奖励系统暂时维护中，请稍后再试'
        });
      }
    } catch (pausedError) {
      console.error('❌ 检查合约暂停状态失败:', pausedError);
      // 继续执行，因为某些合约可能没有paused函数
    }

    // 检查合约余额和奖励金额
    try {
      const contractBalance = await rewardContract.getContractBalance();
      const rewardAmount = await rewardContract.getRewardAmount(0); // 0对应DAILY奖励类型
      
      console.log(`💰 合约余额: ${ethers.formatEther(contractBalance)} INJ`);
      console.log(`🎁 奖励金额: ${ethers.formatEther(rewardAmount)} INJ`);
      
      if (contractBalance < rewardAmount) {
        console.log('⚠️ 合约余额不足以支付奖励');
        return res.status(503).json({
          success: false,
          claimed: false,
          message: '奖励池余额不足，请稍后再试',
          error: '奖励池余额不足，请稍后再试'
        });
      }
    } catch (balanceError) {
      console.error('❌ 检查合约余额失败:', balanceError);
      // 继续执行，让合约在实际调用时处理余额不足的情况
    }

    // 发放奖励
    console.log(`🚀 开始发放奖励给钱包 ${walletAddress}...`);
    try {
      // 使用用户ID的哈希作为dayId，确保每个用户ID只能领取一次
      // 而不是每个钱包地址只能领取一次
      const userIdString = String(userId); // 确保userId是字符串
      const userIdHash = ethers.keccak256(ethers.toUtf8Bytes(userIdString));
      const dayId = BigInt(userIdHash) % BigInt(2**32); // 转换为uint256范围内的数字
      
      console.log(`📝 用户ID: ${userId}, 字符串: ${userIdString}, 对应的dayId: ${dayId.toString()}`);
      
      const tx = await rewardContract.payDailyReward(walletAddress, dayId);
      console.log(`📤 交易已发送: ${tx.hash}`);
      
      // 等待交易确认
      const receipt = await tx.wait();
      console.log(`✅ 交易已确认: ${receipt.transactionHash}`);
      console.log(`⛽ Gas使用量: ${receipt.gasUsed.toString()}`);
      
      // 获取实际奖励金额用于显示
      const rewardAmount = await rewardContract.getRewardAmount(0);
      const rewardAmountInINJ = ethers.formatEther(rewardAmount);
      
      return res.status(200).json({
        success: true,
        claimed: true,
        message: `🎉 恭喜！您已成功获得 ${rewardAmountInINJ} INJ 新用户奖励！`,
        transactionHash: receipt.transactionHash,
        rewardAmount: rewardAmountInINJ
      });
      
    } catch (rewardError: unknown) {
      console.error('❌ 发放奖励时发生错误:', rewardError);
      
      const errorObj = rewardError as { 
        message?: string; 
        data?: string; 
        code?: string;
        shortMessage?: string;
      };
      
      // 检查是否是RewardAlreadyClaimed错误 (0xb3f8c0dc)
      if (errorObj.data === '0xb3f8c0dc' || 
          errorObj.message?.includes('RewardAlreadyClaimed') ||
          errorObj.shortMessage?.includes('custom error')) {
        console.log(`ℹ️ 用户ID ${userId} 已经领取过新用户奖励`);
        return res.status(200).json({
          success: true,
          claimed: false,
          message: '该用户ID已经领取过新用户奖励了'
        });
      }
      
      // 处理余额不足的情况
      if (errorObj.message?.includes('insufficient funds') || 
          errorObj.message?.includes('Insufficient balance')) {
        return res.status(503).json({
          success: false,
          claimed: false,
          message: '奖励池余额不足，请稍后再试',
          error: '奖励池余额不足，请稍后再试'
        });
      }
      
      throw rewardError; // 重新抛出其他错误
    }

  } catch (error: unknown) {
    console.error('❌ 处理奖励申请时发生未知错误:', error);
    
    const errorObj = error as { code?: string; message?: string };
    let errorMessage = '发放奖励失败，请稍后再试';
    
    // 根据错误类型提供更具体的错误信息
    if (errorObj.code === 'NETWORK_ERROR') {
      errorMessage = '网络连接失败，请检查网络设置';
    } else if (errorObj.code === 'TIMEOUT') {
      errorMessage = '请求超时，请稍后再试';
    } else if (errorObj.code === 'INSUFFICIENT_FUNDS') {
      errorMessage = '钱包余额不足以支付交易费用';
    } else if (errorObj.code === 'CALL_EXCEPTION') {
      errorMessage = '智能合约调用失败';
    } else if (errorObj.message?.includes('Contract call reverted')) {
      errorMessage = '合约执行被回滚，可能是条件不满足';
    } else if (errorObj.message?.includes('nonce')) {
      errorMessage = '交易序号错误，请稍后重试';
    } else if (errorObj.message?.includes('gas')) {
      errorMessage = 'Gas费用设置问题，请稍后重试';
    } else if (errorObj.message?.includes('private key')) {
      errorMessage = '钱包配置错误';
    } else if (errorObj.message?.includes('paused')) {
      errorMessage = '奖励系统暂时维护中';
    } else if (errorObj.message) {
      errorMessage = errorObj.message;
    }

    return res.status(500).json({
      success: false,
      claimed: false,
      message: errorMessage,
      error: errorMessage
    });
  }
} 