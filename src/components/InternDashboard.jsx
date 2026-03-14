import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts'
import { API, COLORS, ProfileDropdown } from './Shared'

const INTERN_MODULES = [
  { key: 'my-tasks', label: 'My Tasks', icon: '📋' },
  { key: 'activity', label: 'Daily Activity', icon: '📝' },
  { key: 'productivity', label: 'Productivity Score', icon: '⚡' },
  { key: 'growth', label: 'Growth Tracker', icon: '📈' },
  { key: 'recommendations', label: 'AI Recommendations', icon: '🤖' },
]

export default function InternDashboardLayout({ user, onLogout }) {
  const [active, setActive] = useState('my-tasks')
  const internId = user.local_id || 1

  const renderModule = () => {
    switch (active) {
      case 'my-tasks': return <InternTasksModule internId={internId} />
      case 'activity': return <InternActivityModule internId={internId} />
      case 'productivity': return <InternProductivityModule internId={internId} />
      case 'growth': return <InternGrowthModule internId={internId} />
      case 'recommendations': return <InternRecsModule internId={internId} />
      default: return <InternTasksModule internId={internId} />
    }
  }

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">kenex<span className="accent">ai</span></div>
        <div className="sidebar-section">Intern Dashboard</div>
        {INTERN_MODULES.map(m => (
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
          <div className="navbar-title">{INTERN_MODULES.find(m => m.key === active)?.label}</div>
          <div className="navbar-right">
            <ProfileDropdown user={user} onLogout={onLogout} />
          </div>
        </nav>
        <div className="content-area">{renderModule()}</div>
      </div>
    </div>
  )
}

function InternTasksModule({ internId }) {
  const [tasks, setTasks] = useState([])
  useEffect(() => { fetch(`${API}/intern/tasks/${internId}`).then(r => r.json()).then(setTasks).catch(() => { }) }, [internId])

  const updateProgress = async (taskId, newProgress) => {
    const res = await fetch(`${API}/intern/tasks/${taskId}/progress`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress: newProgress }),
    })
    const updated = await res.json()
    setTasks(tasks.map(t => t.id === taskId ? updated : t))
  }

  const completed = tasks.filter(t => t.status === 'Completed').length
  const inProgress = tasks.filter(t => t.status === 'In Progress').length
  const pending = tasks.filter(t => t.status === 'Pending').length

  return (
    <>
      <div className="page-header"><h1>My Tasks</h1><p>Tasks assigned to you by your manager</p></div>
      <div className="stats-grid cols-3">
        <div className="stat-card"><div className="stat-label">In Progress</div><div className="stat-value">{inProgress}</div></div>
        <div className="stat-card"><div className="stat-label">Completed</div><div className="stat-value">{completed}</div></div>
        <div className="stat-card"><div className="stat-label">Pending</div><div className="stat-value">{pending}</div></div>
      </div>
      <div className="card">
        <h3>Task List</h3>
        {tasks.length === 0 ? <p style={{ color: '#64748B' }}>No tasks assigned yet.</p> : (
          <table className="data-table">
            <thead><tr><th>Task</th><th>Priority</th><th>Status</th><th>Progress</th><th>Deadline</th><th>Action</th></tr></thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>{t.title}</td>
                  <td><span className={`badge ${t.priority.toLowerCase()}`}>{t.priority}</span></td>
                  <td><span className={`badge ${t.status === 'Completed' ? 'completed' : t.status === 'In Progress' ? 'in-progress' : 'pending'}`}>{t.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="progress-bar"><div className={`fill ${t.progress > 60 ? 'high' : t.progress > 30 ? 'med' : 'low'}`} style={{ width: `${t.progress}%` }}></div></div>
                      <span style={{ fontSize: '0.8rem', color: '#64748B', minWidth: 32 }}>{t.progress}%</span>
                    </div>
                  </td>
                  <td>{t.deadline}</td>
                  <td>
                    {t.status !== 'Completed' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.78rem' }} onClick={() => updateProgress(t.id, Math.min(t.progress + 25, 100))}>+25%</button>
                        <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.78rem' }} onClick={() => updateProgress(t.id, 100)}>Done</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

function InternActivityModule({ internId }) {
  const [logs, setLogs] = useState([])
  const [form, setForm] = useState({ hours: '', task_worked: '', description: '', blockers: '' })
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => { fetch(`${API}/intern/activity/${internId}`).then(r => r.json()).then(setLogs).catch(() => { }) }, [internId])

  const submitActivity = async (e) => {
    e.preventDefault()
    const res = await fetch(`${API}/intern/activity`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, intern_id: internId, hours: parseFloat(form.hours) }),
    })
    const entry = await res.json()
    setLogs([...logs, entry])
    setForm({ hours: '', task_worked: '', description: '', blockers: '' })
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  const totalHours = logs.reduce((s, l) => s + (l.hours || 0), 0)

  return (
    <>
      <div className="page-header"><h1>Daily Activity</h1><p>Log your work for today</p></div>
      <div className="stats-grid cols-3">
        <div className="stat-card"><div className="stat-label">Total Hours (Week)</div><div className="stat-value">{totalHours}h</div></div>
        <div className="stat-card"><div className="stat-label">Entries Logged</div><div className="stat-value">{logs.length}</div></div>
        <div className="stat-card"><div className="stat-label">Avg Hours/Day</div><div className="stat-value">{logs.length ? (totalHours / logs.length).toFixed(1) : 0}h</div></div>
      </div>
      <div className="content-grid g-2-1">
        <div className="card">
          <h3>📝 Log Today's Work</h3>
          {submitted && <div style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontWeight: 500 }}>✅ Activity logged successfully!</div>}
          <form onSubmit={submitActivity}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group"><label>Hours Worked</label><input type="number" step="0.5" min="0" max="12" placeholder="e.g. 7" value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} required /></div>
              <div className="form-group"><label>Task Worked On</label><input placeholder="e.g. ETL Pipeline" value={form.task_worked} onChange={e => setForm({ ...form, task_worked: e.target.value })} required /></div>
            </div>
            <div className="form-group"><label>Description of Work</label><input placeholder="Describe what you completed today…" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required /></div>
            <div className="form-group"><label>Blockers (if any)</label><input placeholder="Any blockers or issues? Leave empty if none" value={form.blockers} onChange={e => setForm({ ...form, blockers: e.target.value })} /></div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }}>Submit Activity Log</button>
          </form>
        </div>
        <div className="card">
          <h3>Recent Logs</h3>
          {logs.slice(-5).reverse().map((l, i) => (
            <div key={i} style={{ padding: '12px 0', borderBottom: i < 4 ? '1px solid #f1f5f9' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{l.task_worked}</span>
                <span style={{ fontSize: '0.78rem', color: '#64748B' }}>{l.hours}h</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748B' }}>{l.description}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>{l.date}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function InternProductivityModule({ internId }) {
  const [data, setData] = useState(null)
  useEffect(() => { fetch(`${API}/intern/productivity/${internId}`).then(r => r.json()).then(setData).catch(() => { }) }, [internId])
  if (!data) return <p>Loading…</p>

  const kpis = [
    { label: 'Task Completion', value: data.taskCompletionRate, color: '#7C3AED' },
    { label: 'On-Time Rate', value: data.onTimeRate, color: '#1D4ED8' },
    { label: 'Quality Score', value: data.qualityScore, color: '#059669' },
    { label: 'Consistency', value: data.consistency, color: '#d97706' },
  ]

  return (
    <>
      <div className="page-header"><h1>Productivity Score</h1><p>Your auto-calculated KPI breakdown</p></div>
      <div className="stats-grid cols-4">
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(180,91,158,0.06))', border: '1px solid rgba(124,58,237,0.1)' }}>
          <div className="stat-label">Overall Score</div><div className="stat-value" style={{ color: '#7C3AED' }}>{data.overall}%</div>
          <div className="stat-sub">Rank #{data.rank} of {data.totalInterns}</div>
        </div>
        <div className="stat-card"><div className="stat-label">Total Tasks</div><div className="stat-value">{data.totalTasks}</div><div className="stat-sub">{data.completedTasks} completed</div></div>
        <div className="stat-card"><div className="stat-label">In Progress</div><div className="stat-value">{data.inProgressTasks}</div><div className="stat-sub">{data.avgProgress}% avg progress</div></div>
        <div className="stat-card"><div className="stat-label">On-Time Rate</div><div className="stat-value">{data.onTimeRate}%</div><div className="stat-sub up">↑ 3% this week</div></div>
      </div>
      <div className="content-grid cols-2">
        <div className="card">
          <h3>Weekly Productivity Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.weekly}>
              <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7C3AED" stopOpacity={0.25} /><stop offset="100%" stopColor="#7C3AED" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis domain={[50, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="score" stroke="#7C3AED" fill="url(#pg)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3>KPI Breakdown</h3>
          {kpis.map(k => (
            <div className="skill-bar-group" key={k.label}>
              <div className="skill-bar-label"><span>{k.label}</span><span style={{ fontWeight: 700 }}>{k.value}%</span></div>
              <div className="skill-bar"><div className="fill" style={{ width: `${k.value}%`, background: k.color }}></div></div>
            </div>
          ))}
          <div style={{ marginTop: 20, padding: '14px 16px', background: '#fafbfc', borderRadius: 12 }}>
            <div style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 4 }}>How it's calculated</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>30% Task Completion + 25% On-Time + 25% Quality + 20% Consistency</div>
          </div>
        </div>
      </div>
    </>
  )
}

function InternGrowthModule({ internId }) {
  const [data, setData] = useState(null)
  useEffect(() => { fetch(`${API}/intern/growth/${internId}`).then(r => r.json()).then(setData).catch(() => { }) }, [internId])
  if (!data) return <p>Loading…</p>

  const skillKeys = Object.keys(data.currentSkills)

  return (
    <>
      <div className="page-header"><h1>Growth Tracker</h1><p>Track your learning and skill progress over time</p></div>
      <div className="stats-grid cols-3">
        <div className="stat-card"><div className="stat-label">Hours Learned</div><div className="stat-value">{data.totalHoursLearned}h</div></div>
        <div className="stat-card"><div className="stat-label">Courses Done</div><div className="stat-value">{data.coursesCompleted}</div></div>
        <div className="stat-card"><div className="stat-label">Certifications</div><div className="stat-value">{data.certificationsEarned} 🏅</div></div>
      </div>

      <div className="content-grid cols-2">
        <div className="card">
          <h3>Skill Growth Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.growthChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {skillKeys.map((s, i) => (
                <Line key={s} type="monotone" dataKey={s} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3>Current Skill Levels</h3>
          {Object.entries(data.currentSkills).map(([skill, level]) => (
            <div className="skill-bar-group" key={skill}>
              <div className="skill-bar-label"><span>{skill}</span><span style={{ fontWeight: 700 }}>{level}%</span></div>
              <div className="skill-bar"><div className="fill" style={{ width: `${level}%` }}></div></div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>🎯 Learning Milestones</h3>
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
          {data.milestones.map((m, i) => (
            <div key={i} style={{ minWidth: 180, padding: '16px 20px', border: `1px solid ${m.status === 'completed' ? '#d1fae5' : m.status === 'in-progress' ? '#ddd6fe' : '#f1f5f9'}`, borderRadius: 14, background: m.status === 'completed' ? 'var(--color-success-bg)' : m.status === 'in-progress' ? 'var(--color-accent-light)' : '#fafbfc' }}>
              <div style={{ fontSize: '1.3rem', marginBottom: 6 }}>{m.status === 'completed' ? '✅' : m.status === 'in-progress' ? '🔄' : '🔜'}</div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 4 }}>{m.title}</div>
              {m.status === 'completed' && <div style={{ fontSize: '0.78rem', color: 'var(--color-success)' }}>Completed · {m.date}</div>}
              {m.status === 'in-progress' && (
                <div>
                  <div className="progress-bar" style={{ marginTop: 4 }}><div className="fill high" style={{ width: `${m.progress}%` }}></div></div>
                  <div style={{ fontSize: '0.75rem', color: '#7C3AED', marginTop: 4 }}>{m.progress}% complete</div>
                </div>
              )}
              {m.status === 'upcoming' && <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Starts {m.date}</div>}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function InternRecsModule({ internId }) {
  const [data, setData] = useState(null)
  useEffect(() => { fetch(`${API}/intern/recommendations/${internId}`).then(r => r.json()).then(setData).catch(() => { }) }, [internId])
  if (!data) return <p>Loading…</p>

  return (
    <>
      <div className="page-header"><h1>AI Recommendations</h1><p>Personalized suggestions to improve your skills</p></div>

      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(180,91,158,0.06))', border: '1px solid rgba(124,58,237,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: '2rem' }}>🎯</div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>Weekly Goal</div>
            <div style={{ color: '#64748B', fontSize: '0.92rem' }}>{data.weeklyGoal}</div>
          </div>
        </div>
      </div>

      <div className="content-grid cols-2">
        <div className="card">
          <h3>⚡ Skills to Improve</h3>
          {data.skillRecommendations.map((r, i) => (
            <div key={i} style={{ padding: '14px 16px', background: '#fafbfc', borderRadius: 12, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 700 }}>{r.skill}</span>
                <span className="badge high">{r.priority} Priority</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: '0.82rem', color: '#64748B' }}>{r.currentLevel}%</span>
                <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, position: 'relative' }}>
                  <div style={{ width: `${r.currentLevel}%`, height: '100%', background: '#dc2626', borderRadius: 3 }}></div>
                  <div style={{ position: 'absolute', left: `${r.targetLevel}%`, top: -2, width: 2, height: 10, background: '#059669' }}></div>
                </div>
                <span style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 600 }}>{r.targetLevel}%</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748B' }}>{r.suggestion}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <h3>📋 Recommended Tasks</h3>
          {data.taskRecommendations.map((r, i) => (
            <div key={i} style={{ padding: '14px 16px', background: '#fafbfc', borderRadius: 12, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{r.title}</span>
                <span className={`badge ${r.impact === 'High' ? 'high' : 'medium'}`}>{r.impact}</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748B' }}>{r.reason}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>🎓 Recommended Courses</h3>
        <table className="data-table">
          <thead><tr><th>Course</th><th>Provider</th><th>Duration</th><th>Relevance</th></tr></thead>
          <tbody>
            {data.courseRecommendations.map((c, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{c.name}</td>
                <td>{c.provider}</td>
                <td>{c.duration}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="progress-bar"><div className="fill high" style={{ width: `${c.relevance}%` }}></div></div>
                    <span style={{ fontSize: '0.8rem', color: '#64748B' }}>{c.relevance}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>💪 Your Strengths</h3>
        <div style={{ display: 'flex', gap: 16 }}>
          {data.strengths.map((s, i) => (
            <div key={i} style={{ flex: 1, padding: '20px', background: 'var(--color-success-bg)', borderRadius: 14, textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>{i === 0 ? '🌟' : '⭐'}</div>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>{s.skill}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-success)' }}>{s.score}%</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
