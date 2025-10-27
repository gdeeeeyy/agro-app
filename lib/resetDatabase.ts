import * as FileSystem from 'expo-file-system/legacy';

export const resetDatabase = async () => {
  try {
    const dbPath = `${FileSystem.documentDirectory}SQLite/plants.db`;

    // Check if database exists
    const info = await FileSystem.getInfoAsync(dbPath);
    if (info.exists) {
      console.log('🧹 Deleting old database...');
      await FileSystem.deleteAsync(dbPath, { idempotent: true });
      console.log('✅ Database deleted successfully');
    } else {
      console.log('Database does not exist, nothing to delete');
    }
  } catch (err) {
    console.error('❌ Error resetting database:', err);
  }
};
