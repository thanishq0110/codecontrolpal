const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const PALWORLD_DIR = process.env.PALWORLD_INSTALL_DIR || '/palworld';
let serverProcess = null;
let consoleLogs = [];
const MAX_LOG_LINES = 1000;

// Event emitter for console logs
const EventEmitter = require('events');
const consoleEmitter = new EventEmitter();

function ensurePalworldDirectory() {
  if (!fs.existsSync(PALWORLD_DIR)) {
    fs.mkdirSync(PALWORLD_DIR, { recursive: true });
    console.log(`✅ Created Palworld directory: ${PALWORLD_DIR}`);
  }
}

function initializePalworld() {
  ensurePalworldDirectory();
  console.log('✅ Palworld initialized');
}

function addLog(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  consoleLogs.push(logEntry);
  if (consoleLogs.length > MAX_LOG_LINES) {
    consoleLogs.shift();
  }
  
  // Emit to WebSocket clients
  consoleEmitter.emit('log', { message, level, timestamp });
}

function startServer() {
  if (serverProcess) {
    addLog('Server already running', 'warn');
    return { success: false, message: 'Server already running' };
  }

  try {
    addLog('Starting Palworld server...', 'info');

    // For demonstration, we'll create a mock server process
    // In production, you'd point to actual Palworld server executable
    const isWindows = os.platform() === 'win32';
    const serverCmd = isWindows 
      ? 'cmd' 
      : '/bin/bash';
    
    const args = isWindows 
      ? ['/c', 'echo "Palworld Server Started" && timeout /t 3600']
      : ['-c', 'echo "Palworld Server Started" && sleep 3600'];

    serverProcess = spawn(serverCmd, args);

    serverProcess.stdout.on('data', (data) => {
      addLog(data.toString().trim(), 'stdout');
    });

    serverProcess.stderr.on('data', (data) => {
      addLog(data.toString().trim(), 'stderr');
    });

    serverProcess.on('close', (code) => {
      addLog(`Server stopped with code ${code}`, 'info');
      serverProcess = null;
    });

    addLog('Server started successfully', 'info');
    return { success: true, message: 'Server started' };
  } catch (error) {
    addLog(`Failed to start server: ${error.message}`, 'error');
    return { success: false, message: error.message };
  }
}

function stopServer() {
  if (!serverProcess) {
    addLog('Server not running', 'warn');
    return { success: false, message: 'Server not running' };
  }

  try {
    addLog('Stopping Palworld server...', 'info');
    serverProcess.kill('SIGTERM');
    
    // Force kill after 10 seconds
    setTimeout(() => {
      if (serverProcess) {
        serverProcess.kill('SIGKILL');
      }
    }, 10000);

    return { success: true, message: 'Server stop signal sent' };
  } catch (error) {
    addLog(`Failed to stop server: ${error.message}`, 'error');
    return { success: false, message: error.message };
  }
}

function restartServer() {
  stopServer();
  setTimeout(() => {
    startServer();
  }, 2000);
  return { success: true, message: 'Server restart initiated' };
}

function isServerRunning() {
  return serverProcess !== null;
}

function getConsoleLogs(lines = 50) {
  return consoleLogs.slice(-lines);
}

function clearConsoleLogs() {
  consoleLogs = [];
  addLog('Console logs cleared', 'info');
}

function getServerStats() {
  // Mock stats - replace with actual server stats in production
  return {
    players_online: Math.floor(Math.random() * 10),
    fps: 60,
    server_name: 'Palworld Server',
    uptime_seconds: serverProcess ? Math.floor(Math.random() * 10000) : 0
  };
}

module.exports = {
  initializePalworld,
  startServer,
  stopServer,
  restartServer,
  isServerRunning,
  getConsoleLogs,
  clearConsoleLogs,
  getServerStats,
  addLog,
  consoleEmitter,
  PALWORLD_DIR
};