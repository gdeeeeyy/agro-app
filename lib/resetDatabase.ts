import db from './database';

(async () => {
  try {
    // Drop tables
    await db.execAsync("DROP TABLE IF EXISTS users;");
    await db.execAsync("DROP TABLE IF EXISTS plants;");
    console.log("All tables dropped.");

    // Optionally, recreate them immediately
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS plants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        imageUri TEXT,
        result TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    console.log("Tables recreated successfully.");
  } catch (err) {
    console.error("Error resetting database:", err);
  }
})();
