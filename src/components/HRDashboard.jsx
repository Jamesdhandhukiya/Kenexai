import { useState, useEffect } from 'react'
import { 
  BarChart as BarChartIcon, Users, Briefcase, Building2, LayoutDashboard, 
  LogOut, Plus, Search, Filter, Trash2, ShieldAlert, TrendingUp, CheckCircle2, Clock, RefreshCw
} from 'lucide-react'
import { 
  BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'
import { API, COLORS, ProfileDropdown } from './Shared'

const HR_MODULES = [
  { key: 'hr-overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'hr-interns', label: 'Manage Interns', icon: Users },
  { key: 'hr-managers', label: 'Manage Managers', icon: Briefcase },
  { key: 'hr-departments', label: 'Departments', icon: Building2 },
]

export default function HRDashboardLayout({ user, onLogout }) {
  const [active, setActive] = useState('hr-overview')

  const renderModule = () => {
    switch (active) {
      case 'hr-overview': return <HROverviewModule />
      case 'hr-interns': return <HRInternsModule />
      case 'hr-managers': return <HRManagersModule />
      case 'hr-departments': return <HRDepartmentsModule />
      default: return <HROverviewModule />
    }
  }

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="logo-icon"><TrendingUp size={20} /></div>
          <div className="brand-text">kenex<span className="accent">ai</span></div>
        </div>
        <div className="sidebar-section">HR Dashboard</div>
        {HR_MODULES.map(m => {
          const Icon = m.icon
          return (
            <button key={m.key} className={`sidebar-link ${active === m.key ? 'active' : ''}`} onClick={() => setActive(m.key)}>
              <span className="icon"><Icon size={18} /></span>{m.label}
            </button>
          )
        })}
        <div className="sidebar-bottom">
          <button className="sidebar-link" onClick={onLogout}>
            <span className="icon"><LogOut size={18} /></span>Sign out
          </button>
        </div>
      </aside>
      <div className="main-area">
        <nav className="navbar">
          <div className="navbar-title">{HR_MODULES.find(m => m.key === active)?.label}</div>
          <div className="navbar-right">
            <ProfileDropdown user={user} onLogout={onLogout} />
          </div>
        </nav>
        <div className="content-area">{renderModule()}</div>
      </div>
    </div>
  )
}

function HROverviewModule() {
  const [data, setData] = useState(null)
  const [syncing, setSyncing] = useState(false)
  
  const loadData = () => {
    fetch(`${API}/hr/overview`).then(r => r.json()).then(setData).catch(() => { })
  }

  useEffect(() => { loadData() }, [])

  const syncDatabase = async () => {
    setSyncing(true)
    try {
      await fetch(`${API}/sync`, { method: 'POST' })
      loadData()
    } catch (e) {
      console.error(e)
    }
    setSyncing(false)
  }
  if (!data) return <div className="loading-state">Loading overview data...</div>

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>HR Overview</h1>
          <p>Real-time organization-wide analytics and snapshots</p>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={syncDatabase} 
          disabled={syncing}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <RefreshCw size={16} className={syncing ? 'spin' : ''} />
          {syncing ? 'Syncing...' : 'Sync Database'}
        </button>
      </div>
      
      <div className="stats-grid cols-4">
        <div className="stat-card">
          <div className="stat-label">Total Workforce</div>
          <div className="stat-value">{data.totalUsers}</div>
          <div className="stat-sub">
            <Users size={14} /> {data.totalInterns} interns · {data.totalManagers} managers
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Interns</div>
          <div className="stat-value">{data.activeInterns}</div>
          <div className="stat-sub">
            {data.warningInterns > 0 ? (
              <span style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ShieldAlert size={14} /> {data.warningInterns} warnings
              </span>
            ) : (
              <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={14} /> All healthy
              </span>
            )}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Proficiency</div>
          <div className="stat-value">{data.avgScore}%</div>
          <div className="stat-sub up"><TrendingUp size={14} /> Organization average</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Task Velocity</div>
          <div className="stat-value">{data.totalTasks}</div>
          <div className="stat-sub">
            <Clock size={14} /> {data.completedTasks} done · {data.pendingTasks} pending
          </div>
        </div>
      </div>

      <div className="content-grid cols-2">
        <div className="card">
          <h3><Users size={18} /> Role Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.roleDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                {data.roleDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3><Building2 size={18} /> Department Breakdown</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.departments} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip 
                cursor={{ fill: 'rgba(99,102,241,0.04)' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
              <Bar dataKey="interns" name="Interns" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={24} />
              <Bar dataKey="managers" name="Managers" fill="#EC4899" radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  )
}

function HRInternsModule() {
  const [interns, setInterns] = useState([])
  const [managers, setManagers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', department: 'Data Engineering', manager_id: '' })
  const [created, setCreated] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [editingItem, setEditingItem] = useState(null)

  useEffect(() => {
    fetch(`${API}/hr/interns`).then(r => r.json()).then(setInterns).catch(() => { })
    fetch(`${API}/hr/managers`).then(r => r.json()).then(setManagers).catch(() => { })
  }, [])

  const saveIntern = async () => {
    setErrorMsg('')
    const method = editingItem ? 'PUT' : 'POST'
    const url = editingItem ? `${API}/hr/interns/${editingItem.id}` : `${API}/hr/interns`
    
    const res = await fetch(url, { 
      method, 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(form) 
    })
    const data = await res.json()
    
    if (!res.ok || data.success === false) {
      setErrorMsg(data.message || `Failed to ${editingItem ? 'update' : 'add'} intern.`)
      return
    }
    
    if (editingItem) {
      setInterns(interns.map(i => i.id === editingItem.id ? data.intern : i))
      setShowModal(false)
      setEditingItem(null)
    } else {
      setInterns([...interns, data.intern])
      setCreated(data)
    }
    setForm({ name: '', email: '', department: 'Data Engineering', manager_id: '' })
  }

  const startEdit = (item) => {
    setEditingItem(item)
    setForm({ name: item.name, email: item.email, department: item.department, manager_id: item.manager_id || '' })
    setCreated(null)
    setErrorMsg('')
    setShowModal(true)
  }

  const removeIntern = async (id) => {
    await fetch(`${API}/hr/interns/${id}`, { method: 'DELETE' })
    setInterns(interns.filter(i => i.id !== id))
    setDeleteConfirm(null)
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div><h1>Manage Interns</h1><p>Add, view, and remove interns</p></div>
        <button className="btn btn-primary" onClick={() => { setShowModal(true); setCreated(null); setEditingItem(null); setErrorMsg(''); setForm({ name: '', email: '', department: 'Data Engineering', manager_id: '' }) }}>+ Add Intern</button>
      </div>
      <div className="stats-grid cols-3">
        <div className="stat-card"><div className="stat-label">Total Interns</div><div className="stat-value">{interns.length}</div></div>
        <div className="stat-card"><div className="stat-label">Active</div><div className="stat-value">{interns.filter(i => i.status === 'Active').length}</div></div>
        <div className="stat-card"><div className="stat-label">Warnings</div><div className="stat-value">{interns.filter(i => i.status === 'Warning').length}</div></div>
      </div>
      <div className="card">
        <table className="data-table">
          <thead><tr><th>Intern</th><th>Department</th><th>Manager</th><th>Score</th><th>Status</th><th>Joined</th><th>Action</th></tr></thead>
          <tbody>
            {interns.map((intern, i) => (
              <tr key={intern.id}>
                <td><div className="user-cell"><div className={`avatar-sm a${(i % 6) + 1}`}>{intern.avatar}</div><div><div className="name">{intern.name}</div><div className="dept">{intern.email}</div></div></div></td>
                <td>{intern.department}</td>
                <td>{intern.assigned_manager ? <span style={{ fontWeight: 500 }}>{intern.assigned_manager}</span> : <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Unassigned</span>}</td>
                <td><span style={{ fontWeight: 700 }}>{intern.score}%</span></td>
                <td><span className={`badge ${intern.status === 'Active' ? 'active' : 'warning-badge'}`}>{intern.status}</span></td>
                <td>{intern.joined}</td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.78rem' }} onClick={() => startEdit(intern)}>Edit</button>
                  <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.78rem', color: '#dc2626' }} onClick={() => setDeleteConfirm(intern.id)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>{editingItem ? 'Edit Profile' : 'Add New Intern'}</h3>
            {created ? (
              <div>
                <div style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', padding: 16, borderRadius: 12, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>✅ Intern added successfully!</div>
                  <div style={{ fontSize: '0.88rem' }}>Login credentials:</div>
                  <div style={{ fontSize: '0.88rem' }}>Email: <strong>{created.email}</strong></div>
                  <div style={{ fontSize: '0.88rem' }}>Temp Password: <strong>{created.temp_password}</strong></div>
                  {created.intern?.assigned_manager && <div style={{ fontSize: '0.88rem' }}>Assigned to: <strong>{created.intern.assigned_manager}</strong></div>}
                </div>
                <div className="modal-actions"><button className="btn btn-primary" onClick={() => setShowModal(false)}>Close</button></div>
              </div>
            ) : (
              <div className="modal-body">
                {errorMsg && <div style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: '0.88rem' }}>❌ {errorMsg}</div>}
                <div className="form-group"><label>Full Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. John Smith" /></div>
                <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={!!editingItem} placeholder="e.g. john@kenexai.com" /></div>
                <div className="form-group"><label>Department</label><select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}><option>Data Engineering</option><option>Machine Learning</option><option>Data Analytics</option></select></div>
                <div className="form-group"><label>Assign to Manager</label><select value={form.manager_id} onChange={e => setForm({ ...form, manager_id: e.target.value })}><option value="">— Select Manager —</option>{managers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.department})</option>)}</select></div>
                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={saveIntern} disabled={!form.name || !form.email}>{editingItem ? 'Update Intern' : 'Add Intern'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Confirm Deletion</h3>
            <p style={{ marginBottom: 20 }}>Are you sure you want to permanently remove this intern? Their assigned tasks and authentication data will be permanently deleted.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: '#dc2626', borderColor: '#fcaca9', color: 'white' }} onClick={() => removeIntern(deleteConfirm)}>Delete Intern</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function HRManagersModule() {
  const [managers, setManagers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', department: 'Data Engineering' })
  const [created, setCreated] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [editingItem, setEditingItem] = useState(null)

  useEffect(() => { fetch(`${API}/hr/managers`).then(r => r.json()).then(setManagers).catch(() => { }) }, [])

  const saveManager = async () => {
    setErrorMsg('')
    const method = editingItem ? 'PUT' : 'POST'
    const url = editingItem ? `${API}/hr/managers/${editingItem.id}` : `${API}/hr/managers`
    
    const res = await fetch(url, { 
      method, 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(form) 
    })
    const data = await res.json()
    
    if (!res.ok || data.success === false) {
      setErrorMsg(data.message || `Failed to ${editingItem ? 'update' : 'add'} manager.`)
      return
    }
    
    if (editingItem) {
      setManagers(managers.map(m => m.id === editingItem.id ? data.manager : m))
      setShowModal(false)
      setEditingItem(null)
    } else {
      setManagers([...managers, data.manager])
      setCreated(data)
    }
    setForm({ name: '', email: '', department: 'Data Engineering' })
  }

  const startEdit = (item) => {
    setEditingItem(item)
    setForm({ name: item.name, email: item.email, department: item.department })
    setCreated(null)
    setErrorMsg('')
    setShowModal(true)
  }

  const removeManager = async (id) => {
    await fetch(`${API}/hr/managers/${id}`, { method: 'DELETE' })
    setManagers(managers.filter(m => m.id !== id))
    setDeleteConfirm(null)
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div><h1>Manage Managers</h1><p>Add, view, and remove managers</p></div>
        <button className="btn btn-primary" onClick={() => { setShowModal(true); setCreated(null); setEditingItem(null); setErrorMsg(''); setForm({ name: '', email: '', department: 'Data Engineering' }) }}>+ Add Manager</button>
      </div>
      <div className="stat-card" style={{ marginBottom: 20 }}><div className="stat-label">Total Managers</div><div className="stat-value">{managers.length}</div></div>
      <div className="card">
        <table className="data-table">
          <thead><tr><th>Manager</th><th>Department</th><th>Interns Managed</th><th>Status</th><th>Joined</th><th>Action</th></tr></thead>
          <tbody>
            {managers.map((mgr, i) => (
              <tr key={mgr.id}>
                <td><div className="user-cell"><div className={`avatar-sm a${(i % 6) + 1}`}>{mgr.avatar}</div><div><div className="name">{mgr.name}</div><div className="dept">{mgr.email}</div></div></div></td>
                <td>{mgr.department}</td>
                <td style={{ fontWeight: 700 }}>{mgr.internsManaged}</td>
                <td><span className="badge active">{mgr.status}</span></td>
                <td>{mgr.joined}</td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.78rem' }} onClick={() => startEdit(mgr)}>Edit</button>
                  <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.78rem', color: '#dc2626' }} onClick={() => setDeleteConfirm(mgr.id)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>{editingItem ? 'Edit Profile' : 'Add New Manager'}</h3>
            {created ? (
              <div>
                <div style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', padding: 16, borderRadius: 12, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>✅ Manager added successfully!</div>
                  <div style={{ fontSize: '0.88rem' }}>Login credentials:</div>
                  <div style={{ fontSize: '0.88rem' }}>Email: <strong>{created.email}</strong></div>
                  <div style={{ fontSize: '0.88rem' }}>Temp Password: <strong>{created.temp_password}</strong></div>
                </div>
                <div className="modal-actions"><button className="btn btn-primary" onClick={() => setShowModal(false)}>Close</button></div>
              </div>
            ) : (
              <div className="modal-body">
                {errorMsg && <div style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: '0.88rem' }}>❌ {errorMsg}</div>}
                <div className="form-group"><label>Full Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Jane Doe" /></div>
                <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={!!editingItem} placeholder="e.g. jane@kenexai.com" /></div>
                <div className="form-group"><label>Department</label><select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}><option>Data Engineering</option><option>Machine Learning</option><option>Data Analytics</option></select></div>
                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={saveManager} disabled={!form.name || !form.email}>{editingItem ? 'Update Manager' : 'Add Manager'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Confirm Deletion</h3>
            <p style={{ marginBottom: 20 }}>Are you sure you want to permanently remove this manager? Any interns assigned to them will be unassigned, and their authentication data will be permanently deleted.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: '#dc2626', borderColor: '#fcaca9', color: 'white' }} onClick={() => removeManager(deleteConfirm)}>Delete Manager</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function HRDepartmentsModule() {
  const [data, setData] = useState(null)
  useEffect(() => { fetch(`${API}/hr/overview`).then(r => r.json()).then(setData).catch(() => { }) }, [])
  if (!data) return <p>Loading…</p>

  return (
    <>
      <div className="page-header"><h1>Departments</h1><p>Organization structure and department performance</p></div>
      <div className="content-grid cols-3">
        {data.departments.map((dept, i) => (
          <div className="card" key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{i === 0 ? '⚙️' : i === 1 ? '🧠' : '📊'}</div>
            <h3 style={{ marginBottom: 12 }}>{dept.name}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#7C3AED' }}>{dept.interns}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Interns</div>
              </div>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1D4ED8' }}>{dept.managers}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Managers</div>
              </div>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669' }}>{dept.avgScore}%</div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Avg Score</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3>Department Performance Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.departments}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="avgScore" name="Avg Score" fill="#7C3AED" radius={[6, 6, 0, 0]} />
            <Bar dataKey="interns" name="Interns" fill="#1D4ED8" radius={[6, 6, 0, 0]} />
            <Bar dataKey="managers" name="Managers" fill="#059669" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}
