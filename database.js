const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');

// Set up database
const db = new Database('database.db');

// Initialize database tables
function initializeDatabase() {
  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      balance REAL DEFAULT 100.00
    )
  `);

  // Create transactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      recipient TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  try {
    // Insert a default user for demo purposes
    const hashedPassword = bcrypt.hashSync('password123', 10);
    const insertUser = db.prepare('INSERT INTO users (username, password, balance) VALUES (?, ?, ?)');
    insertUser.run('demo_user', hashedPassword, '10000.00');
    console.log('Default user created: demo_user / password123');
  } catch (error) {
    console.error('User already exists, skipping creation:', error.message);
  }
}

// Initialize database
initializeDatabase();

module.exports = { db };