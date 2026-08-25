import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Datasets', icon: '⬡' },
  { to: '/profile', label: 'Profile', icon: '◯' },
];

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">◈</span>
          <span className="brand-name">DataQuality</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-item ${location.pathname.startsWith(item.to) ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
          {user?.role === 'ADMIN' && (
            <Link
              to="/admin"
              className={`nav-item ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
            >
              <span className="nav-icon">⊞</span>
              Admin
            </Link>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm logout-btn" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile topbar */}
      <div className="mobile-topbar">
        <span className="brand-name">◈ DataQuality</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setMenuOpen((o) => !o)}>
          ☰
        </button>
      </div>

      {menuOpen && (
        <div className="mobile-menu">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="nav-item"
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          {user?.role === 'ADMIN' && (
            <Link to="/admin" className="nav-item" onClick={() => setMenuOpen(false)}>
              Admin
            </Link>
          )}
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      )}

      <main className="main-content">{children}</main>
    </div>
  );
}
