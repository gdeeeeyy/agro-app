import * as Crypto from 'expo-crypto';
import db from './database';
import { api, API_URL } from './api';

async function hashPassword(password: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password
  );
}

export async function createDefaultAdmin() {
  try {
    const number = '1234567890';
    const password = 'admin123';
    const fullName = 'Admin User';
    const hashedPassword = await hashPassword(password);

    if (API_URL) {
      // Remote mode: try to create via API; ignore if it already exists
      try {
        await api.post('/auth/signup', { number, password: hashedPassword, full_name: fullName });
        console.log('Default admin created on server');
      } catch (e: any) {
        const msg = String(e?.message || '').toLowerCase();
        if (msg.includes('exists') || msg.includes('unique')) {
          console.log('Admin account already exists on server');
        } else {
          console.warn('Admin creation (server) skipped:', e);
        }
      }
      return;
    }

    // Local mode: create in on-device SQLite
    const existingAdmin = await db.getFirstAsync(
      "SELECT id FROM users WHERE number = ?",
      number
    );

    if (existingAdmin) {
      console.log('Admin account already exists');
      return;
    }

    await db.runAsync(
      "INSERT INTO users (number, password, full_name, is_admin) VALUES (?, ?, ?, ?)",
      number,
      hashedPassword,
      fullName,
      2
    );

    console.log('Default admin account created successfully!');
  } catch (error) {
    console.error('Error creating admin account:', error);
  }
}

export async function createAdminCustom(number: string, password: string, fullName: string, role: 1|2 = 1) {
  try {
    const hashed = await hashPassword(password);
    if (API_URL) {
      try {
        await api.post('/auth/create-admin', { number, password: hashed, full_name: fullName, is_admin: role });
        return true;
      } catch (e) {
        return false;
      }
    }
    const existing = await db.getFirstAsync("SELECT id FROM users WHERE number = ?", number);
    if (existing) return false;
    await db.runAsync(
      "INSERT INTO users (number, password, full_name, is_admin) VALUES (?, ?, ?, ?)",
      number, hashed, fullName, role
    );
    return true;
  } catch (e) {
    return false;
  }
}
