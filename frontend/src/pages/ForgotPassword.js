import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './Login.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">🔑</div>
          <h1>Reset Password</h1>
          <p>Enter your email to receive a password reset link</p>
        </div>

        {sent ? (
          <div className="alert alert-success" style={{ textAlign: 'center' }}>
            <p>If an account with that email exists, a reset link has been sent.</p>
            <p style={{ marginTop: 12 }}>Check your email or console output.</p>
            <Link to="/login" style={{ color: '#6366f1', marginTop: 16, display: 'inline-block' }}>
              Back to Login
            </Link>
          </div>
        ) : (
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
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Link to="/login" style={{ color: '#6366f1', fontSize: 14 }}>Back to Login</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
