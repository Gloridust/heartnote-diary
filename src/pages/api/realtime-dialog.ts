import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { action, sessionId, audioData } = req.body;
    
    switch (action) {
      case 'start_session':
        return handleStartSession(req, res, sessionId);
      case 'send_audio':
        return handleSendAudio(req, res, sessionId, audioData);
      case 'pause_session':
        return handlePauseSession(req, res, sessionId);
      case 'resume_session':
        return handleResumeSession(req, res, sessionId);
      case 'end_session':
        return handleEndSession(req, res, sessionId);
      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// 模拟的对话数据
const mockConversations = [
  {
    role: 'assistant',
    content: '你好！今天过得怎么样？有什么想要分享的吗？',
    timestamp: Date.now() - 300000
  },
  {
    role: 'user', 
    content: '今天还不错，上午工作很顺利，下午去咖啡厅放松了一下。',
    timestamp: Date.now() - 240000
  },
  {
    role: 'assistant',
    content: '听起来是很充实的一天呢！咖啡厅的氛围怎么样？有什么特别的感受吗？',
    timestamp: Date.now() - 180000
  },
  {
    role: 'user',
    content: '咖啡厅很安静，我点了一杯拿铁，还看了一会儿书。感觉这样的下午很治愈。',
    timestamp: Date.now() - 120000
  },
  {
    role: 'assistant', 
    content: '真是美好的午后时光！阅读加上咖啡的香气，确实很让人放松。今天还有其他印象深刻的事情吗？',
    timestamp: Date.now() - 60000
  },
  {
    role: 'user',
    content: '晚上和朋友一起吃饭，聊了很多有趣的话题，感觉友谊真的很珍贵。',
    timestamp: Date.now() - 30000
  }
];

async function handleStartSession(req: NextApiRequest, res: NextApiResponse, sessionId: string) {
  try {
    // 这里可以集成真实的字节豆包API
    // 暂时返回成功响应
    res.status(200).json({
      success: true,
      sessionId,
      message: 'Session started successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start session' });
  }
}

async function handleSendAudio(req: NextApiRequest, res: NextApiResponse, sessionId: string, audioData: string) {
  try {
    // 这里处理音频数据并发送到字节豆包
    // 暂时返回成功响应
    res.status(200).json({
      success: true,
      message: 'Audio processed successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process audio' });
  }
}

async function handlePauseSession(req: NextApiRequest, res: NextApiResponse, sessionId: string) {
  try {
    res.status(200).json({
      success: true,
      message: 'Session paused'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to pause session' });
  }
}

async function handleResumeSession(req: NextApiRequest, res: NextApiResponse, sessionId: string) {
  try {
    res.status(200).json({
      success: true,
      message: 'Session resumed'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resume session' });
  }
}

async function handleEndSession(req: NextApiRequest, res: NextApiResponse, sessionId: string) {
  try {
    // 返回模拟的对话记录
    res.status(200).json({
      success: true,
      message: 'Session ended',
      messages: mockConversations
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to end session' });
  }
}