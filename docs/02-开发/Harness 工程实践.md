# Harness 工程实践

> **版本:** V1.1
> **更新时间:** 2026-06-14
> **适用对象:** DevOps 工程师 / 全栈工程师

本文档描述如何将 Harness 工程思想融入哈吉咪养成计划项目，涵盖 CI/CD 流水线、特性开关、持续验证和 GitOps 四大核心模块。

---

## 📁 文件结构

```
PangHu/
├── .harness/
│   └── pipeline.yaml            # Harness CI/CD 流水线配置
├── .github/
│   └── workflows/
│       └── quality-gate.yaml    # GitHub Actions 兜底 CI（与 Harness 双轨并行）
├── k8s/
│   ├── backend.yaml             # 后端 K8s 部署配置（声明式）
│   ├── frontend.yaml            # 前端 K8s 部署配置
│   ├── values.staging.yaml      # Staging 环境 Helm Values
│   ├── values.production.yaml   # Production 环境 Helm Values
│   ├── monitoring/
│   │   ├── prometheus.yaml      # Prometheus ServiceMonitor + PrometheusRule
│   │   └── grafana.yaml         # Grafana 数据源 + Dashboard
│   └── argocd/
│       └── applications.yaml    # ArgoCD GitOps 自动同步配置
└── backend/src/
    ├── config/
    │   └── featureFlags.ts      # 特性开关配置（Feature Flags）
    └── agent/
        └── metrics.ts           # Agent 系统监控指标
```

---

## 🔄 CI/CD 流水线

### 流水线架构

```
代码提交 → 质量门禁 → 测试 → 构建 → Staging 部署 → E2E → 持续验证 → 生产部署
  │         │          │      │        │          │        │           │
  │         ↓          ↓      ↓        ↓          ↓        ↓           ↓
  │     类型检查    单元测试  镜像构建  Helm部署  冒烟测试  Prometheus  审批 + 蓝绿
  │     Lint检查   API测试             ArgoCD   Playwright  自动回滚
  │                                                  E2E测试
  ↓
 PR/Merge → 触发器自动执行
```

### 流水线阶段说明

| 阶段 | 类型 | 说明 | 失败策略 |
|------|------|------|---------|
| Code Quality Gate | CI | 类型检查、Lint 扫描 | **ABORT**（阻塞部署） |
| Unit Tests | CI | 前端/后端 Vitest 单元测试 | **ABORT** |
| API Integration Tests | CI | API 集成测试、Agent 专项测试 | api-tests: MARK_SUCCESS / agent-tests: **ABORT** |
| Build Artifacts | CI | 构建 Docker 镜像 / 前端产物 | **ABORT** |
| Deploy Staging | CD | Helm 部署到 Staging 环境 | **AUTO_ROLLBACK** |
| E2E Smoke Tests | CI | Playwright E2E 测试 | MARK_SUCCESS |
| Continuous Verification | CD | Prometheus 阈值告警 → 自动回滚 | **AUTO_ROLLBACK** |
| Deploy Production | CD | 生产环境滚动更新，需审批 | MANUAL_APPROVAL |

### 本地触发流水线

```bash
# 安装 Harness CLI（可选，也可直接在 Harness 平台配置）
# https://developer.harness.io/docs/first-gen/continuous-delivery/harness-cli

# 本地模拟流水线运行
cd frontend && npm run typecheck && npm run lint && npm run build
cd ../backend && npx tsc --noEmit && npm run build

# 运行测试
npx vitest run --config vitest.config.ts
npx vitest run --config vitest.backend.config.ts
```

### 配置触发器

```yaml
# .harness/pipeline.yaml 中的触发器配置
triggers:
  # PR 触发：自动执行质量门禁
  - name: pr-quality-gate
    type: PR_TRIGGER
    condition:
      branch: "^(feat|fix|chore|docs|refactor)/.*$"

  # main 分支触发：自动部署 Staging
  - name: main-deploy-trigger
    type: WEBHOOK
    condition:
      branch: "^(main|master)$"
```

---

## 🚩 特性开关（Feature Flags）

### 核心理念

特性开关实现了**代码与发布的解耦**，使功能可以随时开启/关闭，无需重新部署。结合 Harness Feature Flags，可支持：

- **灰度发布**：从 0% → 10% → 50% → 100% 逐步放量
- **A/B 测试**：不同用户分组看到不同功能
- **热修复**：紧急关闭有问题的功能
- **环境隔离**：开发环境开启实验性功能，生产环境稳定运行

### Agent 系统开关清单

| 开关 Key | 默认 | 说明 | 依赖 |
|---------|------|------|------|
| `AGENT_MODE` | ✅ | Agent 智能模式总开关 | — |
| `AGENT_STREAMING` | ✅ | 流式输出（打字机效果） | AGENT_MODE |
| `AGENT_TOOL_VISUALIZATION` | ✅ | 工具调用进度条 UI | AGENT_MODE |
| `AGENT_CONTEXT_MEMORY` | ✅ | 对话上下文记忆 | AGENT_MODE |
| `HEALTH_ASSESSMENT_CARD` | ✅ | 健康评估结构化卡片 | AGENT_MODE + TOOL_VIS |
| `WEIGHT_TREND_CARD` | ✅ | 体重趋势结构化卡片 | AGENT_MODE + TOOL_VIS |
| `VACCINE_STATUS_CARD` | ✅ | 疫苗状态结构化卡片 | AGENT_MODE + TOOL_VIS |
| `RAG_SEARCH` | ✅ | RAG 知识库检索 | — |
| `CITATIONS_DISPLAY` | ✅ | 引用来源展示 | RAG_SEARCH |
| `MULTI_CAT_COMPARISON` | ❌ | 多猫咪对比（灰度中） | — |
| `SUGGESTED_QUESTIONS` | ✅ | 预设问题快捷入口 | — |
| `SMART_SUGGESTIONS` | ✅ | 上下文智能建议芯片 | — |
| `PROACTIVE_HEALTH_ALERTS` | ❌ | 主动健康提醒（灰度中） | — |
| `AGENT_COT_DISPLAY` | ❌ | 推理过程展示（实验性） | AGENT_MODE |

### 使用方式

```typescript
import {
  isFeatureEnabled,
  getDefaultContext,
  evaluateAllFlags,
} from '@/config/featureFlags'

// 1. 基础用法
const context = getDefaultContext(userId, 'all')
if (isFeatureEnabled('AGENT_MODE', context)) {
  // Agent 模式逻辑
}

// 2. 批量检查（渲染 UI 开关）
const allFlags = evaluateAllFlags(context)
// 前端根据 allFlags 动态渲染功能区域

// 3. 生产热更新（通过 K8s ConfigMap 覆盖）
// 编辑 k8s/argocd/applications.yaml 中的 feature-flags.json
// ArgoCD 自动同步 → 无需重新部署
```

### 灰度发布示例

```typescript
// 逐步将 AGENT_MODE 放开给 30% 的用户
const rollout = {
  percentage: 30,          // 30% 用户
  userSegment: 'all',      // 所有用户群体
  environment: {
    development: true,      // 开发环境 100% 开放
    staging: true,          // Staging 环境 100% 开放
    production: true,       // 生产环境按百分比灰度
  },
}
```

### 与 Harness 集成

在 Harness 平台配置 Feature Flags 服务：

1. **创建 Flags**：在 Harness FF 控制台创建上述开关
2. **配置 Targeting Rules**：设置用户分组和百分比灰度
3. **SDK 集成**：使用 `@harnessio/ff-nodejs-server-sdk` 替换本地实现

```typescript
// 可选：升级为 Harness Feature Flags SDK
import { initialize, getValue } from '@harnessio/ff-nodejs-server-sdk'

const cf = await initialize({ apiKey: process.env.HARNESS_SDK_KEY })

// 替换本地 isFeatureEnabled 调用
const enabled = await cf.booleanValue('AGENT_MODE', userContext, false)
```

---

## 📊 持续验证（Continuous Verification）

### 监控指标体系

Agent 系统定义了以下关键指标（Prometheus 格式）：

| 指标名称 | 类型 | 说明 | 告警阈值 |
|---------|------|------|---------|
| `panghu_agent_requests_total` | Counter | 请求总数 | — |
| `panghu_agent_request_duration_seconds` | Histogram | P99 响应时间（P50/P90/P99 预计算） | Warning: 3s, Critical: 10s |
| `panghu_agent_first_token_latency_seconds` | Histogram | 首 Token 延迟（流式体验关键指标） | Warning: 1s, Critical: 3s |
| `panghu_agent_tool_calls_total` | Counter | 工具调用次数 | — |
| `panghu_agent_tool_success_rate` | Gauge | 工具成功率 | Warning: 95%, Critical: 90% |
| `panghu_agent_tool_duration_seconds` | Histogram | 工具执行耗时 | Warning: 2s, Critical: 5s |
| `panghu_agent_tool_timeout_total` | Counter | 工具调用超时次数 | Warning: > 5/min |
| `panghu_agent_planning_duration_seconds` | Histogram | Agent 规划生成耗时 | Warning: 0.5s, Critical: 1s |
| `panghu_agent_intent_confidence` | Gauge | 意图分类置信度 | Warning: 70%, Critical: 50% |
| `panghu_llm_tokens_used_total` | Counter | Token 消耗量 | — |
| `panghu_llm_response_duration_seconds` | Histogram | LLM 响应耗时 | Warning: 5s, Critical: 15s |
| `panghu_rag_relevance_score` | Gauge | RAG 检索相关性评分 | Warning: 0.6, Critical: 0.4 |

### 自动回滚策略

```
部署新版本
    ↓
持续验证监控（5分钟窗口）
    │
    ├─→ Agent 错误率 > 5%? ──→ AUTO_ROLLBACK（立即回滚）
    │
    ├─→ P99 响应时间 > 10s? ──→ AUTO_ROLLBACK
    │
    └─→ 工具成功率 < 90%? ──→ AUTO_ROLLBACK
```

### Prometheus 告警规则

```yaml
# k8s/backend.yaml 中的 PrometheusRule
rules:
  - alert: AgentToolFailureRate
    expr: |
      sum(rate(panghu_agent_tool_calls_total{status="error"}[5m]))
      /
      sum(rate(panghu_agent_tool_calls_total[5m])) > 0.1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Agent 工具调用失败率超过 10%"

  - alert: AgentHighLatency
    expr: |
      panghu_agent_request_duration_seconds_p99 > 5
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Agent P99 响应时间超过 5 秒"

  - alert: AgentPlanningTimeout
    expr: |
      panghu_agent_planning_duration_seconds_p99 > 1
    for: 3m
    labels:
      severity: warning
    annotations:
      summary: "Agent 规划生成耗时超过 1 秒"

  - alert: AgentLowIntentConfidence
    expr: |
      panghu_agent_intent_confidence < 50
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "意图分类置信度低于 50%"
```

> **说明**: 上述 `_p99`、`_p50` 等后缀指标由 `MetricsCollector` 在客户端预计算后以 Gauge 格式输出，非 Prometheus 原生 Histogram bucket。如需原生 Histogram，可接入 `prom-client` 库。 |

### 监控面板（Grafana）

推荐 Grafana Dashboard JSON 配置：

- **Overview Dashboard**：请求量、响应时间、错误率一览
- **Agent Tools Dashboard**：各工具调用成功率和耗时对比
- **LLM Cost Dashboard**：Token 消耗量和成本趋势
- **User Satisfaction Dashboard**：用户反馈率和满意度趋势

---

## 🔁 GitOps 部署

### 声明式基础设施

所有 Kubernetes 资源使用 YAML 声明式配置，存储在 Git 仓库中：

```
Git Repository
  │
  ├── k8s/backend.yaml          # 后端完整部署配置
  ├── k8s/frontend.yaml         # 前端部署配置
  ├── k8s/values.staging.yaml   # Staging 环境参数
  ├── k8s/values.production.yaml # Production 环境参数
  └── k8s/argocd/applications.yaml  # ArgoCD 应用定义
```

### ArgoCD 自动同步流程

```
代码合并到 main 分支
        │
        ↓
CI/CD 流水线执行
  │ 构建 Docker 镜像
  │ 更新 Helm Values（git commit）
        │
        ↓
ArgoCD 检测到 Git 变更
  │ 对比集群状态与 Git 声明
  │ 自动同步差异
        │
        ↓
Kubernetes 集群更新
  │ HPA 自动扩容（基于 Prometheus 指标）
  │ Rolling Update 平滑发布
        │
        ↓
健康检查通过
  └─ 部署完成
```

### 部署命令

```bash
# 手动部署 Staging
helm upgrade --install panghu-staging ./k8s \
  --namespace panghu-staging \
  --create-namespace \
  --values k8s/values.staging.yaml \
  --set git.commitSha=$(git rev-parse HEAD) \
  --set build.id=$BUILD_ID

# 手动回滚
helm rollback panghu-staging 1 --namespace panghu-staging

# 查看部署状态
kubectl get all -n panghu-staging
kubectl rollout status deployment/panghu-backend -n panghu-staging
```

---

## 🎯 推荐接入策略

### 分阶段实施路线

考虑到项目成本和技术风险，建议按以下优先级分阶段接入：

| 阶段 | 模块 | 接入方式 | 收益 | 风险 |
| ------ | ------ | --------- | ------ | ------ |
| **Phase 1** | Feature Flags | 本地实现 → Harness FF SDK | 灰度发布、A/B 测试 | ⬇ 低 |
| **Phase 2** | CI/CD 质量门禁 | GitHub Actions（快速） + Harness（全量） | 双轨兜底，快速反馈 | ⬇ 低 |
| **Phase 3** | GitOps + Prometheus 基建 | ArgoCD + k8s/monitoring/ | 声明式部署 + 指标采集 | ⬇ 中 |
| **Phase 4** | Harness CD 部署 | 接入 Harness CD 流水线 | 完整的部署编排 + 自动回滚 | ⬇ 中 |
| **Phase 5** | Continuous Verification | Grafana Alerting → Harness CV | 智能告警 + 自动化验证 | ⬆ 高 |

> **建议**: 个人/小团队可停留在 Phase 2-3，用 GitHub Actions + ArgoCD + Grafana 搭建低成本 DevOps 栈。Harness 全量流水线在团队扩张后按需启用。

### 双轨 CI 策略

项目同时维护两套 CI 系统，互为兜底：

```text
PR 提交
  │
  ├──→ GitHub Actions (质量门禁:类型检查+Lint+UT) ←── 3min 内快速反馈
  │     └── PR Check 必须通过，否则禁止合并
  │
  └──→ Harness CI/CD (全量流水线) ←── 包含部署、E2E、CV
        └── main 合并后自动触发
```

- **GitHub Actions**: 轻量级，仅运行质量门禁（类型检查 + Lint + 单元测试），3 分钟内给出反馈
- **Harness**: 全量流水线，包含构建、部署、E2E 测试、持续验证
- **兜底机制**: GitHub Actions 质量门禁作为 PR 合并的必要条件，即使 Harness 服务不可用也能保证代码质量

### 监控基础设施

持续验证依赖 Prometheus 指标采集，在启用 CV 前需先部署监控栈：

```bash
# 1. 安装 Prometheus Operator（kube-prometheus-stack）
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace

# 2. 部署 Agent 监控配置
kubectl apply -f k8s/monitoring/prometheus.yaml

# 3. 部署 Grafana Dashboard
kubectl apply -f k8s/monitoring/grafana.yaml
```

---

## 🔐 安全扫描集成

流水线集成了以下安全扫描：

| 扫描类型 | 工具 | 说明 |
|---------|------|------|
| SAST | Trivy | 静态代码安全扫描 |
| 依赖漏洞 | Trivy | 检测 npm 包漏洞 |
| Docker 镜像 | Trivy | 镜像层漏洞扫描 |
| 制品签名 | Cosign | 镜像和 SBOM 签名 |
| 制品溯源 | SLSA | 软件供应链溯源 |

```yaml
# 流水线中的安全扫描配置
security:
  - name: dependency-scan
    type: TRIVY
    enabled: true
    scanType: LIBRARY
    failOnSeverity: HIGH  # 高危漏洞阻断部署

  - name: image-scan
    type: TRIVY
    enabled: true
    image: "{{ build.image }}"
    failOnSeverity: CRITICAL  # 严重镜像漏洞阻断部署
```

---

## 📝 快速上手

### 1. 配置环境变量

```bash
# 创建 .env.local
cp .env.example .env.local
# 填写以下密钥：
# DATABASE_URL
# JWT_SECRET
# ZHIPUAI_API_KEY
# SLACK_WEBHOOK（可选，用于通知）
```

### 2. 本地运行流水线阶段

```bash
# 阶段 1: 代码质量
cd frontend && npm run typecheck && npm run lint
cd ../backend && npx tsc --noEmit

# 阶段 2: 单元测试
npx vitest run

# 阶段 3: API 测试
npx vitest run --config vitest.api.config.ts

# 阶段 4: 构建
cd frontend && npm run build
cd ../backend && npm run build

# 阶段 5: 本地 K8s 部署（需要 Docker Desktop + K8s）
# 注意: 仅用于本地开发调试。生产环境应使用 ArgoCD 同步（见 GitOps 章节）
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
```

### 3. 添加新特性开关

```typescript
// 1. 在 backend/src/config/featureFlags.ts 添加定义
MY_NEW_FEATURE: {
  key: 'MY_NEW_FEATURE',
  enabledByDefault: false,
  description: '新功能描述',
  rollout: {
    environment: { production: false },
    userSegment: 'internal',
    percentage: 100,
  },
}

// 2. 在代码中使用
import { isFeatureEnabled, getDefaultContext } from '@/config/featureFlags'

if (isFeatureEnabled('MY_NEW_FEATURE', getDefaultContext(userId))) {
  // 新功能逻辑
}

// 3. 通过 K8s ConfigMap 热更新
kubectl patch configmap panghu-feature-flags -n panghu \
  -p '{"data":{"MY_NEW_FEATURE":"true"}}'
```

### 4. 添加新监控指标

```typescript
import { agentMetrics } from '@/agent/metrics'

// 记录指标
agentMetrics.incrementCounter('agent_requests_total', {
  intent: 'greeting',
  status: 'success',
  environment: 'production',
})

// Prometheus 格式输出（GET /api/metrics）
const prometheusOutput = agentMetrics.toPrometheusFormat()
```

---

## 🔗 相关文档

- [AI Agent 系统设计.md](./核心功能/AI%20Agent%20系统设计.md) - Agent 架构设计
- [AI Agent 开发指南.md](./AI%20Agent%20开发指南.md) - Agent 开发实现
- [部署指南.md](./部署指南.md) - 传统部署文档

---

## 🔄 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| V1.0 | 2026-06-14 | 初始版本：CI/CD + Feature Flags + CV + GitOps  |
| V1.1 | 2026-06-14 | 修复指标前缀一致性、补齐缺失开关和指标、修正 PrometheusRule、补全 SAST 配置 |

---

_Harness 工程实践文档最后更新：2026-06-14_
