import { NextApiRequest, NextApiResponse } from 'next';

const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL || 'http://38.225.100.22:5000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    if (method === 'POST') {
      return await handleSaveDiary(req, res);
    } else if (method === 'GET') {
      return await handleGetUserDiaries(req, res);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ 
        success: false, 
        error: `Method ${method} Not Allowed` 
      });
    }
  } catch (error) {
    console.error('Diary proxy error:', error);
    return res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
}

async function handleSaveDiary(req: NextApiRequest, res: NextApiResponse) {
  const diaryData = req.body;
  console.log('📝 代理保存日记请求:', diaryData);

  try {
    // 创建AbortController用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

    const response = await fetch(`${EXTERNAL_API_BASE_URL}/api/diary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(diaryData),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 外部API请求失败:', response.status, errorText);
      throw new Error(`外部API错误: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ 外部API响应:', result);
    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ 保存日记代理错误:', error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return res.status(408).json({
          success: false,
          error: '请求超时，数据库服务器响应缓慢，请稍后重试'
        });
      }
      if (error.message.includes('ETIMEDOUT') || error.message.includes('terminated')) {
        return res.status(503).json({
          success: false,
          error: '网络连接超时，无法连接到数据库服务器'
        });
      }
      if (error.message.includes('fetch')) {
        return res.status(503).json({
          success: false,
          error: '无法连接到数据库服务器，请检查服务器状态'
        });
      }
    }

    return res.status(500).json({
      success: false,
      error: '保存日记失败'
    });
  }
}

async function handleGetUserDiaries(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({
      success: false,
      error: '用户ID参数缺失'
    });
  }

  console.log('📖 代理获取用户日记请求:', userId);

  try {
    const response = await fetch(`${EXTERNAL_API_BASE_URL}/api/diary/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(200).json({
          status: 'error',
          message: `用户 ${userId} 不存在`,
          user_id: parseInt(userId),
          total: 0,
          data: []
        });
      }

      const errorText = await response.text();
      console.error('❌ 外部API请求失败:', response.status, errorText);
      throw new Error(`外部API错误: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ 外部API响应:', result);
    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ 获取日记代理错误:', error);
    
    if (error instanceof Error && error.message.includes('fetch')) {
      return res.status(503).json({
        status: 'error',
        message: '无法连接到数据库服务器，请检查服务器状态'
      });
    }

    return res.status(500).json({
      status: 'error',
      message: '获取日记失败'
    });
  }
} 