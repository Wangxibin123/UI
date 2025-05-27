import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// 🎯 AI模型配置接口
export interface AIModel {
  id: string;
  name: string;
  description: string;
  provider: 'openrouter' | 'openai' | 'anthropic' | 'deepseek';
  modelId: string;
  category: 'latex' | 'analysis' | 'summary' | 'math' | 'general';
  supportsImages: boolean;
  maxTokens: number;
  costPer1kTokens?: number;
}

// 🎯 聊天消息接口 - 兼容OpenAI SDK
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: { url: string };
  }>;
}

// 🎯 API调用参数接口
export interface ChatCompletionParams {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

// 🎯 可用的AI模型配置
const AI_MODELS: AIModel[] = [
  // DeepSeek 系列 - 数学和推理专用
  {
    id: 'deepseek-chat-v3',
    name: 'DeepSeek Chat V3',
    description: '最新的DeepSeek对话模型，擅长数学推理',
    provider: 'openrouter',
    modelId: 'deepseek/deepseek-chat-v3-0324',
    category: 'math',
    supportsImages: false,
    maxTokens: 8192,
    costPer1kTokens: 0.14
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    description: '推理专用模型，适合复杂数学问题',
    provider: 'openrouter',
    modelId: 'deepseek/deepseek-r1',
    category: 'math',
    supportsImages: false,
    maxTokens: 8192,
    costPer1kTokens: 0.55
  },
  {
    id: 'deepseek-prover-v2',
    name: 'DeepSeek Prover V2',
    description: '数学证明专用模型，适合LaTeX格式化',
    provider: 'openrouter',
    modelId: 'deepseek/deepseek-prover-v2',
    category: 'latex',
    supportsImages: false,
    maxTokens: 8192,
    costPer1kTokens: 0.14
  },
  
  // OpenAI 系列 - 通用和多模态
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    description: '最新的GPT-4模型，支持图像分析',
    provider: 'openrouter',
    modelId: 'openai/gpt-4.1',
    category: 'general',
    supportsImages: true,
    maxTokens: 8192,
    costPer1kTokens: 5.0
  },
  {
    id: 'gpt-4.5-preview',
    name: 'GPT-4.5 Preview',
    description: 'GPT-4.5预览版，强大的多模态能力',
    provider: 'openrouter',
    modelId: 'openai/gpt-4.5-preview',
    category: 'analysis',
    supportsImages: true,
    maxTokens: 8192,
    costPer1kTokens: 10.0
  },
  
  // Claude 系列 - 分析和总结
  {
    id: 'claude-opus-4',
    name: 'Claude Opus 4',
    description: 'Claude最强模型，擅长深度分析',
    provider: 'openrouter',
    modelId: 'anthropic/claude-opus-4',
    category: 'analysis',
    supportsImages: true,
    maxTokens: 8192,
    costPer1kTokens: 15.0
  },
  {
    id: 'claude-sonnet-4',
    name: 'Claude Sonnet 4',
    description: 'Claude平衡模型，适合总结和分析',
    provider: 'openrouter',
    modelId: 'anthropic/claude-sonnet-4',
    category: 'summary',
    supportsImages: true,
    maxTokens: 8192,
    costPer1kTokens: 3.0
  },
  {
    id: 'claude-3.7-sonnet-thinking',
    name: 'Claude 3.7 Sonnet (Thinking)',
    description: 'Claude思维模式，显示推理过程',
    provider: 'openrouter',
    modelId: 'anthropic/claude-3.7-sonnet:thinking',
    category: 'analysis',
    supportsImages: true,
    maxTokens: 8192,
    costPer1kTokens: 3.0
  },
  
  // Google 系列 - 快速响应
  {
    id: 'gemini-2.5-flash-thinking',
    name: 'Gemini 2.5 Flash (Thinking)',
    description: 'Google快速模型，思维模式',
    provider: 'openrouter',
    modelId: 'google/gemini-2.5-flash-preview-05-20:thinking',
    category: 'general',
    supportsImages: true,
    maxTokens: 8192,
    costPer1kTokens: 0.075
  },
  
  // Qwen 系列 - 多语言和视觉
  {
    id: 'qwen-2.5-vl-72b',
    name: 'Qwen 2.5 VL 72B',
    description: 'Qwen视觉语言模型，支持图像理解',
    provider: 'openrouter',
    modelId: 'qwen/qwen2.5-vl-72b-instruct',
    category: 'analysis',
    supportsImages: true,
    maxTokens: 8192,
    costPer1kTokens: 0.4
  }
];

// 🎯 AI模型服务类
class AIModelService {
  private openrouterClient: OpenAI;
  private openaiClient: OpenAI | null = null;
  private anthropicClient: OpenAI | null = null;

  constructor() {
    // 初始化OpenRouter客户端（主要使用）
    this.openrouterClient = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: import.meta.env.VITE_OPENROUTER_API_KEY,
      defaultHeaders: {
        "HTTP-Referer": import.meta.env.VITE_SITE_URL || "http://localhost:5173",
        "X-Title": import.meta.env.VITE_SITE_NAME || "AI解题助手",
      },
      dangerouslyAllowBrowser: true // 允许在浏览器中使用
    });

    // 可选：初始化其他客户端
    if (import.meta.env.VITE_OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true
      });
    }
  }

  // 🎯 获取所有可用模型
  getAvailableModels(): AIModel[] {
    return AI_MODELS;
  }

  // 🎯 根据类别获取模型
  getModelsByCategory(category: string): AIModel[] {
    return AI_MODELS.filter(model => model.category === category);
  }

  // 🎯 获取特定模型信息
  getModelById(id: string): AIModel | undefined {
    return AI_MODELS.find(model => model.id === id);
  }

  // 🎯 获取适合特定功能的推荐模型
  getRecommendedModels() {
    return {
      latex: AI_MODELS.filter(m => m.category === 'latex'),
      analysis: AI_MODELS.filter(m => m.category === 'analysis'),
      summary: AI_MODELS.filter(m => m.category === 'summary'),
      math: AI_MODELS.filter(m => m.category === 'math'),
      general: AI_MODELS.filter(m => m.category === 'general')
    };
  }

  // 🎯 转换消息格式以兼容OpenAI SDK
  private convertMessages(messages: ChatMessage[]): ChatCompletionMessageParam[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    } as ChatCompletionMessageParam));
  }

  // 🎯 标准聊天完成API调用
  async chatCompletion(params: ChatCompletionParams): Promise<string> {
    try {
      const model = this.getModelById(params.model);
      if (!model) {
        throw new Error(`未找到模型: ${params.model}`);
      }

      const client = this.getClientForModel(model);
      
      const completion = await client.chat.completions.create({
        model: model.modelId,
        messages: this.convertMessages(params.messages),
        temperature: params.temperature || 0.7,
        max_tokens: params.maxTokens || model.maxTokens,
        stream: false
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('AI API调用失败:', error);
      throw new Error(`AI调用失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // 🎯 流式聊天完成API调用
  async streamChatCompletion(
    params: ChatCompletionParams,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    try {
      const model = this.getModelById(params.model);
      if (!model) {
        throw new Error(`未找到模型: ${params.model}`);
      }

      const client = this.getClientForModel(model);
      
      const stream = await client.chat.completions.create({
        model: model.modelId,
        messages: this.convertMessages(params.messages),
        temperature: params.temperature || 0.7,
        max_tokens: params.maxTokens || model.maxTokens,
        stream: true
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          onChunk(content);
        }
      }
    } catch (error) {
      console.error('AI流式调用失败:', error);
      throw new Error(`AI流式调用失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // 🎯 根据模型获取对应的客户端
  private getClientForModel(model: AIModel): OpenAI {
    switch (model.provider) {
      case 'openai':
        if (!this.openaiClient) {
          throw new Error('OpenAI API Key未配置');
        }
        return this.openaiClient;
      case 'openrouter':
      default:
        return this.openrouterClient;
    }
  }

  // 🎯 检查API Key是否配置
  isConfigured(): boolean {
    return !!import.meta.env.VITE_OPENROUTER_API_KEY;
  }

  // 🎯 获取配置状态
  getConfigStatus() {
    return {
      openrouter: !!import.meta.env.VITE_OPENROUTER_API_KEY,
      openai: !!import.meta.env.VITE_OPENAI_API_KEY,
      claude: !!import.meta.env.VITE_CLAUDE_API_KEY,
      deepseek: !!import.meta.env.VITE_DEEPSEEK_API_KEY
    };
  }
}

// 🎯 导出单例实例
export const aiModelService = new AIModelService(); 