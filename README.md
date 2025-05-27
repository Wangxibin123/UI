# 🎯 AI数学解题助手 (AI Math Solver)

一个基于React + TypeScript的智能数学解题系统，集成了DAG（有向无环图）可视化、LaTeX数学公式渲染、AI辅助分析等功能。

## ✨ 主要功能

### 🔥 核心特性
- **📊 DAG可视化解题流程** - 直观展示解题步骤之间的逻辑关系
- **📝 LaTeX数学公式支持** - 完整的数学公式编辑和渲染
- **🤖 AI智能辅助** - 集成多种AI模型进行解题分析
- **📚 版本历史管理** - 完整的解题步骤版本控制
- **🎨 现代化UI设计** - 响应式布局，支持多种主题

### 🛠️ 技术特性
- **实时LaTeX渲染** - 使用KaTeX进行高性能数学公式渲染
- **智能步骤分析** - AI驱动的解题步骤验证和建议
- **多模型支持** - 支持OpenAI、Claude、DeepSeek等多种AI模型
- **版本历史系统** - 完整的解题过程版本管理
- **响应式设计** - 适配桌面端和移动端

## 🚀 快速开始

### 📋 环境要求

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0 或 **yarn** >= 1.22.0
- **现代浏览器** (Chrome 90+, Firefox 88+, Safari 14+)

### 📦 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/Wangxibin123/UI.git
   cd UI
   ```

2. **安装依赖**
   ```bash
   npm install
   # 或使用 yarn
   yarn install
   ```

3. **配置环境变量**
   ```bash
   # 复制环境变量模板
   cp env.template .env
   
   # 编辑 .env 文件，填入您的API密钥
   nano .env
   ```

4. **启动开发服务器**
   ```bash
   npm run dev
   # 或使用 yarn
   yarn dev
   ```

5. **访问应用**
   
   打开浏览器访问 `http://localhost:5173`

### 🔑 API密钥配置

本系统支持多种AI服务提供商，您需要至少配置一个：

#### 主要推荐：OpenRouter (支持多种模型)
1. 访问 [OpenRouter](https://openrouter.ai/)
2. 注册账户并获取API密钥
3. 在 `.env` 文件中设置：
   ```
   VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```

#### 可选配置：
- **OpenAI**: 从 [OpenAI Platform](https://platform.openai.com/api-keys) 获取
- **Claude**: 从 [Anthropic Console](https://console.anthropic.com/) 获取
- **DeepSeek**: 从 [DeepSeek Platform](https://platform.deepseek.com/) 获取

## 📖 使用指南

### 🎯 基本操作

1. **创建数学问题**
   - 在左侧问题区域输入LaTeX格式的数学问题
   - 支持复杂的数学公式和符号

2. **添加解题步骤**
   - 点击"添加步骤"按钮
   - 使用LaTeX语法编写解题过程
   - 系统会自动渲染数学公式

3. **DAG可视化**
   - 查看右侧DAG图了解解题流程
   - 拖拽节点调整布局
   - 点击节点查看详细内容

4. **AI辅助分析**
   - 选择AI模型（GPT-4、Claude等）
   - 获取解题建议和步骤验证
   - 查看AI生成的解题思路

### 🔧 高级功能

#### 版本历史管理
- 每个解题步骤都有完整的版本历史
- 可以回退到任意历史版本
- 支持版本对比和合并

#### LaTeX编辑器
- 实时预览数学公式
- 语法高亮和错误提示
- 常用数学符号快捷插入

#### 多页面管理
- 支持创建多个解题页面
- 每个页面独立的DAG和步骤
- 页面间快速切换

## 🏗️ 项目架构

### 📁 目录结构
```
src/
├── components/          # React组件
│   ├── features/       # 功能组件
│   │   ├── ai/        # AI相关组件
│   │   ├── dag/       # DAG可视化组件
│   │   └── solver/    # 解题相关组件
│   └── layout/        # 布局组件
├── types/              # TypeScript类型定义
├── utils/              # 工具函数
└── styles/             # 样式文件
```

### 🔧 核心技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI组件**: 自定义组件 + CSS Modules
- **数学渲染**: KaTeX
- **图形可视化**: React Flow
- **状态管理**: React Hooks
- **样式方案**: CSS Modules + 响应式设计

## 🎨 功能演示

### LaTeX数学公式渲染
支持复杂的数学公式，如：
- 分数：`\\frac{a}{b}`
- 积分：`\\int_{a}^{b} f(x) dx`
- 矩阵：`\\begin{matrix} a & b \\\\ c & d \\end{matrix}`
- 求和：`\\sum_{i=1}^{n} x_i`

### DAG解题流程
- 可视化展示解题步骤间的逻辑关系
- 支持拖拽调整节点位置
- 实时更新连接关系

### AI智能分析
- 多模型支持（GPT-4、Claude-3、DeepSeek等）
- 解题步骤验证
- 智能建议和优化

## 🔧 开发指南

### 🛠️ 开发环境设置

1. **安装开发依赖**
   ```bash
   npm install --save-dev
   ```

2. **启动开发模式**
   ```bash
   npm run dev
   ```

3. **代码检查**
   ```bash
   npm run lint
   ```

4. **构建生产版本**
   ```bash
   npm run build
   ```

### 📝 代码规范

- 使用TypeScript进行类型检查
- 遵循ESLint规则
- 组件使用函数式组件 + Hooks
- CSS使用Modules模式

### 🧪 测试

```bash
# 运行测试
npm run test

# 测试覆盖率
npm run test:coverage
```

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

### 🐛 问题报告

如果发现bug或有功能建议，请：
1. 检查是否已有相关issue
2. 创建新issue并详细描述问题
3. 提供复现步骤和环境信息

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [React](https://reactjs.org/) - 前端框架
- [TypeScript](https://www.typescriptlang.org/) - 类型系统
- [Vite](https://vitejs.dev/) - 构建工具
- [KaTeX](https://katex.org/) - 数学公式渲染
- [React Flow](https://reactflow.dev/) - 图形可视化
- [OpenRouter](https://openrouter.ai/) - AI模型API服务

## 📞 联系方式

- 项目地址: [https://github.com/Wangxibin123/UI](https://github.com/Wangxibin123/UI)
- 问题反馈: [GitHub Issues](https://github.com/Wangxibin123/UI/issues)

---

**🎯 让数学解题变得更智能、更直观！** 