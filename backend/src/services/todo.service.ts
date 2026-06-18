/**
 * 待办事项持久化服务
 *
 * 使用独立表存储用户的待办完成状态（不依赖 Prisma model，
 * 直接通过 raw SQL 操作，兼容 pgvector 无法同步 schema 的约束）。
 *
 * P4 新增：支持勾选完成 / 取消，并记录切换时间。
 */

import prisma from '../config/database'

const TABLE_NAME = 'todo_toggles'

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS "${TABLE_NAME}" (
  "id" SERIAL PRIMARY KEY,
  "user_id" VARCHAR(64) NOT NULL,
  "todo_id" VARCHAR(128) NOT NULL,
  "completed" BOOLEAN NOT NULL DEFAULT FALSE,
  "toggled_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("user_id", "todo_id")
);
CREATE INDEX IF NOT EXISTS idx_todo_toggles_user ON "${TABLE_NAME}"("user_id");
`

const CREATE_TABLE_CHECK = `
SELECT EXISTS (
  SELECT FROM information_schema.tables WHERE table_name = '${TABLE_NAME}'
);
`

let tableChecked = false

async function ensureTable(): Promise<void> {
  if (tableChecked) return
  try {
    const result: any = await prisma.$queryRawUnsafe(CREATE_TABLE_CHECK)
    const exists = Array.isArray(result) ? result[0]?.exists : false
    if (!exists) {
      await prisma.$executeRawUnsafe(CREATE_TABLE_SQL)
    }
    tableChecked = true
  } catch {
    // 静默处理：表可能在 init 脚本中已创建
    tableChecked = true
  }
}

/**
 * 获取一批待办项的完成状态
 */
export async function getTodoStatus(userId: string, todoIds: string[]): Promise<Record<string, boolean>> {
  if (todoIds.length === 0) return {}
  await ensureTable()

  try {
    const placeholders = todoIds.map((_, i) => `$${i + 2}`).join(', ')
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT todo_id, completed FROM "${TABLE_NAME}" WHERE user_id = $1 AND todo_id IN (${placeholders})`,
      userId,
      ...todoIds,
    )
    const map: Record<string, boolean> = {}
    for (const row of rows) {
      map[row.todo_id] = row.completed
    }
    return map
  } catch {
    return {}
  }
}

/**
 * 设置某条待办的完成状态（insert or update）
 */
export async function setTodoCompleted(userId: string, todoId: string, completed: boolean): Promise<void> {
  await ensureTable()

  await prisma.$executeRawUnsafe(
    `INSERT INTO "${TABLE_NAME}" (user_id, todo_id, completed, toggled_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, todo_id)
     DO UPDATE SET completed = $3, toggled_at = NOW()`,
    userId,
    todoId,
    completed,
  )
}
