const pool = require('../config/database');

const authorize = (...roles) => {
  return async (req, res, next) => {
    try {
      const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }

      const userRole = result.rows[0].role;
      if (!roles.includes(userRole)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      req.userRole = userRole;
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ error: 'Authorization failed' });
    }
  };
};

module.exports = authorize;
