/**
 * 客户端图片压缩工具
 *
 * 背景：用户上传的猫咪照片往往是手机原图（3~10MB+），而后端 multer 限制头像 5MB、
 * 成长记录/聊天图片 10MB。原图直接上传会触发 413/文件超限失败。
 * 这里在浏览器端用 canvas 做尺寸缩放 + 迭代降质量，把体积压到远低于后端上限后再上传。
 *
 * 设计原则：
 *  - 纯前端、零依赖（仅用 canvas），不引入 compressor.js 等额外包
 *  - 不可变：始终返回新的 File 对象，不修改入参
 *  - 安全降级：GIF/SVG 等非 raster 图直接返回原文件，避免破坏动图/矢量
 *  - 已足够小或压缩后反而变大时，返回原文件
 */

export interface CompressImageOptions {
  /** 最长边像素上限，默认 1920（手机原图常见 4000px+，缩到 1920 仍清晰） */
  maxDimension?: number
  /** 目标体积（字节），默认 1.5MB（远低于后端 10MB 上限，留足余量） */
  targetSize?: number
  /** 输出 MIME，默认 image/jpeg（体积最小、兼容性最好） */
  mimeType?: 'image/jpeg' | 'image/webp'
  /** 最低编码质量，低于此值不再降质量、改为缩尺寸，默认 0.5 */
  qualityFloor?: number
  /** 起始编码质量，默认 0.9 */
  qualityStart?: number
}

/** GIF/SVG 不做 re-encode（动图会丢帧、矢量会栅格化） */
const SKIP_TYPES = new Set(['image/gif', 'image/svg+xml'])

/** 加载 File 为 HTMLImageElement（用 object URL，避免 base64 膨胀） */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })
}

/** 按最长边等比缩放，返回目标宽高（不超过 maxDimension） */
function scaleDown(w: number, h: number, maxDimension: number): { width: number; height: number } {
  const longest = Math.max(w, h)
  if (longest <= maxDimension) return { width: w, height: h }
  const ratio = maxDimension / longest
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) }
}

/** 在指定尺寸/质量下绘制并编码为 Blob（JPEG 无 alpha，先铺白底避免透明区变黑） */
function encode(
  img: HTMLImageElement,
  width: number,
  height: number,
  quality: number,
  mimeType: string,
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('无法创建 canvas'))
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('图片编码失败'))),
      mimeType,
      quality,
    )
  })
}

/** 把文件名扩展名替换为与目标 MIME 一致（jpeg→.jpg） */
function withExt(name: string, mimeType: string): string {
  const ext = mimeType === 'image/jpeg' ? 'jpg' : 'webp'
  const dot = name.lastIndexOf('.')
  return (dot > 0 ? name.slice(0, dot) : name) + '.' + ext
}

/**
 * 通用图片压缩：尺寸缩放 + 迭代降质量，命中 targetSize 即停。
 *
 * 失败/无需压缩时返回原文件（调用方无感）。
 */
export async function compressImage(file: File, options: CompressImageOptions = {}): Promise<File> {
  const {
    maxDimension = 1920,
    targetSize = 1.5 * 1024 * 1024,
    mimeType = 'image/jpeg',
    qualityFloor = 0.5,
    qualityStart = 0.9,
  } = options

  if (!file.type.startsWith('image/') || SKIP_TYPES.has(file.type)) return file

  const img = await loadImage(file)
  let { width, height } = scaleDown(img.width, img.height, maxDimension)

  let blob = await encode(img, width, height, qualityStart, mimeType)

  // 1) 先逐步降质量
  let quality = qualityStart - 0.1
  while (blob.size > targetSize && quality >= qualityFloor) {
    blob = await encode(img, width, height, quality, mimeType)
    quality -= 0.1
  }

  // 2) 降质量到地板仍超标 → 缩尺寸再来一轮（最长边不低于 480，保证可用清晰度）
  while (blob.size > targetSize && Math.max(width, height) > 480) {
    width = Math.round(width * 0.7)
    height = Math.round(height * 0.7)
    blob = await encode(img, width, height, 0.8, mimeType)
  }

  // 压缩后反而更大（极小原图）→ 保留原图
  if (blob.size >= file.size) return file

  return new File([blob], withExt(file.name, mimeType), { type: mimeType, lastModified: Date.now() })
}

export interface AvatarOptions {
  /** 头像输出最长边像素，默认 512（头像显示场景足够清晰，体积极小） */
  size?: number
  /** 编码质量，默认 0.85 */
  quality?: number
}

/**
 * 将图片裁剪为圆形头像并压缩。
 *
 * 合并自原 Form.vue / Detail.vue 重复实现，新增 maxDimension 上限：
 * 原版用 min(w,h)*0.8 作为画布尺寸，手机 4000px 原图会产出 3200px 的巨大头像。
 * 现在统一限制在 512px，输出通常 <300KB，彻底规避 5MB 上传失败。
 */
export async function cropAvatarToCircle(file: File, options: AvatarOptions = {}): Promise<File> {
  const { size = 512, quality = 0.85 } = options

  if (!file.type.startsWith('image/') || SKIP_TYPES.has(file.type)) return file

  const img = await loadImage(file)

  // 取图片较短边居中正方形裁剪，再缩放到目标 size
  const sourceSize = Math.min(img.width, img.height)
  const sx = (img.width - sourceSize) / 2
  const sy = (img.height - sourceSize) / 2

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建 canvas')

  // 圆形裁剪
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()

  // 白底（JPEG 无 alpha，圆外区域统一铺白）
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)

  ctx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, size, size)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('头像编码失败'))),
      'image/jpeg',
      quality,
    )
  })

  return new File([blob], withExt(file.name, 'image/jpeg'), {
    type: 'image/jpeg',
    lastModified: Date.now(),
  })
}
