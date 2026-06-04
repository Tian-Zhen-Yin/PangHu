/**
 * 文档切分服务
 * 将 Markdown 文档按语义切分为适合向量化的小块
 */

export interface Chunk {
  content: string
  chunkIndex: number
  headings: string[]
  metadata: {
    category?: string
    ageStage?: string
  }
}

export interface ChunkOptions {
  maxChunkSize?: number    // 最大块大小（字符数）
  overlap?: number          // 块之间的重叠字符数
  splitByHeadings?: boolean // 是否按标题切分
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  maxChunkSize: 500,
  overlap: 50,
  splitByHeadings: true
}

/**
 * 解析 Markdown 内容，提取标题结构
 */
function parseMarkdownStructure(markdown: string): {
  headings: Array<{ level: number; text: string; index: number }>
  plainText: string
} {
  const lines = markdown.split('\n')
  const headings: Array<{ level: number; text: string; index: number }> = []
  const plainTextLines: string[] = []

  lines.forEach((line, index) => {
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = headingMatch[2].trim()
      headings.push({ level, text, index })
      plainTextLines.push(line)
    } else {
      // 移除 Markdown 格式，保留纯文本
      const cleanLine = line
        .replace(/\*\*([^*]+)\*\*/g, '$1')  // 粗体
        .replace(/\*([^*]+)\*/g, '$1')     // 斜体
        .replace(/`([^`]+)`/g, '$1')       // 行内代码
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 链接
        .replace(/^\s*[-*+]\s+/gm, '')     // 列表项
        .replace(/^\s*\d+\.\s+/gm, '')     // 有序列表
        .replace(/^\s*>\s+/gm, '')         // 引用
      plainTextLines.push(cleanLine)
    }
  })

  return { headings, plainText: plainTextLines.join('\n') }
}

/**
 * 提取文本段的标题路径
 */
function getHeadingPath(
  headings: Array<{ level: number; text: string; index: number }>,
  contentIndex: number
): string[] {
  const path: string[] = []
  let currentLevel = 0

  for (const heading of headings) {
    if (heading.index > contentIndex) break

    if (heading.level > currentLevel) {
      // 下级标题
      while (path.length >= heading.level) {
        path.pop()
      }
      path.push(heading.text)
      currentLevel = heading.level
    } else if (heading.level === currentLevel) {
      // 同级标题，替换最后一个
      if (path.length > 0) path.pop()
      path.push(heading.text)
    } else {
      // 上级标题
      while (path.length >= heading.level) {
        path.pop()
      }
      path.push(heading.text)
      currentLevel = heading.level
    }
  }

  return path
}

/**
 * 按段落切分文本
 */
function splitByParagraphs(text: string, maxSize: number): string[] {
  const paragraphs = text.split(/\n\n+/)
  const chunks: string[] = []
  let currentChunk = ''

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim()
    if (!trimmed) continue

    if (currentChunk.length + trimmed.length > maxSize && currentChunk) {
      chunks.push(currentChunk.trim())
      currentChunk = trimmed
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmed
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

/**
 * 添加重叠内容以提高上下文连贯性
 */
function addOverlap(chunks: string[], overlap: number): string[] {
  if (overlap <= 0) return chunks

  const result: string[] = []

  for (let i = 0; i < chunks.length; i++) {
    let chunk = chunks[i]

    if (i > 0 && overlap > 0) {
      const prevChunk = chunks[i - 1]
      const overlapText = prevChunk.slice(-overlap)
      chunk = overlapText + '\n\n' + chunk
    }

    result.push(chunk)
  }

  return result
}

/**
 * 主函数：将 Markdown 文档切分为块
 */
export function chunkMarkdown(
  markdown: string,
  options: ChunkOptions = {}
): Chunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const { headings, plainText } = parseMarkdownStructure(markdown)

  // 按标题分段
  const sections: Array<{ heading: string | null; content: string; startIndex: number }> = []
  let currentSection: { heading: string | null; content: string; startIndex: number } = {
    heading: null,
    content: '',
    startIndex: 0
  }

  const lines = plainText.split('\n')
  let lineIndex = 0

  for (const line of lines) {
    const isHeading = headings.some(h => h.index === lineIndex && line.trim().startsWith('#'))

    if (isHeading && currentSection.content) {
      sections.push({ ...currentSection })
      currentSection = {
        heading: line.trim(),
        content: '',
        startIndex: lineIndex
      }
    } else if (!isHeading) {
      currentSection.content += (currentSection.content ? '\n' : '') + line
    }

    lineIndex++
  }

  if (currentSection.content) {
    sections.push(currentSection)
  }

  // 将每个段落进一步切分为适合的大块
  const chunks: Chunk[] = []
  let globalIndex = 0

  for (const section of sections) {
    const textChunks = splitByParagraphs(section.content, opts.maxChunkSize)

    for (const text of textChunks) {
      chunks.push({
        content: text,
        chunkIndex: globalIndex++,
        headings: section.heading ? [section.heading.replace(/^#+\s*/, '')] : [],
        metadata: {}
      })
    }
  }

  // 添加重叠
  if (opts.overlap > 0) {
    const overlappedContents = addOverlap(chunks.map(c => c.content), opts.overlap)
    chunks.forEach((chunk, i) => {
      chunk.content = overlappedContents[i]
    })
  }

  return chunks
}

/**
 * 从指南内容中提取元数据
 */
export function extractGuideMetadata(markdown: string): {
  category: string
  ageStage?: string
} {
  // 尝试从 frontmatter 或内容中提取元数据
  const frontmatterMatch = markdown.match(/^---\n([\s\S]+?)\n---/)
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1]
    const categoryMatch = frontmatter.match(/category:\s*(.+)/)
    const ageStageMatch = frontmatter.match(/ageStage:\s*(.+)/)

    return {
      category: (categoryMatch?.[1] || '').trim() || '通用',
      ageStage: ageStageMatch?.[1] ? ageStageMatch[1].trim() : undefined
    }
  }

  // 根据内容关键词推断分类
  const content = markdown.toLowerCase()

  if (content.includes('疫苗') || content.includes('医疗') || content.includes('健康')) {
    return { category: '健康医疗' }
  }
  if (content.includes('喂养') || content.includes('食物') || content.includes('营养')) {
    return { category: '喂养营养' }
  }
  if (content.includes('训练') || content.includes('行为')) {
    return { category: '行为训练' }
  }
  if (content.includes('洗澡') || content.includes('护理') || content.includes('清洁')) {
    return { category: '日常护理' }
  }

  return { category: '通用' }
}
