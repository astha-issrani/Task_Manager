import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, isPast } from 'date-fns';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const COLORS = { 'To Do': '#94a3b8', 'In Progress': '#f59e0b', Done: '#22c55e' };

export default function DashboardPage() {
  const { user, isGlobalAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Pass a query param so backend can filter by assigned user for members
    const endpoint = isGlobalAdmin ? '/dashboard' : '/dashboard?scope=mine';
    api.get(endpoint)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isGlobalAdmin]);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const pieData = data
    ? Object.entries(data.tasksByStatus).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            👋 Hello, {user?.name?.split(' ')[0]}
            {isGlobalAdmin && (
              <span style={{
                marginLeft: 10,
                fontSize: 12,
                fontWeight: 700,
                background: 'var(--accent)',
                color: '#fff',
                borderRadius: 6,
                padding: '3px 10px',
                verticalAlign: 'middle',
                letterSpacing: '0.5px'
              }}>ADMIN</span>
            )}
          </h1>
          <p className="page-subtitle">
            {isGlobalAdmin
              ? "Here's the full task overview across all projects"
              : "Here's your assigned task overview"}
          </p>
        </div>
        {/* Only admins (or project creators) can create projects */}
        {isGlobalAdmin && (
          <Link to="/projects" className="btn btn-primary">+ New Project</Link>
        )}
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Tasks</div>
            <div className="stat-value">{data?.totalTasks ?? 0}</div>
            <div className="stat-sub">{isGlobalAdmin ? 'across all projects' : 'assigned to you'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">To Do</div>
            <div className="stat-value" style={{ color: '#94a3b8' }}>{data?.tasksByStatus['To Do'] ?? 0}</div>
            <div className="stat-sub">not started</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">In Progress</div>
            <div className="stat-value" style={{ color: 'var(--yellow)' }}>{data?.tasksByStatus['In Progress'] ?? 0}</div>
            <div className="stat-sub">being worked on</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Done</div>
            <div className="stat-value" style={{ color: 'var(--green)' }}>{data?.tasksByStatus['Done'] ?? 0}</div>
            <div className="stat-sub">completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Overdue</div>
            <div className="stat-value" style={{ color: data?.overdueTasks > 0 ? 'var(--red)' : 'var(--green)' }}>
              {data?.overdueTasks ?? 0}
            </div>
            <div className="stat-sub">past due date</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
          {/* Pie Chart */}
          <div className="card">
            <div className="section-title">Tasks by Status</div>
            {pieData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={4}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: '32px 0' }}>
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-sub">No tasks yet</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              {Object.entries(COLORS).map(([label, color]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Tasks per user — only shown to admins */}
          {isGlobalAdmin ? (
            <div className="card">
              <div className="section-title">Tasks per Member</div>
              {data?.tasksByUser?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {data.tasksByUser.map((item) => (
                    <div key={item._id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="user-avatar-placeholder" style={{ width: 32, height: 32, fontSize: 12 }}>
                        {item.user.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{item.user.name}</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', flex: 1, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${item.total > 0 ? (item.done / item.total) * 100 : 0}%`, background: 'var(--green)', borderRadius: 3 }} />
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, fontFamily: 'Space Mono', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                        {item.done}/{item.total}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '32px 0' }}>
                  <div className="empty-state-icon">👥</div>
                  <div className="empty-state-sub">No assigned tasks yet</div>
                </div>
              )}
            </div>
          ) : (
            /* Member sees their own progress card instead */
            <div className="card">
              <div className="section-title">Your Progress</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
                {['To Do', 'In Progress', 'Done'].map((status) => {
                  const count = data?.tasksByStatus[status] ?? 0;
                  const total = data?.totalTasks ?? 0;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={status}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                        <span style={{ fontWeight: 600 }}>{status}</span>
                        <span style={{ color: 'var(--text-2)' }}>{count} tasks ({pct}%)</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: COLORS[status],
                          borderRadius: 4,
                          transition: 'width 0.6s ease'
                        }} />
                      </div>
                    </div>
                  );
                })}
                <div style={{ marginTop: 8, padding: '12px 16px', background: 'var(--surface-2, rgba(255,255,255,0.04))', borderRadius: 10, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-2)' }}>Completion rate: </span>
                  <span style={{ fontWeight: 700, color: 'var(--green)' }}>
                    {data?.totalTasks > 0
                      ? Math.round(((data?.tasksByStatus['Done'] ?? 0) / data.totalTasks) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent tasks */}
        <div className="card">
          <div className="section-title">
            {isGlobalAdmin ? 'Recent Tasks' : 'My Assigned Tasks'}
          </div>
          {data?.recentTasks?.length > 0 ? (
            <table className="task-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                  {isGlobalAdmin && <th>Assigned To</th>}
                </tr>
              </thead>
              <tbody>
                {data.recentTasks.map((task) => {
                  const overdue = isPast(new Date(task.dueDate)) && task.status !== 'Done';
                  return (
                    <tr key={task._id}>
                      <td className="task-title-cell">{task.title}</td>
                      <td>
                        <Link to={`/projects/${task.project._id}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 13 }}>
                          {task.project.name}
                        </Link>
                      </td>
                      <td>
                        <span className={`badge badge-${task.status.replace(' ', '').toLowerCase()}`}>{task.status}</span>
                      </td>
                      <td>
                        <span className={`badge badge-${task.priority.toLowerCase()}`}>{task.priority}</span>
                      </td>
                      <td>
                        <span className={`due-date ${overdue ? 'overdue' : ''}`}>
                          {format(new Date(task.dueDate), 'MMM d, yyyy')}
                          {overdue && ' ⚠️'}
                        </span>
                      </td>
                      {isGlobalAdmin && (
                        <td>
                          {task.assignedTo ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div className="user-avatar-placeholder" style={{ width: 22, height: 22, fontSize: 9 }}>
                                {task.assignedTo.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                              <span style={{ fontSize: 13 }}>{task.assignedTo.name}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-3)', fontSize: 13 }}>Unassigned</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🎯</div>
              <div className="empty-state-title">No tasks yet</div>
              <div className="empty-state-sub">
                {isGlobalAdmin
                  ? 'Create a project and add tasks to get started'
                  : 'You have no tasks assigned to you yet'}
              </div>
              {isGlobalAdmin && (
                <Link to="/projects" className="btn btn-primary" style={{ marginTop: 8 }}>Create Project</Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}