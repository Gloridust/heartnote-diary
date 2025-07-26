import { NextApiRequest, NextApiResponse } from 'next';

// ModelScope API 配置
const MS_URL = process.env.MODELSCOPE_API_URL || 'https://api-inference.modelscope.cn/v1/images/generations';
const MS_HEADERS = {
  'Authorization': `Bearer ${process.env.MODELSCOPE_API_KEY}`,
  'Content-Type': 'application/json'
};

// w3up 邮箱配置
const W3UP_EMAIL = process.env.W3UP_EMAIL || 'kiramyby@gmail.com';

// 铸造NFT请求接口
interface MintNFTRequest {
  diaryId: number;
  title: string;
  content: string;
  userId: number;
}

// 铸造NFT响应接口
interface MintNFTResponse {
  status: 'success' | 'error';
  message: string;
  data?: {
    imageUrl?: string;
    ipfsCid?: string;
    ipfsUri?: string;
    gatewayUrl?: string;
  };
}

// 创建超时信号
function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => {
    controller.abort(new Error(`Request timed out after ${timeoutMs} ms`));
  }, timeoutMs);
  return controller.signal;
}

// 生成适合AI的图片提示词
function generateImagePrompt(title: string, content: string): string {
  // 提取日记中的关键词和情感
  const keywords = [];
  
  // 根据内容提取关键元素
  if (content.includes('开心') || content.includes('快乐') || content.includes('高兴') || content.includes('愉快')) {
    keywords.push('快乐温暖的氛围');
  }
  if (content.includes('难过') || content.includes('伤心') || content.includes('沮丧') || content.includes('失落')) {
    keywords.push('忧郁宁静的氛围');
  }
  if (content.includes('工作') || content.includes('办公') || content.includes('会议')) {
    keywords.push('现代办公场景');
  }
  if (content.includes('旅行') || content.includes('旅游') || content.includes('风景')) {
    keywords.push('美丽的旅行风景');
  }
  if (content.includes('朋友') || content.includes('聚会') || content.includes('聊天')) {
    keywords.push('友谊温馨场景');
  }
  if (content.includes('家') || content.includes('家庭') || content.includes('亲人')) {
    keywords.push('温暖的家庭场景');
  }
  if (content.includes('学习') || content.includes('读书') || content.includes('知识')) {
    keywords.push('安静的学习环境');
  }
  if (content.includes('美食') || content.includes('吃饭') || content.includes('餐厅')) {
    keywords.push('美味的食物场景');
  }
  if (content.includes('运动') || content.includes('健身') || content.includes('跑步')) {
    keywords.push('活力运动场景');
  }
  if (content.includes('自然') || content.includes('花') || content.includes('树') || content.includes('山') || content.includes('海')) {
    keywords.push('美丽的自然风光');
  }
  
  // 构建基础提示词
  let prompt = `基于日记标题"${title}"创作的像素风插画，`;
  
  // 添加关键词
  if (keywords.length > 0) {
    prompt += keywords.slice(0, 2).join('，') + '，'; // 最多取前两个关键词
  }
  
  // 添加默认的艺术风格描述
  prompt += '细腻的艺术风格，高品质数字藏品，情感丰富的视觉表达';
  
  return prompt;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MintNFTResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      status: 'error',
      message: '仅支持 POST 请求'
    });
  }

  const { diaryId, title, content, userId }: MintNFTRequest = req.body;

  // 验证请求参数
  if (!diaryId || !title || !content || !userId) {
    return res.status(400).json({
      status: 'error',
      message: '缺少必要参数：diaryId, title, content, userId'
    });
  }

  console.log('🎯 开始铸造NFT:', { diaryId, title, userId });

  // 分阶段超时设置，适应AI生成的长时间需求
  const AI_GENERATION_TIMEOUT = 240000; // AI生成图片：4分钟（足够应对20秒+的生成时间）
  const IMAGE_DOWNLOAD_TIMEOUT = 60000;  // 图片下载：1分钟
  const IPFS_UPLOAD_TIMEOUT = 120000;    // IPFS上传：2分钟

  try {
    // 步骤 1: 生成图片提示词
    const imagePrompt = generateImagePrompt(title, content);
    console.log('🎨 生成的图片提示词:', imagePrompt);

    // 步骤 2: 调用ModelScope API生成图片
    console.log('📡 正在请求 ModelScope API 生成图片...');
    
    const msPayload = {
      model: 'black-forest-labs/FLUX.1-Kontext-dev',
      prompt: imagePrompt,
      size: '1024x1024',
      image_url: "https://resources.modelscope.cn/aigc/image_edit.png"
    };

    const msResponse = await fetch(MS_URL, {
      method: 'POST',
      headers: MS_HEADERS,
      body: JSON.stringify(msPayload),
      signal: createTimeoutSignal(AI_GENERATION_TIMEOUT) // 使用AI生成专用超时
    });

    if (!msResponse.ok) {
      const errorText = await msResponse.text();
      console.error('❌ ModelScope API 错误:', errorText);
      throw new Error(`图片生成失败，状态码: ${msResponse.status}`);
    }

    const msData = await msResponse.json();
    const generatedImageUrl = msData.images?.[0]?.url;

    if (!generatedImageUrl) {
      throw new Error('未能获取生成的图片URL');
    }

    console.log('✅ 图片生成成功，正在下载...');

    // 步骤 3: 下载生成的图片
    const imageResponse = await fetch(generatedImageUrl, {
      signal: createTimeoutSignal(IMAGE_DOWNLOAD_TIMEOUT) // 使用图片下载专用超时
    });

    if (!imageResponse.ok) {
      throw new Error(`图片下载失败，状态码: ${imageResponse.status}`);
    }

    // 步骤 4: 准备上传到IPFS
    console.log('☁️ 正在上传到 IPFS...');

    try {
      // 尝试使用 storacha 客户端
      const { create } = await import('@storacha/client');
      
      // 将图片响应转换为 ArrayBuffer，然后创建 File
      const imageArrayBuffer = await imageResponse.arrayBuffer();
      const imageFile = new File([imageArrayBuffer], `diary-${diaryId}-${Date.now()}.jpg`, {
        type: imageResponse.headers.get('content-type') || 'image/jpeg'
      });

      // 初始化客户端
      const client = await create();
      
      // 登录到 storacha
      const account = await client.login(W3UP_EMAIL as `${string}@${string}`);
      console.log('👤 storacha 账户:', account.did());
      
      // 检查现有空间或创建新空间
      const spaces = client.spaces();
      let space;
      
      if (spaces.length > 0) {
        space = spaces[0];
        await client.setCurrentSpace(space.did());
      } else {
        space = await client.createSpace('heartnote-nfts');
        await account.provision(space.did());
        await space.save();
        await client.setCurrentSpace(space.did());
      }
      
      console.log('🏠 使用空间:', space.did());
      
      // 上传文件到 IPFS (添加超时控制)
      const uploadPromise = client.uploadFile(imageFile);
      
      // 为IPFS上传添加超时控制
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('IPFS上传超时')), IPFS_UPLOAD_TIMEOUT);
      });
      
      const cid = await Promise.race([uploadPromise, timeoutPromise]);
      
      // 构建结果
      const ipfsUri = `ipfs://${cid}`;
      const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`; // 使用更稳定的网关

      console.log('🎉 NFT铸造成功!');
      console.log('📄 IPFS CID:', cid);
      console.log('🔗 IPFS URI:', ipfsUri);
      console.log('🌐 网关URL:', gatewayUrl);

      return res.status(200).json({
        status: 'success',
        message: 'NFT铸造成功！图片已生成并上传到IPFS。',
        data: {
          imageUrl: generatedImageUrl,
          ipfsCid: cid.toString(),
          ipfsUri,
          gatewayUrl
        }
      });
      
    } catch (storageError) {
      console.error('❌ Storacha 上传失败，尝试备用方案:', storageError);
      
      // 备用方案：返回生成的图片URL，不上传到IPFS
      console.log('📸 使用备用方案：返回生成的图片URL');
      
      return res.status(200).json({
        status: 'success',
        message: 'NFT铸造成功！图片已生成（IPFS上传遇到问题，返回原始图片URL）。',
        data: {
          imageUrl: generatedImageUrl,
          ipfsCid: 'fallback-mode',
          ipfsUri: 'ipfs://fallback-mode',
          gatewayUrl: generatedImageUrl // 直接使用ModelScope生成的图片URL
        }
      });
    }

  } catch (error) {
    console.error('❌ NFT铸造失败:', error);
    
    let errorMessage = '铸造失败，请重试';
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = '请求超时，请检查网络连接后重试';
      } else if (error.message.includes('fetch')) {
        errorMessage = '网络连接失败，请检查网络设置';
      } else {
        errorMessage = error.message;
      }
    }

    return res.status(500).json({
      status: 'error',
      message: errorMessage
    });
  }
}
