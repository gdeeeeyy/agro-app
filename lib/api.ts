export const API_URL = process.env.EXPO_PUBLIC_API_URL;

async function request(path: string, options: RequestInit = {}) {
  if (!API_URL) throw new Error('API_URL not configured');
  const url = `${API_URL}${path}`;
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        // Retry on common transient errors
        if ([502, 503, 504].includes(res.status) && attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
          continue;
        }
        throw new Error(`API ${res.status}: ${text || res.statusText}`);
      }
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) return res.json();
      return res.text();
    } catch (e: any) {
      const retriable = String(e?.message || '').includes('Network request failed');
      if (retriable && attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
        continue;
      }
      throw e;
    }
  }
  throw new Error('API request failed after retries');
}

export const api = {
  get: (path: string) => request(path, { method: 'GET' }),
  post: (path: string, body?: any) => request(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: (path: string, body?: any) => request(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  del: (path: string, body?: any) => request(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),
};