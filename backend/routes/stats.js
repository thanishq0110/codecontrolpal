const express = require('express');
const os = require('os');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const cpus = os.cpus();

    const stats = {
      cpu_cores: cpus.length,
      memory: {
        total: Math.round(totalMemory / 1024 / 1024 / 1024 * 100) / 100,
        used: Math.round(usedMemory / 1024 / 1024 / 1024 * 100) / 100,
        free: Math.round(freeMemory / 1024 / 1024 / 1024 * 100) / 100,
        percentage: Math.round((usedMemory / totalMemory) * 100)
      },
      uptime: os.uptime(),
      platform: os.platform(),
      hostname: os.hostname()
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;