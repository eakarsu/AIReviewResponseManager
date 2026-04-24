import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import './Login.css';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }

    const verify = async () => {
      try {
        const response = await api.get(`/auth/verify-email/${token}`);
        setStatus('success');
        setMessage(response.data.message || 'Email verified successfully!');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Verification failed.');
      }
    };
    verify();
  }, [token]);

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">
            {status === 'verifying' ? '...' : status === 'success' ? '✓' : '!'}
          </div>
          <h1>Email Verification</h1>
        </div>

        {status === 'verifying' && <p style={{ textAlign: 'center' }}>Verifying your email...</p>}

        {status === 'success' && (
          <div className="alert alert-success" style={{ textAlign: 'center' }}>
            <p>{message}</p>
            <Link to="/login" style={{ color: '#6366f1', marginTop: 16, display: 'inline-block' }}>
              Sign In
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="alert alert-error" style={{ textAlign: 'center' }}>
            <p>{message}</p>
            <Link to="/login" style={{ color: '#6366f1', marginTop: 16, display: 'inline-block' }}>
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
