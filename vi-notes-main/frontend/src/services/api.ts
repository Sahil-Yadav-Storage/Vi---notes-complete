const API_BASE = 'http://localhost:5001/api';

function getToken(): string | null {
  return localStorage.getItem('vinotes_token');
}

function setToken(token: string): void {
  localStorage.setItem('vinotes_token', token);
}

function clearToken(): void {
  localStorage.removeItem('vinotes_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}

export const api = {
  getToken,
  setToken,
  clearToken,

  register: (name: string, email: string, password: string) =>
    request<{ token: string; user: { id: string; name: string; email: string } }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify({ name, email, password }) }
    ),

  login: (email: string, password: string) =>
    request<{ token: string; user: { id: string; name: string; email: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    ),

  saveSession: (payload: unknown) =>
    request<{ id: string; message: string; report: unknown }>(
      '/sessions',
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  getSessions: () =>
    request<unknown[]>('/sessions'),

  getReport: (sessionId: string) =>
    request<unknown>(`/sessions/${sessionId}/report`),
};
