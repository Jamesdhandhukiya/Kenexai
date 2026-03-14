import { useState, useEffect, useRef } from 'react'
import {
  BarChart as BarChartIcon, Users, ClipboardList, Scale, TrendingUp, Bell,
  Bot, Newspaper, Download, LogOut, Plus, Search, Filter, 
  Trash2, ShieldAlert, CheckCircle2, Clock, Globe
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts'
import { API, COLORS, ProfileDropdown } from './Shared'

const MODULES = [
  { key: 'overview', label: 'Overview', icon: BarChartIcon },
  { key: 'interns', label: 'Intern Management', icon: Users },
  { key: 'tasks', label: 'Task Assignment', icon: ClipboardList },
  { key: 'comparison', label: 'Intern Comparison', icon: Scale },
  { key: 'analytics', label: 'Performance Analytics', icon: TrendingUp },
  { key: 'alerts', label: 'Flags & Alerts', icon: ShieldAlert },
  { key: 'predictions', label: 'Predictions', icon: Globe },
  { key: 'chatbot', label: 'AI Chatbot', icon: Bot },
  { key: 'summary', label: 'Daily Summary', icon: Newspaper },
  { key: 'export', label: 'Data Export', icon: Download },
]

export default function ManagerDashboardLayout({ user, onLogout }) {
  const [active, setActive] = useState('overview')

  const renderModule = () => {
    switch (active) {
      case 'overview': return <OverviewModule user={user} />
      case 'interns': return <InternModule user={user} />
      case 'tasks': return <TaskModule user={user} />
      case 'comparison': return <ComparisonModule user={user} />
      case 'analytics': return <AnalyticsModule user={user} />
      case 'alerts': return <AlertsModule user={user} />
      case 'predictions': return <PredictionModule user={user} />
      case 'chatbot': return <ChatbotModule user={user} />
      case 'summary': return <SummaryModule user={user} />
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

function OverviewModule({ user }) {
  const [data, setData] = useState(null)
  useEffect(() => { fetch(`${API}/manager/overview?manager_id=${user?.local_id}`).then(r => r.json()).then(setData).catch(() => { }) }, [user])
  if (!data) return <p>Loading…</p>

  const taskPie = [
    { name: 'Completed', value: data.completedTasks },
    { name: 'In Progress', value: data.inProgressTasks },
    { name: 'Pending', value: data.pendingTasks },
  ]

  return (
    <>
      <div className="page-header"><h1>Manager Overview</h1><p>Quick snapshot of your team's progress</p></div>
      <div className="stats-grid cols-4">
        <div className="stat-card"><div className="stat-label">Total Interns</div><div className="stat-value">{data.totalInterns}</div><div className="stat-sub">{data.activeInterns} active</div></div>
        <div className="stat-card"><div className="stat-label">Avg Score</div><div className="stat-value">{data.avgScore}%</div><div className="stat-sub up">↑ 4% from last week</div></div>
        <div className="stat-card"><div className="stat-label">Completion Rate</div><div className="stat-value">{data.completionRate}%</div><div className="stat-sub">{data.completedTasks}/{data.totalTasks} tasks</div></div>
        <div className="stat-card"><div className="stat-label">Alerts</div><div className="stat-value">{data.unreadAlerts}</div><div className="stat-sub down">unread alerts</div></div>
      </div>
      <div className="content-grid g-2-1">
        <div className="card">
          <h3>Weekly Performance Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.perfTrend}>
              <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7C3AED" stopOpacity={0.25} /><stop offset="100%" stopColor="#7C3AED" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="score" stroke="#7C3AED" fill="url(#cg)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3>Task Status</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={taskPie} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                {taskPie.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card">
        <h3>Department Breakdown</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.departments}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="avgScore" fill="#7C3AED" radius={[6, 6, 0, 0]} />
            <Bar dataKey="interns" fill="#1D4ED8" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}

function InternModule({ user }) {
  const [interns, setInterns] = useState([])
  useEffect(() => { fetch(`${API}/manager/interns?manager_id=${user?.local_id}`).then(r => r.json()).then(setInterns).catch(() => { }) }, [user])

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
    if(user?.local_id) {
        fetch(`${API}/manager/tasks?manager_id=${user.local_id}`).then(r => r.json()).then(setTasks).catch(() => { }) 
        fetch(`${API}/manager/interns?manager_id=${user.local_id}`).then(r => r.json()).then(data => {
            setMyInterns(data)
        }).catch(() => { })
    }
  }, [user])

  const createTask = async () => {
    const res = await fetch(`${API}/manager/tasks?manager_id=${user?.local_id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
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
        <div className="stat-card"><div className="stat-label">In Progress</div><div className="stat-value">{tasks.filter(t => t.status === 'In Progress').length}</div></div>
        <div className="stat-card"><div className="stat-label">Completed</div><div className="stat-value">{tasks.filter(t => t.status === 'Completed').length}</div></div>
        <div className="stat-card"><div className="stat-label">Pending</div><div className="stat-value">{tasks.filter(t => t.status === 'Pending').length}</div></div>
      </div>
      <div className="card">
        <table className="data-table">
          <thead><tr><th>Task</th><th>Assignee</th><th>Priority</th><th>Status</th><th>Progress</th><th>Deadline</th></tr></thead>
          <tbody>
            {tasks.map(t => (
              <tr key={t.id}>
                <td style={{ fontWeight: 600 }}>{t.title}</td>
                <td>{t.assignee}</td>
                <td><span className={`badge ${t.priority.toLowerCase()}`}>{t.priority}</span></td>
                <td><span className={`badge ${t.status === 'Completed' ? 'completed' : t.status === 'In Progress' ? 'in-progress' : 'pending'}`}>{t.status}</span></td>
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

  useEffect(() => { fetch(`${API}/manager/comparison?manager_id=${user?.local_id}`).then(r => r.json()).then(d => { setData(d); setSelected(d.slice(0, 2).map(i => i.id)) }).catch(() => { }) }, [user])

  const toggle = (id) => {
    if (selected.includes(id)) setSelected(selected.filter(x => x !== id))
    else if (selected.length < 3) setSelected([...selected, id])
  }

  const compared = data.filter(d => selected.includes(d.id))
  const skills = compared.length > 0 ? Object.keys(compared[0].skills) : []
  const radarData = skills.map(s => {
    const obj = { skill: s }
    compared.forEach(c => { obj[c.name] = c.skills[s] })
    return obj
  })

  return (
    <>
      <div className="page-header"><h1>Intern Comparison</h1><p>Compare up to 3 interns side-by-side</p></div>
      <div className="card">
        <h3>Select Interns to Compare</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {data.map((d, i) => (
            <button key={d.id} className={`btn ${selected.includes(d.id) ? 'btn-primary' : 'btn-secondary'}`} onClick={() => toggle(d.id)}>
              {d.name}
            </button>
          ))}
        </div>
      </div>
      {compared.length >= 2 && (
        <div className="content-grid cols-2">
          <div className="card">
            <h3>Skill Radar</h3>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                {compared.map((c, i) => (
                  <Radar key={c.id} name={c.name} dataKey={c.name} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15} strokeWidth={2} />
                ))}
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3>Quick Stats</h3>
            {compared.map((c, i) => (
              <div key={c.id} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div className={`avatar-sm a${(i % 6) + 1}`}>{c.name.split(' ').map(n => n[0]).join('')}</div>
                  <div><div style={{ fontWeight: 700 }}>{c.name}</div><div style={{ fontSize: '0.78rem', color: '#64748B' }}>{c.department}</div></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div className="stat-card" style={{ padding: '12px 14px' }}><div className="stat-label" style={{ fontSize: '0.7rem' }}>Score</div><div className="stat-value" style={{ fontSize: '1.4rem' }}>{c.overallScore}%</div></div>
                  <div className="stat-card" style={{ padding: '12px 14px' }}><div className="stat-label" style={{ fontSize: '0.7rem' }}>Tasks</div><div className="stat-value" style={{ fontSize: '1.4rem' }}>{c.tasksCompleted}</div></div>
                  <div className="stat-card" style={{ padding: '12px 14px' }}><div className="stat-label" style={{ fontSize: '0.7rem' }}>Streak</div><div className="stat-value" style={{ fontSize: '1.4rem' }}>{c.streak}d</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function AnalyticsModule({ user }) {
  const [data, setData] = useState(null)
  useEffect(() => { fetch(`${API}/manager/analytics?manager_id=${user?.local_id}`).then(r => r.json()).then(setData).catch(() => { }) }, [user])
  if (!data) return <p>Loading…</p>

  return (
    <>
      <div className="page-header"><h1>Performance Analytics</h1><p>Deep dive into team performance metrics</p></div>
      <div className="content-grid cols-2">
        <div className="card">
          <h3>Monthly Performance</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="avgScore" name="Avg Score" fill="#7C3AED" radius={[6, 6, 0, 0]} />
              <Bar dataKey="tasksCompleted" name="Tasks Done" fill="#1D4ED8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3>Skill Distribution</h3>
          {data.skills.map(s => (
            <div className="skill-bar-group" key={s.skill}>
              <div className="skill-bar-label"><span>{s.skill}</span><span>{s.avg}%</span></div>
              <div className="skill-bar"><div className="fill" style={{ width: `${s.avg}%` }}></div></div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h3>Top Performers</h3>
        <div style={{ display: 'flex', gap: 20 }}>
          {data.topPerformers.map((p, i) => (
            <div key={p.id} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14, padding: '16px', background: i === 0 ? 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(180,91,158,0.06))' : '#fafbfc', borderRadius: 14 }}>
              <div style={{ fontSize: '2rem' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
              <div>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div style={{ fontSize: '0.82rem', color: '#64748B' }}>{p.department}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#7C3AED', marginTop: 2 }}>{p.score}%</div>
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
  useEffect(() => { fetch(`${API}/manager/alerts?manager_id=${user?.local_id}`).then(r => r.json()).then(setAlerts).catch(() => { }) }, [user])

  return (
    <>
      <div className="page-header"><h1>Flags & Alerts</h1><p>Monitor critical notifications and warnings</p></div>
      <div className="stats-grid cols-3">
        <div className="stat-card"><div className="stat-label">Unread</div><div className="stat-value">{alerts.filter(a => !a.read).length}</div></div>
        <div className="stat-card"><div className="stat-label">Warnings</div><div className="stat-value">{alerts.filter(a => a.type === 'warning' || a.type === 'danger').length}</div></div>
        <div className="stat-card"><div className="stat-label">Total</div><div className="stat-value">{alerts.length}</div></div>
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
  useEffect(() => { fetch(`${API}/manager/predictions?manager_id=${user?.local_id}`).then(r => r.json()).then(setPreds).catch(() => { }) }, [user])

  const chartData = preds.map(p => ({ name: p.name.split(' ')[0], current: p.currentScore, predicted: p.predictedScore }))

  return (
    <>
      <div className="page-header"><h1>Predictions</h1><p>AI‑powered forecasts for intern performance</p></div>
      <div className="card">
        <h3>Current vs Predicted Scores</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="current" name="Current" fill="#7C3AED" radius={[6, 6, 0, 0]} />
            <Bar dataKey="predicted" name="Predicted" fill="#B45B9E" radius={[6, 6, 0, 0]} />
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
                <td>{p.currentScore}%</td>
                <td>{p.predictedScore}%</td>
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
      const res = await fetch(`${API}/manager/chat?manager_id=${user?.local_id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: userMsg }) })
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
  useEffect(() => { fetch(`${API}/manager/daily-summary?manager_id=${user?.local_id}`).then(r => r.json()).then(setData).catch(() => { }) }, [user])
  if (!data) return <p>Loading…</p>

  return (
    <>
      <div className="page-header"><h1>Daily Summary</h1><p>{data.date}</p></div>
      <div className="stats-grid cols-4">
        <div className="stat-card"><div className="stat-label">Completed Today</div><div className="stat-value">{data.completedToday}</div></div>
        <div className="stat-card"><div className="stat-label">New Tasks</div><div className="stat-value">{data.newTasks}</div></div>
        <div className="stat-card"><div className="stat-label">Hours Logged</div><div className="stat-value">{data.teamHoursLogged}</div></div>
        <div className="stat-card"><div className="stat-label">Team Mood</div><div className="stat-value" style={{ fontSize: '1.4rem' }}>{data.overallMood} ✨</div></div>
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
          <thead><tr><th>Task</th><th>Assignee</th><th>Deadline</th></tr></thead>
          <tbody>{data.upcoming.map((u, i) => <tr key={i}><td style={{ fontWeight: 600 }}>{u.task}</td><td>{u.assignee}</td><td>{u.deadline}</td></tr>)}</tbody>
        </table>
      </div>
    </>
  )
}

function ExportModule({ user }) {
  const downloadJSON = async (type) => {
    const res = await fetch(`${API}/manager/export/${type}?manager_id=${user?.local_id}`)
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
