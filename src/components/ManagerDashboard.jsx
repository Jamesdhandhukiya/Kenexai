import { useState, useEffect, useRef } from 'react'
import {
  BarChart as BarChartIcon, Users, ClipboardList, Scale, TrendingUp, Bell,
  Bot, Newspaper, Download, LogOut, Plus, Search, Filter,
  Trash2, ShieldAlert, CheckCircle2, Clock, Globe, Award, Code2, Layers
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts'
import { API, COLORS, ProfileDropdown } from './Shared'
import { OverviewModule, InternInsightsModule, BestPerformersModule, TechAnalyticsModule, ScoreBadge, KPICard } from './ManagerModules'

const MODULES = [
  { key: 'overview', label: 'Overview', icon: BarChartIcon },
  { key: 'interns', label: 'Intern Management', icon: Users },
  { key: 'insights', label: 'Performance Insights', icon: TrendingUp },
  { key: 'tasks', label: 'Task Assignment', icon: ClipboardList },
  { key: 'comparison', label: 'Intern Comparison', icon: Scale },
  { key: 'alerts', label: 'Flags & Alerts', icon: ShieldAlert },
  { key: 'chatbot', label: 'AI Chatbot', icon: Bot },
  { key: 'export', label: 'Data Export', icon: Download }
]

export default function ManagerDashboardLayout({ user, onLogout }) {
  const [active, setActive] = useState('overview')

  const renderModule = () => {
    switch (active) {
      case 'overview': return <OverviewModule user={user} />
      case 'interns': return <InternModule user={user} />
      case 'insights': return <InternInsightsModule user={user} />
      case 'tasks': return <TaskModule user={user} />
      case 'comparison': return <ComparisonModule user={user} />
      case 'alerts': return <AlertsModule user={user} />
      case 'chatbot': return <ChatbotModule user={user} />
      case 'export': return <ExportModule user={user} />
      default: return <OverviewModule user={user} />
    }
  }

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="logo-icon"><TrendingUp size={20} /></div>
          <div className="brand-text">kenex<span className="accent">ai</span></div>
        </div>
        <div className="sidebar-section">Manager Dashboard</div>
        {MODULES.map(m => {
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
          <div className="navbar-title">{MODULES.find(m => m.key === active)?.label}</div>
          <div className="navbar-right">
            <ProfileDropdown user={user} onLogout={onLogout} />
          </div>
        </nav>
        <div className="content-area">{renderModule()}</div>
      </div>
    </div>
  )
}

function InternModule({ user }) {
  const [interns, setInterns] = useState([])
  useEffect(() => { fetch(`${API}/manager/interns?manager_id=${user.local_id}`).then(r => r.json()).then(setInterns).catch(() => { }) }, [user])

  return (
    <>
      <div className="page-header"><h1>Intern Management</h1><p>View and manage all interns</p></div>
      <div className="card">
        <table className="data-table">
          <thead><tr><th>Intern</th><th>Department</th><th>Score</th><th>Status</th><th>Joined</th></tr></thead>
          <tbody>
            {interns.map((intern, i) => (
              <tr key={intern.id}>
                <td><div className="user-cell"><div className={`avatar-sm a${(i % 6) + 1}`}>{intern.avatar}</div><div><div className="name">{intern.name}</div><div className="dept">{intern.email}</div></div></div></td>
                <td>{intern.department}</td>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontWeight: 700 }}>{intern.score}%</span><div className="progress-bar"><div className="fill high" style={{ width: `${intern.score}%` }}></div></div></div></td>
                <td><span className={`badge ${intern.status === 'Active' ? 'active' : 'warning-badge'}`}>{intern.status}</span></td>
                <td>{intern.joined}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function TaskModule({ user }) {
  const [tasks, setTasks] = useState([])
  const [myInterns, setMyInterns] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', assignee: '', priority: 'Medium', deadline: '' })

  useEffect(() => {
    fetch(`${API}/manager/tasks?manager_id=${user.local_id}`).then(r => r.json()).then(setTasks).catch(() => { })
    fetch(`${API}/manager/interns?manager_id=${user.local_id}`).then(r => r.json()).then(setMyInterns).catch(() => { })
  }, [user])

  const createTask = async () => {
    const res = await fetch(`${API}/manager/tasks?manager_id=${user.local_id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const newTask = await res.json()
    setTasks([...tasks, newTask])
    setShowModal(false)
    setForm({ title: '', assignee: '', priority: 'Medium', deadline: '' })
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div><h1>Task Assignment</h1><p>Assign and track tasks across interns</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Task</button>
      </div>
      <div className="stats-grid cols-3">
        <KPICard icon={Clock} label="In Progress" value={tasks.filter(t => t.status === 'In Progress').length} color="#3B82F6" />
        <KPICard icon={CheckCircle2} label="Completed" value={tasks.filter(t => t.status === 'Completed').length} color="#10B981" />
        <KPICard icon={ShieldAlert} label="Pending/Blocked" value={tasks.filter(t => ['Pending', 'Not Started', 'Blocked'].includes(t.status)).length} color="#F59E0B" />
      </div>
      <div className="card">
        <table className="data-table">
          <thead><tr><th>Task</th><th>Assignee</th><th>Priority</th><th>Status</th><th>Score</th><th>Progress</th><th>Deadline</th></tr></thead>
          <tbody>
            {tasks.map(t => (
              <tr key={t.id}>
                <td style={{ fontWeight: 600 }}>{t.title}</td>
                <td>{t.assignee}</td>
                <td><span className={`badge ${(t.priority || '').toLowerCase()}`}>{t.priority}</span></td>
                <td><span className={`badge ${t.status === 'Completed' ? 'completed' : t.status === 'In Progress' ? 'in-progress' : t.status === 'Blocked' ? 'high' : 'pending'}`}>{t.status}</span></td>
                <td>{t.taskScore ? <ScoreBadge score={t.taskScore} /> : '—'}</td>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div className="progress-bar"><div className={`fill ${t.progress > 60 ? 'high' : t.progress > 30 ? 'med' : 'low'}`} style={{ width: `${t.progress}%` }}></div></div><span style={{ fontSize: '0.8rem', color: '#64748B' }}>{t.progress}%</span></div></td>
                <td>{t.deadline}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Create New Task</h3>
            <div className="modal-body">
              <div className="form-group"><label>Task Title</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div className="form-group"><label>Assignee</label>
                <select value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })}>
                  <option value="">-- Select Intern --</option>
                  {myInterns.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Priority</label><select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}><option>High</option><option>Medium</option><option>Low</option></select></div>
              <div className="form-group"><label>Deadline</label><input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} /></div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createTask}>Create Task</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ComparisonModule({ user }) {
  const [data, setData] = useState([])
  const [selected, setSelected] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => { fetch(`${API}/manager/comparison?manager_id=${user.local_id}`).then(r => r.json()).then(d => { setData(d); setSelected(d.slice(0, 2).map(i => i.id)) }).catch(() => { }) }, [user])

  const toggle = (id) => {
    if (selected.includes(id)) setSelected(selected.filter(x => x !== id))
    else if (selected.length < 3) setSelected([...selected, id])
  }

  const compared = data.filter(d => selected.includes(d.id))
  const filteredData = data.filter(d => (d.name || '').toLowerCase().includes(search.toLowerCase()) || (d.persona || '').toLowerCase().includes(search.toLowerCase()) || (d.department || '').toLowerCase().includes(search.toLowerCase()))

  const kpiData = [
    { metric: 'Score' },
    { metric: 'Completion %' },
    { metric: 'On-Time %' },
    { metric: 'Quality %' }
  ]
  compared.forEach(c => {
    kpiData[0][c.name] = c.overallScore || 0
    kpiData[1][c.name] = c.scores?.completion_rate || 0
    kpiData[2][c.name] = c.scores?.on_time_rate || 0
    kpiData[3][c.name] = c.scores?.quality_avg || 0
  })

  return (
    <>
      <div className="page-header"><h1>Intern Comparison & Personas</h1><p>Compare up to 3 interns side-by-side using dynamic KPI profiling</p></div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3>Select Interns to Compare</h3>
          <div className="search-box" style={{ width: 250, display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', padding: '6px 12px', borderRadius: 8 }}>
            <Search size={16} color="#94a3b8" />
            <input type="text" placeholder="Search by name, dept, persona..." value={search} onChange={e => setSearch(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.9rem' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', maxHeight: 150, overflowY: 'auto' }}>
          {filteredData.map(d => (
            <button key={d.id} className={`btn ${selected.includes(d.id) ? 'btn-primary' : 'btn-secondary'}`} onClick={() => toggle(d.id)} style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
              {d.name} <span style={{ opacity: 0.8, fontSize: '0.75rem', marginLeft: 6 }}>({d.persona || 'Unknown'})</span>
            </button>
          ))}
          {filteredData.length === 0 && <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No interns matched your search.</div>}
        </div>
      </div>
      {compared.length >= 2 && (
        <div className="content-grid cols-2">
          <div className="card">
            <h3>KPI Benchmark</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={kpiData} margin={{ top: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Legend />
                {compared.map((c, i) => (
                  <Bar key={c.id} dataKey={c.name} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3>Efficiency & Persona Analysis</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {compared.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 16px', background: `${COLORS[i]}08`, borderRadius: 12, borderLeft: `4px solid ${COLORS[i]}` }}>
                  <div className={`avatar-sm a${(i % 6) + 1}`}>{c.avatar || c.name.split(' ').map(n => n[0]).join('')}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{c.name}</span>
                      <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: `${COLORS[i]}20`, color: COLORS[i], borderRadius: 12, fontWeight: 700 }}>
                        {c.persona || 'Balanced'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 20, marginTop: 10, fontSize: '0.8rem' }}>
                      <div><div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Tasks Done</div><div style={{ fontWeight: 700 }}>{c.tasksCompleted}/{c.totalTasks}</div></div>
                      <div><div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Est/Act Hours</div><div style={{ fontWeight: 700 }}>{c.efficiency?.estHours || 0} / {c.efficiency?.actHours || 0}</div></div>
                      <div><div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Avg Delay</div><div style={{ fontWeight: 700, color: (c.efficiency?.avgDelay || 0) > 0 ? '#EF4444' : '#10B981' }}>{(c.efficiency?.avgDelay || 0) > 0 ? `+${c.efficiency.avgDelay}d` : 'On Time'}</div></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function AnalyticsModule({ user }) {
  const [data, setData] = useState(null)
  useEffect(() => { fetch(`${API}/manager/analytics?manager_id=${user.local_id}`).then(r => r.json()).then(setData).catch(() => { }) }, [user])
  if (!data) return <p>Loading…</p>

  return (
    <>
      <div className="page-header"><h1>Performance Analytics</h1><p>Monthly trends & skill distribution from DB</p></div>
      <div className="content-grid cols-2">
        <div className="card">
          <h3>Monthly Performance</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Legend />
              <Bar dataKey="avgScore" name="Avg Score" fill="#6366F1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="tasksCompleted" name="Tasks Done" fill="#10B981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3>Tech Skill Distribution</h3>
          {data.skills.slice(0, 8).map(s => (
            <div className="skill-bar-group" key={s.skill}>
              <div className="skill-bar-label"><span>{s.skill}</span><span>{s.avg}% ({s.tasks} tasks)</span></div>
              <div className="skill-bar"><div className="fill" style={{ width: `${s.avg}%` }}></div></div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h3>Top Performers (Computed Scores)</h3>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {data.topPerformers.map((p, i) => (
            <div key={p.id} style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 14, padding: 18, background: i === 0 ? 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(236,72,153,0.06))' : '#fafbfc', borderRadius: 16, border: i === 0 ? '1px solid rgba(99,102,241,0.2)' : '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '2rem' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</div>
              <div>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div style={{ fontSize: '0.82rem', color: '#64748B' }}>{p.department}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <ScoreBadge score={p.score} />
                  <span style={{ fontSize: '0.78rem', color: '#64748B', alignSelf: 'center' }}>{p.tasksCompleted}/{p.totalTasks} tasks</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function AlertsModule({ user }) {
  const [alerts, setAlerts] = useState([])
  useEffect(() => { fetch(`${API}/manager/alerts?manager_id=${user.local_id}`).then(r => r.json()).then(setAlerts).catch(() => { }) }, [user])

  return (
    <>
      <div className="page-header"><h1>Flags & Alerts</h1><p>Monitor critical notifications</p></div>
      <div className="stats-grid cols-3">
        <KPICard icon={Bell} label="Unread" value={alerts.filter(a => !a.read).length} color="#EF4444" />
        <KPICard icon={ShieldAlert} label="Warnings" value={alerts.filter(a => a.type === 'warning' || a.type === 'danger').length} color="#F59E0B" />
        <KPICard icon={CheckCircle2} label="Total" value={alerts.length} color="#6366F1" />
      </div>
      <div className="card">
        {alerts.map(a => (
          <div key={a.id} className={`alert-item ${a.read ? '' : 'unread'}`}>
            <div className={`alert-dot ${a.type}`}></div>
            <div className="alert-content">
              <div className="msg">{a.message}</div>
              <div className="time">{a.timestamp}{a.intern ? ` · ${a.intern}` : ''}</div>
            </div>
            <span className={`badge ${a.type === 'danger' ? 'high' : a.type === 'warning' ? 'pending' : a.type === 'success' ? 'completed' : 'in-progress'}`}>{a.type}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function PredictionModule({ user }) {
  const [preds, setPreds] = useState([])
  useEffect(() => { fetch(`${API}/manager/predictions?manager_id=${user.local_id}`).then(r => r.json()).then(setPreds).catch(() => { }) }, [user])

  const chartData = preds.map(p => ({ name: p.name.split(' ')[0], current: p.currentScore, predicted: p.predictedScore }))

  return (
    <>
      <div className="page-header"><h1>Predictions</h1><p>Score-based forecasts from silver table data</p></div>
      <div className="card">
        <h3>Current vs Predicted Scores</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 12 }} /><Tooltip /><Legend />
            <Bar dataKey="current" name="Current" fill="#6366F1" radius={[6, 6, 0, 0]} />
            <Bar dataKey="predicted" name="Predicted" fill="#EC4899" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="card">
        <table className="data-table">
          <thead><tr><th>Intern</th><th>Current</th><th>Predicted</th><th>Trend</th><th>Risk</th><th>Recommendation</th></tr></thead>
          <tbody>
            {preds.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td><ScoreBadge score={p.currentScore} /></td>
                <td><ScoreBadge score={p.predictedScore} /></td>
                <td><span className={`badge ${p.trend}`}>{p.trend}</span></td>
                <td><span className={`badge ${p.riskLevel === 'High' ? 'high' : p.riskLevel === 'Medium' ? 'medium' : 'low'}`}>{p.riskLevel}</span></td>
                <td style={{ fontSize: '0.85rem', color: '#64748B' }}>{p.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function ChatbotModule({ user }) {
  const [messages, setMessages] = useState([{ text: "Hello! I'm the KenexAI assistant. Ask me about intern performance, tasks, or alerts.", sender: 'bot' }])
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!input.trim()) return
    const userMsg = input
    setMessages(prev => [...prev, { text: userMsg, sender: 'user' }])
    setInput('')
    try {
      const res = await fetch(`${API}/manager/chat?manager_id=${user.local_id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: userMsg }) })
      const data = await res.json()
      setMessages(prev => [...prev, { text: data.reply, sender: 'bot' }])
    } catch {
      setMessages(prev => [...prev, { text: 'Could not reach the server.', sender: 'bot' }])
    }
  }

  return (
    <div className="chat-container">
      <div className="page-header"><h1>AI Chatbot</h1><p>Ask anything about your team</p></div>
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="chat-messages">
          {messages.map((m, i) => <div key={i} className={`chat-bubble ${m.sender}`}>{m.text}</div>)}
          <div ref={bottomRef} />
        </div>
        <div className="chat-input-bar">
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about interns, tasks, alerts…" onKeyDown={e => e.key === 'Enter' && send()} />
          <button className="chat-send-btn" onClick={send}>Send</button>
        </div>
      </div>
    </div>
  )
}

function SummaryModule({ user }) {
  const [data, setData] = useState(null)
  useEffect(() => { fetch(`${API}/manager/daily-summary?manager_id=${user.local_id}`).then(r => r.json()).then(setData).catch(() => { }) }, [user])
  if (!data) return <p>Loading…</p>

  return (
    <>
      <div className="page-header"><h1>Daily Summary</h1><p>{data.date}</p></div>
      <div className="stats-grid cols-4">
        <KPICard icon={CheckCircle2} label="Completed" value={data.completedToday} color="#10B981" />
        <KPICard icon={Clock} label="In Progress" value={data.inProgress || 0} color="#3B82F6" />
        <KPICard icon={ShieldAlert} label="Blocked" value={data.blocked || 0} color="#EF4444" />
        <KPICard icon={TrendingUp} label="Team Mood" value={data.overallMood} color="#8B5CF6" />
      </div>
      <div className="content-grid cols-2">
        <div className="card">
          <h3>✅ Highlights</h3>
          {data.highlights.map((h, i) => <div key={i} className="summary-highlight"><span className="bullet green"></span>{h}</div>)}
        </div>
        <div className="card">
          <h3>⚠️ Concerns</h3>
          {data.concerns.map((c, i) => <div key={i} className="summary-highlight"><span className="bullet red"></span>{c}</div>)}
        </div>
      </div>
      <div className="card">
        <h3>📅 Upcoming Deadlines</h3>
        <table className="data-table">
          <thead><tr><th>Task</th><th>Assignee</th><th>Priority</th><th>Status</th><th>Deadline</th></tr></thead>
          <tbody>{(data.upcoming || []).map((u, i) => <tr key={i}><td style={{ fontWeight: 600 }}>{u.task}</td><td>{u.assignee}</td><td><span className={`badge ${(u.priority || '').toLowerCase()}`}>{u.priority}</span></td><td><span className={`badge ${u.status === 'In Progress' ? 'in-progress' : 'pending'}`}>{u.status}</span></td><td>{u.deadline}</td></tr>)}</tbody>
        </table>
      </div>
    </>
  )
}

function ExportModule({ user }) {
  const downloadJSON = async (type) => {
    const res = await fetch(`${API}/manager/export/${type}?manager_id=${user.local_id}`)
    const data = await res.json()
    const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = data.filename.replace('.csv', '.json'); a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="page-header"><h1>Data Export</h1><p>Download datasets for offline analysis</p></div>
      <div className="export-cards">
        <div className="export-card" onClick={() => downloadJSON('interns')}>
          <div className="icon">👥</div><h4>Interns Data</h4><p>All intern profiles, scores, and statuses</p>
        </div>
        <div className="export-card" onClick={() => downloadJSON('tasks')}>
          <div className="icon">📋</div><h4>Tasks Data</h4><p>Complete task list with progress and deadlines</p>
        </div>
        <div className="export-card" onClick={() => downloadJSON('alerts')}>
          <div className="icon">🔔</div><h4>Alerts Data</h4><p>All alerts and notifications history</p>
        </div>
      </div>
    </>
  )
}
