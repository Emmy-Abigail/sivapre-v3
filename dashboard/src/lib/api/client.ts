import axios from 'axios'

export const TOKEN_KEY = 'sivapre_token'

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

export const apiClient = axios.create({ baseURL: BASE_URL })

apiClient.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401: clear stored token so the auth gate shows the login form on next render
apiClient.interceptors.response.use(
  r => r,
  error => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY)
        window.dispatchEvent(new Event('sivapre:unauthorized'))
      }
    }
    return Promise.reject(error)
  },
)
