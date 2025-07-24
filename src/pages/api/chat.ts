import { NextApiRequest, NextApiResponse } from 'next';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: Message[];
  stream?: boolean;
}

interface ChatResponse {
  success: boolean;
  content?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }

  const { messages, stream = false }: ChatRequest = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ success: false, error: 'Messages array is required' });
  }

  try {
    if (stream) {
      await handleStreamResponse(req, res, messages);
    } else {
      const content = await getChatCompletion(messages);
      return res.status(200).json({
        success: true,
        content
      });
    }
  } catch (error) {
    console.error('Chat completion error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get chat completion'
    });
  }
}

async function getChatCompletion(messages: Message[]): Promise<string> {
  const chatUrl = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
  
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.ARK_API_KEY || ""}`
  };

  // 添加系统提示词，针对日记助手场景
  const systemMessage: Message = {
    role: "system",
    content: `# 角色
你是“信语日记 APP”中的日记助手“小语”，是一个由 LLM 驱动的对话式日记本引导者。每天生活结束时，你主动与用户对话，以简短且循循善诱的方式，引导用户分享当天的经历，了解用户过得如何、发生了何事等日记要素。你的回答和问题要尽可能简短，不能编造未提及的虚假内容。

## 技能
### 技能 1: 引导用户分享
主动开启对话，询问用户当天的情况，逐步引导用户说出当天发生的事情、日记要素等内容。回复以json格式输出，示例如下：
{
    "mode": "continue",
    "message": "今天过得怎么样呀？"
}

### 技能 2: 结束对话生成日记
当用户希望结束对话时，依据所有历史对话，生成一篇完整的日记记录。日记内容必须完全基于对话记录编写，不得编造。正常情况下，完整日记 500 字以上。回复以json格式输出，示例如下：
{
    "mode": "end",
    "message": "[具体日记内容]",
    "score": 5,
    "tag": "personal"
}

## 限制:
- 对话围绕用户的生活经历展开。
- 生成的日记需忠实于对话记录，不得偏离历史对话所提供的信息。
- 对话语言应简洁明了。 
- 回复必须以规定的json格式输出，且包含"score"（取值范围为1 - 10的评分，分数越高心情越好，5分为平静）和"tag"（从'work'、'personal'、'travel'、'relationships'、'health'、'goals'、'reflection'、'gratitude'、'dreams'、'memories'中选择今天的主题内容）字段。 

请用中文回复，语气要亲和自然。`
  };

  const requestBody = {
    messages: [systemMessage, ...messages],
    model: process.env.DOUBAO_MODEL || "doubao-1-5-pro-32k-250115",
    stream: false,
    max_tokens: 2000,
    temperature: 0.8
  };

  const response = await fetch(chatUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Chat API error: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  
  if (result.choices && result.choices.length > 0) {
    return result.choices[0].message.content.trim();
  } else {
    throw new Error('No response from chat model');
  }
}

async function handleStreamResponse(
  req: NextApiRequest,
  res: NextApiResponse,
  messages: Message[]
) {
  const chatUrl = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
  
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.ARK_API_KEY || ""}`
  };

  const systemMessage: Message = {
    role: "system",
    content: `# 角色
你是“信语日记 APP”中的日记助手“小语”，是一个由 LLM 驱动的对话式日记本引导者。每天生活结束时，你主动与用户对话，以简短且循循善诱的方式，引导用户分享当天的经历，了解用户过得如何、发生了何事等日记要素。你的回答和问题要尽可能简短，不能编造未提及的虚假内容。

## 技能
### 技能 1: 引导用户分享
主动开启对话，询问用户当天的情况，逐步引导用户说出当天发生的事情、日记要素等内容。回复以json格式输出，示例如下：
{
    "mode": "continue",
    "message": "今天过得怎么样呀？"
}

### 技能 2: 结束对话生成日记
当用户希望结束对话时，依据所有历史对话，生成一篇完整的日记记录。日记内容必须完全基于对话记录编写，不得编造。正常情况下，完整日记 500 字以上。回复以json格式输出，示例如下：
{
    "mode": "end",
    "message": "[具体日记内容]",
    "score": 5,
    "tag": "personal"
}

## 限制:
- 对话围绕用户的生活经历展开。
- 生成的日记需忠实于对话记录，不得偏离历史对话所提供的信息。
- 对话语言应简洁明了。 
- 回复必须以规定的json格式输出，且包含"score"（取值范围为1 - 10的评分，分数越高心情越好，5分为平静）和"tag"（从'work'、'personal'、'travel'、'relationships'、'health'、'goals'、'reflection'、'gratitude'、'dreams'、'memories'中选择今天的主题内容）字段。 

请用中文回复，语气要亲和自然。`
  };

  const requestBody = {
    messages: [systemMessage, ...messages],
    model: process.env.DOUBAO_MODEL || "doubao-1-5-pro-32k-250115",
    stream: true,
    max_tokens: 2000,
    temperature: 0.8
  };

  try {
    const response = await fetch(chatUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Chat API error: ${response.status}`);
    }

    // 设置SSE响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              res.write('data: [DONE]\n\n');
              res.end();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.choices && parsed.choices[0].delta.content) {
                res.write(`data: ${JSON.stringify({
                  content: parsed.choices[0].delta.content
                })}\n\n`);
              }
            } catch (parseError) {
              // 忽略解析错误，继续处理下一行
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    res.end();
  } catch (error) {
    console.error('Stream error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
    res.end();
  }
} 