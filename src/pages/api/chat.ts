import { NextApiRequest, NextApiResponse } from 'next';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: Message[];
  weather?: string;
  location?: string;
}

interface ChatResponse {
  success: boolean;
  content?: string;
  error?: string;
}

// 动态生成系统提示词
function createSystemMessage(weather?: string, location?: string): Message {
  const now = new Date();
  const timeContext = `今天是 ${now.toLocaleDateString('zh-CN')} ${['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()]} ${now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  
  const weatherContext = weather ? `当前天气：${weather}` : '';
  const locationContext = location ? `当前位置：${location}` : '';
  
  const environmentInfo = [weatherContext, locationContext].filter(Boolean).join('，');
  const environmentSection = environmentInfo ? `\n\n# 环境信息\n${environmentInfo}。` : '';

  return {
    role: "system",
    content: `# 角色
你是"信语日记 APP"中的日记助手"小语"，是一个由 LLM 驱动的对话式日记本引导者。每天生活结束时，你主动与用户对话，以简短且循循善诱的方式，引导用户分享当天的经历，了解用户过得如何、发生了何事等日记要素。你的回答和问题要尽可能简短，不能编造未提及的虚假内容。

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
    "title": "[简短的日记标题，10字以内]",
    "message": "[具体日记内容]",
    "score": 5,
    "tag": "personal"
}

## 限制:
- 对话围绕用户的生活经历展开。
- 生成的日记需忠实于对话记录，不得偏离历史对话所提供的信息。
- 对话语言应简洁明了。 
- 回复必须以规定的json格式输出，且包含"title"（简短的日记标题，10字以内，概括当天的主要内容或心情）、"score"（取值范围为1 - 10的评分，分数越高心情越好，5分为平静）和"tag"（从'work'、'personal'、'travel'、'relationships'、'health'、'goals'、'reflection'、'gratitude'、'dreams'、'memories'中选择今天的主题内容）字段。 

请用中文回复，语气要亲和自然。适当时机偶尔加入一句安慰/鼓励的话，但不要浪费太多时间。

# 时间背景
${timeContext}${environmentSection}
你可以了解这些信息，但是不用刻意提起，除非用户提及。

## 重要提醒
- 你的回复必须是严格的JSON格式，不能包含任何markdown标记或代码块标记
- JSON中的字符串值不能包含换行符、制表符等控制字符`
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }

  const { messages, weather, location }: ChatRequest = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ success: false, error: 'Messages array is required' });
  }

  try {
    const content = await getChatCompletion(messages, weather, location);
    return res.status(200).json({
      success: true,
      content
    });
  } catch (error) {
    console.error('Chat completion error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get chat completion'
    });
  }
}

async function getChatCompletion(messages: Message[], weather?: string, location?: string): Promise<string> {
  const chatUrl = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
  
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.ARK_API_KEY || ""}`
  };

  const systemMessage = createSystemMessage(weather, location);
  
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