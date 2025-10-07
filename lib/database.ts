import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("plants.db");

// Create table if not exists
(async () => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS plants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      imageUri TEXT,
      result TEXT
    );
  `);
})();

export async function savePlant(name: string, imageUri: string, result: string) {
  try {
    await db.runAsync("INSERT INTO plants (name, imageUri, result) VALUES (?, ?, ?)", [
      name,
      imageUri,
      result,
    ]);
  } catch (err) {
    console.error("SQLite insert error:", err);
  }
}

export async function getAllPlants() {
  try {
    const rows = await db.getAllAsync("SELECT * FROM plants ORDER BY id DESC");
    return rows;
  } catch (err) {
    console.error("SQLite fetch error:", err);
    return [];
  }
}

export default db;
