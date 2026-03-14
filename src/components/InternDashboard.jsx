import { useState, useEffect } from 'react'
import {
  ClipboardList, FileText, Zap, LineChart as LineChartIcon, Bot,
  LogOut, Plus, CheckCircle2, Clock, PlayCircle, Star, TrendingUp, Award
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { API, COLORS, ProfileDropdown } from './Shared'

const INTERN_MODULES = [
  { key: 'my-tasks', label: 'My Tasks', icon: ClipboardList },
  { key: 'activity', label: 'Daily Activity', icon: FileText },
  { key: 'productivity', label: 'Productivity Score', icon: Zap },
  { key: 'growth', label: 'Growth Tracker', icon: LineChartIcon },
  { key: 'recommendations', label: 'AI Recommendations', icon: Bot },
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
      case 'recommendations': return <InternRecsModule user={user} />
      default: return <InternTasksModule internId={internId} />
    }
  }

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="logo-icon"><TrendingUp size={20} /></div>
          <div className="brand-text">kenex<span className="accent">ai</span></div>
        </div>
        <div className="sidebar-section">Intern Dashboard</div>
        {INTERN_MODULES.map(m => {
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
  const [loading, setLoading] = useState(true)

  const COLUMNS = [
    { id: 'Pending', title: 'TO DO', color: '#64748B' },
    { id: 'In Progress', title: 'IN PROGRESS', color: '#7C3AED' },
    { id: 'Completed', title: 'DONE', color: '#059669' },
    { id: 'Approved', title: 'APPROVED', color: '#1D4ED8' }
  ]

  useEffect(() => {
    fetch(`${API}/intern/tasks/${internId}`)
      .then(r => r.json())
      .then(data => {
        setTasks(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [internId])

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const newStatus = destination.droppableId
    const updatedTasks = tasks.map(t => t.id === draggableId ? { ...t, status: newStatus } : t)
    setTasks(updatedTasks)

    try {
      await fetch(`${API}/intern/tasks/${draggableId}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, progress: newStatus === 'Completed' || newStatus === 'Approved' ? 100 : newStatus === 'Pending' ? 0 : 50 }),
      })
    } catch (err) {
      console.error("Failed to update status", err)
    }
  }

  if (loading) return <div className="loading-state">Loading board...</div>

  return (
    <div className="kanban-module">
      <div className="page-header">
        <h1>Task Kanban Board</h1>
        <p>Drag and drop tasks to update their progress and status</p>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="kanban-board">
          {COLUMNS.map(col => (
            <div key={col.id} className="kanban-column">
              <div className="column-header" style={{ borderTop: `4px solid ${col.color}` }}>
                <span className="column-status-dot" style={{ backgroundColor: col.color }}></span>
                <h3>{col.title}</h3>
                <span className="task-count">{tasks.filter(t => t.status === col.id).length}</span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`column-body ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                  >
                    {tasks.filter(t => t.status === col.id).map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`kanban-card ${snapshot.isDragging ? 'is-dragging' : ''}`}
                          >
                            <div className="card-header">
                              <span className={`card-priority ${task.priority.toLowerCase()}`}>
                                {task.priority}
                              </span>
                              <span className="card-id">{task.id}</span>
                            </div>
                            <div className="card-title">{task.title}</div>
                            <div className="card-footer">
                              <div className="card-deadline">
                                <Clock size={12} />
                                <span>{task.deadline}</span>
                              </div>
                              <div className="card-progress">
                                <div className="progress-mini">
                                  <div className="fill" style={{ width: `${task.progress}%` }}></div>
                                </div>
                                <span>{task.progress}%</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
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
  useEffect(() => { fetch(`${API}/intern/growth/${internId}`).then(r => r.json()).then(setData).catch(() => setData(null)) }, [internId])
  if (!data) return <p>Loading…</p>

  const skillKeys = Object.keys(data.currentSkills || {})
  const certifications = data.certifications || []
  const growthChart = data.growthChart || []
  const chartKeys = growthChart.length && typeof growthChart[0] === 'object' ? Object.keys(growthChart[0]).filter(k => k !== 'week' && k !== 'course') : ['Score']

  return (
    <>
      <div className="page-header"><h1>Growth Tracker</h1><p>Track your learning, certifications, and skill progress</p></div>
      <div className="stats-grid cols-3">
        <div className="stat-card"><div className="stat-label">Total Hours (Certs)</div><div className="stat-value">{data.totalHoursLearned ?? 0}h</div></div>
        <div className="stat-card"><div className="stat-label">Courses Done</div><div className="stat-value">{data.coursesCompleted ?? 0}</div></div>
        <div className="stat-card"><div className="stat-label">Certifications</div><div className="stat-value">{data.certificationsEarned ?? 0} 🏅</div></div>
      </div>

      {certifications.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3>📜 Certifications Completed</h3>
          <p style={{ color: '#64748B', marginBottom: 16, fontSize: '0.9rem' }}>Skill level is derived from your exam score for each certification.</p>
          <div style={{ display: 'grid', gap: 12 }}>
            {certifications.map((c, i) => (
              <div key={i} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 600 }}>{c.course}</div>
                <span className="badge high" style={{ background: c.skill_level === 'Expert' ? '#059669' : c.skill_level === 'Advanced' ? '#7C3AED' : '#64748B' }}>{c.skill_level}</span>
                <span style={{ fontSize: '0.9rem', color: '#64748B' }}>Score: {c.score}%</span>
                <span style={{ fontSize: '0.9rem', color: '#64748B' }}>⏱ {c.hours_spent}h spent</span>
                {c.completed_at && <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{c.completed_at.slice(0, 10)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="content-grid cols-2">
        <div className="card">
          <h3>Skill Growth (Exam Scores)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={growthChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {chartKeys.map((s, i) => (
                <Line key={s} type="monotone" dataKey={s} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3>Current Skill Levels (from exams)</h3>
          {skillKeys.length > 0 ? Object.entries(data.currentSkills).map(([skill, level]) => (
            <div className="skill-bar-group" key={skill}>
              <div className="skill-bar-label"><span>{skill}</span><span style={{ fontWeight: 700 }}>{level}%</span></div>
              <div className="skill-bar"><div className="fill" style={{ width: `${level}%` }}></div></div>
            </div>
          )) : <p style={{ color: '#64748B' }}>Complete course tests to see skill levels here.</p>}
        </div>
      </div>

      <div className="card">
        <h3>🎯 Milestones &amp; Ranking</h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', paddingBottom: 8 }}>
          {data.mentorRank > 0 && (
            <div style={{ minWidth: 200, padding: '16px 20px', border: '1px solid #d1fae5', borderRadius: 14, background: 'var(--color-success-bg)' }}>
              <div style={{ fontSize: '1.3rem', marginBottom: 6 }}>🏆</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Rank #{data.mentorRank} among {data.mentorCohortSize} interns</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-success)' }}>Same mentor cohort</div>
            </div>
          )}
          {(data.milestones || []).map((m, i) => (
            <div key={i} style={{ minWidth: 180, padding: '16px 20px', border: `1px solid ${m.status === 'completed' ? '#d1fae5' : m.status === 'in-progress' ? '#ddd6fe' : '#f1f5f9'}`, borderRadius: 14, background: m.status === 'completed' ? 'var(--color-success-bg)' : m.status === 'in-progress' ? 'var(--color-accent-light)' : '#fafbfc' }}>
              <div style={{ fontSize: '1.3rem', marginBottom: 6 }}>{m.status === 'completed' ? '✅' : m.status === 'in-progress' ? '🔄' : '🔜'}</div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 4 }}>{m.title}</div>
              {m.status === 'completed' && m.date && <div style={{ fontSize: '0.78rem', color: 'var(--color-success)' }}>Completed · {m.date}</div>}
              {m.skill_level && <div style={{ fontSize: '0.78rem', color: '#7C3AED' }}>Level: {m.skill_level}</div>}
              {m.status === 'in-progress' && (
                <div>
                  <div className="progress-bar" style={{ marginTop: 4 }}><div className="fill high" style={{ width: `${m.progress || 0}%` }}></div></div>
                  <div style={{ fontSize: '0.75rem', color: '#7C3AED', marginTop: 4 }}>{m.progress || 0}% complete</div>
                </div>
              )}
              {m.status === 'upcoming' && m.date && <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Starts {m.date}</div>}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function InternRecsModule({ user }) {
  const [recommendations, setRecommendations] = useState([])
  const [completed, setCompleted] = useState(new Set())
  const [testCourse, setTestCourse] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.email) return
    Promise.all([
      fetch(`${API}/recommendations?email=${encodeURIComponent(user.email)}`).then(r => r.json()),
      fetch(`${API}/intern/course-completions?email=${encodeURIComponent(user.email)}`).then(r => r.json())
    ])
      .then(([recData, compData]) => {
        setRecommendations(recData.recommendations || [])
        setCompleted(new Set(compData.completed || []))
      })
      .catch(err => {
        console.error('Error fetching recommendations or completions', err)
        setRecommendations([])
      })
      .finally(() => setLoading(false))
  }, [user?.email])

  const markCompleted = (course) => {
    if (!user?.email) return
    setCompleted(prev => new Set(prev).add(course))
    fetch(`${API}/intern/course-completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, course }),
    }).catch(() => {})
  }

  const startTest = (course) => {
    setTestCourse(course)
  }

  const closeTest = () => {
    setTestCourse(null)
  }

  const onTestComplete = (result) => {
    if (!user?.email || !result?.course) return
    setCompleted(prev => new Set(prev).add(result.course))
    fetch(`${API}/intern/test-result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        course: result.course,
        score: result.score ?? 0,
        hours_spent: result.hours_spent,
      }),
    }).catch(() => {})
  }

  if (loading) return <p>Loading recommendations...</p>

  if (testCourse) {
    return (
      <CourseTest
        course={testCourse}
        onClose={closeTest}
        onTestComplete={onTestComplete}
      />
    )
  }

  return (
    <>
      <div className="page-header">
        <h1>AI Course Recommendations</h1>
        <p>Personalized course suggestions based on your profile</p>
      </div>

      <div className="card">
        <h3>🎓 Recommended Courses for You</h3>
        {recommendations.length > 0 ? (
          <div style={{ display: 'grid', gap: '16px' }}>
            {recommendations.map((rec, i) => (
              <div key={i} style={{ padding: '16px', background: '#fafbfc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{rec.course}</h4>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a href={rec.link} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                      View Course
                    </a>
                    {completed.has(rec.course) ? (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span className="badge high" style={{ alignSelf: 'center' }}>Completed</span>
                        <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem' }} onClick={() => startTest(rec)}>
                          Take Test
                        </button>
                      </div>
                    ) : (
                      <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem' }} onClick={() => markCompleted(rec.course)}>
                        Mark Completed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No recommendations available at this time.</p>
        )}
      </div>
    </>
  )
}

function CourseTest({ course, onClose, onTestComplete }) {
  const courseName = typeof course === 'string' ? course : course?.course
  const courseLink = typeof course === 'object' && course?.link ? course.link : null
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!courseName) return
    setLoading(true)
    setResult(null)
    setError(null)
    const params = new URLSearchParams({ course: courseName })
    if (courseLink) params.set('link', courseLink)
    fetch(`${API}/tests?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        setQuestions(data.questions || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load test questions', err)
        setError('Unable to load test questions.')
        setLoading(false)
      })
  }, [courseName, courseLink])

  const updateAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    setResult(null)

    try {
      const payload = {
        course: courseName,
        ...(courseLink && { link: courseLink }),
        answers: questions.map(q => ({ id: q.id, answer: answers[q.id] ?? null })),
      }
      const res = await fetch(`${API}/tests/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to grade test')
      } else {
        setResult(data)
        onTestComplete?.({ course: courseName, score: data.score, total: data.total })
      }
    } catch (err) {
      console.error(err)
      setError('Failed to submit answers.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p>Loading test...</p>

  if (error) return (
    <div className="card">
      <h3>Test: {courseName}</h3>
      <p style={{ color: 'var(--color-danger)' }}>{error}</p>
      <button className="btn btn-secondary" onClick={onClose}>Back to Recommendations</button>
    </div>
  )

  if (result) {
    return (
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Test Results: {courseName}</h3>
          <button className="btn btn-secondary" onClick={onClose}>Back</button>
        </div>
        <p>
          Score: <strong>{result.score}%</strong> ({result.correct} / {result.total})
        </p>
        <div style={{ marginTop: 16 }}>
          {result.details && result.details.map((d) => (
            <div key={d.id} style={{ marginBottom: 10, padding: 10, border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Question: {questions.find(q => q.id === d.id)?.question}</div>
              <div>
                {d.correct ? (
                  <span style={{ color: 'var(--color-success)' }}>✅ Correct</span>
                ) : (
                  <span style={{ color: 'var(--color-danger)' }}>❌ Incorrect</span>
                )}
              </div>
              {d.expected !== undefined && (
                <div style={{ fontSize: '0.9rem', color: '#64748B' }}>
                  Expected: {typeof d.expected === 'number' ? questions.find(q => q.id === d.id)?.options?.[d.expected] : d.expected}
                  {' | '}
                  Your answer: {typeof d.given === 'number' ? questions.find(q => q.id === d.id)?.options?.[d.given] : d.given}
                </div>
              )}
              {d.expected_keywords && (
                <div style={{ fontSize: '0.9rem', color: '#64748B' }}>
                  Expected keywords: {d.expected_keywords.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="btn btn-primary" onClick={() => { setResult(null); setAnswers({}) }}>
            Retake Test
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    )
  }

  if (!questions.length) {
    return (
      <div className="card">
        <h3>Test: {courseName}</h3>
        <p>No questions found for this topic.</p>
        <button className="btn btn-secondary" onClick={onClose}>Back</button>
      </div>
    )
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Test: {courseName}</h3>
        <button className="btn btn-secondary" onClick={onClose}>Back</button>
      </div>

      <p>Answer all questions below and submit to see your score.</p>

      <div style={{ display: 'grid', gap: 16 }}>
        {questions.map((q, idx) => (
          <div key={q.id} style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff' }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{idx + 1}. {q.question}</div>
            {q.type === 'mcq' ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {q.options?.map((opt, optIndex) => (
                  <label key={optIndex} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name={q.id}
                      value={optIndex}
                      checked={answers[q.id] === optIndex}
                      onChange={() => updateAnswer(q.id, optIndex)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                rows={3}
                value={answers[q.id] || ''}
                onChange={e => updateAnswer(q.id, e.target.value)}
                placeholder="Write your answer here..."
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            )}
          </div>
        ))}
      </div>

      {error && <div style={{ color: 'var(--color-danger)', marginTop: 12 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn btn-primary" onClick={submit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Answers'}
        </button>
        <button className="btn btn-secondary" onClick={() => { setAnswers({}); setResult(null); }} disabled={submitting}>
          Reset
        </button>
      </div>
    </div>
  )
}
