import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchUser, setSearchUser] = useState('');
  const [searchTask, setSearchTask] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/admin/users'),
      api.get('/admin/tasks'),
      api.get('/projects')
    ])
      .then(([usersRes, tasksRes, projectsRes]) => {
        setUsers(usersRes.data.users);
        setTasks(tasksRes.data.tasks);
        setProjects(projectsRes.data.projects);
      })
      .catch(() => toast.error('Failed to load admin data'))
      .finally(() => setLoading(false));
  }, []);

  const handleDeleteUser = async (userId) => {
    if (userId === user._id) return toast.error("You can't delete yourself");
    if (!window.confirm('Delete this user and all their data?')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(users.filter((u) => u._id !== userId));
      toast.success('User deleted');
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const handleChangeUserRole = async (userId, newRole) => {
    try {
      const res = await api.put(`/admin/users/${userId}`, { role: newRole });
      setUsers(users.map((u) => u._id === userId ? res.data.user : u));
      toast.success('Role updated');
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(tasks.filter((t) => t._id !== taskId));
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const handleReassignTask = async (taskId, userId) => {
    try {
      const res = await api.put(`/tasks/${taskId}`, { assignedTo: userId || null });
      setTasks(tasks.map((t) => t._id === taskId ? res.data.task : t));
      toast.success('Task reassigned');
    } catch {
      toast.error('Failed to reassign task');
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  const filteredTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(searchTask.toLowerCase()) ||
    t.assignedTo?.name?.toLowerCase().includes(searchTask.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🛡️ Admin Panel</h1>
          <p className="page-subtitle">Manage all users, tasks, and projects across the platform</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="page-body">
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
          {[
            { label: 'Total Users', value: users.length, icon: '👥', color: 'var(--accent)' },
            { label: 'Total Projects', value: projects.length, icon: '📁', color: '#a855f7' },
            { label: 'Total Tasks', value: tasks.length, icon: '✅', color: 'var(--green)' },
            { label: 'Admins', value: users.filter((u) => u.role === 'admin').length, icon: '🛡️', color: 'var(--yellow)' }
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div className="stat-label">{s.icon} {s.label}</div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ marginBottom: 20 }}>
          <div className="tabs">
            <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
              Users ({users.length})
            </button>
            <button className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>
              All Tasks ({tasks.length})
            </button>
            <button className={`tab-btn ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>
              Projects ({projects.length})
            </button>
          </div>
        </div>

        {/* ── Users tab ── */}
        {activeTab === 'users' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <input
                className="form-input"
                placeholder="🔍 Search users by name or email..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                style={{ maxWidth: 360 }}
              />
            </div>
            <table className="task-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Global Role</th>
                  <th>Joined</th>
                  <th>Tasks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="user-avatar-placeholder" style={{ width: 32, height: 32, fontSize: 12 }}>
                          {u.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>
                            {u.name}
                            {u._id === user._id && <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: 11, marginLeft: 6 }}>(you)</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-2)' }}>{u.email}</td>
                    <td>
                      {u._id === user._id ? (
                        <span className="badge badge-admin">admin</span>
                      ) : (
                        <select
                          className="form-input"
                          value={u.role || 'member'}
                          onChange={(e) => handleChangeUserRole(u._id, e.target.value)}
                          style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}
                        >
                          <option value="member">member</option>
                          <option value="admin">admin</option>
                        </select>
                      )}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-2)' }}>
                      {u.createdAt ? format(new Date(u.createdAt), 'MMM d, yyyy') : '—'}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {tasks.filter((t) => t.assignedTo?._id === u._id).length}
                    </td>
                    <td>
                      {u._id !== user._id && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(u._id)}>🗑️</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="empty-state"><div className="empty-state-sub">No users found</div></div>
            )}
          </div>
        )}

        {/* ── Tasks tab ── */}
        {activeTab === 'tasks' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <input
                className="form-input"
                placeholder="🔍 Search tasks by title or assignee..."
                value={searchTask}
                onChange={(e) => setSearchTask(e.target.value)}
                style={{ maxWidth: 360 }}
              />
            </div>
            <table className="task-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Assigned To</th>
                  <th>Due Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task._id}>
                    <td className="task-title-cell">{task.title}</td>
                    <td>
                      {task.project ? (
                        <Link to={`/projects/${task.project._id}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 13 }}>
                          {task.project.name}
                        </Link>
                      ) : '—'}
                    </td>
                    <td><span className={`badge badge-${task.status.replace(' ', '').toLowerCase()}`}>{task.status}</span></td>
                    <td><span className={`badge badge-${task.priority.toLowerCase()}`}>{task.priority}</span></td>
                    <td>
                      {/* Admin can reassign any task */}
                      <select
                        className="form-input"
                        value={task.assignedTo?._id || ''}
                        onChange={(e) => handleReassignTask(task._id, e.target.value)}
                        style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}
                      >
                        <option value="">Unassigned</option>
                        {users.map((u) => (
                          <option key={u._id} value={u._id}>{u.name}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : '—'}
                    </td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTask(task._id)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTasks.length === 0 && (
              <div className="empty-state"><div className="empty-state-sub">No tasks found</div></div>
            )}
          </div>
        )}

        {/* ── Projects tab ── */}
        {activeTab === 'projects' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="task-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Members</th>
                  <th>Tasks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: project.color }} />
                        <Link to={`/projects/${project._id}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                          {project.name}
                        </Link>
                      </div>
                      {project.description && (
                        <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                          {project.description.substring(0, 60)}{project.description.length > 60 ? '...' : ''}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="member-stack">
                          {project.members?.slice(0, 3).map((m, i) => (
                            <div key={i} className="member-avatar-placeholder" style={{ width: 24, height: 24, fontSize: 9 }}>
                              {m.user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                            </div>
                          ))}
                        </div>
                        <span style={{ fontSize: 13 }}>{project.members?.length}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {tasks.filter((t) => t.project?._id === project._id).length}
                    </td>
                    <td>
                      <Link to={`/projects/${project._id}`} className="btn btn-ghost btn-sm">View →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {projects.length === 0 && (
              <div className="empty-state"><div className="empty-state-sub">No projects yet</div></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}