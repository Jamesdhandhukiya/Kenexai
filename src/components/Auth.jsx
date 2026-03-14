import { useState } from 'react'

const API = 'http://localhost:5000/api'

/* ========================================
   SVG Brain Animation
   ======================================== */
export function BrainSVG() {
  return (
    <svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#d8b4fe" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#f9a8d4" stopOpacity="0.4" />
        </linearGradient>
        <filter id="gl" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="12" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g filter="url(#gl)">
        <path d="M120 320c40 0 60-70 55-120s70-80 115-90c45-10 70 25 80 55 10 30 90 40 100 85 10 45-40 120-120 120s-170-15-230-25z" fill="url(#bg)" opacity="0.7" />
        <circle cx="220" cy="200" r="18" fill="#FFF" opacity="0.85"><animate attributeName="opacity" values="0.5;1;0.5" dur="2.2s" repeatCount="indefinite" /></circle>
        <circle cx="310" cy="160" r="11" fill="#FFF" opacity="0.7"><animate attributeName="cx" values="310;330;310" dur="2.6s" repeatCount="indefinite" /></circle>
        <circle cx="180" cy="240" r="14" fill="#FFF" opacity="0.65"><animate attributeName="cy" values="240;258;240" dur="3.1s" repeatCount="indefinite" /></circle>
        <circle cx="380" cy="230" r="9" fill="#FFF" opacity="0.55"><animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.8s" repeatCount="indefinite" /></circle>
      </g>
      <path d="M130 278c16-22 48-53 105-55 58-2 92 23 106 50" fill="none" stroke="#fff" strokeWidth="2" opacity="0.5" strokeLinecap="round"><animate attributeName="strokeDasharray" values="0,200;200,0;0,200" dur="5s" repeatCount="indefinite" /></path>
      <path d="M170 210c40-25 90-35 135-10" fill="none" stroke="#fff" strokeWidth="1.6" opacity="0.4" strokeLinecap="round"><animate attributeName="strokeDashoffset" values="0;150;0" dur="4s" repeatCount="indefinite" /></path>
    </svg>
  )
}

/* ========================================
   LOGIN PAGE
   ======================================== */
export function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (data.success) {
        onLogin(data.user)
      } else {
        setError(data.message || 'Invalid credentials')
      }
    } catch {
      setError('Server not reachable. Start the Flask server on port 5000.')
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-brand">kenex<span className="accent">ai</span></div>
          <h2>Welcome back</h2>
          <p className="subtitle">Sign in to access your analytics dashboard.</p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" placeholder="e.g. hr@kenexai.com" value={email} onChange={e => { setEmail(e.target.value); setError('') }} />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" placeholder="Enter password" value={password} onChange={e => { setPassword(e.target.value); setError('') }} />
            </div>
            <button type="submit" className="login-btn" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
          </form>
          {error && <div className="login-error">{error}</div>}
          <div className="login-footer">Demo: <strong>hr@kenexai.com</strong> / <strong>manager@kenexai.com</strong> / <strong>intern@kenexai.com</strong> — password: <strong>Admin@123</strong></div>
        </div>
        <div className="login-hero">
          <div className="hero-svg-wrapper"><BrainSVG /></div>
          <h2>Master your career journey</h2>
          <p>Experience next‑level analytics and skill tracking backed by AI.</p>
        </div>
      </div>
    </div>
  )
}

/* ========================================
   FIRST LOGIN — UPDATE PASSWORD
   ======================================== */
export function FirstLoginPage({ user, onComplete }) {
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (newPass.length < 6) { setError('Password must be at least 6 characters'); return }
    if (newPass !== confirmPass) { setError('Passwords do not match'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/update-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, new_password: newPass }),
      })
      const data = await res.json()
      if (data.success) {
        onComplete({ ...user, first_login: false })
      } else {
        setError(data.message)
      }
    } catch {
      setError('Server error')
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-container" style={{ justifyContent: 'center' }}>
        <div className="login-card" style={{ maxWidth: 460 }}>
          <div className="login-brand">kenex<span className="accent">ai</span></div>
          <h2>Update Password</h2>
          <p className="subtitle">Welcome, <strong>{user.name}</strong>! Please set a new password to proceed.</p>
          <form onSubmit={handleUpdate}>
            <div className="form-group"><label>New Password</label><input type="password" placeholder="Min 6 characters" value={newPass} onChange={e => { setNewPass(e.target.value); setError('') }} /></div>
            <div className="form-group"><label>Confirm Password</label><input type="password" placeholder="Re-enter password" value={confirmPass} onChange={e => { setConfirmPass(e.target.value); setError('') }} /></div>
            <button type="submit" className="login-btn" disabled={loading}>{loading ? 'Updating…' : 'Set Password & Continue'}</button>
          </form>
          {error && <div className="login-error">{error}</div>}
        </div>
      </div>
    </div>
  )
}

/* ========================================
   CHANGE PASSWORD MODAL
   ======================================== */
export function ChangePasswordModal({ user, onClose }) {
  const [current, setCurrent] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = async (e) => {
    e.preventDefault()
    if (newPass.length < 6) { setError('Password must be at least 6 characters'); return }
    if (newPass !== confirmPass) { setError('Passwords do not match'); return }
    setLoading(true); setError(''); setMsg('')
    try {
      const res = await fetch(`${API}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, current_password: current, new_password: newPass }),
      })
      const data = await res.json()
      if (data.success) {
        setMsg('✅ Password changed successfully!')
        setCurrent(''); setNewPass(''); setConfirmPass('')
        setTimeout(() => onClose(), 1500)
      } else {
        setError(data.message)
      }
    } catch {
      setError('Server error')
    }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3>Change Password</h3>
        {msg && <div style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', padding: '10px 14px', borderRadius: 10, marginBottom: 12, fontWeight: 500 }}>{msg}</div>}
        {error && <div style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: 10, marginBottom: 12, fontWeight: 500 }}>{error}</div>}
        <form onSubmit={handleChange}>
          <div className="modal-body">
            <div className="form-group"><label>Current Password</label><input type="password" value={current} onChange={e => { setCurrent(e.target.value); setError('') }} required /></div>
            <div className="form-group"><label>New Password</label><input type="password" placeholder="Min 6 characters" value={newPass} onChange={e => { setNewPass(e.target.value); setError('') }} required /></div>
            <div className="form-group"><label>Confirm New Password</label><input type="password" value={confirmPass} onChange={e => { setConfirmPass(e.target.value); setError('') }} required /></div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Updating…' : 'Change Password'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
