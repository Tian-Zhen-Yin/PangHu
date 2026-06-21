/**
 * 陪玩游戏插图映射
 *
 * 约定：图片文件名 = 游戏 id（见后端 playGames.ts），放在本目录下，
 * 支持 .png / .jpg / .webp / .svg。例如 laser-chase.png。
 *
 * 使用 Vite 的 import.meta.glob 自动收集，新增图片后无需改代码：
 * 把对应文件名的图丢进 src/assets/play/ 即可自动生效。
 *
 * 取不到对应插图时返回 undefined，由卡片侧做占位兜底。
 */

const modules = import.meta.glob('./*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const illustrationMap: Record<string, string> = {}
for (const path in modules) {
  // './laser-chase.png' -> 'laser-chase'
  const key = path.replace(/^\.\//, '').replace(/\.[^.]+$/, '')
  illustrationMap[key] = modules[path]!
}

/** 按游戏 id 获取插图 URL，未配置时返回 undefined */
export function getPlayIllustration(gameId: string): string | undefined {
  return illustrationMap[gameId]
}
