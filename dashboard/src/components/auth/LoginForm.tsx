'use client'
import { useState } from 'react'
import { LogIn, AlertCircle } from 'lucide-react'

interface LoginFormProps {
  onLogin: (creds: { email: string; password: string }) => Promise<unknown>
  isPending: boolean
  errorMessage?: string | null
}

export function LoginForm({ onLogin, isPending, errorMessage }: LoginFormProps) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onLogin({ email, password })
  }

  return (
    <div
      className="flex h-screen items-center justify-center radar-grid"
      style={{ backgroundColor: '#050d1a' }}
    >
      <form
        onSubmit={handleSubmit}
        className="glass-card-cyan p-8 w-full max-w-sm flex flex-col gap-6"
      >
        {/* Logo */}
        <div className="text-center">
          <h1
            className="text-2xl font-bold font-mono tracking-widest uppercase"
            style={{ color: '#22d3ee', textShadow: '0 0 16px rgba(34,211,238,0.5)' }}
          >
            SIVAPRE
          </h1>
          <p className="text-xs text-slate-500 mt-1">Sistema de Vigilancia Epidemiológica</p>
        </div>

        {/* Campos */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-[11px] font-mono text-slate-500 uppercase tracking-widest"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2 rounded-lg text-sm font-mono text-slate-200 outline-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(34,211,238,0.2)',
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-[11px] font-mono text-slate-500 uppercase tracking-widest"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-3 py-2 rounded-lg text-sm font-mono text-slate-200 outline-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(34,211,238,0.2)',
              }}
            />
          </div>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="flex items-center gap-2 text-xs font-mono" style={{ color: '#f87171' }}>
            <AlertCircle size={13} aria-hidden />
            {errorMessage}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-mono font-semibold tracking-wider transition-all disabled:opacity-50 cursor-pointer"
          style={{
            background: 'rgba(34,211,238,0.12)',
            color: '#22d3ee',
            border: '1px solid rgba(34,211,238,0.35)',
          }}
        >
          <LogIn size={14} aria-hidden />
          {isPending ? 'Autenticando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}
