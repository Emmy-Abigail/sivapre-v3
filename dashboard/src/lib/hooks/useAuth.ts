'use client'
import { useState, useEffect, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { TOKEN_KEY } from '@/lib/api/client'

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

export function useAuth() {
  // undefined = still checking; null = no token; string = authenticated
  const [token, setToken] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    setToken(localStorage.getItem(TOKEN_KEY) ?? null)

    // React to 401 responses dispatched by the axios interceptor
    function onUnauthorized() { setToken(null) }
    window.addEventListener('sivapre:unauthorized', onUnauthorized)
    return () => window.removeEventListener('sivapre:unauthorized', onUnauthorized)
  }, [])

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data } = await axios.post(`${BASE_URL}/api/v1/auth/login`, { email, password })
      return data.token as string
    },
    onSuccess: (newToken) => {
      localStorage.setItem(TOKEN_KEY, newToken)
      setToken(newToken)
    },
  })

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
  }, [])

  return {
    token,
    isChecking: token === undefined,
    isAuthenticated: typeof token === 'string',
    login: loginMutation,
    logout,
  }
}
