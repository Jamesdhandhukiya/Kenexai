import { useState, useEffect } from 'react'
import { 
  BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'
import { API, COLORS, ProfileDropdown } from './Shared'

const HR_MODULES = [
  { key: 'hr-overview', label: 'Overview', icon: '📊' },
  { key: 'hr-interns', label: 'Manage Interns', icon: '👥' },
  { key: 'hr-managers', label: 'Manage Managers', icon: '👔' },
  { key: 'hr-departments', label: 'Departments', icon: '🏢' },
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
        <div className="sidebar-brand">kenex<span className="accent">ai</span></div>
        <div className="sidebar-section">HR Dashboard</div>
        {HR_MODULES.map(m => (
          <button key={m.key} className={`sidebar-link ${active === m.key ? 'active' : ''}`} onClick={() => setActive(m.key)}>
            <span className="icon">{m.icon}</span>{m.label}
          </button>
        ))}
        <div className="sidebar-bottom">
          <button className="sidebar-link" onClick={onLogout}>
            <span className="icon">🚪</span>Sign out
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
  useEffect(() => { fetch(`${API}/hr/overview`).then(r => r.json()).then(setData).catch(() => { }) }, [])
  if (!data) return <p>Loading…</p>

  return (
    <>
      <div className="page-header"><h1>HR Overview</h1><p>Organization-wide snapshot</p></div>
      <div className="stats-grid cols-4">
        <div className="stat-card"><div className="stat-label">Total Users</div><div className="stat-value">{data.totalUsers}</div><div className="stat-sub">{data.totalInterns} interns · {data.totalManagers} managers</div></div>
        <div className="stat-card"><div className="stat-label">Active Interns</div><div className="stat-value">{data.activeInterns}</div><div className="stat-sub">{data.warningInterns > 0 ? `${data.warningInterns} warnings` : 'All healthy'}</div></div>
        <div className="stat-card"><div className="stat-label">Avg Score</div><div className="stat-value">{data.avgScore}%</div><div className="stat-sub up">across all interns</div></div>
        <div className="stat-card"><div className="stat-label">Tasks</div><div className="stat-value">{data.totalTasks}</div><div className="stat-sub">{data.completedTasks} done · {data.pendingTasks} pending</div></div>
      </div>
      <div className="content-grid cols-2">
        <div className="card">
          <h3>Role Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.roleDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                {data.roleDistribution.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3>Department Breakdown</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.departments}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="interns" name="Interns" fill="#7C3AED" radius={[6, 6, 0, 0]} />
              <Bar dataKey="managers" name="Managers" fill="#1D4ED8" radius={[6, 6, 0, 0]} />
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

  useEffect(() => {
    fetch(`${API}/hr/interns`).then(r => r.json()).then(setInterns).catch(() => { })
    fetch(`${API}/hr/managers`).then(r => r.json()).then(setManagers).catch(() => { })
  }, [])

  const addIntern = async () => {
    setErrorMsg('')
    const res = await fetch(`${API}/hr/interns`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok || data.success === false) {
      setErrorMsg(data.message || 'Failed to add intern.')
      return
    }
    setInterns([...interns, data.intern])
    setCreated(data)
    setForm({ name: '', email: '', department: 'Data Engineering', manager_id: '' })
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
        <button className="btn btn-primary" onClick={() => { setShowModal(true); setCreated(null); setErrorMsg('') }}>+ Add Intern</button>
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
                <td><button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.78rem', color: '#dc2626' }} onClick={() => setDeleteConfirm(intern.id)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Add New Intern</h3>
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
                <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="e.g. john@kenexai.com" /></div>
                <div className="form-group"><label>Department</label><select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}><option>Data Engineering</option><option>Machine Learning</option><option>Data Analytics</option></select></div>
                <div className="form-group"><label>Assign to Manager</label><select value={form.manager_id} onChange={e => setForm({ ...form, manager_id: e.target.value })}><option value="">— Select Manager —</option>{managers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.department})</option>)}</select></div>
                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={addIntern} disabled={!form.name || !form.email}>Add Intern</button>
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

  useEffect(() => { fetch(`${API}/hr/managers`).then(r => r.json()).then(setManagers).catch(() => { }) }, [])

  const addManager = async () => {
    setErrorMsg('')
    const res = await fetch(`${API}/hr/managers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok || data.success === false) {
      setErrorMsg(data.message || 'Failed to add manager.')
      return
    }
    setManagers([...managers, data.manager])
    setCreated(data)
    setForm({ name: '', email: '', department: 'Data Engineering' })
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
        <button className="btn btn-primary" onClick={() => { setShowModal(true); setCreated(null); setErrorMsg('') }}>+ Add Manager</button>
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
                <td><button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.78rem', color: '#dc2626' }} onClick={() => setDeleteConfirm(mgr.id)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Add New Manager</h3>
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
                <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="e.g. jane@kenexai.com" /></div>
                <div className="form-group"><label>Department</label><select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}><option>Data Engineering</option><option>Machine Learning</option><option>Data Analytics</option></select></div>
                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={addManager} disabled={!form.name || !form.email}>Add Manager</button>
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
