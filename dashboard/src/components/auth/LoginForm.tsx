'use client'
import { useState } from 'react'
import { LogIn, AlertCircle, Shield } from 'lucide-react'

interface LoginFormProps {
  onLogin: (creds: { email: string; password: string }) => Promise<unknown>
  isPending: boolean
  errorMessage?: string | null
}

export function LoginForm({ onLogin, isPending, errorMessage }: LoginFormProps) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setLocalError(null)
    if (!email.trim())    { setLocalError('El identificador de email es requerido'); return }
    if (!password.trim()) { setLocalError('La contraseña es requerida'); return }
    await onLogin({ email, password })
  }

  const displayError = localError ?? errorMessage

  return (
    <div
      className="relative flex h-screen items-center justify-center radar-grid overflow-hidden"
      style={{ backgroundColor: '#050d1a' }}
    >
      {/* Ambient glow orbs */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '20%', left: '15%', width: 480, height: 480,
          background: 'radial-gradient(circle, rgba(34,211,238,0.05) 0%, transparent 65%)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '15%', right: '10%', width: 360, height: 360,
          background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 65%)',
        }}
      />

      {/* Card */}
      <div className="login-card relative w-full max-w-sm mx-4">
        {/* Corner brackets */}
        <span className="login-corner login-corner-tl" aria-hidden />
        <span className="login-corner login-corner-tr" aria-hidden />
        <span className="login-corner login-corner-bl" aria-hidden />
        <span className="login-corner login-corner-br" aria-hidden />

        {/* Scan line */}
        <div className="login-scan-line" aria-hidden />

        <form
          onSubmit={handleSubmit}
          noValidate
          className="relative z-10 p-8 flex flex-col gap-6"
        >
          {/* Header */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="login-shield" aria-hidden>
              <Shield size={26} strokeWidth={1.5} />
            </div>

            <div>
              <h1
                className="text-3xl font-bold font-mono tracking-[0.22em] uppercase"
                style={{ color: '#22d3ee', textShadow: '0 0 20px rgba(34,211,238,0.55)' }}
              >
                SIVAPRE
              </h1>
              <p className="text-[10px] font-mono text-slate-500 mt-1 tracking-widest uppercase">
                Sistema de Vigilancia Epidemiológica
              </p>
            </div>

            <div
              className="w-full h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(34,211,238,0.35), transparent)',
              }}
            />
          </div>

          {/* Fields */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-[10px] font-mono text-slate-500 uppercase tracking-widest"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => { setLocalError(null); setEmail(e.target.value) }}
                autoComplete="email"
                placeholder="usuario@sivapre.pe"
                className="sivapre-input"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-[10px] font-mono text-slate-500 uppercase tracking-widest"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => { setLocalError(null); setPassword(e.target.value) }}
                autoComplete="current-password"
                placeholder="••••••••"
                className="sivapre-input"
              />
            </div>
          </div>

          {/* Error */}
          {displayError && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono"
              role="alert"
              style={{
                color: '#f87171',
                background: 'rgba(248,113,113,0.07)',
                border: '1px solid rgba(248,113,113,0.2)',
              }}
            >
              <AlertCircle size={13} aria-hidden />
              {displayError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className="sivapre-btn"
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span
                  className="inline-block w-3.5 h-3.5 rounded-full border border-current border-t-transparent"
                  style={{ animation: 'spin 0.7s linear infinite' }}
                  aria-hidden
                />
                Autenticando…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <LogIn size={14} aria-hidden />
                Ingresar al Sistema
              </span>
            )}
          </button>

          {/* Footer */}
          <p className="text-center text-[9px] font-mono text-slate-700 tracking-widest uppercase">
            Acceso restringido · DIRESA Loreto · Perú
          </p>
        </form>
      </div>
    </div>
  )
}
