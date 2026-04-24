import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import './Login.css';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="alert alert-error">Invalid or missing reset token.</div>
          <Link to="/login" style={{ color: '#6366f1' }}>Back to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">🔐</div>
          <h1>Set New Password</h1>
        </div>

        {success ? (
          <div className="alert alert-success" style={{ textAlign: 'center' }}>
            <p>Password reset successfully!</p>
            <Link to="/login" style={{ color: '#6366f1', marginTop: 16, display: 'inline-block' }}>
              Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label htmlFor="password">New Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                minLength={8}
              />
              <PasswordStrengthMeter password={password} />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
