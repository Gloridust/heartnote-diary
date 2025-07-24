import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';

interface SpeechToTextRequest {
  audioData: string; // Base64编码的音频数据
}

interface SpeechToTextResponse {
  success: boolean;
  text?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SpeechToTextResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }

  const { audioData }: SpeechToTextRequest = req.body;

  if (!audioData) {
    return res.status(400).json({ success: false, error: 'Audio data is required' });
  }

  try {
    const result = await recognizeAudioFlash(audioData);
    
    return res.status(200).json({
      success: true,
      text: result
    });
  } catch (error) {
    console.error('Speech to text error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to convert speech to text'
    });
  }
}

async function recognizeAudioFlash(audioData: string): Promise<string> {
  const recognizeUrl = "https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash";
  
  const headers = {
    "X-Api-App-Key": process.env.BYTEDANCE_APP_KEY || "",
    "X-Api-Access-Key": process.env.BYTEDANCE_ACCESS_TOKEN || "",
    "X-Api-Resource-Id": "volc.bigasr.auc_turbo",
    "X-Api-Request-Id": uuidv4(),
    "X-Api-Sequence": "-1",
    "Content-Type": "application/json"
  };

  // 处理base64数据，移除data URL前缀（如果存在）
  let base64Audio = audioData;
  if (audioData.startsWith('data:')) {
    base64Audio = audioData.split(',')[1];
  }

  const request = {
    user: {
      uid: process.env.BYTEDANCE_APP_KEY || "diary_user"
    },
    audio: {
      data: base64Audio
    },
    request: {
      model_name: "bigmodel",
      enable_itn: true,
      enable_punc: true,
      enable_ddc: true
    }
  };

  const response = await fetch(recognizeUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(request)
  });

  const statusCode = response.headers.get("X-Api-Status-Code");
  
  if (statusCode === "20000000") {
    const result = await response.json();
    console.log(`Speech recognition successful, X-Tt-Logid: ${response.headers.get("X-Tt-Logid")}`);
    return extractTextFromFlashResult(result);
  } else {
    const errorMessage = response.headers.get("X-Api-Message") || "Unknown error";
    console.error(`Speech recognition failed: ${errorMessage}, X-Tt-Logid: ${response.headers.get("X-Tt-Logid")}`);
    throw new Error(`Speech recognition failed: ${errorMessage}`);
  }
}

interface FlashSpeechResult {
  result?: {
    text?: string;
    utterances?: Array<{
      text: string;
    }>;
  };
}

function extractTextFromFlashResult(result: FlashSpeechResult): string {
  try {
    // 优先使用整体文本
    if (result.result?.text) {
      return result.result.text.trim() || '无法识别语音内容';
    }
    
    // 备用：合并utterances
    if (result.result?.utterances) {
      const texts = result.result.utterances
        .map((utterance) => utterance.text)
        .filter((text: string) => text && text.trim())
        .join(' ');
      return texts || '无法识别语音内容';
    }
    
    return '无法识别语音内容';
  } catch (error) {
    console.error('Error extracting text from flash result:', error);
    return '语音识别结果解析错误';
  }
} 