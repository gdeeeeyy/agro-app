export const API_URL = process.env.EXPO_PUBLIC_API_URL;

async function request(path: string, options: RequestInit = {}) {
  if (!API_URL) throw new Error('API_URL not configured');
  const url = `${API_URL}${path}`;
  const doFetch = () => fetch(url, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  let res = await doFetch();
  if (!res.ok && [502,503,504].includes(res.status)) {
    // Handle cold-starts/transient upstream issues with a short retry
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
