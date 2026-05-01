import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const PROJECT_COLORS = ['#4f8ef7', '#a855f7', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#f97316', '#ec4899'];

// ─── Create Project Modal ─────────────────────────────────────────────────────
function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', color: PROJECT_COLORS[0] });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/projects', form);
      toast.success('Project created!');
      onCreated(res.data.project);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">Create New Project</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Project Name</label>
            <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Website Redesign" required minLength={3} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <textarea className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is this project about?" rows={3} />
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {PROJECT_COLORS.map((c) => (
                <button type="button" key={c} onClick={() => setForm({ ...form, color: c })}
                  style={{
                    width: 32, height: 32, borderRadius: 8, background: c, border: 'none', cursor: 'pointer',
                    outline: form.color === c ? `3px solid white` : 'none',
                    outlineOffset: 2,
                    transform: form.color === c ? 'scale(1.15)' : 'none',
                    transition: 'transform 0.15s'
                  }}
                />
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Join Project Modal (invite code fallback) ────────────────────────────────
function JoinProjectModal({ onClose, onJoined }) {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/projects/join', { inviteCode: inviteCode.trim() });
      toast.success(`Joined "${res.data.project.name}"!`);
      onJoined(res.data.project);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid invite code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <h2 className="modal-title">Join via Invite Code</h2>
        <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 20 }}>
          Enter the invite code shared by your project admin.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Invite Code</label>
            <input
              className="form-input"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="e.g. ABC-123XY"
              required
              autoFocus
              style={{ fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !inviteCode.trim()}>
              {loading ? 'Joining...' : 'Join Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [availableProjects, setAvailableProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [activeTab, setActiveTab] = useState('mine');

  const fetchProjects = async () => {
    try {
      const [myRes, availRes] = await Promise.all([
        api.get('/projects'),
        api.get('/projects/available')
      ]);
      setProjects(myRes.data.projects);
      setAvailableProjects(availRes.data.projects);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  // Derive each project's role for the current user
  const getProjectRole = (project) => {
    const member = project.members?.find(
      (m) => (m.user?._id || m.user) === user?._id
    );
    return member?.role || 'Member';
  };

  // One-click join from available projects list
  const handleQuickJoin = async (projectId) => {
    setJoiningId(projectId);
    try {
      const res = await api.post(`/projects/${projectId}/join-direct`);
      toast.success(`Joined "${res.data.project.name}"!`);
      // Move from available to my projects
      setAvailableProjects(availableProjects.filter((p) => p._id !== projectId));
      setProjects([res.data.project, ...projects]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join project');
    } finally {
      setJoiningId(null);
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} you're part of</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setShowJoin(true)}>🔗 Invite Code</button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Project</button>
        </div>
      </div>

      <div className="page-body">
        {/* Tabs */}
        <div style={{ marginBottom: 24 }}>
          <div className="tabs">
            <button className={`tab-btn ${activeTab === 'mine' ? 'active' : ''}`} onClick={() => setActiveTab('mine')}>
              My Projects ({projects.length})
            </button>
            <button className={`tab-btn ${activeTab === 'available' ? 'active' : ''}`} onClick={() => setActiveTab('available')}>
              Available to Join
              {availableProjects.length > 0 && (
                <span style={{
                  marginLeft: 6,
                  background: 'var(--accent)',
                  color: '#fff',
                  borderRadius: 100,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 6px'
                }}>{availableProjects.length}</span>
              )}
            </button>
          </div>
        </div>

        {/* ── My Projects tab ── */}
        {activeTab === 'mine' && (
          <>
            {projects.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📁</div>
                <div className="empty-state-title">No projects yet</div>
                <div className="empty-state-sub">Create a new project or check "Available to Join" to join an existing one</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <button className="btn btn-secondary" onClick={() => setActiveTab('available')}>Browse Projects</button>
                  <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Project</button>
                </div>
              </div>
            ) : (
              <div className="projects-grid">
                {projects.map((project) => {
                  const role = getProjectRole(project);
                  return (
                    <Link to={`/projects/${project._id}`} key={project._id} className="project-card">
                      <div className="project-card-accent" style={{ background: project.color }} />
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 3, background: project.color, flexShrink: 0 }} />
                          <span className={`badge badge-${role.toLowerCase()}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                            {role}
                          </span>
                        </div>
                        <div className="project-card-title">{project.name}</div>
                        <div className="project-card-desc">{project.description || 'No description'}</div>

                        {/* Progress bar */}
                        {project.taskStats && (
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-2)', marginBottom: 4 }}>
                              <span>Progress</span>
                              <span>
                                {project.taskStats.total > 0
                                  ? Math.round((project.taskStats.done / project.taskStats.total) * 100)
                                  : 0}%
                              </span>
                            </div>
                            <div style={{ height: 5, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%',
                                width: `${project.taskStats.total > 0 ? (project.taskStats.done / project.taskStats.total) * 100 : 0}%`,
                                background: 'var(--green)',
                                borderRadius: 3
                              }} />
                            </div>
                          </div>
                        )}

                        <div className="project-card-meta">
                          <div className="member-stack">
                            {project.members?.slice(0, 4).map((m, i) => (
                              <div key={i} className="member-avatar-placeholder">
                                {m.user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                              </div>
                            ))}
                          </div>
                          <span>{project.members?.length} member{project.members?.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Available to Join tab ── */}
        {activeTab === 'available' && (
          <>
            {availableProjects.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <div className="empty-state-title">No projects available</div>
                <div className="empty-state-sub">You're already in all existing projects, or there are none yet. Use an invite code if you have one.</div>
                <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => setShowJoin(true)}>
                  🔗 Use Invite Code
                </button>
              </div>
            ) : (
              <div className="projects-grid">
                {availableProjects.map((project) => (
                  <div key={project._id} className="project-card" style={{ cursor: 'default' }}>
                    <div className="project-card-accent" style={{ background: project.color }} />
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: project.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Not joined</span>
                      </div>
                      <div className="project-card-title">{project.name}</div>
                      <div className="project-card-desc">{project.description || 'No description'}</div>
                      <div className="project-card-meta" style={{ marginBottom: 12 }}>
                        <div className="member-stack">
                          {project.members?.slice(0, 4).map((m, i) => (
                            <div key={i} className="member-avatar-placeholder">
                              {m.user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                            </div>
                          ))}
                        </div>
                        <span>{project.members?.length} member{project.members?.length !== 1 ? 's' : ''}</span>
                      </div>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ width: '100%', marginTop: 8 }}
                        onClick={() => handleQuickJoin(project._id)}
                        disabled={joiningId === project._id}
                      >
                        {joiningId === project._id ? 'Joining...' : '+ Join Project'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={(p) => setProjects([p, ...projects])}
        />
      )}

      {showJoin && (
        <JoinProjectModal
          onClose={() => setShowJoin(false)}
          onJoined={(p) => {
            setProjects([p, ...projects]);
            setAvailableProjects(availableProjects.filter((ap) => ap._id !== p._id));
          }}
        />
      )}
    </div>
  );
}