/**
 * 全局测试 setup（vitest setupFiles 入口）
 *
 * 设计原则（详见 docs/02-开发/PangHu-AI协作工作流设计.md §5.2）：
 *   - 轻量入口：只做必要的事
 *   - 不破坏已有 17 个用 beforeEach/beforeAll 的测试文件
 *   - 不主动接管 INTERNAL_USER_IDS / BETA_USER_IDS（featureFlags.test.ts 自己管理）
 *   - 不主动 clearAllMocks（避免破坏既有 mock lifecycle）
 *
 * 新增测试文件可按需扩展 fixture 工厂导出。
 */

// 1. 环境变量默认值
//    - ??= 不覆盖已有设定（CI / .env / 测试自己设过的都保留）
//    - JWT_SECRET 是 src/utils/jwt.ts 的硬性依赖（不设会 process.exit(1)）
process.env.JWT_SECRET ??= 'test-secret-for-vitest'
process.env.NODE_ENV ??= 'test'

// 2. 全局 mock 重置（占位）
//    若未来需要 vi.clearAllMocks() / resetModules() 之类，先确认不会破坏既有 mock lifecycle 再开启。
//    推荐：让具体测试文件自己 beforeEach 处理，本文件只兜底环境。

// 3. 公共 fixture 工厂导出（按需引入）
//    示例：export { makeTestUser, makeTestCat } from './fixtures/testFactories'
