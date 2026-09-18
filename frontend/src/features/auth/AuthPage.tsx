import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { Loading } from '../../components/Loading'
import { authErrorMessage } from './errors'
import { useAuth } from './useAuth'
import './auth.css'

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const isRegister = mode === 'register'
  const auth = useAuth()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const requested = location.state?.from
  const destination =
    typeof requested === 'string' &&
    ['/', '/dashboard', '/projects', '/map'].includes(requested)
      ? requested
      : '/dashboard'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const fields = new FormData(form)
    const password = String(fields.get('password') || '')
    if (isRegister && !password.trim()) {
      setError('Password must not contain only whitespace.')
      return
    }
    setPending(true)
    setError(null)
    try {
      const input = { email: String(fields.get('email') || ''), password }
      if (isRegister)
        await auth.register({
          ...input,
          full_name: String(fields.get('full_name') || ''),
        })
      else await auth.login(input)
      form.reset()
    } catch (failure: unknown) {
      setError(authErrorMessage(failure))
    } finally {
      setPending(false)
    }
  }

  if (auth.isLoading) return <Loading message="Restoring your session…" />
  if (auth.isAuthenticated) return <Navigate to={destination} replace />

  return (
    <main className="auth-layout">
      <section className="auth-story">
        <Link to="/login" className="auth-brand">
          darukaa<span>.earth</span>
        </Link>
        <div>
          <p className="eyebrow">ENVIRONMENTAL INTELLIGENCE</p>
          <h1>
            A clearer view.
            <br />A lasting impact.
          </h1>
          <p>
            A shared workspace for the places and projects that matter to our
            planet.
          </p>
        </div>
        <span className="auth-caption">Carbon & biodiversity intelligence</span>
      </section>
      <section className="auth-panel" aria-labelledby="auth-heading">
        <div className="auth-form-wrap">
          <p className="eyebrow">YOUR WORKSPACE AWAITS</p>
          <h2 id="auth-heading">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="auth-intro">
            {isRegister
              ? 'Start with a secure account for your environmental workspace.'
              : 'Sign in to your Darukaa.Earth workspace.'}
          </p>
          <form onSubmit={submit} aria-busy={pending}>
            {isRegister && (
              <label>
                Full name <span className="optional">(optional)</span>
                <input
                  name="full_name"
                  autoComplete="name"
                  maxLength={200}
                  disabled={pending}
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={320}
                disabled={pending}
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                required
                minLength={isRegister ? 12 : 1}
                maxLength={128}
                disabled={pending}
                aria-describedby={isRegister ? 'password-policy' : undefined}
              />
            </label>
            {isRegister && (
              <p id="password-policy" className="password-policy">
                Use 12–128 characters. A memorable passphrase works well.
              </p>
            )}
            {error && (
              <p role="alert" className="auth-error">
                {error}
              </p>
            )}
            <button className="auth-submit" type="submit" disabled={pending}>
              {pending
                ? 'Please wait…'
                : isRegister
                  ? 'Create account'
                  : 'Sign in'}
            </button>
          </form>
          <p className="auth-switch">
            {isRegister ? 'Already have an account?' : 'New to Darukaa.Earth?'}{' '}
            <Link to={isRegister ? '/login' : '/register'}>
              {isRegister ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
          {auth.sessionError && (
            <p role="status" className="auth-error">
              {auth.sessionError}{' '}
              <button onClick={auth.logout}>Clear session</button>
            </p>
          )}
        </div>
      </section>
    </main>
  )
}
