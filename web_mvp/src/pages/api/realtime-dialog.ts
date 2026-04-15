// 此文件已废弃，功能已迁移到新的API路由：
// - /api/speech-to-text: 语音转文字
// - /api/chat: LLM对话
// - /api/upload-audio: 音频上传

import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(410).json({ 
    error: 'This API has been deprecated. Please use the new API endpoints.',
    newEndpoints: [
      '/api/speech-to-text',
      '/api/chat', 
      '/api/upload-audio'
    ]
  });
}