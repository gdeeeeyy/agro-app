import * as Crypto from 'expo-crypto';
import db from './database';

async function hashPassword(password: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password
  );
}

export async function createDefaultAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await db.getFirstAsync(
      "SELECT id FROM users WHERE number = ?",
      "1234567890"
    );

    if (existingAdmin) {
      console.log('Admin account already exists');
      return;
    }

    // Create admin account
    const hashedPassword = await hashPassword("admin123");
    
    await db.runAsync(
      "INSERT INTO users (number, password, full_name, is_admin) VALUES (?, ?, ?, ?)",
      "1234567890", 
      hashedPassword, 
      "Admin User", 
      1
    );

    console.log('Default admin account created successfully!');
    console.log('Admin Number: 1234567890');
    console.log('Admin Password: admin123');
  } catch (error) {
    console.error('Error creating admin account:', error);
  }
}

// Run this function to create the default admin
// createDefaultAdmin();
