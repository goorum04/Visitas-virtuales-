const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || `HTTP ${res.status}`);
  return data.data as T;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; email: string; vertical: string; plan: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    signup: (email: string, password: string, vertical: string) =>
      request<{ token: string; email: string; vertical: string; plan: string }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, vertical }),
      }),
  },

  projects: {
    list: () => request<Project[]>('/api/projects'),
    get: (id: string) => request<Project>(`/api/projects/${id}`),
    create: (vertical: string, formData: FormData) => {
      const token = getToken();
      return fetch(`${API}/api/projects/create/${vertical}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      }).then((r) => r.json()).then((d) => {
        if (!d.success) throw new Error(d.error);
        return d.data as { projectId: string; status: string };
      });
    },
    delete: (id: string) => request<void>(`/api/projects/${id}`, { method: 'DELETE' }),
    export: (id: string, format: string) =>
      request<{ format: string; url: string }>(`/api/projects/${id}/export/${format}`),
  },
};

export interface Project {
  id: string;
  name: string;
  vertical: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  image_url: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
  outputs?: Output[];
}

export interface Output {
  id: string;
  format: string;
  url: string;
  size_bytes: number;
  metadata: Record<string, unknown>;
}
