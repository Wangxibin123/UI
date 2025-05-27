# 🔑 API配置说明

## OpenRouter API 配置 (推荐)

本系统已集成OpenRouter API，支持多种先进的AI模型：

### 支持的模型
- **Claude 3.5 Sonnet** (推荐) - 优秀的数学和推理能力
- **GPT-4o** - 强大的多模态能力，支持图像理解
- **GPT-4 Turbo** - 快速响应的GPT-4版本
- **Gemini Pro 1.5** - Google的先进AI模型

### 环境变量配置

创建 `.env` 文件在项目根目录，添加以下配置：

```env
# 🔑 OpenRouter API 配置 (推荐使用)
VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here

# 🔑 备用 OpenAI API 配置
VITE_OPENAI_API_KEY=your_openai_api_key_here

# 🔧 其他配置
VITE_DEFAULT_MODEL=anthropic/claude-3.5-sonnet
VITE_MAX_TOKENS=4000
VITE_TEMPERATURE=0.7
```

### 获取API Key

#### OpenRouter (推荐)
1. 访问 [OpenRouter官网](https://openrouter.ai/)
2. 注册账户并获取API key
3. 支持多种付费模式，按使用量计费

#### OpenAI (备用)
1. 访问 [OpenAI平台](https://platform.openai.com/)
2. 创建API key
3. 需要有效的付费账户

### 功能特性

✅ **流式输出** - 实时显示AI响应  
✅ **图片支持** - 上传图片进行分析  
✅ **LaTeX渲染** - 数学公式实时渲染  
✅ **可复制块** - 重要内容可一键复制  
✅ **文件上传** - 支持图片、PDF、Word等文件  
✅ **多模型切换** - 实时切换不同AI模型  

### 使用说明

1. **配置API key** 后启动系统
2. **LaTeX格式化** 面板会自动使用配置的API
3. **上传文件** 支持图片等多媒体内容
4. **AI响应** 中的LaTeX内容会自动渲染并提供复制功能

### 注意事项

- 优先使用OpenRouter API key，功能更全面
- 确保API key有足够的余额
- 图片上传功能需要支持多模态的模型
- 系统会自动处理API调用和错误处理 