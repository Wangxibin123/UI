import OpenAI from 'openai';

// 🎯 AI模型类型定义
export type AIProvider = 'openrouter' | 'openai' | 'anthropic' | 'deepseek';

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  openrouterModelId?: string; // OpenRouter模型ID
  supportsImages: boolean;
  maxTokens?: number;
  description?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
    };
  }>;
}

export interface ChatCompletionOptions {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

// 🎯 支持的AI模型配置
export const AI_MODELS: AIModel[] = [
  // DeepSeek 系列
  {
    id: 'deepseek-chat-v3',
    name: 'DeepSeek Chat V3',
    provider: 'openrouter',
    openrouterModelId: 'deepseek/deepseek-chat-v3-0324',
    supportsImages: false,
    description: '深度思考对话模型'
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'openrouter',
    openrouterModelId: 'deepseek/deepseek-r1',
    supportsImages: false,
    description: '推理专用模型'
  },
  {
    id: 'deepseek-prover-v2',
    name: 'DeepSeek Prover V2',
    provider: 'openrouter',
    openrouterModelId: 'deepseek/deepseek-prover-v2',
    supportsImages: false,
    description: '数学证明专用模型'
  },
  
  // OpenAI 系列
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    provider: 'openrouter',
    openrouterModelId: 'openai/gpt-4.1',
    supportsImages: true,
    description: 'OpenAI最新旗舰模型'
  },
  {
    id: 'gpt-4.5-preview',
    name: 'GPT-4.5 Preview',
    provider: 'openrouter',
    openrouterModelId: 'openai/gpt-4.5-preview',
    supportsImages: true,
    description: 'GPT-4.5预览版'
  },
  {
    id: 'o3',
    name: 'OpenAI O3',
    provider: 'openai',
    supportsImages: true,
    description: 'OpenAI O3推理模型'
  },
  
  // Anthropic Claude 系列
  {
    id: 'claude-opus-4',
    name: 'Claude Opus 4',
    provider: 'openrouter',
    openrouterModelId: 'anthropic/claude-opus-4',
    supportsImages: true,
    description: 'Claude最强模型'
  },
  {
    id: 'claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: 'openrouter',
    openrouterModelId: 'anthropic/claude-sonnet-4',
    supportsImages: true,
    description: 'Claude平衡模型'
  },
  {
    id: 'claude-3.7-sonnet-thinking',
    name: 'Claude 3.7 Sonnet (Thinking)',
    provider: 'openrouter',
    openrouterModelId: 'anthropic/claude-3.7-sonnet:thinking',
    supportsImages: true,
    description: 'Claude思维模式'
  },
  
  // Google Gemini 系列
  {
    id: 'gemini-2.5-flash-preview',
    name: 'Gemini 2.5 Flash Preview',
    provider: 'openrouter',
    openrouterModelId: 'google/gemini-2.5-flash-preview-05-20',
    supportsImages: true,
    description: 'Google最新视觉模型'
  },
  {
    id: 'gemini-2.5-flash-thinking',
    name: 'Gemini 2.5 Flash (Thinking)',
    provider: 'openrouter',
    openrouterModelId: 'google/gemini-2.5-flash-preview-05-20:thinking',
    supportsImages: true,
    description: 'Gemini思维模式'
  },
  
  // Qwen 系列
  {
    id: 'qwen2.5-vl-32b',
    name: 'Qwen 2.5 VL 32B',
    provider: 'openrouter',
    openrouterModelId: 'qwen/qwen2.5-vl-32b-instruct',
    supportsImages: true,
    description: '通义千问视觉模型'
  },
  {
    id: 'qwen2.5-vl-72b',
    name: 'Qwen 2.5 VL 72B',
    provider: 'openrouter',
    openrouterModelId: 'qwen/qwen2.5-vl-72b-instruct',
    supportsImages: true,
    description: '通义千问大型视觉模型'
  },
  {
    id: 'qwen3-235b',
    name: 'Qwen 3 235B',
    provider: 'openrouter',
    openrouterModelId: 'qwen/qwen3-235b-a22b',
    supportsImages: false,
    description: '通义千问超大模型'
  },
  {
    id: 'qwen3-32b',
    name: 'Qwen 3 32B',
    provider: 'openrouter',
    openrouterModelId: 'qwen/qwen3-32b',
    supportsImages: false,
    description: '通义千问高效模型'
  }
];

// 🎯 AI模型服务类
export class AIModelService {
  private openrouterClient: OpenAI;
  private openaiClient: OpenAI | null = null;
  private siteUrl: string;
  private siteName: string;

  constructor() {
    // 获取环境变量
    const openrouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    this.siteUrl = import.meta.env.VITE_SITE_URL || 'http://localhost:5173';
    this.siteName = import.meta.env.VITE_SITE_NAME || 'AI解题助手';

    // 初始化OpenRouter客户端
    if (!openrouterApiKey) {
      console.warn('OpenRouter API Key 未设置');
    }
    
    this.openrouterClient = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: openrouterApiKey || '',
      defaultHeaders: {
        "HTTP-Referer": this.siteUrl,
        "X-Title": this.siteName,
      },
      dangerouslyAllowBrowser: true
    });

    // 初始化OpenAI客户端（用于O3模型）
    if (openaiApiKey) {
      this.openaiClient = new OpenAI({
        apiKey: openaiApiKey,
        dangerouslyAllowBrowser: true
      });
    }
  }

  // 🎯 获取所有可用模型
  getAvailableModels(): AIModel[] {
    return AI_MODELS;
  }

  // 🎯 根据ID获取模型信息
  getModelById(modelId: string): AIModel | undefined {
    return AI_MODELS.find(model => model.id === modelId);
  }

  // 🎯 按提供商分组模型
  getModelsByProvider(): Record<AIProvider, AIModel[]> {
    const grouped: Record<AIProvider, AIModel[]> = {
      openrouter: [],
      openai: [],
      anthropic: [],
      deepseek: []
    };

    AI_MODELS.forEach(model => {
      grouped[model.provider].push(model);
    });

    return grouped;
  }

  // 🎯 调用AI模型进行对话
  async chatCompletion(options: ChatCompletionOptions): Promise<string> {
    const model = this.getModelById(options.model);
    if (!model) {
      throw new Error(`未找到模型: ${options.model}`);
    }

    try {
      switch (model.provider) {
        case 'openrouter':
          return await this.callOpenRouterModel(model, options);
        
        case 'openai':
          return await this.callOpenAIModel(model, options);
        
        default:
          throw new Error(`不支持的提供商: ${model.provider}`);
      }
    } catch (error) {
      console.error('AI模型调用失败:', error);
      throw error;
    }
  }

  // 🎯 调用OpenRouter模型
  private async callOpenRouterModel(model: AIModel, options: ChatCompletionOptions): Promise<string> {
    const completion = await this.openrouterClient.chat.completions.create({
      model: model.openrouterModelId!,
      messages: options.messages as any,
      max_tokens: options.maxTokens,
      temperature: options.temperature || 0.7,
      stream: false
    });

    return completion.choices[0]?.message?.content || '';
  }

  // 🎯 调用OpenAI O3模型（使用新的responses API）
  private async callOpenAIModel(model: AIModel, options: ChatCompletionOptions): Promise<string> {
    if (!this.openaiClient) {
      throw new Error('OpenAI API Key 未设置');
    }

    if (model.id === 'o3') {
      // 使用新的responses API调用O3
      const response = await (this.openaiClient as any).responses.create({
        model: "o3",
        input: options.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      });
      
      return response.output_text || '';
    } else {
      // 使用标准的chat completions API
      const completion = await this.openaiClient.chat.completions.create({
        model: model.openrouterModelId || model.id,
        messages: options.messages as any,
        max_tokens: options.maxTokens,
        temperature: options.temperature || 0.7
      });

      return completion.choices[0]?.message?.content || '';
    }
  }

  // 🎯 流式调用（用于实时对话）
  async streamChatCompletion(
    options: ChatCompletionOptions, 
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const model = this.getModelById(options.model);
    if (!model) {
      throw new Error(`未找到模型: ${options.model}`);
    }

    if (model.provider === 'openrouter') {
      const stream = await this.openrouterClient.chat.completions.create({
        model: model.openrouterModelId!,
        messages: options.messages as any,
        max_tokens: options.maxTokens,
        temperature: options.temperature || 0.7,
        stream: true
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          onChunk(content);
        }
      }
    } else if (model.provider === 'openai' && model.id === 'o3') {
      if (!this.openaiClient) {
        throw new Error('OpenAI API Key 未设置');
      }

      // O3流式调用
      const stream = await (this.openaiClient as any).responses.create({
        model: "o3",
        input: options.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        stream: true
      });

      for await (const event of stream) {
        if (event.output_text) {
          onChunk(event.output_text);
        }
      }
    }
  }

  // 🎯 检查模型可用性
  isModelAvailable(modelId: string): boolean {
    const model = this.getModelById(modelId);
    if (!model) return false;

    switch (model.provider) {
      case 'openrouter':
        return !!import.meta.env.VITE_OPENROUTER_API_KEY;
      case 'openai':
        return !!import.meta.env.VITE_OPENAI_API_KEY;
      case 'anthropic':
        return !!import.meta.env.VITE_CLAUDE_API_KEY;
      case 'deepseek':
        return !!import.meta.env.VITE_DEEPSEEK_API_KEY;
      default:
        return false;
    }
  }

  // 🎯 获取可用的模型列表
  getAvailableModelIds(): string[] {
    return AI_MODELS
      .filter(model => this.isModelAvailable(model.id))
      .map(model => model.id);
  }
}

// 🎯 导出单例实例
export const aiModelService = new AIModelService(); 