import * as crypto from 'crypto';

// 协议常量
const PROTOCOL_VERSION = 0b0001;
const CLIENT_FULL_REQUEST = 0b0001;
const CLIENT_AUDIO_ONLY_REQUEST = 0b0010;
const MSG_WITH_EVENT = 0b0100;
const JSON_SERIALIZATION = 0b0001;
const GZIP_COMPRESSION = 0b0001;

interface DoubaoConfig {
  baseUrl: string;
  headers: {
    [key: string]: string;
  };
  startSessionReq: any;
}

export class DoubaoWebSocketClient {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private config: DoubaoConfig;
  private isConnected = false;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.config = {
      baseUrl: "wss://openspeech.bytedance.com/api/v3/realtime/dialogue",
      headers: {
        "X-Api-App-ID": process.env.NEXT_PUBLIC_DOUBAO_APP_ID || "",
        "X-Api-Access-Key": process.env.NEXT_PUBLIC_DOUBAO_ACCESS_KEY || "",
        "X-Api-Resource-Id": "volc.speech.dialog",
        "X-Api-App-Key": "PlgvMymc7f3tQnJ6",
        "X-Api-Connect-Id": crypto.randomUUID(),
      },
      startSessionReq: {
        tts: {
          audio_config: {
            channel: 1,
            format: "pcm",
            sample_rate: 24000
          }
        },
        dialog: {
          bot_name: "豆包",
          system_role: "你是一个贴心的AI日记助手，性格温和亲切，擅长倾听和引导用户分享生活。你会主动询问用户的生活细节，引导用户表达情感和想法。",
          speaking_style: "你的说话风格自然亲和，语速适中，善于用温暖的话语鼓励用户表达。会适时提出具体的问题来深入了解用户的经历。",
          extra: {
            strict_audit: false,
            audit_response: "让我们聊聊别的话题吧。"
          }
        }
      }
    };
  }

  // 生成协议头部
  private generateHeader(messageType = CLIENT_FULL_REQUEST, flags = MSG_WITH_EVENT): ArrayBuffer {
    const header = new ArrayBuffer(4);
    const view = new DataView(header);
    
    let headerValue = (PROTOCOL_VERSION & 0xF) << 28;
    headerValue |= (0x1 & 0xF) << 24;
    headerValue |= (messageType & 0xF) << 20;
    headerValue |= (flags & 0xF) << 16;
    headerValue |= (JSON_SERIALIZATION & 0xF) << 12;
    headerValue |= (GZIP_COMPRESSION & 0xF) << 8;
    headerValue |= 0x00;
    
    view.setUint32(0, headerValue, false); // big-endian
    return header;
  }

  // 创建消息
  private async createMessage(sequence: number, payload: any, sessionId = ''): Promise<ArrayBuffer> {
    const header = this.generateHeader();
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    
    // 使用浏览器的CompressionStream API进行gzip压缩
    const compressedPayload = await this.compressData(payloadStr);
    const sessionIdBytes = new TextEncoder().encode(sessionId);
    
    const totalLength = 12 + sessionIdBytes.length + compressedPayload.byteLength;
    const message = new ArrayBuffer(totalLength);
    const view = new DataView(message);
    let offset = 0;
    
    // 写入头部
    new Uint8Array(message, offset, 4).set(new Uint8Array(header));
    offset += 4;
    
    // 写入序列号
    view.setUint32(offset, sequence, false);
    offset += 4;
    
    // 写入sessionId长度和内容
    view.setUint32(offset, sessionIdBytes.length, false);
    offset += 4;
    if (sessionIdBytes.length > 0) {
      new Uint8Array(message, offset, sessionIdBytes.length).set(sessionIdBytes);
      offset += sessionIdBytes.length;
    }
    
    // 写入payload长度和内容
    view.setUint32(offset, compressedPayload.byteLength, false);
    offset += 4;
    new Uint8Array(message, offset, compressedPayload.byteLength).set(new Uint8Array(compressedPayload));
    
    return message;
  }

  // 数据压缩
  private async compressData(data: string): Promise<ArrayBuffer> {
    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    
    writer.write(new TextEncoder().encode(data));
    writer.close();
    
    const chunks: Uint8Array[] = [];
    let done = false;
    
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }
    
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result.buffer;
  }

  // 连接到豆包服务
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = new URL(this.config.baseUrl);
        
        // 创建WebSocket连接
        this.ws = new WebSocket(wsUrl.toString());
        
        this.ws.onopen = async () => {
          console.log('Connected to Doubao');
          this.isConnected = true;
          
          try {
            // 发送StartConnection请求
            const startConnectionMsg = await this.createMessage(1, {});
            this.ws!.send(startConnectionMsg);
            
            // 发送StartSession请求
            setTimeout(async () => {
              const startSessionMsg = await this.createMessage(100, this.config.startSessionReq, this.sessionId);
              this.ws!.send(startSessionMsg);
            }, 100);
            
            resolve();
          } catch (error) {
            reject(error);
          }
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnected = false;
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket connection closed');
          this.isConnected = false;
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  // 处理接收到的消息
  private async handleMessage(data: ArrayBuffer) {
    try {
      const response = await this.parseResponse(data);
      if (response) {
        // 触发消息处理器
        this.messageHandlers.forEach(handler => handler(response));
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  // 解析响应
  private async parseResponse(buffer: ArrayBuffer): Promise<any> {
    try {
      const view = new DataView(buffer);
      const header = view.getUint32(0, false);
      const messageType = (header >> 20) & 0xF;
      const sequence = view.getUint32(4, false);
      
      let offset = 8;
      const sessionIdLength = view.getUint32(offset, false);
      offset += 4;
      
      const sessionId = sessionIdLength > 0 
        ? new TextDecoder().decode(buffer.slice(offset, offset + sessionIdLength))
        : '';
      offset += sessionIdLength;
      
      const payloadLength = view.getUint32(offset, false);
      offset += 4;
      
      if (buffer.byteLength >= offset + payloadLength) {
        const payloadBuffer = buffer.slice(offset, offset + payloadLength);
        let payload = null;
        
        try {
          const decompressed = await this.decompressData(payloadBuffer);
          payload = JSON.parse(decompressed);
        } catch (e) {
          payload = new TextDecoder().decode(payloadBuffer);
        }
        
        return {
          messageType,
          sequence,
          sessionId,
          payload
        };
      }
      return null;
    } catch (error) {
      console.error('Error parsing response:', error);
      return null;
    }
  }

  // 数据解压缩
  private async decompressData(data: ArrayBuffer): Promise<string> {
    const stream = new DecompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    
    writer.write(new Uint8Array(data));
    writer.close();
    
    const chunks: Uint8Array[] = [];
    let done = false;
    
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }
    
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return new TextDecoder().decode(result);
  }

  // 发送音频数据
  async sendAudio(audioData: ArrayBuffer): Promise<void> {
    if (!this.isConnected || !this.ws) {
      throw new Error('WebSocket not connected');
    }

    const audioMessage = await this.createMessage(200, {
      audio: Array.from(new Uint8Array(audioData)),
      format: "pcm",
      sample_rate: 16000
    }, this.sessionId);
    
    this.ws.send(audioMessage);
  }

  // 发送文本消息
  async sendText(text: string): Promise<void> {
    if (!this.isConnected || !this.ws) {
      throw new Error('WebSocket not connected');
    }

    const textMessage = await this.createMessage(300, {
      content: text
    }, this.sessionId);
    
    this.ws.send(textMessage);
  }

  // 添加消息处理器
  onMessage(handler: (data: any) => void): void {
    const id = crypto.randomUUID();
    this.messageHandlers.set(id, handler);
  }

  // 断开连接
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.messageHandlers.clear();
  }

  // 获取连接状态
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}