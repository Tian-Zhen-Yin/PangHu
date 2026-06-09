/**
 * Markdown 处理工具函数
 */

/**
 * 去除 Markdown 内容中的首个 H1 标题
 *
 * 用途：指南详情页的页面标题已经显示了文章标题，
 * Markdown 内容中的首个 H1 会造成重复，需要去除。
 *
 * @param markdown - 原始 Markdown 内容
 * @returns 去除首个 H1 后的 Markdown 内容
 *
 * @example
 * ```ts
 * const markdown = "# 我的世界\n\n这是内容..."
 * const result = removeFirstH1(markdown)
 * // result: "这是内容..."
 * ```
 */
export function removeFirstH1(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return markdown
  }

  // 按行分割
  const lines = markdown.split('\n')

  // 查找首个 H1（以 # 开头，后面跟空格）
  const firstHeadingIndex = lines.findIndex(line => {
    const trimmed = line.trim()
    return trimmed.startsWith('# ')
  })

  // 如果没找到 H1，返回原内容
  if (firstHeadingIndex === -1) {
    return markdown
  }

  // 移除首个 H1 行
  lines.splice(firstHeadingIndex, 1)

  // 重新组合
  return lines.join('\n')
}

/**
 * 检测 Markdown 内容是否包含 H1
 *
 * @param markdown - Markdown 内容
 * @returns 是否包含 H1
 */
export function hasH1(markdown: string): boolean {
  if (!markdown || typeof markdown !== 'string') {
    return false
  }

  const lines = markdown.split('\n')
  return lines.some(line => line.trim().startsWith('# '))
}

/**
 * 提取 Markdown 首个 H1 标题文本
 *
 * @param markdown - Markdown 内容
 * @returns H1 标题文本（不包含 # 符号），如果没有则返回 null
 */
export function extractFirstH1Title(markdown: string): string | null {
  if (!markdown || typeof markdown !== 'string') {
    return null
  }

  const lines = markdown.split('\n')
  const firstHeadingLine = lines.find(line => line.trim().startsWith('# '))

  if (!firstHeadingLine) {
    return null
  }

  // 去除 "# " 前缀，返回纯文本
  return firstHeadingLine.trim().slice(2)
}
