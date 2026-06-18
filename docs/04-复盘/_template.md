# <Feature 名称> Retro

> 复制本文件为 `<feature-name>-retro.md` 后填实。模板来源：[docs/02-开发/PangHu-AI协作工作流设计.md](../02-开发/PangHu-AI协作工作流设计.md) §7。

**日期**：YYYY-MM-DD
**分支**：`feat/<name>-*` → `master`
**耗时**：X 小时（含 review）
**主要协作者**：人 + LLM session 数

---

## 一、Sprint 设置

- **拆分的子分支**：
  - `feat/<name>-data`
  - `feat/<name>-services`
  - `feat/<name>-agent-tools`
  - `feat/<name>-api`
  - `feat/<name>-frontend`
- **LLM 角色分工**：工人 session X 个 / review session X 个
- **隔离方式**：git worktree（X 个）/ 单分支顺序
- **关键 Branch Contracts（摘自当时 CLAUDE.md）**：
  - 禁止改动清单的豁免项：
  - 合并顺序：

## 二、最终结果

- **测试结果**：backend unit X passed / Y failed；api X passed / Y failed；frontend typecheck ✓/✗
- **merge graph**（`git log --oneline --graph -10` 摘要）：
  ```
  <贴 git log 摘要>
  ```
- **是否触发回滚**：否 / 是（描述）

## 三、What Worked（≤5 条，含 LLM 协作的具体瞬间）

1.
2.
3.
4.
5.

## 四、What Hurt（≤5 条，按痛感排序）

1.
2.
3.
4.
5.

## 五、合并冲突案例集

| 文件 | 冲突类型 | 处理 |
| ---- | -------- | ---- |
|      |          |      |

> 冲突类型参考设计文档 §6.1 五类典型：.gitignore add/add、依赖列表合并、同 bug 双修、测试接口变更、内部 API 失效。

## 六、Numbers

- 总 commits：
- 新增 / 删除行：
- 测试新增条数：
- supervisor must-fix 数 / 采纳数：
- **LLM 越界尝试次数 / 被 hook 拦下次数 / 漏网次数**：
- **越界类型 Top 3**（如：擅改 schema、动 routes/index.ts、自加 npm 依赖）：

## 七、Action Items（≤3 条；重复出现 2 次以上的反哺回 CLAUDE.md）

- [ ]
- [ ]
- [ ]

---

## 复盘检查清单（提交前自检）

- [ ] 三段（设置/结果/Worked/Hurt）都填了，不留空
- [ ] 冲突案例表至少 1 行（即使是 "无冲突，因为 X"）
- [ ] Numbers 段填实数（用 `git diff --stat master..<branch>` / `git rev-list --count` 取数）
- [ ] Action Items ≤3 条，每条可执行、有 owner
- [ ] 任何重复 2 次以上的 Action Item 已同步到 CLAUDE.md
