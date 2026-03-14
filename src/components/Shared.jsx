import { useState, useEffect, useRef } from 'react'
import { ChangePasswordModal } from './Auth'
import { LogOut, Key, ChevronDown, User, Settings, Bell } from 'lucide-react'

export const API = 'http://localhost:5000/api'
export const COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

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
    <div ref={ref} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <button className="navbar-badge">
        <Bell size={20} />
        <div className="dot"></div>
      </button>
      
      <div className="navbar-user" onClick={() => setOpen(!open)} style={{ cursor: 'pointer' }}>
        <div className="navbar-avatar">
          {user.name?.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="navbar-user-info">
          <div className="name">{user.name}</div>
          <div className="role">
            {user.role === 'hr' ? 'HR Admin' : user.role === 'manager' ? 'Manager' : `Intern ${user.assigned_manager ? `(Assigned to ${user.assigned_manager})` : ''}`}
          </div>
        </div>
        <ChevronDown size={16} style={{ color: '#94a3b8', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </div>

      {open && (
        <div style={{ 
          position: 'absolute', 
          right: 0, 
          top: '100%', 
          marginTop: 12, 
          background: '#fff', 
          borderRadius: 16, 
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', 
          border: '1px solid var(--color-input-border)', 
          minWidth: 220, 
          zIndex: 100, 
          overflow: 'hidden',
          padding: '8px'
        }}>
          <div style={{ padding: '12px 12px 16px', borderBottom: '1px solid var(--color-input-border)', marginBottom: 4 }}>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-text)' }}>{user.name}</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', wordBreak: 'break-all' }}>{user.email}</div>
          </div>
          
          <button className="dropdown-item" onClick={() => { setShowPwdModal(true); setOpen(false) }}>
            <Key size={16} /> <span>Change Password</span>
          </button>
          
          <button className="dropdown-item logout" onClick={onLogout}>
            <LogOut size={16} /> <span>Sign out</span>
          </button>
        </div>
      )}
      {showPwdModal && <ChangePasswordModal user={user} onClose={() => setShowPwdModal(false)} />}
    </div>
  )
}
