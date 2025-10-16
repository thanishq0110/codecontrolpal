const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
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
const { dockerManager } = require('./utils/docker-manager');

const app = express();
const server = http.createServer(app);

// CORS configuration for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CORS_ORIGIN || 'http://localhost:8080'
    : '*',
  credentials: true,
  optionsSuccessStatus: 200
};

const io = socketIO(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000,
  maxHttpBufferSize: 1e6
});

// Make io available globally for routes
global.io = io;

expressWs(app);

// Security middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

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
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message || 'Internal Server Error';
  res.status(status).json({ error: message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Initialize services with error handling
async function initializeServices() {
  try {
    console.log('🚀 Initializing services...');
    
    // Initialize Palworld
    initializePalworld();
    
    // Load existing Docker containers
    await dockerManager.loadExistingContainers();
    console.log('✅ Docker containers loaded');
  } catch (error) {
    console.error('⚠️ Initialization warning:', error.message);
    // Don't exit, continue running with warnings
  }
}

// WebSocket events
io.on('connection', (socket) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔗 Client connected:', socket.id);
  }
  
  socket.on('disconnect', () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔌 Client disconnected:', socket.id);
    }
  });

  // Subscribe to server stats
  socket.on('subscribe:stats', (serverId) => {
    if (typeof serverId === 'string' && serverId.length > 0) {
      socket.join(`stats:${serverId}`);
    }
  });

  socket.on('unsubscribe:stats', (serverId) => {
    if (typeof serverId === 'string' && serverId.length > 0) {
      socket.leave(`stats:${serverId}`);
    }
  });
});

// Real-time stats broadcasting (every 2 seconds)
let statsInterval;
function startStatsBroadcasting() {
  statsInterval = setInterval(async () => {
    try {
      const sockets = io.of('/').sockets.sockets;
      const rooms = new Set();
      
      // Collect unique rooms
      for (const [, socket] of sockets) {
        const socketRooms = Array.from(socket.rooms);
        for (const room of socketRooms) {
          if (room.startsWith('stats:')) {
            rooms.add(room);
          }
        }
      }
      
      // Broadcast stats for each room
      for (const room of rooms) {
        try {
          const serverId = room.replace('stats:', '');
          const stats = await dockerManager.getStats(serverId);
          if (stats) {
            io.to(room).emit('server:stats:update', { serverId, stats });
          }
        } catch (error) {
          console.error(`Error getting stats for room ${room}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error broadcasting stats:', error.message);
    }
  }, 2000);
}

// Start server
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';

server.listen(PORT, async () => {
  console.log(`✅ Palworld Panel running on port ${PORT}`);
  console.log(`📍 Environment: ${NODE_ENV}`);
  console.log(`🐳 Docker container management enabled`);
  
  // Initialize services after server starts
  await initializeServices();
  
  // Start stats broadcasting
  startStatsBroadcasting();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📛 SIGTERM signal received: closing HTTP server');
  clearInterval(statsInterval);
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('❌ Forcing shutdown');
    process.exit(1);
  }, 10000);
});

process.on('SIGINT', () => {
  console.log('📛 SIGINT signal received: closing HTTP server');
  clearInterval(statsInterval);
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});