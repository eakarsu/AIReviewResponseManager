import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail(process.env.REACT_APP_DEMO_EMAIL || '');
    setPassword(process.env.REACT_APP_DEMO_PASSWORD || '');
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">🤖</div>
          <h1>AI Review Manager</h1>
          <p>Auto-draft replies to Google & Yelp reviews</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-full demo-btn"
            onClick={fillDemoCredentials}
          >
            Fill Demo Credentials
          </button>
        </form>

        <div className="login-links">
          <a href="/forgot-password" className="login-link">Forgot your password?</a>
        </div>

        <div className="login-footer">
          <p className="demo-info">
            <strong>Demo Account:</strong><br />
            Email: admin@reviewmanager.com<br />
            Password: admin123
          </p>
        </div>
      </div>

      <div className="login-features">
        <h2>Features</h2>
        <div className="feature-list">
          <div className="feature-item">
            <span className="feature-icon">⭐</span>
            <div>
              <h3>Review Management</h3>
              <p>Manage Google and Yelp reviews in one place</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🤖</span>
            <div>
              <h3>AI-Powered Responses</h3>
              <p>Generate professional replies automatically</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📋</span>
            <div>
              <h3>Custom Templates</h3>
              <p>Create and reuse response templates</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📊</span>
            <div>
              <h3>Analytics Dashboard</h3>
              <p>Track review sentiment and response rates</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
