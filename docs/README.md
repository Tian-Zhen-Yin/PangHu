# PangHu / 哈吉咪养成计划 · 文档中心

> 更新：2026-09-11（refactor/project-cleanup 全仓重构时重整）

## 目录结构

```
docs/
├── 01-产品/        PRD、产品手册、DesignToken、陪玩 PRD、产品演示、参赛文稿、历史版本
├── 02-开发/        开发文档、快速开始、技术架构、API 文档、数据模型、部署指南、
│                   AI Agent 开发指南、AI 协作工作流、Code-Wiki、核心功能、历史版本
├── 03-设计/        UI 规范、品牌手册、后台管理系统设计方案与 UE-UX 规范、截图指南
├── 04-复盘/        feature 收尾复盘（模板见 _template.md，RETRO 节奏见 AGENTS.md）
├── 05-计划/        按日期命名的 feature 计划（*-plan.md）
├── 06-规范/        按日期命名的设计规范（*-design.md）、UI 约束
├── 07-记录/        开发过程记录、成长记录、UI-UX 优化记录
├── 08-其他/        养猫小指南等杂项
│   └── archive/    历史归档：表情包生成时代（Python/通义万相）、k8s 部署方案（已弃用）
└── images/         产品截图
```

## 阅读入口

- **新成员上手**：`02-开发/快速开始.md` → `02-开发/技术架构.md` → `01-产品/产品手册.md`
- **AI 协作**：根目录 `AGENTS.md`（唯一契约真源）+ `02-开发/PangHu-AI协作工作流设计.md`
- **部署**：`02-开发/部署指南.md`；Mac Mini 自部署见 `scripts/mac-mini/README.md`

## 维护约定

- 计划/规范文档按 `YYYY-MM-DD-<topic>-plan.md` / `-design.md` 命名，分别进 05/06
- feature 收尾必须写复盘进 `04-复盘/`（AGENTS.md 复盘节奏）
- 代码结构相关文档（技术架构、Code-Wiki）在重构后需同步更新
