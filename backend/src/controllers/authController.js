const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');
const { sendPasswordResetEmail, sendVerificationEmail } = require('../services/emailService');
require('dotenv').config({ path: '../../.env' });

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here';

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const result = await pool.query(
      'INSERT INTO users (email, password, name, email_verification_token) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email, hashedPassword, name, verificationToken]
    );

    const user = result.rows[0];

    // Send verification email
    await sendVerificationEmail(email, verificationToken);

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, email_verified, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader.split(' ')[1];
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Decode to get expiration
    const decoded = jwt.decode(token);
    const expiresAt = new Date(decoded.exp * 1000);

    await pool.query(
      'INSERT INTO token_blacklist (token_hash, expires_at) VALUES ($1, $2)',
      [tokenHash, expiresAt]
    );

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

    // Always return success to prevent email enumeration
    if (result.rows.length === 0) {
      return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await pool.query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE email = $3',
      [resetToken, resetExpires, email]
    );

    await sendPasswordResetEmail(email, resetToken);

    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const result = await pool.query(
      'SELECT id FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      'UPDATE users SET password = $1, password_reset_token = NULL, password_reset_expires = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, result.rows[0].id]
    );

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, req.userId]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const result = await pool.query(
      'UPDATE users SET email_verified = TRUE, email_verification_token = NULL, updated_at = CURRENT_TIMESTAMP WHERE email_verification_token = $1 RETURNING id',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { login, register, getProfile, logout, forgotPassword, resetPassword, changePassword, verifyEmail };
