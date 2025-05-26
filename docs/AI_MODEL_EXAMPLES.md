# AI模型调用示例文档

本文档包含了所有支持的AI模型的调用示例，包括Python和TypeScript/JavaScript版本。

## 🔧 环境配置

### 环境变量设置

在项目根目录创建 `.env` 文件：

```bash
# OpenRouter API Key - 主要推荐使用的API key
VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here

# OpenAI API Key - 直接调用OpenAI服务时使用
VITE_OPENAI_API_KEY=your_openai_api_key_here

# Claude API Key - 直接调用Anthropic服务时使用  
VITE_CLAUDE_API_KEY=your_claude_api_key_here

# DeepSeek API Key - 直接调用DeepSeek服务时使用
VITE_DEEPSEEK_API_KEY=your_deepseek_api_key_here

# 网站信息 - 用于OpenRouter排名统计
VITE_SITE_URL=http://localhost:5173
VITE_SITE_NAME=AI解题助手
```

## 🤖 DeepSeek 系列模型

### 1. DeepSeek Chat V3

**Python 示例:**
```python
from openai import OpenAI

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key="<OPENROUTER_API_KEY>",
)

completion = client.chat.completions.create(
  extra_headers={
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>",
  },
  extra_body={},
  model="deepseek/deepseek-chat-v3-0324",
  messages=[
    {
      "role": "user",
      "content": "What is the meaning of life?"
    }
  ]
)
print(completion.choices[0].message.content)
```

**TypeScript 示例:**
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "<OPENROUTER_API_KEY>",
  defaultHeaders: {
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>",
  },
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: "deepseek/deepseek-chat-v3-0324",
    messages: [
      {
        "role": "user",
        "content": "What is the meaning of life?"
      }
    ],
  });

  console.log(completion.choices[0].message);
}

main();
```

### 2. DeepSeek R1

**Python 示例:**
```python
from openai import OpenAI

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key="<OPENROUTER_API_KEY>",
)

completion = client.chat.completions.create(
  extra_headers={
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>",
  },
  extra_body={},
  model="deepseek/deepseek-r1",
  messages=[
    {
      "role": "user",
      "content": "What is the meaning of life?"
    }
  ]
)
print(completion.choices[0].message.content)
```

**TypeScript 示例:**
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "<OPENROUTER_API_KEY>",
  defaultHeaders: {
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>",
  },
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: "deepseek/deepseek-r1",
    messages: [
      {
        "role": "user",
        "content": "What is the meaning of life?"
      }
    ],
  });

  console.log(completion.choices[0].message);
}

main();
```

### 3. DeepSeek Prover V2

**Python 示例:**
```python
from openai import OpenAI

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key="<OPENROUTER_API_KEY>",
)

completion = client.chat.completions.create(
  extra_headers={
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>",
  },
  extra_body={},
  model="deepseek/deepseek-prover-v2",
  messages=[
    {
      "role": "user",
      "content": "What is the meaning of life?"
    }
  ]
)
print(completion.choices[0].message.content)
```

**TypeScript 示例:**
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "<OPENROUTER_API_KEY>",
  defaultHeaders: {
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>",
  },
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: "deepseek/deepseek-prover-v2",
    messages: [
      {
        "role": "user",
        "content": "What is the meaning of life?"
      }
    ],
  });

  console.log(completion.choices[0].message);
}

main();
```

## 🧠 OpenAI 系列模型

### 1. GPT-4.1 (支持图像)

**Python 示例:**
```python
from openai import OpenAI

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key="<OPENROUTER_API_KEY>",
)

completion = client.chat.completions.create(
  extra_headers={
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>",
  },
  extra_body={},
  model="openai/gpt-4.1",
  messages=[
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "What is in this image?"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
          }
        }
      ]
    }
  ]
)
print(completion.choices[0].message.content)
```

**TypeScript 示例:**
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "<OPENROUTER_API_KEY>",
  defaultHeaders: {
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>",
  },
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: "openai/gpt-4.1",
    messages: [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "What is in this image?"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
            }
          }
        ]
      }
    ],
  });

  console.log(completion.choices[0].message);
}

main();
```

### 2. GPT-4.5 Preview (支持图像)

**Python 示例:**
```python
from openai import OpenAI

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key="<OPENROUTER_API_KEY>",
)

completion = client.chat.completions.create(
  extra_headers={
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>",
  },
  extra_body={},
  model="openai/gpt-4.5-preview",
  messages=[
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "What is in this image?"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
          }
        }
      ]
    }
  ]
)
print(completion.choices[0].message.content)
```

**TypeScript 示例:**
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "<OPENROUTER_API_KEY>",
  defaultHeaders: {
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>",
  },
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: "openai/gpt-4.5-preview",
    messages: [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "What is in this image?"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
            }
          }
        ]
      }
    ],
  });

  console.log(completion.choices[0].message);
}

main();
```

### 3. OpenAI O3 (使用新的 responses API)

**Python 示例:**
```python
from openai import OpenAI
client = OpenAI()

response = client.responses.create(
    model="o3",
    input=[
        {"role": "user", "content": "what teams are playing in this image?"},
        {
            "role": "user",
            "content": [
                {
                    "type": "input_image",
                    "image_url": "https://upload.wikimedia.org/wikipedia/commons/3/3b/LeBron_James_Layup_%28Cleveland_vs_Brooklyn_2018%29.jpg"
                }
            ]
        }
    ]
)

print(response.output_text)
```

**TypeScript 示例:**
```typescript
import OpenAI from "openai";
const client = new OpenAI();

const response = await client.responses.create({
    model: "o3",
    input: [
        { role: "user", content: "What two teams are playing in this photo?" },
        {
            role: "user",
            content: [
                {
                    type: "input_image", 
                    image_url: "https://upload.wikimedia.org/wikipedia/commons/3/3b/LeBron_James_Layup_%28Cleveland_vs_Brooklyn_2018%29.jpg",
                }
            ],
        },
    ],
});

console.log(response.output_text);
```

**O3 流式调用示例:**

**Python:**
```python
from openai import OpenAI
client = OpenAI()

stream = client.responses.create(
    model="o3",
    input=[
        {
            "role": "user",
            "content": "Say 'double bubble bath' ten times fast.",
        },
    ],
    stream=True,
)

for event in stream:
    print(event)
```

**TypeScript:**
```typescript
import { OpenAI } from "openai";
const client = new OpenAI();

const stream = await client.responses.create({
    model: "o3",
    input: [
        {
            role: "user",
            content: "Say 'double bubble bath' ten times fast.",
        },
    ],
    stream: true,
});

for await (const event of stream) {
    console.log(event);
}
```

**O3 工具调用示例:**

**Python:**
```python
from openai import OpenAI
client = OpenAI()

response = client.responses.create(
    model="o3",
    tools=[{"type": "web_search_preview"}],
    input="What was a positive news story from today?"
)

print(response.output_text)
```

**TypeScript:**
```typescript
import OpenAI from "openai";
const client = new OpenAI();

const response = await client.responses.create({
    model: "o3",
    tools: [ { type: "web_search_preview" } ],
    input: "What was a positive news story from today?",
});

console.log(response.output_text);
```

## 🎭 Anthropic Claude 系列模型

### 1. Claude Opus 4 (支持图像)

**Python 示例:**
```python
from openai import OpenAI

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key="<OPENROUTER_API_KEY>",
)

completion = client.chat.completions.create(
  extra_headers={
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>",
  },
  extra_body={},
  model="anthropic/claude-opus-4",
  messages=[
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "What is in this image?"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
          }
        }
      ]
    }
  ]
)
print(completion.choices[0].message.content)
```

**TypeScript 示例:**
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "<OPENROUTER_API_KEY>",
  defaultHeaders: {
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>",
  },
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: "anthropic/claude-opus-4",
    messages: [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "What is in this image?"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
            }
          }
        ]
      }
    ],
  });

  console.log(completion.choices[0].message);
}

main();
```

### 2. Claude Sonnet 4 (支持图像)

**Python 示例:**
```python
from openai import OpenAI

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key="<OPENROUTER_API_KEY>",
)

completion = client.chat.completions.create(
  extra_headers={
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>",
  },
  extra_body={},
  model="anthropic/claude-sonnet-4",
  messages=[
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "What is in this image?"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
          }
        }
      ]
    }
  ]
)
print(completion.choices[0].message.content)
```

**TypeScript 示例:**
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "<OPENROUTER_API_KEY>",
  defaultHeaders: {
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>",
  },
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: "anthropic/claude-sonnet-4",
    messages: [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "What is in this image?"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
            }
          }
        ]
      }
    ],
  });

  console.log(completion.choices[0].message);
}

main();
```

### 3. Claude 3.7 Sonnet (Thinking Mode)

**Python 示例:**
```python
from openai import OpenAI

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key="<OPENROUTER_API_KEY>",
)

completion = client.chat.completions.create(
  extra_headers={
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>",
  },
  extra_body={},
  model="anthropic/claude-3.7-sonnet:thinking",
  messages=[
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "What is in this image?"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
          }
        }
      ]
    }
  ]
)
print(completion.choices[0].message.content)
```

**TypeScript 示例:**
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "<OPENROUTER_API_KEY>",
  defaultHeaders: {
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>",
  },
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: "anthropic/claude-3.7-sonnet:thinking",
    messages: [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "What is in this image?"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
            }
          }
        ]
      }
    ],
  });

  console.log(completion.choices[0].message);
}

main();
```

## 🔍 Google Gemini 系列模型

### 1. Gemini 2.5 Flash Preview (支持图像)

**Python 示例:**
```python
from openai import OpenAI

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key="<OPENROUTER_API_KEY>",
)

completion = client.chat.completions.create(
  extra_headers={
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>",
  },
  extra_body={},
  model="google/gemini-2.5-flash-preview-05-20",
  messages=[
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "What is in this image?"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
          }
        }
      ]
    }
  ]
)
print(completion.choices[0].message.content)
```

**TypeScript 示例:**
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "<OPENROUTER_API_KEY>",
  defaultHeaders: {
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>",
  },
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: "google/gemini-2.5-flash-preview-05-20",
    messages: [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "What is in this image?"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
            }
          }
        ]
      }
    ],
  });

  console.log(completion.choices[0].message);
}

main();
```

### 2. Gemini 2.5 Flash (Thinking Mode)

**Python 示例:**
```python
from openai import OpenAI

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key="<OPENROUTER_API_KEY>",
)

completion = client.chat.completions.create(
  extra_headers={
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>",
  },
  extra_body={},
  model="google/gemini-2.5-flash-preview-05-20:thinking",
  messages=[
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "What is in this image?"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
          }
        }
      ]
    }
  ]
)
print(completion.choices[0].message.content)
```

**TypeScript 示例:**
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "<OPENROUTER_API_KEY>",
  defaultHeaders: {
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>",
  },
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: "google/gemini-2.5-flash-preview-05-20:thinking",
    messages: [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "What is in this image?"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
            }
          }
        ]
      }
    ],
  });

  console.log(completion.choices[0].message);
}

main();
```

## 🌟 Qwen 系列模型

### 1. Qwen 2.5 VL 32B (支持图像)

**Python 示例:**
```python
from openai import OpenAI

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key="<OPENROUTER_API_KEY>",
)

completion = client.chat.completions.create(
  extra_headers={
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>",
  },
  extra_body={},
  model="qwen/qwen2.5-vl-32b-instruct",
  messages=[
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "What is in this image?"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
          }
        }
      ]
    }
  ]
)
print(completion.choices[0].message.content)
```

**TypeScript 示例:**
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "<OPENROUTER_API_KEY>",
  defaultHeaders: {
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>",
  },
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: "qwen/qwen2.5-vl-32b-instruct",
    messages: [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "What is in this image?"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
            }
          }
        ]
      }
    ],
  });

  console.log(completion.choices[0].message);
}

main();
```

### 2. Qwen 2.5 VL 72B (支持图像)

**Python 示例:**
```python
from openai import OpenAI

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key="<OPENROUTER_API_KEY>",
)

completion = client.chat.completions.create(
  extra_headers={
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>",
  },
  extra_body={},
  model="qwen/qwen2.5-vl-72b-instruct",
  messages=[
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "What is in this image?"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
          }
        }
      ]
    }
  ]
)
print(completion.choices[0].message.content)
```

**TypeScript 示例:**
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "<OPENROUTER_API_KEY>",
  defaultHeaders: {
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>",
  },
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: "qwen/qwen2.5-vl-72b-instruct",
    messages: [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "What is in this image?"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
            }
          }
        ]
      }
    ],
  });

  console.log(completion.choices[0].message);
}

main();
```

### 3. Qwen 3 235B

**Python 示例:**
```python
from openai import OpenAI

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key="<OPENROUTER_API_KEY>",
)

completion = client.chat.completions.create(
  extra_headers={
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>",
  },
  extra_body={},
  model="qwen/qwen3-235b-a22b",
  messages=[
    {
      "role": "user",
      "content": "What is the meaning of life?"
    }
  ]
)
print(completion.choices[0].message.content)
```

**TypeScript 示例:**
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "<OPENROUTER_API_KEY>",
  defaultHeaders: {
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>",
  },
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: "qwen/qwen3-235b-a22b",
    messages: [
      {
        "role": "user",
        "content": "What is the meaning of life?"
      }
    ],
  });

  console.log(completion.choices[0].message);
}

main();
```

### 4. Qwen 3 32B

**Python 示例:**
```python
from openai import OpenAI

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key="<OPENROUTER_API_KEY>",
)

completion = client.chat.completions.create(
  extra_headers={
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>",
  },
  extra_body={},
  model="qwen/qwen3-32b",
  messages=[
    {
      "role": "user",
      "content": "What is the meaning of life?"
    }
  ]
)
print(completion.choices[0].message.content)
```

**TypeScript 示例:**
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "<OPENROUTER_API_KEY>",
  defaultHeaders: {
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>",
  },
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: "qwen/qwen3-32b",
    messages: [
      {
        "role": "user",
        "content": "What is the meaning of life?"
      }
    ],
  });

  console.log(completion.choices[0].message);
}

main();
```

## 🔧 项目中的使用方式

在我们的项目中，所有这些模型都通过统一的 `aiModelService` 进行调用：

```typescript
import { aiModelService } from './services/aiModelService';

// 基本调用
const response = await aiModelService.chatCompletion({
  model: 'deepseek-prover-v2', // 使用我们定义的模型ID
  messages: [
    { role: 'system', content: '你是一个数学专家' },
    { role: 'user', content: '解这个方程：x^2 + 5x + 6 = 0' }
  ],
  temperature: 0.7,
  maxTokens: 2000
});

// 流式调用
await aiModelService.streamChatCompletion({
  model: 'claude-sonnet-4',
  messages: [
    { role: 'user', content: '请详细解释这个数学概念' }
  ],
  stream: true
}, (chunk) => {
  console.log('收到流式响应:', chunk);
});

// 获取可用模型
const availableModels = aiModelService.getAvailableModels();
console.log('可用模型:', availableModels);
```

## 📝 注意事项

1. **API Key 安全**: 请确保不要将API Key提交到版本控制系统中
2. **模型可用性**: 某些模型可能需要特定的API Key或有使用限制
3. **图像支持**: 标记为"支持图像"的模型可以处理图像输入
4. **思维模式**: 带有":thinking"后缀的模型会显示推理过程
5. **流式调用**: 适用于需要实时显示响应的场景
6. **工具调用**: O3模型支持工具调用功能，如网络搜索

## 🚀 快速开始

1. 复制 `env.example` 为 `.env`
2. 填入你的API Keys
3. 在项目中使用 `aiModelService` 调用任何支持的模型
4. 享受强大的AI功能！ 