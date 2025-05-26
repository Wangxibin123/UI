# 🚀 AI-MATH 环境变量配置指南

## 📋 配置步骤

1. **在项目根目录创建 `.env` 文件**：
```bash
touch .env
```

2. **添加以下内容到 `.env` 文件**：
```bash
# 🎯 优先使用OpenRouter API（推荐）
# 注册地址：https://openrouter.ai/
VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here

# 🤖 OpenAI API（用于O3等特殊模型）
# 注册地址：https://platform.openai.com/
VITE_OPENAI_API_KEY=your_openai_api_key_here

# 🧠 Claude API（Anthropic）
# 注册地址：https://console.anthropic.com/
VITE_CLAUDE_API_KEY=your_claude_api_key_here

# 🔬 DeepSeek API（直接调用）
# 注册地址：https://platform.deepseek.com/
VITE_DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

3. **填入您的实际API密钥**

4. **重启开发服务器**：
```bash
npm run dev
```

## 🔧 当前API Key配置方式

您的 `.env` 文件配置方式是**完全正确的**！使用 `VITE_` 前缀是Vite项目的标准做法，我们的代码已经正确配置了对应的环境变量读取。

## 🎯 模型支持情况

- **OpenRouter**: 支持所有主流模型（DeepSeek、GPT、Claude、Gemini等）
- **OpenAI**: 支持GPT系列和O3特殊模型
- **Claude**: 支持Anthropic模型
- **DeepSeek**: 支持DeepSeek专有模型

## ✅ 验证配置

启动应用后，在AI模型选择器中可以看到可用的模型列表。如果API Key配置正确，对应的模型会自动启用。 