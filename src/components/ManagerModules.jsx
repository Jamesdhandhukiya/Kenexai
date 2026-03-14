import { useState, useEffect, useRef } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts'
import { API, COLORS } from './Shared'
import {
  Users, ClipboardList, TrendingUp, TrendingDown, Award, Target, Clock,
  Star, Filter, ArrowUpDown, Search, ChevronDown, ChevronUp, Zap, Code2,
  CheckCircle2, AlertTriangle, XCircle, Layers, BarChart3, Crown
} from 'lucide-react'

const CHART_COLORS = ['#6366F1','#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316','#06B6D4']

// ─── Score Badge ───
function ScoreBadge({ score, size = 'md' }) {
  const color = score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444'
  const bg = score >= 75 ? '#ECFDF5' : score >= 50 ? '#FFFBEB' : '#FEF2F2'
  const sz = size === 'lg' ? { fontSize: '1.6rem', padding: '8px 18px' } : { fontSize: '0.9rem', padding: '4px 12px' }
  return <span style={{ background: bg, color, fontWeight: 800, borderRadius: 12, ...sz, display: 'inline-block' }}>{score}%</span>
}

// ─── KPI Card ───
function KPICard({ icon: Icon, label, value, sub, color = '#6366F1', trend }) {
  return (
    <div className="stat-card" style={{ position: 'relative', borderLeft: `4px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value">{value}</div>
          {sub && <div className={`stat-sub ${trend === 'up' ? 'up' : trend === 'down' ? 'down' : ''}`}>{sub}</div>}
        </div>
        {Icon && <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={22} color={color} />
        </div>}
      </div>
    </div>
  )
}

// ─── Filter Bar ───
function FilterBar({ filters, setFilters, options }) {
  return (
    <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={16} style={{ color: '#64748B' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F8FAFC', borderRadius: 10, padding: '6px 12px', border: '1px solid #E2E8F0' }}>
          <Search size={14} color="#94a3b8" />
          <input placeholder="Search interns..." value={filters.search || ''} onChange={e => setFilters({ ...filters, search: e.target.value })}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', width: 140, fontFamily: 'inherit' }} />
        </div>
        <select value={filters.department || ''} onChange={e => setFilters({ ...filters, department: e.target.value })}
          style={{ padding: '7px 12px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: '0.84rem', fontFamily: 'inherit', background: '#F8FAFC', cursor: 'pointer' }}>
          <option value="">All Departments</option>
          {(options.departments || []).map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filters.tech || ''} onChange={e => setFilters({ ...filters, tech: e.target.value })}
          style={{ padding: '7px 12px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: '0.84rem', fontFamily: 'inherit', background: '#F8FAFC', cursor: 'pointer' }}>
          <option value="">All Tech Stacks</option>
          {(options.techStacks || []).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filters.sortBy || 'overall'} onChange={e => setFilters({ ...filters, sortBy: e.target.value })}
          style={{ padding: '7px 12px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: '0.84rem', fontFamily: 'inherit', background: '#F8FAFC', cursor: 'pointer' }}>
          <option value="overall">Sort: Overall Score</option>
          <option value="name">Sort: Name</option>
          <option value="completion_rate">Sort: Completion Rate</option>
          <option value="avg_task_score">Sort: Avg Task Score</option>
          <option value="quality">Sort: Quality</option>
          <option value="tasks">Sort: Total Tasks</option>
          <option value="delay">Sort: Avg Delay</option>
        </select>
        <button onClick={() => setFilters({ ...filters, sortDir: filters.sortDir === 'desc' ? 'asc' : 'desc' })}
          style={{ padding: '7px 10px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowUpDown size={14} /> {filters.sortDir === 'asc' ? '↑' : '↓'}
        </button>
        {(filters.department || filters.tech || filters.search) && (
          <button onClick={() => setFilters({ sortBy: 'overall', sortDir: 'desc' })}
            style={{ padding: '7px 14px', borderRadius: 10, border: 'none', background: '#FEF2F2', color: '#EF4444', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>Clear</button>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════
// OVERVIEW MODULE (Enhanced — intern highlights, no dept/weekly)
// ════════════════════════════════════════════
export function OverviewModule({ user }) {
  const [data, setData] = useState(null)
  useEffect(() => { fetch(`${API}/manager/overview?manager_id=${user.local_id}`).then(r => r.json()).then(setData).catch(() => {}) }, [user])
  if (!data) return <p>Loading…</p>

  const taskPie = [
    { name: 'Completed', value: data.completedTasks },
    { name: 'In Progress', value: data.inProgressTasks },
    { name: 'Pending', value: data.pendingTasks },
    { name: 'Blocked', value: data.blockedTasks || 0 },
  ].filter(d => d.value > 0)

  const feedbackColors = { 'Excellent work': '#10B981', 'Good progress': '#3B82F6', 'Code quality good': '#8B5CF6', 'Well documented': '#14B8A6', 'On track': '#6366F1', 'Needs improvement': '#F59E0B', 'Requires refactoring': '#F97316', 'Delayed due to dependency': '#EF4444' }

  return (
    <>
      <div className="page-header"><h1>Manager Overview</h1><p>Real-time insights from silver & gold data layers</p></div>

      <div className="stats-grid cols-4">
        <KPICard icon={Users} label="Total Interns" value={data.totalInterns} sub={`${data.activeInterns} active`} color="#6366F1" />
        <KPICard icon={Target} label="Avg Task Score" value={`${data.avgScore}%`} sub={`Quality: ${data.avgQuality}/5`} color="#10B981" trend="up" />
        <KPICard icon={CheckCircle2} label="Completion Rate" value={`${data.completionRate}%`} sub={`${data.completedTasks}/${data.totalTasks} tasks`} color="#3B82F6" />
        <KPICard icon={Clock} label="On-Time Delivery" value={`${data.onTimeRate}%`} sub={`Avg delay: ${data.avgDelay || 0}d`} color="#F59E0B" />
      </div>

      {(data.topPerformers || []).length > 0 && (
        <div className="card">
          <h3><Crown size={18} style={{ color: '#F59E0B' }} /> Top Performers</h3>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(3, data.topPerformers.length)}, 1fr)`, gap: 16 }}>
            {data.topPerformers.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18, borderRadius: 16, background: i === 0 ? 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(236,72,153,0.04))' : '#FAFBFC', border: i === 0 ? '1px solid rgba(99,102,241,0.15)' : '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '1.8rem', flexShrink: 0 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{p.department}</div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                    <ScoreBadge score={p.score} />
                    <span style={{ fontSize: '0.78rem', color: '#64748B', alignSelf: 'center' }}>{p.tasksCompleted}/{p.totalTasks} tasks</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="content-grid cols-2">
        <div className="card">
          <h3><AlertTriangle size={18} style={{ color: '#EF4444' }} /> At-Risk Interns</h3>
          {(data.atRiskInterns || []).length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#10B981', background: '#ECFDF5', borderRadius: 12 }}>
              <CheckCircle2 size={28} style={{ marginBottom: 8 }} />
              <div style={{ fontWeight: 700 }}>All interns are on track!</div>
              <div style={{ fontSize: '0.82rem', marginTop: 4, color: '#64748B' }}>No one below risk threshold</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.atRiskInterns.map((r, i) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FECACA' }}>
                  <div className={`avatar-sm a${(i % 6) + 1}`} style={{ width: 36, height: 36, fontSize: '0.75rem' }}>{r.avatar || r.name.split(' ').map(n => n[0]).join('')}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{r.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{r.department}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <ScoreBadge score={r.score} />
                    <div style={{ fontSize: '0.72rem', color: '#EF4444', marginTop: 4 }}>Completion: {r.completionRate}%</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h3><TrendingUp size={18} style={{ color: '#10B981' }} /> High Potential (Worth IT)</h3>
          {(data.worthItInterns || []).length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#64748B', background: '#F8FAFC', borderRadius: 12 }}>
              <div style={{ fontWeight: 700 }}>No candidates identified</div>
              <div style={{ fontSize: '0.82rem', marginTop: 4 }}>Need more data to identify potential</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.worthItInterns.map((r, i) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                  <div className={`avatar-sm a${((i+3) % 6) + 1}`} style={{ width: 36, height: 36, fontSize: '0.75rem' }}>{r.avatar || r.name.split(' ').map(n => n[0]).join('')}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{r.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{r.department}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <ScoreBadge score={r.score} />
                    <div style={{ fontSize: '0.72rem', color: '#10B981', marginTop: 4, fontWeight: 600 }}>Consistent Performer</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="content-grid cols-2">
        <div className="card">
          <h3><CheckCircle2 size={18} style={{ color: '#10B981' }} /> Recently Completed Tasks</h3>
          {(data.recentCompleted || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: '0.88rem' }}>No completed tasks yet</div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Task</th><th>Intern</th><th>Score</th><th>Tech</th><th>Delay</th></tr></thead>
              <tbody>
                {data.recentCompleted.map((t, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, fontSize: '0.84rem' }}>{t.taskName}</td>
                    <td style={{ fontSize: '0.84rem' }}>{t.intern}</td>
                    <td><ScoreBadge score={t.score} /></td>
                    <td><span style={{ padding: '2px 8px', background: '#EEF2FF', color: '#6366F1', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600 }}>{t.techStack}</span></td>
                    <td style={{ color: t.delay > 0 ? '#EF4444' : '#10B981', fontWeight: 600 }}>{t.delay > 0 ? `+${t.delay}d` : '✓'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h3><TrendingUp size={18} style={{ color: '#8B5CF6' }} /> Priority Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.priorityBreakdown || []} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value" nameKey="name">
                {(data.priorityBreakdown || []).map((entry, i) => {
                  const pColor = { Critical: '#EF4444', High: '#F97316', Medium: '#F59E0B', Low: '#10B981' }
                  return <Cell key={i} fill={pColor[entry.name] || CHART_COLORS[i]} />
                })}
              </Pie>
              <Tooltip /><Legend verticalAlign="bottom" iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="content-grid cols-2">
        <div className="card">
          <h3><Layers size={18} style={{ color: '#3B82F6' }} /> Task Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={taskPie} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                {taskPie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
              </Pie>
              <Tooltip /><Legend verticalAlign="bottom" iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{ maxHeight: 310, overflowY: 'auto' }}>
          <h3><Code2 size={18} style={{ color: '#6366F1' }} /> Interns by Tech Stack</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(data.techStackInterns || []).map((tech, i) => (
              <div key={tech.category}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: CHART_COLORS[i % CHART_COLORS.length], marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{tech.category} <span style={{ color: '#94a3b8', fontSize: '0.75rem', marginLeft: 4 }}>({tech.interns.length})</span></div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {tech.interns.slice(0, 5).map(intern => (
                    <div key={intern.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: '#f1f5f9', borderRadius: 20, fontSize: '0.75rem' }}>
                      <span style={{ fontWeight: 600 }}>{intern.name}</span>
                      <ScoreBadge score={intern.score} />
                    </div>
                  ))}
                  {tech.interns.length > 5 && <div style={{ fontSize: '0.75rem', color: '#64748B', padding: '4px 8px' }}>+{tech.interns.length - 5} more</div>}
                </div>
              </div>
            ))}
            {(data.techStackInterns || []).length === 0 && (
              <div style={{ color: '#94a3b8', fontSize: '0.82rem', textAlign: 'center', padding: 20 }}>No tech categories assigned</div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}




// ════════════════════════════════════════════
// INTERN INSIGHTS MODULE (New — replaces old analytics views)
// ════════════════════════════════════════════
export function InternInsightsModule({ user }) {
  const [data, setData] = useState(null)
  const [filters, setFilters] = useState({ sortBy: 'overall', sortDir: 'desc' })
  const [expanded, setExpanded] = useState(null)

  const fetchData = () => {
    const params = new URLSearchParams({ manager_id: user.local_id, sort_by: filters.sortBy || 'overall', sort_dir: filters.sortDir || 'desc' })
    if (filters.department) params.set('department', filters.department)
    if (filters.tech) params.set('tech_stack', filters.tech)
    fetch(`${API}/manager/intern-insights?${params}`).then(r => r.json()).then(setData).catch(() => {})
  }

  useEffect(fetchData, [user, filters])
  if (!data) return <p>Loading…</p>

  const agg = data.aggregated
  const searchTerm = (filters.search || '').toLowerCase()
  const filtered = data.interns.filter(i => !searchTerm || i.name.toLowerCase().includes(searchTerm) || i.email.toLowerCase().includes(searchTerm))

  return (
    <>
      <div className="page-header"><h1>Intern Performance Insights</h1><p>Dynamic analytics from silver & gold data layers</p></div>
      <div className="stats-grid cols-4">
        <KPICard icon={Users} label="Interns Analyzed" value={agg.totalInterns} color="#6366F1" />
        <KPICard icon={Target} label="Avg Overall Score" value={`${agg.avgOverallScore}%`} color="#10B981" />
        <KPICard icon={ClipboardList} label="Total Tasks" value={agg.totalTasks} color="#3B82F6" />
        <KPICard icon={Code2} label="Tech Stacks Used" value={agg.techStack?.length || 0} color="#8B5CF6" />
      </div>

      {/* Aggregated Visualizations */}
      <div className="content-grid cols-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <h3><TrendingUp size={18} style={{ color: '#10B981' }} /> Average Score by Department</h3>
          {(() => {
            const depts = {}
            data.interns.forEach(i => {
              if (!depts[i.department]) depts[i.department] = { sum: 0, count: 0 }
              depts[i.department].sum += i.scores.overall
              depts[i.department].count += 1
            })
            const deptData = Object.keys(depts).map(d => ({
              name: d || 'Unassigned',
              score: Math.round(depts[d].sum / depts[d].count)
            })).sort((a,b) => b.score - a.score)

            return (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={deptData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="score" fill="#10B981" radius={[0,6,6,0]}>
                    {deptData.map((d, i) => <Cell key={d.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          })()}
        </div>
        <div className="card">
          <h3><Layers size={18} style={{ color: '#3B82F6' }} /> Task Categories</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={agg.categories || []} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="count" nameKey="name">
                {(agg.categories || []).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip /><Legend verticalAlign="bottom" iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3><Zap size={18} style={{ color: '#F59E0B' }} /> Task Complexity</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
             {Object.keys(agg.complexities || {}).map((cx, i) => (
                <div key={cx} style={{ flex: 1, textAlign: 'center', padding: '16px 10px', background: `${CHART_COLORS[(i+2) % CHART_COLORS.length]}10`, borderRadius: 12, border: `1px solid ${CHART_COLORS[(i+2) % CHART_COLORS.length]}20` }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: CHART_COLORS[(i+2) % CHART_COLORS.length] }}>{agg.complexities[cx]}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: 4 }}>{cx}</div>
                </div>
             ))}
          </div>
        </div>
        <div className="card">
          <h3><AlertTriangle size={18} style={{ color: '#EF4444' }} /> Priority Distribution</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
            {Object.keys(agg.priorities || {}).map(pri => {
              const count = agg.priorities[pri]
              const maxCount = Math.max(...Object.values(agg.priorities), 1)
              const pct = (count / maxCount) * 100
              const colors = { Critical: '#EF4444', High: '#F97316', Medium: '#3B82F6', Low: '#10B981' }
              const priColor = colors[pri] || '#64748B'
              return (
                <div key={pri}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: priColor }}>{pri}</span>
                    <span style={{ color: '#64748B' }}>{count} tasks</span>
                  </div>
                  <div style={{ height: 6, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: priColor, borderRadius: 3 }}></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <FilterBar filters={filters} setFilters={setFilters} options={data.filterOptions || {}} />

      {/* Score Formula Card */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #EEF2FF, #F5F3FF)', marginBottom: 20, padding: '18px 24px' }}>
        <h3 style={{ marginBottom: 12 }}><Zap size={18} style={{ color: '#6366F1' }} /> Performance Score Formula</h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.82rem' }}>
          {[
            { label: 'Completion Rate', weight: '30%', color: '#10B981' },
            { label: 'Avg Task Score', weight: '25%', color: '#3B82F6' },
            { label: 'Quality Rating', weight: '20%', color: '#8B5CF6' },
            { label: 'On-Time Delivery', weight: '15%', color: '#F59E0B' },
            { label: 'Progress Factor', weight: '10%', color: '#EC4899' },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', padding: '6px 14px', borderRadius: 10, border: `1px solid ${f.color}30` }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: f.color, flexShrink: 0 }}></span>
              <span style={{ fontWeight: 600, color: f.color }}>{f.weight}</span>
              <span style={{ color: '#64748B' }}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Intern Cards */}
      {filtered.map((intern, idx) => (
        <div key={intern.id} className="card" style={{ marginBottom: 16, cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setExpanded(expanded === intern.id ? null : intern.id)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ position: 'relative' }}>
                {idx < 3 && <span style={{ position: 'absolute', top: -8, right: -8, fontSize: '1rem', zIndex: 2 }}>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>}
                <div className={`avatar-sm a${(idx % 6) + 1}`} style={{ width: 42, height: 42, fontSize: '0.85rem' }}>{intern.avatar || intern.name.split(' ').map(n => n[0]).join('')}</div>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{intern.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{intern.department} · {intern.email}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Score</div><ScoreBadge score={intern.scores.overall} /></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Tasks</div><span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{intern.taskBreakdown.completed}/{intern.taskBreakdown.total}</span></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Quality</div><span style={{ fontWeight: 700 }}>{intern.scores.quality_avg}%</span></div>
              {expanded === intern.id ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
            </div>
          </div>

          {expanded === intern.id && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #f1f5f9', animation: 'fadeIn 0.3s ease' }}>
              {/* Score breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Completion', val: intern.scores.completion_rate, color: '#10B981' },
                  { label: 'Task Score', val: intern.scores.avg_task_score, color: '#3B82F6' },
                  { label: 'Quality', val: intern.scores.quality_avg, color: '#8B5CF6' },
                  { label: 'On-Time', val: intern.scores.on_time_rate, color: '#F59E0B' },
                  { label: 'Progress', val: intern.scores.progress_factor, color: '#EC4899' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center', padding: 12, background: `${s.color}08`, borderRadius: 12, border: `1px solid ${s.color}20` }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: s.color }}>{s.val}%</div>
                  </div>
                ))}
              </div>
              {/* Tech stack & categories */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', marginBottom: 8 }}>TECH STACK</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {intern.techStack.map(t => (
                      <span key={t.name} style={{ padding: '4px 10px', background: '#EEF2FF', color: '#6366F1', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600 }}>
                        {t.name} <span style={{ opacity: 0.6 }}>({t.count})</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', marginBottom: 8 }}>TASK STATUS</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { label: 'Done', val: intern.taskBreakdown.completed, bg: '#ECFDF5', color: '#10B981' },
                      { label: 'Active', val: intern.taskBreakdown.inProgress, bg: '#EFF6FF', color: '#3B82F6' },
                      { label: 'Blocked', val: intern.taskBreakdown.blocked, bg: '#FEF2F2', color: '#EF4444' },
                      { label: 'Pending', val: intern.taskBreakdown.notStarted, bg: '#FFFBEB', color: '#F59E0B' },
                    ].map(s => (
                      <div key={s.label} style={{ padding: '6px 12px', background: s.bg, borderRadius: 8, textAlign: 'center' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: s.color }}>{s.val}</div>
                        <div style={{ fontSize: '0.68rem', color: s.color, fontWeight: 600 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Hours & Delay */}
              <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                <span style={{ fontSize: '0.82rem', color: '#64748B' }}>⏱ Est: <b>{intern.estimatedHours}h</b> | Act: <b>{intern.actualHours}h</b></span>
                <span style={{ fontSize: '0.82rem', color: intern.avgDelay > 2 ? '#EF4444' : '#64748B' }}>📅 Avg Delay: <b>{intern.avgDelay} days</b></span>
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  )
}

// ════════════════════════════════════════════
// BEST PERFORMERS MODULE
// ════════════════════════════════════════════
export function BestPerformersModule({ user }) {
  const [data, setData] = useState([])
  useEffect(() => { fetch(`${API}/manager/best-performers?manager_id=${user.local_id}`).then(r => r.json()).then(setData).catch(() => {}) }, [user])
  if (!data.length) return <p>Loading…</p>

  const top3 = data.slice(0, 3)
  const rest = data.slice(3)
  const radarData = top3.length > 0 ? ['completion_rate', 'avg_task_score', 'quality_avg', 'on_time_rate', 'progress_factor'].map(key => {
    const obj = { metric: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace('Avg ', '').replace(' Rate', '').replace(' Factor', '') }
    top3.forEach(p => { obj[p.name] = p.scores[key] || 0 })
    return obj
  }) : []

  return (
    <>
      <div className="page-header"><h1>Best Performers</h1><p>Rankings computed from silver table task data</p></div>
      {/* Podium */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 28, justifyContent: 'center', alignItems: 'flex-end' }}>
        {[1, 0, 2].map(idx => {
          const p = top3[idx]
          if (!p) return null
          const isFirst = idx === 0
          const medals = ['🥇', '🥈', '🥉']
          const heights = [220, 260, 200]
          const bgs = ['linear-gradient(135deg,#EFF6FF,#DBEAFE)', 'linear-gradient(135deg,#EEF2FF,#E0E7FF)', 'linear-gradient(135deg,#ECFDF5,#D1FAE5)']
          return (
            <div key={p.id} style={{ flex: 1, maxWidth: 280, height: heights[idx], background: bgs[idx], borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', border: isFirst ? '2px solid #6366F1' : '1px solid #E2E8F0', boxShadow: isFirst ? '0 8px 30px rgba(99,102,241,0.15)' : 'none', transition: 'transform 0.3s' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{medals[idx]}</div>
              <div className={`avatar-sm a${(idx % 6) + 1}`} style={{ width: 50, height: 50, fontSize: '1rem', marginBottom: 8 }}>{p.avatar || p.name.split(' ').map(n => n[0]).join('')}</div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{p.name}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: 8 }}>{p.department}</div>
              <ScoreBadge score={p.scores.overall} size="lg" />
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 8 }}>{p.tasksCompleted}/{p.totalTasks} tasks · {p.excellentFeedbacks} ⭐</div>
            </div>
          )
        })}
      </div>
      {/* Radar comparison of top 3 */}
      {radarData.length > 0 && (
        <div className="card">
          <h3><Star size={18} style={{ color: '#F59E0B' }} /> Top 3 Skill Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e2e8f0" /><PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} /><PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
              {top3.map((p, i) => <Radar key={p.id} name={p.name} dataKey={p.name} stroke={CHART_COLORS[i]} fill={CHART_COLORS[i]} fillOpacity={0.12} strokeWidth={2} />)}
              <Legend /><Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
      {/* Table for rest */}
      {rest.length > 0 && (
        <div className="card">
          <h3>All Rankings</h3>
          <table className="data-table">
            <thead><tr><th>#</th><th>Intern</th><th>Score</th><th>Tasks Done</th><th>Quality</th><th>On-Time</th><th>Delay</th></tr></thead>
            <tbody>
              {data.map((p, i) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 700, color: i < 3 ? '#6366F1' : '#64748B' }}>{i + 1}</td>
                  <td><div className="user-cell"><div className={`avatar-sm a${(i % 6) + 1}`}>{p.avatar || p.name[0]}</div><div><div className="name">{p.name}</div><div className="dept">{p.department}</div></div></div></td>
                  <td><ScoreBadge score={p.scores.overall} /></td>
                  <td>{p.tasksCompleted}/{p.totalTasks}</td>
                  <td>{p.scores.quality_avg}%</td>
                  <td>{p.scores.on_time_rate}%</td>
                  <td style={{ color: p.avgDelay > 2 ? '#EF4444' : '#10B981' }}>{p.avgDelay}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

// ════════════════════════════════════════════
// TECH STACK ANALYTICS MODULE
// ════════════════════════════════════════════
export function TechAnalyticsModule({ user }) {
  const [data, setData] = useState(null)
  useEffect(() => { fetch(`${API}/manager/tech-analytics?manager_id=${user.local_id}`).then(r => r.json()).then(setData).catch(() => {}) }, [user])
  if (!data) return <p>Loading…</p>

  return (
    <>
      <div className="page-header"><h1>Tech Stack Analytics</h1><p>Performance breakdown by technology, category & complexity</p></div>
      <div className="content-grid cols-2">
        <div className="card">
          <h3><Code2 size={18} style={{ color: '#6366F1' }} /> Score by Tech Stack</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.techStacks}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend />
              <Bar dataKey="avgScore" name="Avg Score" fill="#6366F1" radius={[6,6,0,0]} />
              <Bar dataKey="completionRate" name="Completion %" fill="#10B981" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3><Layers size={18} style={{ color: '#3B82F6' }} /> Tasks by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.categories} cx="50%" cy="50%" innerRadius={50} outerRadius={100} paddingAngle={3} dataKey="totalTasks" nameKey="name">
                {data.categories.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Tech Stack Table */}
      <div className="card">
        <h3>Detailed Tech Stack Metrics</h3>
        <table className="data-table">
          <thead><tr><th>Technology</th><th>Tasks</th><th>Completed</th><th>Completion %</th><th>Avg Score</th><th>Quality</th><th>Avg Delay</th><th>Interns</th></tr></thead>
          <tbody>
            {data.techStacks.map(t => (
              <tr key={t.name}>
                <td style={{ fontWeight: 700 }}><span style={{ padding: '3px 10px', background: '#EEF2FF', borderRadius: 8, color: '#6366F1', fontSize: '0.82rem' }}>{t.name}</span></td>
                <td>{t.totalTasks}</td>
                <td>{t.completed}</td>
                <td><ScoreBadge score={t.completionRate} /></td>
                <td><ScoreBadge score={t.avgScore} /></td>
                <td>{t.avgQuality}/5</td>
                <td style={{ color: t.avgDelay > 2 ? '#EF4444' : '#10B981' }}>{t.avgDelay}d</td>
                <td>{t.internCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Complexity */}
      <div className="card">
        <h3>Complexity Distribution</h3>
        <div style={{ display: 'flex', gap: 16 }}>
          {data.complexities.map((c, i) => (
            <div key={c.name} style={{ flex: 1, textAlign: 'center', padding: 20, borderRadius: 16, background: `${CHART_COLORS[i]}10`, border: `1px solid ${CHART_COLORS[i]}25` }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: CHART_COLORS[i] }}>{c.totalTasks}</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{c.name}</div>
              <div style={{ fontSize: '0.82rem', color: '#64748B' }}>Avg Score: {c.avgScore}% · Done: {c.completed}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export { ScoreBadge, KPICard, FilterBar }
