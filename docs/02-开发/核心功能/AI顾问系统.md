# AI 顾问系统

> **功能版本:** V2.0 (RAG增强)
> **更新时间:** 2026-06-04
> **功能状态:** ✅ 已上线

本文档详细描述 AI 顾问系统的实现细节和技术架构。

---

## 📋 功能概述

AI 顾问系统是基于 RAG（检索增强生成）技术的智能问答系统，为用户提供：
- 专业的猫咪养护建议
- 健康问题咨询
- 养护知识查询
- 上下文对话能力

---

## 🎯 功能特性

### 核心功能

| 功能 | 描述 | 状态 |
|------|------|------|
| **智能问答** | 基于知识库的专业回答 | ✅ |
| **流式输出** | 实时显示回答过程 | ✅ |
| **上下文记忆** | 保持对话连续性 | ✅ |
| **知识检索** | RAG 向量检索 | ✅ |
| **引用来源** | 显示参考来源 | ⏳ 规划中 |

### 技术亮点

- 🤖 **智谱 AI GLM-4-flash** - 强大的语言模型
- 📚 **向量检索** - 准确的知识匹配
- ⚡ **流式响应** - 实时输出体验
- 🔐 **上下文增强** - 关联猫咪信息
- 🎯 **意图识别** - 精准理解问题

---

## 🏗️ 系统架构

### 整体架构

```
┌─────────────┐
│  前端界面    │
│  AIChat组件 │
└──────┬──────┘
       │ SSE流式请求
       ↓
┌─────────────┐
│  后端API层  │
│ chat.controller│
└──────┬──────┘
       ↓
┌─────────────┐
│  服务编排层  │
│ rag.service │
└──────┬──────┘
       ↓
┌──────────────────────┐
│                      │
│  ┌────────┐  ┌──────┐│
│  │意图解析│  │向量化 ││
│  └────────┘  └──────┘│
│       ↓           ↓    │
│  ┌────────┐  ┌──────┐│
│  │知识检索│  │LLM  ││
│  └────────┘  └──────┘│
└──────────────────────┘
       ↓
┌─────────────┐
│  知识库     │
│  (Markdown) │
└─────────────┘
```

---

## 🔧 技术实现

### 前端组件

#### AIChat 页面

**文件路径：** `frontend/src/views/AIChat/index.vue`

```vue
<template>
  <div class="ai-chat-page">
    <div class="chat-container">
      <!-- 消息列表 -->
      <div class="messages">
        <div
          v-for="message in messages"
          :key="message.id"
          class="message"
          :class="message.role"
        >
          <div class="message-content">
            {{ message.content }}
            <div v-if="message.citations" class="citations">
              <span
                v-for="(citation, index) in message.citations"
                :key="index"
                class="citation"
              >
                参考: {{ citation.title }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="input-area">
        <textarea
          v-model="inputMessage"
          @keydown.enter.exact="handleSend"
          placeholder="输入您的问题..."
        ></textarea>
        <button @click="handleSend" :disabled="!canSend">
          发送
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()
const inputMessage = ref('')
const canSend = ref(true)

async function handleSend() {
  if (!inputMessage.value.trim() || !canSend.value) return

  const userMessage = inputMessage.value
  inputMessage.value = ''
  canSend.value = false

  // 添加用户消息
  chatStore.addMessage({
    role: 'user',
    content: userMessage
  })

  // 发送到后端
  await chatStore.sendMessage(userMessage)

  canSend.value = true
}
</script>
```

#### Chat Store

**文件路径：** `frontend/src/stores/chat.ts`

```typescript
import { defineStore } from 'pinia'

export const useChatStore = defineStore('chat', () => {
  const messages = ref<Message[]>([])
  const isConnected = ref(false)

  async function sendMessage(content: string) {
    try {
      const eventSource = new EventSource(
        '/api/chat/messages',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ message: content })
        }
      )

      // 处理流式响应
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)

        switch (event.type) {
          case 'message_start':
            // 开始接收消息
            messages.value.push({
              id: Date.now(),
              role: 'assistant',
              content: ''
            })
            break

          case 'message_delta':
            // 追加内容
            const lastMsg = messages.value[messages.value.length - 1]
            lastMsg.content += data.delta.content
            break

          case 'message_done':
            // 消息完成
            const lastMsg = messages.value[messages.value.length - 1]
            lastMsg.citations = data.citations
            eventSource.close()
            break
        }
      }
    } catch (error) {
      console.error('发送消息失败', error)
    }
  }

  return { messages, isConnected, sendMessage }
})
```

### 后端实现

#### 聊天控制器

**文件路径：** `backend/src/controllers/chat.controller.ts`

```typescript
export async function chatMessage(req: Request, res: Response) {
  const { message, catId } = req.body
  const userId = (req as any).user?.userId

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    // 发送开始事件
    res.write(`event: message_start\n`)
    res.write(`data: ${JSON.stringify({ model: 'glm-4-flash' })}\n\n`)

    // 调用 RAG 服务
    const stream = await ragService.streamResponse(
      message,
      userId,
      catId
    )

    // 流式转发 AI 响应
    for await (const chunk of stream) {
      res.write(`event: message_delta\n`)
      res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`)
    }

    // 发送完成事件
    res.write(`event: message_done\n`)
    res.write(`data: ${JSON.stringify({ citations: [] })}\n\n`)
  } catch (error: any) {
    console.error('[Chat] Error:', error)
    res.write(`event: error\n`)
    res.write(`data: ${JSON.stringify({ message: error.message })}\n\n`)
  }
}
```

#### RAG 服务

**文件路径：** `backend/src/services/rag.service.ts`

```typescript
export class RAGService {
  private aiService: AIService
  private embeddingService: EmbeddingService
  private vectorStore: VectorStore

  /**
   * 流式响应生成
   */
  async *streamResponse(
    message: string,
    userId: string,
    catId?: string
  ): AsyncGenerator<string> {
    // 1. 意图解析
    const intent = await this.parseIntent(message)

    // 2. 向量化查询
    const queryVector = await this.embeddingService.embed(message)

    // 3. 检索相关知识
    const relevantDocs = await this.vectorStore.search(
      queryVector,
      intent.filters
    )

    // 4. 构建提示词
    const prompt = this.buildPrompt(message, relevantDocs, catId)

    // 5. 调用 AI（流式）
    const stream = await this.aiService.streamChat(prompt)

    for await (const chunk of stream) {
      yield chunk
    }
  }

  /**
   * 意图解析
   */
  private async parseIntent(message: string): Promise<Intent> {
    // 简单的关键词匹配
    const keywords = {
      vaccine: ['疫苗', '接种', '针'],
      food: ['吃', '粮', '喂'],
      health: ['病', '症状', '不舒服'],
      behavior: ['行为', '性格', '咬']
    }

    for (const [category, words] of Object.entries(keywords)) {
      if (words.some(word => message.includes(word))) {
        return { category, confidence: 0.8 }
      }
    }

    return { category: 'general', confidence: 0.5 }
  }

  /**
   * 构建提示词
   */
  private buildPrompt(
    message: string,
    docs: Document[],
    catId?: string
  ): string {
    let prompt = `你是喵喵医生，一位专业的猫咪养护顾问。`

    // 添加知识库内容
    if (docs.length > 0) {
      prompt += `\n\n参考资料：\n`
      docs.forEach((doc, index) => {
        prompt += `[${index + 1}] ${doc.content}\n`
      })
    }

    // 添加猫咪信息
    if (catId) {
      const cat = await this.getCatInfo(catId)
      prompt += `\n\n猫咪信息：`
      prompt += `\n- 名字：${cat.name}`
      prompt += `\n- 品种：${cat.breed || '未知'}`
      prompt += `\n- 年龄：${cat.ageFormatted}`
    }

    prompt += `\n\n用户问题：${message}`
    prompt += `\n\n请基于以上信息，提供专业、友好的建议。`

    return prompt
  }
}
```

---

## 🔄 数据流程

### 完整对话流程

```
用户输入问题
    ↓
前端发送 POST 请求
    ↓
后端接收请求
    ↓
┌───────────────────┐
│  意图解析          │
│  - 识别关键词       │
│  - 提取参数         │
└────────┬──────────┘
         ↓
┌───────────────────┐
│  向量化查询         │
│  - embedding-3    │
│  - 生成向量         │
└────────┬──────────┘
         ↓
┌───────────────────┐
│  知识检索          │
│  - 向量相似度计算   │
│  - 元数据过滤       │
│  - Top-K 选择       │
└────────┬──────────┘
         ↓
┌───────────────────┐
│  提示词组装         │
│  - 系统人设         │
│  - 知识库内容       │
│  - 猫咪信息         │
└────────┬──────────┘
         ↓
┌───────────────────┐
│  AI 生成            │
│  - 调用 GLM-4     │
│  - 流式输出         │
└────────┬──────────┘
         ↓
    SSE 流式响应
         ↓
前端实时显示
```

---

## 💬 对话示例

### 示例 1：疫苗咨询

```
用户: 幼猫需要打什么疫苗？

喵喵医生: 幼猫需要接种的核心疫苗包括：

1. 猫三联疫苗（FVRCP）
   - 预防：猫瘟、猫鼻支气管炎、猫杯状病毒
   - 时间：6-8周开始，每3-4周一次，共3次

2. 狂犬疫苗
   - 预防：狂犬病
   - 时间：12周以上，每1-3年一次

建议您到附近的宠物医院咨询具体的疫苗接种计划。
```

### 示例 2：健康问题

```
用户: 猫咪不爱吃东西怎么办？

喵喵医生: 猫咪食欲不振可能有多种原因：

1. 环境因素
   - 食盆位置不合适
   - 食物不新鲜
   - 压力过大

2. 健康问题
   - 口腔问题
   - 消化系统疾病
   - 应激反应

建议：
- 检查食盆和食物
- 观察其他症状
- 如持续超过24小时，建议就医
```

---

## 🔧 API 接口

### 发送消息

```http
POST /api/chat/messages
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体：**

```json
{
  "message": "幼猫需要打什么疫苗？",
  "catId": "cat_123"
}
```

**响应（流式）：**

```
event: message_start
data: {"model": "glm-4-flash"}

event: message_delta
data: {"delta": {"content": "幼猫需要"}}

event: message_delta
data: {"delta": {"content": "接种核心"}}

event: message_done
data: {"citations": [...]}
```

---

## 📚 知识库

### 知识来源

- 幼猫养护指南（Markdown 格式）
- 品种标准数据
- 常见健康问题解答
- 用户使用手册

### 知识组织

```
知识库/
├── 基础养护/
│   ├── 幼猫护理.md
│   ├── 成猫喂养.md
│   └── 老年关怀.md
├── 健康管理/
│   ├── 疫苗接种.md
│   ├── 常见疾病.md
│   └── 急救处理.md
├── 行为问题/
│   ├── 咬人行为.md
│   ├── 应激反应.md
│   └── 社训技巧.md
└── 营养指南/
    ├── 食物选择.md
    ├── 喂养技巧.md
    └── 营养禁忌.md
```

---

## 🐛 常见问题

### 问题 1：响应慢

**可能原因：**
- 知识库过大
- 网络延迟
- AI 服务限流

**解决方案：**
- 优化检索算法
- 增加缓存机制
- 使用更快的 embedding 模型

### 问题 2：回答不准确

**可能原因：**
- 检索内容不相关
- 提示词不够明确
- 知识库覆盖不全

**解决方案：**
- 优化检索策略
- 改进提示词设计
- 扩充知识库内容

### 问题 3：SSE 连接断开

**可能原因：**
- 网络不稳定
- 服务器超时
- Token 过期

**解决方案：**
- 实现自动重连
- 增加心跳机制
- 优化超时设置

---

## 💡 最佳实践

### 提问技巧

1. **明确具体**
   - ✅ "3个月大的幼猫需要打什么疫苗？"
   - ❌ "猫要打疫苗吗？"

2. **提供上下文**
   - ✅ "我的猫咪是英短，3个月大，最近不爱吃东西"
   - ❌ "猫咪病了怎么办？"

3. **相关问题**
   - 询问症状细节
   - 提供年龄信息
   - 说明最近情况

### 使用建议

1. **咨询健康问题**
   - 先观察症状
   - 记录详细信息
   - 严重时及时就医

2. **养护建议**
   - 结合实际情况
   - 考虑猫咪个性
   - 循序渐进改变

---

## 📝 相关文档

- [RAG模块设计](../RAG模块设计.md) - 系统架构设计
- [API文档](../API文档.md) - 接口说明
- [技术架构](../技术架构.md) - 整体架构

---

## 🔄 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| V2.0 | 2026-02-20 | RAG 增强版上线 |
| V4.0 | 2026-06-04 | 文档更新，补充实现细节 |

---

_AI 顾问系统文档最后更新：2026-06-04_
