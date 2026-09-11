# 全仓重构（refactor/project-cleanup）Retro

> 模板来源：[docs/02-开发/PangHu-AI协作工作流设计.md](../02-开发/PangHu-AI协作工作流设计.md) §7。

**日期**：2026-09-11
**分支**：`refactor/project-cleanup`（自 master b94189a 拉出，master 未动）
**耗时**：单个 session 顺序完成
**主要协作者**：人 + 1 LLM session（3 个 Explore 侦察 agent 并行）

---

## 一、Sprint 设置

- **拆分的子分支**：无——单分支 7 个 Phase 顺序提交（重构任务天然同域，不宜并行切分）
- **隔离方式**：单分支顺序；每 Phase 一次逻辑提交 + 验证门禁
- **Branch Contracts 豁免**（已记入 AGENTS.md）：
  - `backend/src/agent/index.ts`（三链路收敛）
  - 根 `vitest.*.config.ts`（测试 include 修复，实际被 frontend/vitest.config.ts 取代）
- **仍然禁动**：schema.prisma、migrations、routes/index.ts、featureFlags.ts、auto-generated d.ts

## 二、最终结果

- **测试结果**：
  - backend unit:262 passed / 11 failed（失败与重构前基线**逐字一致**，均为 featureFlags 配置漂移等存量问题）
  - frontend vitest:**45/45 全绿**（重构前 include 只挂了 1/9 文件，属"从未运行"状态）
  - backend `tsc --noEmit`:错误 28(基线 39,净减 11);前端 typecheck 错误 50(基线 59)
  - backend esbuild(Vercel bundle)✓ / frontend `vite build` ✓ / mac-mini 脚本 `bash -n` ✓
- **净删约 8600 行死代码**；agent/index.ts 856→300 行且不再依赖 express 类型
- **是否触发回滚**：否

## 三、What Worked

1. **重构前先派 3 个 Explore agent 并行侦察**,产出三份体检报告;动手前的所有删除项又逐一 grep 复核引用——两道关口下零误删(仅 SectionHeader 一条误报被复核拦下)。
2. **基线先行**:Phase 0 把 27 个未提交改动打成 WIP 快照;同时记录 tsc 错误/测试失败基线,每 Phase 验证只做「错误数不增、失败集合不变」对比,让存量烂账不阻塞重构判断。
3. **批量脚本 + 逐文件抽查**:PrismaClient/logger 两轮 10+ 文件的机械改动用 node 脚本,但立即用 tsc 抓出「注释开头文件插入失败」「相对路径多一级」两类脚本缺陷——自动化后必须有编译器兜底。
4. **死代码先于深重构**:先删 8600 行(agent 死链路/React 孤儿/Play 死副本),agent/index.ts 的实际存量立刻缩水,深重构的工作量和风险显著下降。
5. 前端测试 include 从 1 个文件放开到全量后暴露的 12 个失败,全部属于「测试从未跑过导致的漂移」,一次修清,测试套件从静默腐烂变成真门禁。

## 四、What Didn't Work

1. **node 批处理脚本对「文件头是块注释」的文件插入 import 失败**(`^` 不带 m 标志只匹配字符串头),导致 log/prisma 未定义,靠 tsc + 人工补丁返工一轮。
2. 前端 imageCompress 测试的竞态(onerror 触发早于异步 sniff 挂载)第一版修复放错作用域(describe 外访问不到 mockImg),二次返工。
3. `k8s archived` 误入 shell 链把整条 git mv 命令打断,后半段操作静默未执行,靠事后 ls 发现补救。
4. 一次 Write 工具因「未先 Read」被拒、一次 Bash 因 cwd 停留在子目录而路径全错——工具前置条件检查仍需习惯性确认。

## 五、Key Learnings

1. **「混乱」的仓库多半不是代码烂,是三层烂叠在一起**:git 卫生(密钥/构建产物被追踪)、目录考古层(Python 表情包时代/k8s/三份重复 skills)、代码内部债(三链路/三份 token 拷贝/10 个 PrismaClient)。分层治理,每层一个 commit,可独立回退。
2. **存量失败基线是重构的生命线**:11 个基线失败若不先记录,agent 重构后无法在 30 秒内证明「我没弄坏任何东西」。
3. 深重构(SSE 解耦)的正确路径:**先写窄接口(sseSink)与适配器,新旧行为逐路径对照搬运**,比"重写"安全得多;迁移期逃生舱(runCaptured)让遗留直写组件(ai.service)不必同步改造。
4. 测试配置的静默失效(include 只挂 1 个文件)比没有测试更危险——它制造"有测试"的错觉。CI 应对「include 匹配数为 0/骤降」报警。

## 六、Action Items

- [ ] **[P0] 轮换两个已泄露的 API key**(test.py 的 BigModel key、ZhipuAI.ini 的 ZhipuAI key 已进 git 历史;文件已删但历史仍在)——需人到开放平台操作
- [ ] 修复 11 个存量失败测试:featureFlags 配置与测试断言漂移(9 个)、过敏意图 bypass V3(1 个)、recommendPlay schema(1 个)
- [ ] featureFlags/agent 三代链路灰度已收敛,下一 sprint 决定 V2 管线去留(若 V3 稳定,可删 v2Pipeline 或反向收编)
- [ ] 拆分 14 个 800+ 行巨型前端组件(AIChat/index.vue 2326 行最优先)——独立 feature 分支
- [ ] 生产路径剩余 ~130 处 console.log 逐模块替换为 utils/logger(重灾区已清,剩长尾)
- [ ] 评估 OpenAPI/类型快照机制,替代前后端手写类型漂移(本次 ai.service MessageRole 放宽即是漂移实例)

---

*本 retro 由 refactor/project-cleanup 收尾时撰写;Action Items 反哺自 What Didn't Work 与遗留清单。*
