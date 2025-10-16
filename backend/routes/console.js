const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const palworldManager = require('../utils/palworld-manager');

const router = express.Router();

router.get('/logs', authenticateToken, (req, res) => {
  try {
    const lines = req.query.lines || 50;
    const logs = palworldManager.getConsoleLogs(parseInt(lines));
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/clear', authenticateToken, (req, res) => {
  try {
    palworldManager.clearConsoleLogs();
    res.json({ message: 'Console cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WebSocket for real-time console
router.ws('/stream', (ws, req) => {
  // Check if user is authenticated (basic check)
  const token = req.query.token;
  if (!token) {
    ws.close(4001, 'Unauthorized');
    return;
  }

  const logHandler = (logData) => {
    ws.send(JSON.stringify(logData));
  };

  palworldManager.consoleEmitter.on('log', logHandler);

  ws.on('close', () => {
    palworldManager.consoleEmitter.off('log', logHandler);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

module.exports = router;