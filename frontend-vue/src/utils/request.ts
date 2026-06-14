import axios, { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import { getToken, setToken, setRefreshToken, removeToken, getRefreshToken } from '@/utils/storage'

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '/api'

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

const instance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

let isRefreshing = false
let requestQueue: Array<{ resolve: (token: string) => void; reject: (reason?: any) => void }> = []

instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

async function refreshToken(): Promise<{ token: string; refreshToken: string }> {
  const storedRefreshToken = getRefreshToken()
  if (!storedRefreshToken) {
    window.location.href = '/login'
    throw new Error('No refresh token')
  }

  try {
    const res = await axios.post(`${BASE_URL}/auth/refresh`, {
      refreshToken: storedRefreshToken,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (res.data.code === 0) {
      setToken(res.data.data.token)
      setRefreshToken(res.data.data.refreshToken)
      return res.data.data
    } else {
      throw new Error('Refresh failed')
    }
  } catch (e) {
    removeToken()
    window.location.href = '/login'
    throw e
  }
}

instance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<AxiosResponse>((resolve, reject) => {
          requestQueue.push({
            resolve: (newToken: string) => {
              originalRequest._retry = true
              originalRequest.headers.Authorization = `Bearer ${newToken}`
              resolve(instance(originalRequest))
            },
            reject,
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const data = await refreshToken()
        originalRequest.headers.Authorization = `Bearer ${data.token}`
        requestQueue.forEach(({ resolve }) => resolve(data.token))
        requestQueue = []
        return instance(originalRequest)
      } catch (e) {
        requestQueue.forEach(({ reject }) => reject(e))
        requestQueue = []
        throw e
      } finally {
        isRefreshing = false
      }
    }

    const status = error.response?.status
    const message = error.response?.data?.message as string | undefined

    if (status === 403) {
      ElMessage.error('您没有权限执行此操作')
    } else if (status === 404) {
      ElMessage.error('资源不存在')
    } else if (status === 422) {
      ElMessage.error(message || '参数校验失败')
    } else if (status >= 500) {
      ElMessage.error('服务器错误，请稍后重试')
    }

    return Promise.reject(error)
  }
)

export interface RequestConfig extends AxiosRequestConfig {
  params?: Record<string, any>
}

export default {
  get<T = any>(url: string, config?: RequestConfig) {
    return instance.get<any, AxiosResponse<T>>(url, config)
  },
  post<T = any>(url: string, data?: any, config?: RequestConfig) {
    return instance.post<any, AxiosResponse<T>>(url, data, config)
  },
  put<T = any>(url: string, data?: any, config?: RequestConfig) {
    return instance.put<any, AxiosResponse<T>>(url, data, config)
  },
  delete<T = any>(url: string, config?: RequestConfig) {
    return instance.delete<any, AxiosResponse<T>>(url, config)
  },
  patch<T = any>(url: string, data?: any, config?: RequestConfig) {
    return instance.patch<any, AxiosResponse<T>>(url, data, config)
  },
}
