import * as Crypto from 'expo-crypto';
import db from './database';

export interface User {
  id: number;
  number: string;
  full_name: string | null;
  is_admin: number;
  created_at: string;
}

async function hashPassword(password: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password
  );
}

export async function signUp(number: string, password: string, fullName?: string): Promise<{ user?: User; error?: string }> {
  try {
    const hashedPassword = await hashPassword(password);

    const result = await db.runAsync(
      "INSERT INTO users (number, password, full_name, is_admin) VALUES (?, ?, ?, ?)",
      number, hashedPassword, fullName || null, 0
    );

    const user = await db.getFirstAsync<User>(
      "SELECT id, number, full_name, is_admin, created_at FROM users WHERE id = ?",
      result.lastInsertRowId
    );

    return { user: user || undefined };
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      return { error: 'number already exists' };
    }
    console.error("Sign up error:", err);
    return { error: 'Failed to create account' };
  }
}

export async function signIn(number: string, password: string): Promise<{ user?: User; error?: string }> {
  try {
    const hashedPassword = await hashPassword(password);

    const user = await db.getFirstAsync<User>(
      "SELECT id, number, full_name, is_admin, created_at FROM users WHERE number = ? AND password = ?",
      number, hashedPassword
    );

    if (!user) {
      return { error: 'Invalid number or password' };
    }

    return { user };
  } catch (err) {
    console.error("Sign in error:", err);
    return { error: 'Failed to sign in' };
  }
}
