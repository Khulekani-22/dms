import api from './api';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
    // Persist token and user
    localStorage.setItem('dms_token', data.token);
    localStorage.setItem('dms_user', JSON.stringify(data.user));
    return data;
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('dms_token');
      localStorage.removeItem('dms_user');
    }
  },

  getMe: async (): Promise<AuthUser> => {
    const { data } = await api.get<{ user: AuthUser }>('/auth/me');
    return data.user;
  },

  getCurrentUser: (): AuthUser | null => {
    const stored = localStorage.getItem('dms_user');
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('dms_token');
  },
};
