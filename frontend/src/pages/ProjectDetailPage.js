import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format, isPast } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

// ─── Task Modal ───────────────────────────────────────────────────────────────
function TaskModal({ task, members, projectId, onClose, onSaved, userRole }) {
  const isNew = !task;
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    dueDate: task?.dueDate ? task.dueDate.substring(0, 10) : '',
    priority: task?.priority || 'Medium',
    status: task?.status || 'To Do',
    assignedTo: task?.assignedTo?._id || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let res;
      if (isNew) {
        res = await api.post('/tasks', { ...form, projectId });
        toast.success('Task created!');
      } else {
        // Members can only update status; admins can update everything
        const payload = userRole === 'Admin'
          ? form
          : { status: form.status };
        res = await api.put(`/tasks/${task._id}`, payload);
        toast.success('Task updated!');
      }
      onSaved(res.data.task, isNew);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">{isNew ? 'Create Task' : userRole === 'Admin' ? 'Edit Task' : 'Update Task Status'}</h2>
        {userRole === 'Member' && !isNew && (
          <div style={{
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: 13,
            color: 'var(--yellow)'
          }}>
            ℹ️ As a Member, you can only update the status of your assigned tasks.
          </div>
        )}
        <form onSubmit={handleSubmit}>
          {userRole === 'Admin' && (
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required minLength={3} autoFocus />
            </div>
          )}
          {userRole === 'Admin' && (
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: userRole === 'Admin' ? '1fr 1fr' : '1fr', gap: 16 }}>
            {userRole === 'Admin' && (
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input className="form-input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} autoFocus={userRole === 'Member'}>
                <option>To Do</option>
                <option>In Progress</option>
                <option>Done</option>
              </select>
            </div>
            {userRole === 'Admin' && (
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
            )}
          </div>
          {userRole === 'Admin' && (
            <div className="form-group">
              <label className="form-label">Assign To</label>
              <select className="form-input" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}>
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user._id} value={m.user._id}>{m.user.name} ({m.role})</option>
                ))}
              </select>
            </div>
          )}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : isNew ? 'Create Task' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add Member Modal ────────────────────────────────────────────────────────
function AddMemberModal({ projectId, onClose, onAdded }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post(`/projects/${projectId}/members`, { email });
      toast.success('Member added!');
      onAdded(res.data.project);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <h2 className="modal-title">Add Member</h2>
        <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 20 }}>Invite a user by their registered email address.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" required autoFocus />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Adding...' : 'Add Member'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Progress Bar ────────────────────────────────────────────────────────────
function ProgressBar({ tasks }) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'Done').length;
  const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div style={{ padding: '16px 20px', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Overall Progress</span>
        <span style={{ fontWeight: 700, fontSize: 20, color: pct === 100 ? 'var(--green)' : 'var(--accent)' }}>{pct}%</span>
      </div>
      <div style={{ height: 10, borderRadius: 5, background: 'var(--border)', overflow: 'hidden', position: 'relative' }}>
        {/* In-progress segment */}
        <div style={{
          position: 'absolute',
          height: '100%',
          width: `${total > 0 ? ((done + inProgress) / total) * 100 : 0}%`,
          background: 'var(--yellow)',
          borderRadius: 5,
          transition: 'width 0.6s ease'
        }} />
        {/* Done segment on top */}
        <div style={{
          position: 'absolute',
          height: '100%',
          width: `${pct}%`,
          background: 'var(--green)',
          borderRadius: 5,
          transition: 'width 0.6s ease'
        }} />
      </div>
      <div style={{ display: 'flex', gap: 20, marginTop: 10, fontSize: 12, color: 'var(--text-2)' }}>
        <span style={{ color: '#94a3b8' }}>● {tasks.filter(t => t.status === 'To Do').length} To Do</span>
        <span style={{ color: 'var(--yellow)' }}>● {inProgress} In Progress</span>
        <span style={{ color: 'var(--green)' }}>● {done} Done</span>
        {total > 0 && <span style={{ marginLeft: 'auto' }}>{done}/{total} tasks complete</span>}
      </div>
    </div>
  );
}

// ─── Invite Code Box ─────────────────────────────────────────────────────────
function InviteCodeBox({ projectId }) {
  const [code, setCode] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchCode = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/projects/${projectId}/invite-code`);
      setCode(res.data.inviteCode);
    } catch {
      toast.error('Could not fetch invite code');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success('Invite code copied!');
  };

  const regenerate = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/projects/${projectId}/invite-code/regenerate`);
      setCode(res.data.inviteCode);
      toast.success('New invite code generated');
    } catch {
      toast.error('Failed to regenerate code');
    } finally {
      setLoading(false);
    }
  };

  if (!code) {
    return (
      <button className="btn btn-secondary btn-sm" onClick={fetchCode} disabled={loading}>
        {loading ? 'Loading...' : '🔗 Show Invite Code'}
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <div style={{
        fontFamily: 'monospace',
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: '0.15em',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '6px 14px',
        color: 'var(--accent)'
      }}>
        {code}
      </div>
      <button className="btn btn-ghost btn-sm" onClick={copyCode} title="Copy">📋</button>
      <button className="btn btn-ghost btn-sm" onClick={regenerate} disabled={loading} title="Regenerate">🔄</button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks');

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [showMyTasksOnly, setShowMyTasksOnly] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [projRes, tasksRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/tasks?projectId=${id}`)
      ]);
      setProject(projRes.data.project);
      setUserRole(projRes.data.userRole);
      setTasks(tasksRes.data.tasks);
      // Members default to seeing only their tasks
      if (projRes.data.userRole === 'Member') setShowMyTasksOnly(true);
    } catch (err) {
      toast.error('Failed to load project');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleTaskSaved = (savedTask, isNew) => {
    if (isNew) setTasks([savedTask, ...tasks]);
    else setTasks(tasks.map((t) => (t._id === savedTask._id ? savedTask : t)));
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(tasks.filter((t) => t._id !== taskId));
      toast.success('Task deleted');
    } catch (err) {
      toast.error('Failed to delete task');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      const res = await api.delete(`/projects/${id}/members/${userId}`);
      setProject(res.data.project);
      toast.success('Member removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm('Delete this project and ALL its tasks? This cannot be undone.')) return;
    try {
      await api.delete(`/projects/${id}`);
      toast.success('Project deleted');
      navigate('/projects');
    } catch (err) {
      toast.error('Failed to delete project');
    }
  };

  const handleLeaveProject = async () => {
    if (!window.confirm('Leave this project? You will lose access unless re-invited.')) return;
    try {
      await api.post(`/projects/${id}/leave`);
      toast.success('Left project');
      navigate('/projects');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to leave project');
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  // Apply filters
  let filteredTasks = tasks;
  if (showMyTasksOnly) filteredTasks = filteredTasks.filter((t) => t.assignedTo?._id === user._id);
  if (filterStatus !== 'All') filteredTasks = filteredTasks.filter((t) => t.status === filterStatus);

  const todoCount = tasks.filter((t) => t.status === 'To Do').length;
  const inProgressCount = tasks.filter((t) => t.status === 'In Progress').length;
  const doneCount = tasks.filter((t) => t.status === 'Done').length;
  const overdueCount = tasks.filter((t) => t.status !== 'Done' && isPast(new Date(t.dueDate))).length;

  // Member: tasks assigned to them
  const myTasks = tasks.filter((t) => t.assignedTo?._id === user._id);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 14, height: 14, borderRadius: 4, background: project.color, flexShrink: 0 }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 className="page-title">{project.name}</h1>
              <span className={`badge badge-${userRole?.toLowerCase()}`}>{userRole}</span>
            </div>
            <p className="page-subtitle">{project.description || 'No description'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {userRole === 'Admin' && <InviteCodeBox projectId={id} />}
          {userRole === 'Admin' && (
            <>
              <button className="btn btn-primary" onClick={() => { setEditingTask(null); setShowTaskModal(true); }}>+ Add Task</button>
              <button className="btn btn-danger btn-sm" onClick={handleDeleteProject}>Delete Project</button>
            </>
          )}
          {userRole === 'Member' && (
            <button className="btn btn-secondary btn-sm" onClick={handleLeaveProject}>Leave Project</button>
          )}
        </div>
      </div>

      <div className="page-body">
        {/* Progress bar — always visible */}
        <ProgressBar tasks={tasks} />

        {/* Mini stats */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
          {[
            { label: 'To Do', value: todoCount, color: '#94a3b8' },
            { label: 'In Progress', value: inProgressCount, color: 'var(--yellow)' },
            { label: 'Done', value: doneCount, color: 'var(--green)' },
            { label: 'Overdue', value: overdueCount, color: 'var(--red)' }
          ].map((s) => (
            <div key={s.label} className="stat-card" style={{ padding: '16px 20px' }}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ fontSize: 26, color: s.color }}>{s.value}</div>
              {userRole === 'Member' && s.label !== 'Overdue' && (
                <div className="stat-sub" style={{ fontSize: 11 }}>
                  {myTasks.filter((t) => t.status === s.label).length} assigned to you
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Tabs + filters */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div className="tabs">
            <button className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>Tasks ({tasks.length})</button>
            <button className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>Members ({project.members?.length})</button>
          </div>
          {activeTab === 'tasks' && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* My tasks toggle — admins can also use it */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: 'var(--text-2)' }}>
                <input
                  type="checkbox"
                  checked={showMyTasksOnly}
                  onChange={(e) => setShowMyTasksOnly(e.target.checked)}
                  style={{ accentColor: 'var(--accent)' }}
                />
                My tasks only
              </label>
              <div className="tabs">
                {['All', 'To Do', 'In Progress', 'Done'].map((s) => (
                  <button key={s} className={`tab-btn ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tasks tab */}
        {activeTab === 'tasks' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {filteredTasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🎯</div>
                <div className="empty-state-title">No tasks here</div>
                <div className="empty-state-sub">
                  {userRole === 'Admin'
                    ? 'Add tasks to get the team moving'
                    : showMyTasksOnly
                    ? 'No tasks assigned to you in this filter'
                    : 'No tasks match the current filter'}
                </div>
                {userRole === 'Admin' && (
                  <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => { setEditingTask(null); setShowTaskModal(true); }}>+ Add Task</button>
                )}
              </div>
            ) : (
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Assigned To</th>
                    <th>Due Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => {
                    const overdue = isPast(new Date(task.dueDate)) && task.status !== 'Done';
                    // Members can only edit tasks assigned to them
                    const canEdit = userRole === 'Admin' || task.assignedTo?._id === user._id;
                    return (
                      <tr key={task._id}>
                        <td>
                          <div className="task-title-cell">{task.title}</div>
                          {task.description && <div className="task-desc">{task.description.substring(0, 80)}{task.description.length > 80 ? '...' : ''}</div>}
                        </td>
                        <td>
                          <span className={`badge badge-${task.status.replace(' ', '').toLowerCase()}`}>{task.status}</span>
                        </td>
                        <td>
                          <span className={`badge badge-${task.priority.toLowerCase()}`}>{task.priority}</span>
                        </td>
                        <td>
                          {task.assignedTo ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div className="user-avatar-placeholder" style={{ width: 26, height: 26, fontSize: 10 }}>
                                {task.assignedTo.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                              <span style={{ fontSize: 13 }}>
                                {task.assignedTo.name}
                                {task.assignedTo._id === user._id && (
                                  <span style={{ color: 'var(--accent)', fontSize: 11, marginLeft: 4 }}>(you)</span>
                                )}
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-3)', fontSize: 13 }}>Unassigned</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className={`due-date ${overdue ? 'overdue' : ''}`}>
                              {format(new Date(task.dueDate), 'MMM d, yyyy')}
                            </span>
                            {overdue && <span className="overdue-pill">Overdue</span>}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {canEdit && (
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => { setEditingTask(task); setShowTaskModal(true); }}
                                title={userRole === 'Member' ? 'Update status' : 'Edit task'}
                              >
                                {userRole === 'Member' ? '🔄' : '✏️'}
                              </button>
                            )}
                            {userRole === 'Admin' && (
                              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTask(task._id)}>🗑️</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Members tab */}
        {activeTab === 'members' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div className="section-title" style={{ margin: 0 }}>Team Members</div>
              {userRole === 'Admin' && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowAddMember(true)}>+ Add Member</button>
              )}
            </div>
            {project.members?.map((member) => {
              // Count tasks assigned to this member
              const memberTaskCount = tasks.filter((t) => t.assignedTo?._id === member.user._id).length;
              const memberDoneCount = tasks.filter((t) => t.assignedTo?._id === member.user._id && t.status === 'Done').length;

              return (
                <div key={member.user._id} className="member-row">
                  <div className="user-avatar-placeholder">
                    {member.user.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="member-info" style={{ flex: 1 }}>
                    <div className="member-info-name">
                      {member.user.name}
                      {member.user._id === user._id && <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: 12 }}> (you)</span>}
                    </div>
                    <div className="member-info-email">{member.user.email}</div>
                    {/* Task progress per member */}
                    {memberTaskCount > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <div style={{ height: 4, width: 80, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${(memberDoneCount / memberTaskCount) * 100}%`,
                            background: 'var(--green)',
                            borderRadius: 2
                          }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{memberDoneCount}/{memberTaskCount} tasks done</span>
                      </div>
                    )}
                  </div>
                  <span className={`badge badge-${member.role.toLowerCase()}`}>{member.role}</span>
                  {userRole === 'Admin' && member.user._id !== user._id && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(member.user._id)}>Remove</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showTaskModal && (
        <TaskModal
          task={editingTask}
          members={project.members}
          projectId={id}
          userRole={userRole}
          onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
          onSaved={handleTaskSaved}
        />
      )}

      {showAddMember && (
        <AddMemberModal
          projectId={id}
          onClose={() => setShowAddMember(false)}
          onAdded={(updatedProject) => setProject(updatedProject)}
        />
      )}
    </div>
  );
}