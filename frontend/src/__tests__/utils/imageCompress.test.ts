// frontend/src/__tests__/utils/imageCompress.test.ts
// 单元测试:覆盖图片上传"加载失败"相关全部场景
// 重写版,适配 magic bytes + createImageBitmap fallback 新架构

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// 工具:构造一个带 magic bytes 的 File
function makeFile(bytes: number[], name: string, type = ''): File {
  return new File([new Uint8Array(bytes)], name, { type })
}

// HEIC magic bytes: 任意 4 字节 box size + 'ftyp' + 'heic'
const HEIC_HEADER = [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]
const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]
const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

describe('imageCompress - magic bytes 嗅探 + 解码兼容性', () => {
  let createObjectURLSpy: any
  let revokeObjectURLSpy: any
  let originalImage: typeof Image
  let mockImg: any

  beforeEach(() => {
    createObjectURLSpy = vi.fn(() => 'blob:mock-url')
    revokeObjectURLSpy = vi.fn()
    // @ts-ignore
    globalThis.URL.createObjectURL = createObjectURLSpy
    // @ts-ignore
    globalThis.URL.revokeObjectURL = revokeObjectURLSpy

    mockImg = { onload: null as any, onerror: null as any, src: '' }
    originalImage = globalThis.Image
    // @ts-ignore
    globalThis.Image = vi.fn(() => mockImg)

    // 默认禁用 createImageBitmap,逐 case 按需打开
    // @ts-ignore
    globalThis.createImageBitmap = undefined
  })

  afterEach(() => {
    // @ts-ignore
    globalThis.Image = originalImage
    vi.restoreAllMocks()
  })

  it('HEIC 文件(magic bytes)应被精准识别并给出 iPhone 设置提示', async () => {
    const { cropAvatarToCircle } = await import('../../utils/imageCompress')
    // 即使后缀写成 .jpg 也能识别
    const file = makeFile(HEIC_HEADER, 'photo.jpg', 'image/jpeg')
    await expect(cropAvatarToCircle(file)).rejects.toThrow(/HEIC|最兼容|iPhone/)
  })

  it('HEIC 文件即使 file.type 为空也能识别', async () => {
    const { cropAvatarToCircle } = await import('../../utils/imageCompress')
    const file = makeFile(HEIC_HEADER, 'IMG_1234.HEIC', '')
    await expect(cropAvatarToCircle(file)).rejects.toThrow(/HEIC/)
  })

  it('空文件应给出"为空"提示而不是"格式不支持"', async () => {
    const { cropAvatarToCircle } = await import('../../utils/imageCompress')
    const file = new File([], 'empty.jpg', { type: 'image/jpeg' })
    await expect(cropAvatarToCircle(file)).rejects.toThrow(/为空/)
  })

  it('JPEG magic bytes 应被识别为有效图片(进入 Image 加载流程)', async () => {
    const { compressImage } = await import('../../utils/imageCompress')
    const file = makeFile(JPEG_HEADER, 'a.jpg', 'image/jpeg')
    // 模拟 Image 加载失败,但应该是"解码失败"而非"HEIC"或"为空"
    setTimeout(() => mockImg.onerror?.(), 0)
    await expect(compressImage(file)).rejects.toThrow(/解码失败|损坏/)
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url')
  })

  it('createImageBitmap 可用时应优先使用,不再走 Image+blob URL', async () => {
    const fakeBitmap = { width: 1000, height: 800, close: vi.fn() }
    const createImageBitmapSpy = vi.fn(async () => fakeBitmap)
    // @ts-ignore
    globalThis.createImageBitmap = createImageBitmapSpy

    // 准备 canvas mock,让 encode 成功
    const blob = new Blob(['x'], { type: 'image/jpeg' })
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({ fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() }),
      toBlob: (cb: any) => cb(blob),
    }
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return fakeCanvas as any
      return document.createElement(tag)
    })

    const { compressImage } = await import('../../utils/imageCompress')
    const file = makeFile(JPEG_HEADER.concat(Array(3000).fill(0)), 'big.jpg', 'image/jpeg')
    Object.defineProperty(file, 'size', { value: 3 * 1024 * 1024 })

    await compressImage(file)
    expect(createImageBitmapSpy).toHaveBeenCalledWith(file, expect.any(Object))
    // 没走 Image fallback → 不应调 createObjectURL
    expect(createObjectURLSpy).not.toHaveBeenCalled()
    // ImageBitmap 必须被释放
    expect(fakeBitmap.close).toHaveBeenCalled()
  })

  it('createImageBitmap 失败时应自动 fallback 到 Image 加载', async () => {
    const createImageBitmapSpy = vi.fn(async () => {
      throw new Error('decode error')
    })
    // @ts-ignore
    globalThis.createImageBitmap = createImageBitmapSpy

    const { cropAvatarToCircle } = await import('../../utils/imageCompress')
    const file = makeFile(JPEG_HEADER, 'a.jpg', 'image/jpeg')

    // Image 也失败 → 抛出最终错误
    setTimeout(() => mockImg.onerror?.(), 0)

    await expect(cropAvatarToCircle(file)).rejects.toThrow(/解码失败|损坏/)
    expect(createImageBitmapSpy).toHaveBeenCalled()
    // fallback 到 Image,blob URL 被创建并释放
    expect(createObjectURLSpy).toHaveBeenCalled()
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url')
  })

  it('PNG magic bytes 应被识别为有效图片', async () => {
    const fakeBitmap = { width: 100, height: 100, close: vi.fn() }
    // @ts-ignore
    globalThis.createImageBitmap = vi.fn(async () => fakeBitmap)
    const blob = new Blob(['x'], { type: 'image/jpeg' })
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({ fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), closePath: vi.fn(), clip: vi.fn() }),
      toBlob: (cb: any) => cb(blob),
    }
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return fakeCanvas as any
      return document.createElement(tag)
    })

    const { cropAvatarToCircle } = await import('../../utils/imageCompress')
    const file = makeFile(PNG_HEADER, 'cat.png', 'image/png')
    const result = await cropAvatarToCircle(file)
    expect(result).toBeInstanceOf(File)
    expect(result.type).toBe('image/jpeg')
    expect(fakeBitmap.close).toHaveBeenCalled()
  })
})

describe('format.ts - getAvatarUrl 对各种 URL 协议的处理', () => {
  it('应原样返回 base64 data: URL,不要前置 "/"', async () => {
    const { getAvatarUrl } = await import('../../utils/format')
    const dataUrl = 'data:image/png;base64,iVBORw0KGgo='
    expect(getAvatarUrl({ avatar: dataUrl })).toBe(dataUrl)
  })

  it('应原样返回 blob: URL', async () => {
    const { getAvatarUrl } = await import('../../utils/format')
    const blobUrl = 'blob:http://localhost:5173/abc-123'
    expect(getAvatarUrl({ avatar: blobUrl })).toBe(blobUrl)
  })

  it('优先返回 avatarData(base64)而不是 avatar 字段', async () => {
    const { getAvatarUrl } = await import('../../utils/format')
    expect(getAvatarUrl({
      avatarData: 'data:image/png;base64,XXX',
      avatar: '/uploads/avatars/old.jpg'
    })).toBe('data:image/png;base64,XXX')
  })

  it('相对路径 /uploads/... 保持不变', async () => {
    const { getAvatarUrl } = await import('../../utils/format')
    expect(getAvatarUrl({ avatar: '/uploads/avatars/x.jpg' })).toBe('/uploads/avatars/x.jpg')
  })

  it('完整 http URL 保持不变', async () => {
    const { getAvatarUrl } = await import('../../utils/format')
    expect(getAvatarUrl({ avatar: 'https://cdn.example.com/x.jpg' })).toBe('https://cdn.example.com/x.jpg')
  })

  it('空值返回空字符串', async () => {
    const { getAvatarUrl } = await import('../../utils/format')
    expect(getAvatarUrl({ avatar: null })).toBe('')
    expect(getAvatarUrl({})).toBe('')
  })
})

describe('format.ts - 防回归:协议 URL 不能被前置斜杠', () => {
  const testCases = [
    { input: 'blob:http://localhost/abc', desc: 'blob 协议' },
    { input: 'data:image/jpeg;base64,/9j/4AAQ', desc: 'data base64' },
    { input: 'https://cdn.example.com/x.png', desc: 'https 协议' },
    { input: 'http://example.com/x.png', desc: 'http 协议' },
  ]

  testCases.forEach(({ input, desc }) => {
    it(`${desc} 不应被前置 "/"`, async () => {
      const { getAvatarUrl } = await import('../../utils/format')
      const result = getAvatarUrl({ avatar: input })
      expect(result).not.toMatch(/^\/(blob:|data:|http)/)
      expect(result).toBe(input)
    })
  })
})
