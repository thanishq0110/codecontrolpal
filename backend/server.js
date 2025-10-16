const express = require('express');
const cors = require('cors');
const path = require('path');
const expressWs = require('express-ws');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const serverRoutes = require('./routes/server');
const playersRoutes = require('./routes/players');
const consoleRoutes = require('./routes/console');
const filesRoutes = require('./routes/files');
const statsRoutes = require('./routes/stats');

// Import utilities
const { initializeDatabase } = require('./utils/database');
const { initializePalworld } = require('./utils/palworld-manager');

const app = express();
expressWs(app);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize database
initializeDatabase();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/server', serverRoutes);
app.use('/api/players', playersRoutes);
app.use('/api/console', consoleRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/stats', statsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve React frontend
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
    if (err) {
      res.status(500).send(err);
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Initialize Palworld
initializePalworld();

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Palworld Panel running on port ${PORT}`);
  console.log(`📍 Access at http://localhost:${PORT}`);
});