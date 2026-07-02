import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

interface Props { onClose: () => void }

export default function AuthModal({ onClose }: Props) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = mode === 'signup'
      ? await signUp(email, password, username)
      : await signIn(email, password)
    setLoading(false)
    if (result.error) setError(result.error)
    else onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-header">
          <h2>{mode === 'signin' ? 'Sign In' : 'Create Account'}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="auth-tabs">
          <button className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>Sign In</button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Sign Up</button>
        </div>
        <form className="auth-form" onSubmit={submit}>
          {mode === 'signup' && (
            <div className="auth-field">
              <label>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="producer_name" required />
            </div>
          )}
          <div className="auth-field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Loading…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
