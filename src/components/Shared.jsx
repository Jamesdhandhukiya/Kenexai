import { useState, useEffect, useRef } from 'react'
import { ChangePasswordModal } from './Auth'

export const API = 'http://localhost:5000/api'
export const COLORS = ['#7C3AED', '#1D4ED8', '#059669', '#d97706', '#dc2626', '#0891b2']

export function ProfileDropdown({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const [showPwdModal, setShowPwdModal] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div className="navbar-user" onClick={() => setOpen(!open)} style={{ cursor: 'pointer' }}>
        <div className="navbar-avatar">{user.name?.split(' ').map(n => n[0]).join('')}</div>
        <div className="navbar-user-info">
          <div className="name">{user.name}</div>
          <div className="role">
            {user.role === 'hr' ? 'HR Admin' : user.role === 'manager' ? 'Manager' : `Intern ${user.assigned_manager ? `(${user.assigned_manager})` : ''}`}
          </div>
        </div>
        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 8, background: 'var(--color-card)', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.12)', border: '1px solid var(--color-input-border)', minWidth: 200, zIndex: 100, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-input-border)' }}>
            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{user.name}</div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{user.email}</div>
          </div>
          <button onClick={() => { setShowPwdModal(true); setOpen(false) }} style={{ width: '100%', padding: '11px 16px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-text)' }}>
            🔑 Change Password
          </button>
          <button onClick={onLogout} style={{ width: '100%', padding: '11px 16px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 10, color: '#dc2626', borderTop: '1px solid var(--color-input-border)' }}>
            🚪 Sign out
          </button>
        </div>
      )}
      {showPwdModal && <ChangePasswordModal user={user} onClose={() => setShowPwdModal(false)} />}
    </div>
  )
}
