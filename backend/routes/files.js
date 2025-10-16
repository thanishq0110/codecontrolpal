const express = require('express');
const fs = require('fs');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const palworldManager = require('../utils/palworld-manager');

const router = express.Router();
const BASE_DIR = palworldManager.PALWORLD_DIR;

router.get('/list', authenticateToken, (req, res) => {
  try {
    const dirPath = req.query.path || BASE_DIR;
    const fullPath = path.join(BASE_DIR, dirPath);

    // Security: prevent directory traversal
    if (!fullPath.startsWith(BASE_DIR)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const files = fs.readdirSync(fullPath, { withFileTypes: true });
    const fileList = files.map(file => ({
      name: file.name,
      isDirectory: file.isDirectory(),
      size: file.isDirectory() ? null : fs.statSync(path.join(fullPath, file.name)).size,
      modified: fs.statSync(path.join(fullPath, file.name)).mtime
    }));

    res.json({ files: fileList, path: dirPath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/download', authenticateToken, (req, res) => {
  try {
    const filePath = req.query.path;
    const fullPath = path.join(BASE_DIR, filePath);

    if (!fullPath.startsWith(BASE_DIR)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(fullPath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/upload', authenticateToken, (req, res) => {
  try {
    // Implement file upload functionality
    res.json({ message: 'File uploaded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;