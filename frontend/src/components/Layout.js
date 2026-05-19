import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/reviews', label: 'Reviews', icon: '⭐' },
    { path: '/drafts', label: 'Drafts', icon: '📝' },
    { path: '/templates', label: 'Templates', icon: '📋' },
    { path: '/businesses', label: 'Businesses', icon: '🏪' },
    { type: 'divider', label: 'AI Tools' },
    { path: '/fake-reviews', label: 'Fake Detector', icon: '🔍' },
    { path: '/review-summaries', label: 'Summarizer', icon: '📑' },
    { path: '/trends', label: 'Trend Analyzer', icon: '📈' },
    { path: '/counterfeit', label: 'Counterfeit', icon: '⚠️' },
    { path: '/competitors', label: 'Competitors', icon: '🏆' },
    { path: '/personalizer', label: 'Personalizer', icon: '✨' },
    { path: '/solicitations', label: 'Solicitor', icon: '📧' },
    { path: '/reputation', label: 'Reputation Score', icon: '⭐' },
    { path: '/bulk-import', label: 'Bulk Import', icon: '📥' },
    { path: '/semantic-search', label: 'Semantic Search', icon: '🔎' },
    { path: '/custom-views', label: 'Review Views', icon: '📉' },
    { type: 'divider', label: 'Settings' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h1 className="logo">
            <span className="logo-icon">🤖</span>
            {sidebarOpen && <span className="logo-text">ReviewAI</span>}
          </h1>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item, index) => (
            item.type === 'divider' ? (
              <div key={index} className="nav-divider">
                {sidebarOpen && <span>{item.label}</span>}
              </div>
            ) : (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${location.pathname === item.path || location.pathname.startsWith(item.path + '/') ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {sidebarOpen && <span className="nav-label">{item.label}</span>}
              </Link>
            )
          ))}
        </nav>

        <div className="sidebar-footer">
          {sidebarOpen && user && (
            <div className="user-info">
              <div className="user-avatar">{user.name?.charAt(0) || 'U'}</div>
              <div className="user-details">
                <span className="user-name">{user.name}</span>
                <span className="user-email">{user.email}</span>
              </div>
            </div>
          )}
          <button className="logout-btn" onClick={handleLogout}>
            <span>🚪</span>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="content-wrapper">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
