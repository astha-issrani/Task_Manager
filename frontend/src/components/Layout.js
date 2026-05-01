import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Layout() {
  const { user, logout, isGlobalAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⚡</div>
          <div>
            <div className="sidebar-logo-text">TaskFlow</div>
            <div className="sidebar-logo-sub">v1.0</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">📊</span> Dashboard
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">📁</span> Projects
          </NavLink>
          {/* Show Admin panel link only for global admins */}
          {isGlobalAdmin && (
            <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">🛡️</span> Admin Panel
            </NavLink>
          )}
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar-placeholder">{initials}</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="user-email" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{user?.email}</div>
              {isGlobalAdmin && (
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  background: 'var(--accent)',
                  color: '#fff',
                  borderRadius: 4,
                  padding: '1px 5px',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  flexShrink: 0
                }}>Admin</span>
              )}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={handleLogout} title="Logout">🚪</button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}