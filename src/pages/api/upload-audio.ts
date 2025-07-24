import { NextApiRequest, NextApiResponse } from 'next';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // 设置上传文件大小限制
    },
  },
};

interface UploadResponse {
  success: boolean;
  audioUrl?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UploadResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { audioData, format = 'webm' } = req.body;

    if (!audioData) {
      return res.status(400).json({ success: false, error: 'Audio data is required' });
    }

    // 生成唯一文件名
    const fileName = `${uuidv4()}.${format}`;
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    const filePath = join(uploadsDir, fileName);

    // 确保上传目录存在
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      // 目录可能已存在，忽略错误
    }

    // 将base64数据转换为buffer
    let buffer: Buffer;
    if (audioData.startsWith('data:')) {
      // 处理data URL格式
      const base64Data = audioData.split(',')[1];
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      // 处理纯base64格式
      buffer = Buffer.from(audioData, 'base64');
    }

    // 写入文件
    await writeFile(filePath, buffer);

    // 返回可访问的URL
    const audioUrl = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/uploads/${fileName}`;

    return res.status(200).json({
      success: true,
      audioUrl
    });

  } catch (error) {
    console.error('Audio upload error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to upload audio file'
    });
  }
} 