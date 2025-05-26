// OpenRouter API Service
// 用于调用各种AI模型的服务 (已迁移到 aiModelService，保持向后兼容)

import { aiModelService, type ChatMessage as NewChatMessage, type AIModel } from './aiModelService';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason?: string;
  }>;
}

class OpenRouterService {
  private apiKey: string;
  private baseUrl: string = 'https://openrouter.ai/api/v1';

  constructor() {
    // 从环境变量获取API Key
    this.apiKey = import.meta.env.VITE_OPENROUTER_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('OpenRouter API Key 未设置。请在 .env 文件中添加 VITE_OPENROUTER_API_KEY');
    }
  }

  // 检查API Key是否已设置
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  // 通用API调用方法
  private async makeRequest(
    endpoint: string,
    options: RequestInit
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'LaTeX Helper App',
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API Error: ${response.status} - ${errorText}`);
    }

    return response;
  }

  // 发送聊天消息（非流式）
  async sendChatMessage(
    messages: ChatMessage[],
    model: string = 'deepseek/deepseek-chat',
    options: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
    } = {}
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('OpenRouter API Key 未配置');
    }

    const requestBody = {
      model,
      messages,
      temperature: options.temperature ?? 0,
      max_tokens: options.maxTokens ?? 4000,
      top_p: options.topP ?? 1,
      frequency_penalty: options.frequencyPenalty ?? 0,
      presence_penalty: options.presencePenalty ?? 0,
      stream: false,
    };

    try {
      const response = await this.makeRequest('/chat/completions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const data: OpenRouterResponse = await response.json();
      
      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content;
      } else {
        throw new Error('No response content received');
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  }

  // 发送聊天消息（流式）
  async sendChatMessageStream(
    messages: ChatMessage[],
    model: string = 'deepseek/deepseek-chat',
    onChunk: (chunk: string) => void,
    options: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
    } = {}
  ): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('OpenRouter API Key 未配置');
    }

    const requestBody = {
      model,
      messages,
      temperature: options.temperature ?? 0,
      max_tokens: options.maxTokens ?? 4000,
      top_p: options.topP ?? 1,
      frequency_penalty: options.frequencyPenalty ?? 0,
      presence_penalty: options.presencePenalty ?? 0,
      stream: true,
    };

    try {
      const response = await this.makeRequest('/chat/completions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      if (!response.body) {
        throw new Error('No response body received');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed: StreamChunk = JSON.parse(data);
              
              if (parsed.choices && parsed.choices.length > 0) {
                const deltaContent = parsed.choices[0].delta.content;
                if (deltaContent) {
                  onChunk(deltaContent);
                }
              }
            } catch (parseError) {
              // 忽略解析错误，继续处理下一行
              continue;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending stream chat message:', error);
      throw error;
    }
  }

  // 多模态消息处理（用于题目识别）
  async sendMultimodalMessage(
    textContent: string,
    imageBase64?: string,
    model: string = 'google/gemini-2.0-flash-thinking-exp:free',
    systemPrompt?: string
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('OpenRouter API Key 未配置');
    }

    const messages: ChatMessage[] = [];

    // 添加系统提示
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // 构建用户消息
    let userContent = textContent;
    
    // 如果有图片，添加图片内容（这里需要根据具体模型的要求调整格式）
    if (imageBase64) {
      userContent += `\n\n[Image Data: ${imageBase64.substring(0, 100)}...]`;
    }

    messages.push({
      role: 'user',
      content: userContent
    });

    return this.sendChatMessage(messages, model, {
      temperature: 0,
      maxTokens: 4000,
    });
  }

  // 🎯 新增：获取可用的AI模型列表
  getAvailableAIModels(): AIModel[] {
    return aiModelService.getAvailableModels();
  }

  // 🎯 新增：使用新模型服务发送消息
  async sendMessageWithNewService(
    messages: ChatMessage[],
    modelId: string,
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<string> {
    const newMessages: NewChatMessage[] = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    return await aiModelService.chatCompletion({
      model: modelId,
      messages: newMessages,
      temperature: options.temperature,
      maxTokens: options.maxTokens
    });
  }

  // 🎯 新增：使用新模型服务流式发送消息
  async sendMessageStreamWithNewService(
    messages: ChatMessage[],
    modelId: string,
    onChunk: (chunk: string) => void,
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<void> {
    const newMessages: NewChatMessage[] = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    return await aiModelService.streamChatCompletion({
      model: modelId,
      messages: newMessages,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      stream: true
    }, onChunk);
  }

  // 预定义的模型配置 (已迁移到 aiModelService)
  static readonly MODELS = {
    DEEPSEEK_CHAT: 'deepseek-chat-v3',
    DEEPSEEK_R1: 'deepseek-r1',
    DEEPSEEK_PROVER: 'deepseek-prover-v2',
    GPT_4_1: 'gpt-4.1',
    GPT_4_5: 'gpt-4.5-preview',
    O3: 'o3',
    CLAUDE_OPUS: 'claude-opus-4',
    CLAUDE_SONNET: 'claude-sonnet-4',
    CLAUDE_THINKING: 'claude-3.7-sonnet-thinking',
    GEMINI_FLASH: 'gemini-2.5-flash-preview',
    GEMINI_THINKING: 'gemini-2.5-flash-thinking',
    QWEN_VL_32B: 'qwen2.5-vl-32b',
    QWEN_VL_72B: 'qwen2.5-vl-72b',
    QWEN_235B: 'qwen3-235b',
    QWEN_32B: 'qwen3-32b',
  } as const;

  // 预定义的提示词模版
  static readonly PROMPTS = {
    GENERAL: `你是一个专业的LaTeX专家，帮助用户处理LaTeX相关问题。请用LaTeX格式回复，并确保输出的内容可以直接复制使用。

规则：
1. 优先使用LaTeX语法
2. 确保数学公式正确
3. 保持格式整洁易读
4. 在必要时提供解释

用户的请求：`,

    RECOGNITION: `你是一个专业的数学题目识别专家。请将用户提供的图片或文字内容识别并转换为标准的LaTeX格式。

要求：
1. 准确识别数学公式和符号
2. 使用标准LaTeX语法
3. 保持原始内容的逻辑结构
4. 如有不确定的部分，请标注

请处理以下内容：`,

    REPAIR: `你是一个LaTeX修复专家。请修复用户提供的LaTeX内容中的错误，使其符合标准LaTeX语法并能正确渲染。

修复要点：
1. 检查语法错误
2. 补充缺失的标记
3. 修正符号使用
4. 确保可正确编译

需要修复的内容：`,

    DETAILED: `你是一个LaTeX详细化专家。请将用户提供的LaTeX内容进行详细化处理，添加更多步骤说明和中间过程。

详细化要求：
1. 添加中间推导步骤
2. 增加解释性文字
3. 使用更清晰的格式
4. 保持逻辑连贯性

需要详细化的内容：`,

    SIMPLIFIED: `你是一个LaTeX精简专家。请将用户提供的LaTeX内容进行精简处理，保留核心要点，去除冗余信息。

精简要求：
1. 保留关键信息
2. 去除冗余步骤
3. 使用简洁格式
4. 保持核心逻辑

需要精简的内容：`,
  } as const;
}

// 创建单例实例
export const openRouterService = new OpenRouterService();

export default OpenRouterService; 