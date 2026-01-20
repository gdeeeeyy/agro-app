import * as Crypto from 'expo-crypto';
import db from './database';
import { api, API_URL } from './api';
import { secureStorage } from './secureStorage';

const ADMIN_OTP_NUMBER = '1234567890';

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

    if (API_URL) {
      const res = await api.post('/auth/signup', { number, password: hashedPassword, full_name: fullName || null });
      // Save tokens if provided
      if (res.token) {
        await secureStorage.saveToken(res.token);
      }
      if (res.refreshToken) {
        await secureStorage.saveRefreshToken(res.refreshToken);
      }
      return { user: res.user || res };
    }

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
    if (String(err?.message || '').includes('UNIQUE')) {
      return { error: 'number already exists' };
    }
    console.error("Sign up error:", err);
    return { error: 'Failed to create account' };
  }
}

export async function signIn(number: string, password: string): Promise<{ user?: User; error?: string }> {
  try {
    const hashedPassword = await hashPassword(password);

    if (API_URL) {
      const res = await api.post('/auth/signin', { number, password: hashedPassword });
      // Save tokens if provided
      if (res.token) {
        await secureStorage.saveToken(res.token);
      }
      if (res.refreshToken) {
        await secureStorage.saveRefreshToken(res.refreshToken);
      }
      return { user: res.user || res };
    }

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

export async function ensureOtpUser(number: string): Promise<{ user?: User; error?: string }> {
  const trimmed = String(number || '').trim();
  if (!trimmed) return { error: 'Enter mobile number' };

  try {
    if (API_URL) {
      // Remote: use /users-basic to find existing, otherwise create via signup or create-admin.
      try {
        const rows = (await api.get('/users-basic')) as any[];
        const existing = (rows || []).find((u) => String(u.number) === trimmed);
        if (existing) {
          // Upgrade admin number to master role if needed.
          if (trimmed === ADMIN_OTP_NUMBER && Number(existing.is_admin ?? 0) !== 2) {
            await api.patch(`/users/${existing.id}`, { is_admin: 2 });
            const updated = (await api.get(`/users-basic`)) as any[];
            const row = (updated || []).find((u) => String(u.number) === trimmed);
            return { user: row as User };
          }
          return { user: existing as User };
        }
      } catch {
        // fall through to create
      }

      const defaultPassword = 'otp-login-only';
      const hashed = await hashPassword(defaultPassword);

      if (trimmed === ADMIN_OTP_NUMBER) {
        // Ensure a master admin exists for this number.
        try {
          const u = await api.post('/auth/create-admin', {
            number: trimmed,
            password: hashed,
            full_name: null,
            is_admin: 2,
          });
          return { user: u as User };
        } catch (e: any) {
          const msg = String(e?.message || '');
          if (msg.toLowerCase().includes('number already exists')) {
            // Someone created this user earlier; just upgrade role.
            const rows = (await api.get('/users-basic')) as any[];
            const existing = (rows || []).find((u) => String(u.number) === trimmed);
            if (existing) {
              await api.patch(`/users/${existing.id}`, { is_admin: 2 });
              return { user: { ...(existing as any), is_admin: 2 } as User };
            }
          }
          return { error: 'Failed to ensure admin user' };
        }
      }

      // Normal user/vendor: sign up with a dummy password if not present.
      try {
        const res = await api.post('/auth/signup', {
          number: trimmed,
          password: hashed,
          full_name: null,
        });
        return { user: res as User };
      } catch (e: any) {
        const msg = String(e?.message || '').toLowerCase();
        if (msg.includes('number already exists')) {
          // Fetch again via users-basic.
          const rows = (await api.get('/users-basic')) as any[];
          const existing = (rows || []).find((u) => String(u.number) === trimmed);
          if (existing) return { user: existing as User };
        }
        return { error: 'Failed to sign in with OTP' };
      }
    }

    // Local SQLite mode
    const existing = await db.getFirstAsync<User>(
      'SELECT id, number, full_name, is_admin, created_at FROM users WHERE number = ?',
      trimmed
    );
    if (existing) {
      // Ensure admin role for special number.
      if (trimmed === ADMIN_OTP_NUMBER && Number(existing.is_admin ?? 0) !== 2) {
        await db.runAsync('UPDATE users SET is_admin = 2 WHERE id = ?', existing.id);
        return {
          user: { ...existing, is_admin: 2 },
        };
      }
      return { user: existing };
    }

    // Create new user locally.
    const isAdminRole = trimmed === ADMIN_OTP_NUMBER ? 2 : 0;
    await db.runAsync(
      'INSERT INTO users (number, password, full_name, is_admin) VALUES (?, ?, ?, ?)',
      trimmed,
      '',
      null,
      isAdminRole,
    );
    const user = await db.getFirstAsync<User>(
      'SELECT id, number, full_name, is_admin, created_at FROM users WHERE number = ?',
      trimmed
    );
    return { user: user || undefined };
  } catch (err) {
    console.error('ensureOtpUser error:', err);
    return { error: 'Failed to sign in with OTP' };
  }
}
