import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("userPlants.db");

async function initializeDatabase() {
  try {
    // Drop old "users" table if it has wrong columns (optional but safe)
    // Uncomment if you previously had errors about missing columns
    // await db.execAsync("DROP TABLE IF EXISTS users;");
    // await db.execAsync("DROP TABLE IF EXISTS plants;");

    // ✅ Create users table with phone number
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        number TEXT UNIQUE NOT NULL,        -- stores phone number
        password TEXT NOT NULL,
        full_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ✅ Create plants table with foreign key reference
    await db.execAsync(`
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

    console.log("✅ Database initialized successfully");
  } catch (err) {
    console.error("❌ Database initialization error:", err);
  }
}

// Initialize DB on app startup
initializeDatabase();

// ✅ Save plant entry
export async function savePlant(
  userId: number,
  name: string,
  imageUri: string,
  result: string
) {
  try {
    await db.runAsync(
      "INSERT INTO plants (user_id, name, imageUri, result) VALUES (?, ?, ?, ?)",
      userId,
      name,
      imageUri,
      result
    );
  } catch (err) {
    console.error("❌ SQLite insert error:", err);
  }
}

// ✅ Fetch all plants for a user
export async function getAllPlants(userId: number) {
  try {
    const rows = await db.getAllAsync(
      "SELECT * FROM plants WHERE user_id = ? ORDER BY id DESC",
      userId
    );
    return rows;
  } catch (err) {
    console.error("❌ SQLite fetch error:", err);
    return [];
  }
}

export default db;
