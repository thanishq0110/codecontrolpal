const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { dockerManager } = require('../utils/docker-manager');
const { allQuery, getQuery, runQuery } = require('../utils/database');

const router = express.Router();

// Get all servers for current user
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const servers = await allQuery(
      'SELECT * FROM servers WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    
    // Enrich with real-time stats
    const enrichedServers = await Promise.all(
      (servers || []).map(async (server) => {
        const stats = await dockerManager.getStats(server.id);
        return {
          ...server,
          stats: stats || {}
        };
      })
    );

    res.json(enrichedServers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific server
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const server = await getQuery(
      'SELECT * FROM servers WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Get real-time stats
    const stats = await dockerManager.getStats(server.id);
    const containerInfo = await dockerManager.getContainerInfo(server.id);

    res.json({
      ...server,
      stats: stats || {},
      containerInfo: containerInfo || {}
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new server
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { serverName, maxPlayers, difficulty } = req.body;
    const userId = req.user.id;

    if (!serverName) {
      return res.status(400).json({ error: 'Server name is required' });
    }

    // Find available port starting from 8211
    let port = 8211;
    let portAvailable = false;
    while (!portAvailable && port < 8300) {
      const existing = await getQuery('SELECT id FROM servers WHERE port = ?', [port]);
      if (!existing) {
        portAvailable = true;
      } else {
        port++;
      }
    }

    if (!portAvailable) {
      return res.status(400).json({ error: 'No available ports' });
    }

    const serverId = 'server-' + Date.now();
    const serverConfig = {
      server_name: serverName,
      max_players: maxPlayers || 32,
      difficulty: difficulty || 'Normal',
      port: port
    };

    // Create Docker container
    try {
      const containerResult = await dockerManager.createServerContainer(serverId, serverConfig);
      
      await runQuery(
        'INSERT INTO servers (id, user_id, server_name, max_players, difficulty, port, container_id, running) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [serverId, userId, serverName, maxPlayers || 32, difficulty || 'Normal', port, containerResult.containerId, 1]
      );

      const newServer = await getQuery('SELECT * FROM servers WHERE id = ?', [serverId]);

      // Emit real-time update
      if (global.io) {
        global.io.emit('server:created', newServer);
      }

      res.status(201).json(newServer);
    } catch (dockerError) {
      console.error('Docker creation error:', dockerError);
      
      // Still create server record but mark as failed
      await runQuery(
        'INSERT INTO servers (id, user_id, server_name, max_players, difficulty, port) VALUES (?, ?, ?, ?, ?, ?)',
        [serverId, userId, serverName, maxPlayers || 32, difficulty || 'Normal', port]
      );

      const newServer = await getQuery('SELECT * FROM servers WHERE id = ?', [serverId]);
      res.status(201).json({ 
        ...newServer, 
        warning: 'Server created but Docker container failed. Check Docker configuration.' 
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
router.post('/:id/start', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const server = await getQuery(
      'SELECT * FROM servers WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    if (server.running) {
      return res.status(400).json({ error: 'Server already running' });
    }

    // Start the Docker container
    try {
      await dockerManager.startContainer(req.params.id);
    } catch (dockerError) {
      console.error('Docker start error:', dockerError);
      return res.status(500).json({ error: 'Failed to start Docker container' });
    }

    // Update database
    await runQuery('UPDATE servers SET running = 1 WHERE id = ?', [req.params.id]);

    const updatedServer = await getQuery('SELECT * FROM servers WHERE id = ?', [req.params.id]);

    // Emit real-time update
    if (global.io) {
      global.io.emit('server:started', updatedServer);
    }

    res.json({ success: true, server: updatedServer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop server
router.post('/:id/stop', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const server = await getQuery(
      'SELECT * FROM servers WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    if (!server.running) {
      return res.status(400).json({ error: 'Server not running' });
    }

    // Stop the Docker container
    try {
      await dockerManager.stopContainer(req.params.id);
    } catch (dockerError) {
      console.error('Docker stop error:', dockerError);
      return res.status(500).json({ error: 'Failed to stop Docker container' });
    }

    // Update database
    await runQuery('UPDATE servers SET running = 0 WHERE id = ?', [req.params.id]);

    const updatedServer = await getQuery('SELECT * FROM servers WHERE id = ?', [req.params.id]);

    // Emit real-time update
    if (global.io) {
      global.io.emit('server:stopped', updatedServer);
    }

    res.json({ success: true, server: updatedServer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restart server
router.post('/:id/restart', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const server = await getQuery(
      'SELECT * FROM servers WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    if (!server.running) {
      return res.status(400).json({ error: 'Server not running' });
    }

    // Restart the Docker container
    try {
      await dockerManager.restartContainer(req.params.id);
    } catch (dockerError) {
      console.error('Docker restart error:', dockerError);
      return res.status(500).json({ error: 'Failed to restart Docker container' });
    }

    const updatedServer = await getQuery('SELECT * FROM servers WHERE id = ?', [req.params.id]);

    // Emit real-time update
    if (global.io) {
      global.io.emit('server:restarted', updatedServer);
    }

    res.json({ success: true, server: updatedServer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete server
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const server = await getQuery(
      'SELECT * FROM servers WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    if (server.running) {
      return res.status(400).json({ error: 'Cannot delete running server. Stop it first.' });
    }

    // Delete Docker container
    try {
      await dockerManager.deleteContainer(req.params.id);
    } catch (dockerError) {
      console.error('Docker delete error:', dockerError);
      // Continue anyway to clean up database
    }

    // Delete from database
    await runQuery('DELETE FROM servers WHERE id = ?', [req.params.id]);

    // Emit real-time update
    if (global.io) {
      global.io.emit('server:deleted', { id: req.params.id });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get server logs
router.get('/:id/logs', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const server = await getQuery(
      'SELECT * FROM servers WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const lines = req.query.lines ? parseInt(req.query.lines) : 100;
    const logs = dockerManager.getLogs(req.params.id, lines);

    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear server logs
router.post('/:id/logs/clear', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const server = await getQuery(
      'SELECT * FROM servers WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    dockerManager.clearLogs(req.params.id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send console command
router.post('/:id/console', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    const server = await getQuery(
      'SELECT * FROM servers WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    if (!server.running) {
      return res.status(400).json({ error: 'Server not running' });
    }

    try {
      const result = await dockerManager.sendConsoleCommand(req.params.id, command);
      res.json(result);
    } catch (dockerError) {
      console.error('Docker console error:', dockerError);
      res.status(500).json({ error: 'Failed to send console command' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get server stats (real-time)
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const server = await getQuery(
      'SELECT * FROM servers WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const stats = await dockerManager.getStats(req.params.id);

    res.json(stats || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;