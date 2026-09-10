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

/** 读取 Blob 前 N 字节为 Uint8Array (兼容 iOS Safari <14 没有 Blob.arrayBuffer 的环境) */
function readHeadBytes(file: Blob, n: number): Promise<Uint8Array> {
  const slice = file.slice(0, n)
  // 优先用 arrayBuffer (现代浏览器)
  if (typeof (slice as any).arrayBuffer === 'function') {
    return (slice as any).arrayBuffer().then((buf: ArrayBuffer) => new Uint8Array(buf))
  }
  // Fallback: FileReader
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(reader.error || new Error('文件读取失败'))
    reader.readAsArrayBuffer(slice)
  })
}

/** 通过文件 magic bytes 嗅探真实格式,比文件后缀和 file.type 更可靠 */
async function sniffFormat(file: File): Promise<'heic' | 'avif' | 'jpeg' | 'png' | 'webp' | 'gif' | 'bmp' | 'tiff' | 'empty' | 'unknown'> {
  if (file.size === 0) return 'empty'
  // 读前 32 字节足以识别所有常见图片格式
  let buf: Uint8Array
  try {
    buf = await readHeadBytes(file, 32)
  } catch {
    return 'unknown'
  }
  const ascii = (start: number, end: number) => String.fromCharCode(...buf.slice(start, end))

  // ISO Base Media 容器 (HEIC/HEIF/AVIF): 4 字节 box size + 'ftyp' + 4 字节 brand
  if (buf.length >= 12 && ascii(4, 8) === 'ftyp') {
    const brand = ascii(8, 12).toLowerCase()
    // AVIF (新一代格式,部分高端安卓手机/ColorOS 默认):浏览器原生支持率较高,但 Canvas 解码可能有问题
    if (/avif|avis/.test(brand)) return 'avif'
    // HEIC/HEIF 全部 brand 兜底:任何 mif/msf/heic/heix/heim/heis/hevc/hevx 都识别
    if (/heic|heix|heim|heis|hevc|hevx|mif1|msf1|mif2/.test(brand)) return 'heic'
    // 其他不认识的 ISO BMFF 容器也按 heic 处理(避免解码失败)
    return 'heic'
  }
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg'
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png'
  // WebP: RIFF....WEBP
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp'
  // GIF: GIF87a / GIF89a
  if (ascii(0, 3) === 'GIF') return 'gif'
  // BMP: BM
  if (buf[0] === 0x42 && buf[1] === 0x4d) return 'bmp'
  // TIFF: II*\0 or MM\0*
  if ((buf[0] === 0x49 && buf[1] === 0x49 && buf[2] === 0x2a) || (buf[0] === 0x4d && buf[1] === 0x4d && buf[3] === 0x2a)) return 'tiff'
  return 'unknown'
}

/**
 * 加载 File 为可绘制源(HTMLImageElement 或 ImageBitmap)。
 *
 * 三层兜底策略,大幅提升兼容性:
 *  1) 先 magic bytes 嗅探,HEIC/空文件/未知格式提前拒绝并给出精确提示
 *  2) 优先 createImageBitmap(原生解码,iOS/Android 兼容性最佳,无 CSP blob 问题)
 *  3) fallback 到传统 Image + object URL
 *
 * 关键:无论加载成败,都必须 revoke object URL,避免内存泄漏。
 */
async function loadImage(file: File): Promise<HTMLImageElement | ImageBitmap> {
  // 1) magic bytes 嗅探
  const format = await sniffFormat(file)

  // 调试日志:用户反馈失败时,F12 控制台可以直接看到真实格式
  // (生产环境也保留,无害且对排查关键)
  console.log('[loadImage] 文件信息', {
    name: file.name,
    type: file.type || '(空)',
    size: file.size,
    sizeKB: Math.round(file.size / 1024),
    detectedFormat: format,
  })

  if (format === 'empty') {
    throw new Error('图片文件为空,请重新选择')
  }
  if (format === 'heic') {
    throw new Error([
      '检测到 HEIC/HEIF 格式,浏览器无法直接解码。',
      '请按以下方式处理:',
      '• iPhone: 设置 → 相机 → 格式 → 选「最兼容」',
      '• OPPO/华为/小米: 相机设置中关闭「高效格式」或「HEIF」',
      '• 临时方案: 用微信/QQ 发给自己,再保存到相册即可自动转 JPG',
    ].join('\n'))
  }
  if (format === 'tiff') {
    throw new Error('暂不支持 TIFF 格式,请使用 JPG / PNG / WebP 格式的图片')
  }
  // AVIF: Chromium 内核浏览器原生支持解码,不拦截,让 createImageBitmap 尝试
  // 如果失败会进入 fallback,最终给出明确解码错误
  // 已知非图片格式
  if (format === 'unknown') {
    throw new Error(`文件不是常见图片格式(读取到的 MIME: ${file.type || '空'}, 文件名: ${file.name})。\n请选择 JPG / PNG / WebP / GIF 格式的图片。`)
  }

  // 2) 优先 createImageBitmap(Chrome/Safari 14+/Firefox 全支持,无需 object URL)
  if (typeof createImageBitmap === 'function') {
    try {
      // imageOrientation: 'from-image' 让 iOS 自动正方向(避免横拍照片旋转 90°)
      return await createImageBitmap(file, { imageOrientation: 'from-image' as any })
    } catch (err) {
      // createImageBitmap 失败 → 走 Image fallback,不直接抛错
      console.warn('[loadImage] createImageBitmap 失败,回退到 Image 加载:', err)
    }
  }

  // 3) Fallback: 传统 Image + object URL
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    const cleanup = () => URL.revokeObjectURL(objectUrl)
    img.onload = () => {
      cleanup()
      resolve(img)
    }
    img.onerror = () => {
      cleanup()
      reject(new Error(`图片解码失败(${format === 'unknown' ? '未知格式' : format}),文件可能已损坏。请重新拍摄或换一张图片。`))
    }
    img.src = objectUrl
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
  img: HTMLImageElement | ImageBitmap,
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
  ctx.drawImage(img as CanvasImageSource, 0, 0, width, height)
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

/** 检查文件是否为可处理的图片(iOS Safari file.type 可能为空,要回退到扩展名) */
function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  return /\.(jpe?g|png|webp|gif|heic|heif|bmp)$/i.test(file.name)
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

  if (!isImageFile(file) || SKIP_TYPES.has(file.type)) return file

  const img = await loadImage(file)
  try {
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
  } finally {
    // ImageBitmap 需要主动释放,HTMLImageElement 不需要
    if ('close' in img && typeof img.close === 'function') img.close()
  }
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

  if (!isImageFile(file) || SKIP_TYPES.has(file.type)) return file

  const img = await loadImage(file)
  try {
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

    ctx.drawImage(img as CanvasImageSource, sx, sy, sourceSize, sourceSize, 0, 0, size, size)

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
  } finally {
    if ('close' in img && typeof img.close === 'function') img.close()
  }
}
