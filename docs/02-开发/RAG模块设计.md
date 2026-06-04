以下是《哈吉咪养成计划》RAG 模块的概要设计文档：

---

# 哈吉咪养成计划 - RAG 模块概要设计

## 1. 架构概览

RAG 模块将作为独立的服务层（Service Layer）集成到现有的 Express 后端中。整体系统分为两个核心工作流：**离线知识处理流（Data Ingestion）** 和 **在线检索增强流（Online Retrieval & Generation）**。

## 2. 核心模块划分与职责

### 2.1 离线知识处理模块 (Knowledge Ingestion)

负责将现有的 Markdown 指南转化为系统可检索的向量数据。

* **文档加载与切分 (Document Loader & Splitter)**：将《养护指南》按 Markdown 的标题层级（H2/H3）或语义段落进行切块（Chunking），确保每个片段保持完整的上下文语义。
* **向量化 (Embedding)**：调用智谱 AI 的 `embedding-3` 接口，将文本片段转化为高维向量。
* **持久化 (Storage)**：将向量数据、原始文本片段以及关联的元数据（如 `guideId`, `category`, `ageStage`）存入向量数据库中，建立语义模型与原始数据源的关联。

### 2.2 任务编排与检索模块 (Orchestration & Retrieval)

负责处理用户的实时提问，是连接大模型与本地数据的桥梁。

* **意图解析 (Intent Parsing)**：在用户提问时，先通过一个轻量级的 LLM 调用（或本地规则引擎），解析出提问中的实体参数（例如：提取出 `ageStage: 幼猫期`, `topic: 疫苗`）。
* **混合检索 (Hybrid Search)**：
* 将用户的原问题进行 Embedding 向量化。
* **核心动作**：利用上一步解析出的参数构建查询模板，在数据库中执行**向量相似度计算 + 元数据过滤（Metadata Filtering）** 的联合查询。


* **上下文重排 (Reranking/Limiting)**：对召回的 Chunk 根据相似度得分进行排序，截取 Top-K（如前 3 条）作为有效上下文。

### 2.3 模板生成模块 (Template Generation)

负责标准化 Prompt 的构建。

* **Prompt 组装**：提供特定的模板接口，将检索到的 Top-K 知识切片、系统人设（喵喵医生）以及用户的历史对话上下文进行结构化拼接。
* **流式输出 (Stream Output)**：将组装好的 Prompt 发送给智谱 `glm-4-flash`，并将生成的回复通过现有的 SSE（Server-Sent Events）接口流式推送到前端。

## 3. 数据库模型设计 (Data Model)

为了支持上述查询逻辑，建议将底层的 SQLite 升级为 PostgreSQL，并启用 `pgvector` 扩展。这样可以复用现有的 Prisma ORM 体系，同时实现高效的向量检索。

```prisma
// schema.prisma (PostgreSQL 环境)

// 知识片段切块表
model GuideChunk {
  id          String   @id @default(cuid())
  guideId     String   // 关联原指南，方便前端回溯溯源
  guide       Guide    @relation(fields: [guideId], references: [id], onDelete: Cascade)
  
  content     String   // 切分后的纯文本内容
  chunkIndex  Int      // 块在原文档中的顺序索引
  
  // 元数据过滤维度 (用于意图解析后的精准过滤)
  category    String   // 例如: "健康医疗", "喂养营养"
  ageStage    String?  // 例如: "幼猫期", "成年期"

  // 向量字段
  embedding   Unsupported("vector(2048)")?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([guideId])
  // 建议在数据库层面为 embedding 字段建立 HNSW 或 IVFFlat 索引以提升检索效率
}

```

## 4. API 与交互设计更新

为了实现前端引文高亮和跳转，现有的聊天接口需要扩展返回结构。

**修改 `POST /api/chat/messages` 流式响应结束事件：**

当 LLM 生成完毕后，在 `message_done` 事件中附加此次生成所使用的参考指南源数据，以便前端建立数据源关联大屏或引用卡片。

```json
event: message_done
data: {
  "model": "glm-4-flash",
  "latency": 1234,
  "citations": [
    {
      "guideId": "guide_123",
      "title": "幼猫疫苗接种计划",
      "similarity": 0.89
    }
  ]
}

```

## 5. 实施步骤规划

1. **基础设施准备**：搭建 PostgreSQL + pgvector 数据库环境，更新 Prisma 配置并完成 Schema 迁移。
2. **数据清洗与入库**：编写 Node.js 脚本（独立于主服务），读取现有指南，调用大模型接口完成向量化并写入数据库。
3. **核心服务重构**：在 `ai.service.ts` 中引入任务编排逻辑，增加意图解析和组装 Prompt 模板的流程；在 `knowledge.service.ts` 中实现基于 Prisma 的向量检索 SQL。
4. **前端适配**：在 `ChatMessage.vue` 中解析 `citations` 数据，渲染“参考来源”的 UI 组件。
