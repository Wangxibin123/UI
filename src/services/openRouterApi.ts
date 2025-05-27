interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
    };
  }>;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

interface OpenRouterStreamResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    delta: {
      content?: string;
      role?: string;
    };
    index: number;
    finish_reason?: string;
  }>;
}

export class OpenRouterApiService {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor() {
    // 优先使用OpenRouter API key，回退到其他API key
    this.apiKey = import.meta.env.VITE_OPENROUTER_API_KEY || 
                  import.meta.env.VITE_OPENAI_API_KEY || 
                  '';
    
    if (!this.apiKey) {
      console.warn('No API key found. Please set VITE_OPENROUTER_API_KEY or VITE_OPENAI_API_KEY');
    }
  }

  // 将文件转换为base64
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // 创建包含图片的消息内容
  private async createMessageContent(text: string, files: File[]): Promise<string | Array<any>> {
    if (files.length === 0) {
      return text;
    }

    const content: Array<any> = [
      {
        type: 'text',
        text: text
      }
    ];

    // 只处理图片文件
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    for (const file of imageFiles) {
      try {
        const base64 = await this.fileToBase64(file);
        content.push({
          type: 'image_url',
          image_url: {
            url: base64
          }
        });
      } catch (error) {
        console.error('Error converting image to base64:', error);
      }
    }

    return content;
  }

  // 流式调用OpenRouter API
  public async *streamChat(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    model: string = 'anthropic/claude-3.5-sonnet',
    files: File[] = [],
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): AsyncGenerator<string, void, unknown> {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    try {
      // 转换消息格式，处理最后一条用户消息的文件
      const processedMessages: OpenRouterMessage[] = [];
      
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        
        if (i === messages.length - 1 && message.role === 'user' && files.length > 0) {
          // 最后一条用户消息包含文件
          const content = await this.createMessageContent(message.content, files);
          processedMessages.push({
            role: message.role,
            content: content
          });
        } else {
          processedMessages.push({
            role: message.role,
            content: message.content
          });
        }
      }

      const requestBody: OpenRouterRequest = {
        model: model,
        messages: processedMessages,
        stream: true,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 4000,
      };

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'LaTeX Math Assistant',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${errorText}`);
      }

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
            const trimmed = line.trim();
            if (trimmed === '' || trimmed === 'data: [DONE]') continue;
            
            if (trimmed.startsWith('data: ')) {
              try {
                const jsonStr = trimmed.slice(6);
                const data: OpenRouterStreamResponse = JSON.parse(jsonStr);
                
                const content = data.choices[0]?.delta?.content;
                if (content) {
                  yield content;
                }
              } catch (parseError) {
                console.warn('Failed to parse streaming response:', parseError);
                continue;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('OpenRouter API error:', error);
      throw error;
    }
  }

  // 获取可用的模型列表
  public getAvailableModels() {
    return [
      {
        id: 'claude-3.5-sonnet',
        modelId: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        supportsImages: true,
        description: '最新的Claude模型，优秀的数学和推理能力'
      },
      {
        id: 'gpt-4o',
        modelId: 'openai/gpt-4o',
        name: 'GPT-4o',
        supportsImages: true,
        description: '强大的多模态模型，支持图像理解'
      },
      {
        id: 'gpt-4-turbo',
        modelId: 'openai/gpt-4-turbo',
        name: 'GPT-4 Turbo',
        supportsImages: true,
        description: '快速响应的GPT-4版本'
      },
      {
        id: 'gemini-pro-1.5',
        modelId: 'google/gemini-pro-1.5',
        name: 'Gemini Pro 1.5',
        supportsImages: true,
        description: 'Google的先进AI模型'
      }
    ];
  }
}

export const openRouterApi = new OpenRouterApiService(); 