import { secureStorage } from './secureStorage';

export const API_URL = process.env.EXPO_PUBLIC_API_URL;

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = await secureStorage.getRefreshToken();
    if (!refreshToken) return null;

    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.token) {
      await secureStorage.saveToken(data.token);
      return data.token;
    }
    return null;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}

async function request(path: string, options: RequestInit = {}) {
  if (!API_URL) throw new Error('API_URL not configured');
  const url = `${API_URL}${path}`;

  // Add auth token to headers if available
  const token = await secureStorage.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const doFetch = () => fetch(url, { ...options, headers });
  let res = await doFetch();

  // Handle 401 Unauthorized - try to refresh token
  if (res.status === 401 && token) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await refreshAccessToken();
      isRefreshing = false;

      if (newToken) {
        onTokenRefreshed(newToken);
        // Retry with new token
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(url, { ...options, headers });
      } else {
        // Refresh failed - clear auth and throw
        await secureStorage.clearAuth();
        throw new Error('Session expired. Please login again.');
      }
    } else {
      // Wait for ongoing refresh
      const newToken = await new Promise<string>((resolve) => {
        subscribeTokenRefresh(resolve);
      });
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, { ...options, headers });
    }
  }

  // Handle cold-starts/transient upstream issues with a short retry
  if (!res.ok && [502, 503, 504].includes(res.status)) {
    await new Promise(r => setTimeout(r, 800));
    res = await doFetch();
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

export const api = {
  get: (path: string) => request(path, { method: 'GET' }),
  post: (path: string, body?: any) => request(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: (path: string, body?: any) => request(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: (path: string, body?: any) => request(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  del: (path: string, body?: any) => request(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),
};
