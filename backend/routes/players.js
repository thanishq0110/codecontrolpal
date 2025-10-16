const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Mock players data
let players = [
  { id: 1, name: 'Player1', level: 25, playtime: 120 },
  { id: 2, name: 'Player2', level: 18, playtime: 85 }
];

router.get('/', authenticateToken, (req, res) => {
  try {
    res.json({ players });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/kick/:playerId', authenticateToken, (req, res) => {
  try {
    const { playerId } = req.params;
    players = players.filter(p => p.id !== parseInt(playerId));
    res.json({ message: 'Player kicked', players });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/ban/:playerId', authenticateToken, (req, res) => {
  try {
    const { playerId } = req.params;
    const player = players.find(p => p.id === parseInt(playerId));
    if (player) {
      player.banned = true;
      res.json({ message: 'Player banned', players });
    } else {
      res.status(404).json({ error: 'Player not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;