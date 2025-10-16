const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const palworldManager = require('../utils/palworld-manager');

const router = express.Router();

router.post('/start', authenticateToken, (req, res) => {
  try {
    const result = palworldManager.startServer();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/stop', authenticateToken, (req, res) => {
  try {
    const result = palworldManager.stopServer();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/restart', authenticateToken, (req, res) => {
  try {
    const result = palworldManager.restartServer();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/status', authenticateToken, (req, res) => {
  try {
    const running = palworldManager.isServerRunning();
    const stats = palworldManager.getServerStats();
    res.json({
      running,
      ...stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;