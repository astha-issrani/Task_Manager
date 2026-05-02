import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
                    outline: form.color === c ? '3px solid white' : 'none',
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

// ─── Invite Code Modal ────────────────────────────────────────────────────────
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

// ─── Project Preview Modal ────────────────────────────────────────────────────
function ProjectPreviewModal({ projectId, onClose, onJoined, onEnter }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    api.get(`/projects/preview/${projectId}`)
      .then((res) => setData(res.data))
      .catch(() => toast.error('Failed to load project preview'))
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await api.post(`/projects/${projectId}/join-direct`);
      toast.success(`Joined "${res.data.project.name}"!`);
      onJoined(res.data.project);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <div className="spinner" />
          </div>
        ) : data ? (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 14, height: 14, borderRadius: 4, background: data.project.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{data.project.name}</h2>
                  {data.userRole && (
                    <span className={`badge badge-${data.userRole.toLowerCase()}`}>{data.userRole}</span>
                  )}
                  {!data.isMember && (
                    <span style={{ fontSize: 11, color: 'var(--text-3)', background: 'var(--bg-3)', padding: '2px 8px', borderRadius: 100 }}>Not joined</span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
                  {data.project.description || 'No description'}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: 20, padding: '14px 16px', background: 'var(--bg-3)', borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>Progress</span>
                <span>{data.taskStats.total > 0 ? Math.round((data.taskStats.done / data.taskStats.total) * 100) : 0}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${data.taskStats.total > 0 ? (data.taskStats.done / data.taskStats.total) * 100 : 0}%`,
                  background: 'var(--green)',
                  borderRadius: 4,
                  transition: 'width 0.5s ease'
                }} />
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, color: 'var(--text-2)' }}>
                <span>📋 {data.taskStats.total} total tasks</span>
                <span style={{ color: 'var(--yellow)' }}>⏳ {data.taskStats.inProgress} in progress</span>
                <span style={{ color: 'var(--green)' }}>✅ {data.taskStats.done} done</span>
              </div>
            </div>

            {/* Members */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                Team Members ({data.project.members?.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 200, overflowY: 'auto' }}>
                {data.project.members?.map((member) => (
                  <div key={member.user._id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="user-avatar-placeholder" style={{ width: 30, height: 30, fontSize: 11, flexShrink: 0 }}>
                      {member.user.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{member.user.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{member.user.email}</div>
                    </div>
                    <span className={`badge badge-${member.role.toLowerCase()}`} style={{ fontSize: 10 }}>
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
              {data.isMember ? (
                <button className="btn btn-primary" onClick={() => { onClose(); onEnter(projectId); }}>
                  Open Project →
                </button>
              ) : (
                <button className="btn btn-primary" onClick={handleJoin} disabled={joining}>
                  {joining ? 'Joining...' : '+ Join Project'}
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="empty-state"><div className="empty-state-sub">Failed to load project</div></div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [availableProjects, setAvailableProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [previewProjectId, setPreviewProjectId] = useState(null);
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

  const getProjectRole = (project) => {
    const member = project.members?.find(
      (m) => (m.user?._id || m.user) === user?._id
    );
    return member?.role || 'Member';
  };

  const handleJoined = (newProject) => {
    setAvailableProjects((prev) => prev.filter((p) => p._id !== newProject._id));
    setProjects((prev) => [newProject, ...prev]);
    setActiveTab('mine');
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const renderProjectCard = (project, isAvailable = false) => {
    const role = isAvailable ? null : getProjectRole(project);

    return (
      <div
        key={project._id}
        className="project-card"
        style={{ cursor: 'pointer' }}
        onClick={() => setPreviewProjectId(project._id)}
      >
        <div className="project-card-accent" style={{ background: project.color }} />
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: project.color, flexShrink: 0 }} />
            {role ? (
              <span className={`badge badge-${role.toLowerCase()}`} style={{ fontSize: 10, padding: '2px 8px' }}>{role}</span>
            ) : (
              <span style={{ fontSize: 10, color: 'var(--text-3)', background: 'var(--bg-3)', padding: '2px 8px', borderRadius: 100 }}>Not joined</span>
            )}
          </div>
          <div className="project-card-title">{project.name}</div>
          <div className="project-card-desc">{project.description || 'No description'}</div>

          {/* Progress bar */}
          {project.taskStats && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-2)', marginBottom: 4 }}>
                <span>Progress</span>
                <span>{project.taskStats.total > 0 ? Math.round((project.taskStats.done / project.taskStats.total) * 100) : 0}%</span>
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

          {isAvailable && (
            <div style={{
              marginTop: 10,
              padding: '6px 0 0',
              borderTop: '1px solid var(--border)',
              fontSize: 12,
              color: 'var(--accent)',
              fontWeight: 600
            }}>
              Click to preview & join →
            </div>
          )}
        </div>
      </div>
    );
  };

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
                  marginLeft: 6, background: 'var(--accent)', color: '#fff',
                  borderRadius: 100, fontSize: 10, fontWeight: 700, padding: '1px 6px'
                }}>{availableProjects.length}</span>
              )}
            </button>
          </div>
        </div>

        {/* My Projects */}
        {activeTab === 'mine' && (
          projects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📁</div>
              <div className="empty-state-title">No projects yet</div>
              <div className="empty-state-sub">Create a new project or check "Available to Join"</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button className="btn btn-secondary" onClick={() => setActiveTab('available')}>Browse Projects</button>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Project</button>
              </div>
            </div>
          ) : (
            <div className="projects-grid">
              {projects.map((p) => renderProjectCard(p, false))}
            </div>
          )
        )}

        {/* Available to Join */}
        {activeTab === 'available' && (
          availableProjects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <div className="empty-state-title">No projects available</div>
              <div className="empty-state-sub">You're already in all projects. Use an invite code if you have one.</div>
              <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => setShowJoin(true)}>
                🔗 Use Invite Code
              </button>
            </div>
          ) : (
            <div className="projects-grid">
              {availableProjects.map((p) => renderProjectCard(p, true))}
            </div>
          )
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={(p) => setProjects([p, ...projects])}
        />
      )}

      {showJoin && (
        <JoinProjectModal
          onClose={() => setShowJoin(false)}
          onJoined={handleJoined}
        />
      )}

      {previewProjectId && (
        <ProjectPreviewModal
          projectId={previewProjectId}
          onClose={() => setPreviewProjectId(null)}
          onJoined={handleJoined}
          onEnter={(id) => navigate(`/projects/${id}`)}
        />
      )}
    </div>
  );
}