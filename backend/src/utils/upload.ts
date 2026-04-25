import multer from 'multer'
import path from 'path'
import fs from 'fs'

// 确保上传目录存在
const uploadDir = path.join(process.cwd(), 'uploads', 'pets')
const avatarDir = path.join(process.cwd(), 'uploads', 'avatars')

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true })
}

// 允许的图片扩展名
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp'])

// 允许的 MIME 类型（排除 SVG 等可嵌入脚本的类型）
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
])

// 存储配置
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname).toLowerCase()
    // 只使用允许的扩展名，否则回退到 .jpg
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.jpg'
    cb(null, 'pet-' + uniqueSuffix + safeExt)
  }
})

// 头像存储配置
const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, avatarDir)
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname).toLowerCase()
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.jpg'
    cb(null, 'avatar-' + uniqueSuffix + safeExt)
  }
})

// 文件过滤器 — 同时检查 MIME 类型和扩展名
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase()
  if (
    ALLOWED_MIME_TYPES.has(file.mimetype) &&
    ALLOWED_EXTENSIONS.has(ext)
  ) {
    cb(null, true)
  } else {
    cb(new Error('只允许上传 JPG/PNG/GIF/WebP 格式的图片'))
  }
}

// 创建 multer 实例
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB 限制
  }
})

// 单个图片上传中间件
export const uploadPetPhoto = upload.single('photo')

// 多图上传中间件（最多9张）
export const uploadPetPhotos = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
}).array('photos', 9)

// 头像上传中间件
export const uploadCatAvatar = multer({
  storage: avatarStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
}).single('avatar')
