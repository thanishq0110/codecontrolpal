const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getQuery } = require('../utils/database');
const { authenticateToken, JWT_SECRET, JWT_EXPIRY } = require('../middleware/auth');

const router = express.Router();

// Rate limiting to prevent brute force
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip) {
  const attempts = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  
  if (attempts.lockedUntil > Date.now()) {
    return false;
  }
  
  if (attempts.count >= MAX_ATTEMPTS) {
    loginAttempts.set(ip, { count: 0, lockedUntil: Date.now() + LOCKOUT_TIME });
    return false;
  }
  
  return true;
}

function recordLoginAttempt(ip, success) {
  if (!success) {
    const attempts = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
    attempts.count++;
    loginAttempts.set(ip, attempts);
  } else {
    loginAttempts.delete(ip);
  }
}

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;

    // Check rate limiting
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
    }

    // Validate input
    if (!username || !password) {
      recordLoginAttempt(clientIp, false);
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
      recordLoginAttempt(clientIp, false);
      return res.status(400).json({ error: 'Invalid input' });
    }

    const user = await getQuery('SELECT * FROM users WHERE username = ?', [username]);

    if (!user) {
      recordLoginAttempt(clientIp, false);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      recordLoginAttempt(clientIp, false);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY, algorithm: 'HS256' }
    );

    recordLoginAttempt(clientIp, true);
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

router.post('/verify', (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    res.json({ valid: true, user: decoded });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ valid: false, error: 'Token expired' });
    }
    res.status(401).json({ valid: false, error: 'Invalid token' });
  }
});

router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await getQuery('SELECT id, username FROM users WHERE id = ?', [req.user.id]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

module.exports = router;