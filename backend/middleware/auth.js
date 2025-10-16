const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, (err, user) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ error: 'Token expired' });
        }
        if (err.name === 'JsonWebTokenError') {
          return res.status(403).json({ error: 'Invalid token' });
        }
        return res.status(403).json({ error: 'Authentication failed' });
      }
      
      if (!user || !user.id) {
        return res.status(403).json({ error: 'Invalid token data' });
      }
      
      req.user = user;
      next();
    });
  } catch (error) {
    return res.status(500).json({ error: 'Authentication error' });
  }
}

module.exports = {
  authenticateToken,
  JWT_SECRET,
  JWT_EXPIRY
};