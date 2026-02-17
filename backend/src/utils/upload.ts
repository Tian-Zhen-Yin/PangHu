import multer from 'multer'
import path from 'path'
import fs from 'fs'

// 确保上传目录存在
const uploadDir = path.join(process.cwd(), 'uploads', 'pets')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// 存储配置
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    // 生成唯一文件名: 时间戳-随机数.扩展名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, 'pet-' + uniqueSuffix + ext)
  }
})

// 文件过滤器
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 只允许图片
  if (file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    cb(new Error('只允许上传图片文件'))
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
