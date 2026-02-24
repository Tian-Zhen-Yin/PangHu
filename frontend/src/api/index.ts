import axios from 'axios'

// 创建axios实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 从 localStorage 获取 token
    const token = localStorage.getItem('auth_token')
    console.log('[API Request]', config.method?.toUpperCase(), config.url, 'hasToken:', !!token)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    } else {
      console.warn('[API Request] No auth token found in localStorage')
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    console.log('[API Response]', response.config.url, 'status:', response.status)
    return response.data
  },
  (error) => {
    const message = error.response?.data?.message || error.message || '请求失败'
    console.error('[API Error]', error.response?.status, message)
    return Promise.reject({ message })
  }
)

export default api
