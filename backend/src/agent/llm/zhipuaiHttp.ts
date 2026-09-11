import crypto from 'crypto'
import axios from 'axios'
import https from 'https'

/**
 * 智谱开放平台 HTTP 访问层 —— 全项目唯一的智谱 token 签名与请求封装。
 *
 * 之前 generateToken 在 ai.service / embedding.service / prompt-eval 三处各有一份拷贝,
 * axios + https.Agent 也各自为政;现统一收敛到这里。
 * 注意:本模块的 generateZhipuaiToken 是智谱 API key 签名,与用户 JWT(utils/jwt.generateToken)无关。
 */

export const ZHIPUAI_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4'

// 历史上为绕过代理证书问题关闭过证书校验;现默认校验,确需关闭时显式设置 ZHIPUAI_INSECURE_TLS=1
const httpsAgent = new https.Agent({ rejectUnauthorized: process.env.ZHIPUAI_INSECURE_TLS !== '1' })

/** 用 "id.secret" 格式的 API key 生成 1 小时有效的签名 token */
export function generateZhipuaiToken(apiKey: string): string {
  const [id, secret] = apiKey.split('.')
  if (!id || !secret) throw new Error('Invalid ZhipuAI API key format (expect "id.secret")')

  const header = { alg: 'HS256', sign_type: 'SIGN' }
  const now = Date.now()
  const payload = { api_key: id, exp: now + 3600000, timestamp: now }

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64')
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url')

  return `${encodedHeader}.${encodedPayload}.${signature}`
}

export interface ZhipuaiRequestOptions {
  /** 不传时读 ZHIPUAI_API_KEY 环境变量 */
  apiKey?: string
  /** true 时返回流式 response(responseType: 'stream') */
  stream?: boolean
  signal?: AbortSignal
}

/** 智谱开放平台 POST 的统一入口;失败时抛 axios 错误,由调用方决定如何降级 */
export function postZhipuai(path: string, body: Record<string, unknown>, opts: ZhipuaiRequestOptions = {}) {
  const apiKey = opts.apiKey ?? process.env.ZHIPUAI_API_KEY ?? ''
  const token = generateZhipuaiToken(apiKey)

  return axios.post(`${ZHIPUAI_BASE_URL}${path}`, body, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(opts.stream ? { responseType: 'stream' as const } : {}),
    httpsAgent,
    signal: opts.signal as any,
  })
}

/** POST /chat/completions 便捷封装 */
export function postZhipuaiChat(body: Record<string, unknown>, opts: ZhipuaiRequestOptions = {}) {
  return postZhipuai('/chat/completions', body, opts)
}
