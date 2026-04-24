const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');
require('dotenv').config({ path: '../../.env' });

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here';

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2) {
    return res.status(401).json({ error: 'Token error' });
  }

  const [scheme, token] = parts;

  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ error: 'Token malformatted' });
  }

  try {
    // Check if token is blacklisted
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const blacklisted = await pool.query(
      'SELECT id FROM token_blacklist WHERE token_hash = $1',
      [tokenHash]
    );
    if (blacklisted.rows.length > 0) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalid' });
  }
};

module.exports = authMiddleware;
