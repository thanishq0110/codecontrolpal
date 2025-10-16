const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/panel.db');

let db = null;

function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Database error:', err);
      } else {
        console.log('✅ Connected to SQLite database');
      }
    });
  }
  return db;
}

function initializeDatabase() {
  const database = getDatabase();
  
  database.serialize(() => {
    // Users table
    database.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Server settings table
    database.run(`
      CREATE TABLE IF NOT EXISTS server_settings (
        id INTEGER PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Server logs table
    database.run(`
      CREATE TABLE IF NOT EXISTS server_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        level TEXT,
        message TEXT
      )
    `);

    // Create default admin user if not exists
    const bcrypt = require('bcryptjs');
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123';
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);

    database.get('SELECT * FROM users WHERE username = ?', [adminUsername], (err, row) => {
      if (!row) {
        database.run(
          'INSERT INTO users (id, username, password) VALUES (?, ?, ?)',
          ['admin-' + Date.now(), adminUsername, hashedPassword],
          (err) => {
            if (err) console.error('Error creating admin user:', err);
            else console.log('✅ Admin user created');
          }
        );
      }
    });
  });
}

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = {
  initializeDatabase,
  getDatabase,
  runQuery,
  getQuery,
  allQuery
};