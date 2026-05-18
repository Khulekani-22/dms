import api from './api';

export interface AccessLog {
  id: string;
  accessed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  action: 'view' | 'download';
  share_links?: {
    pin: string;
    folders?: { name: string };
  };
}

export const logService = {
  list: async (params?: {
    share_link_id?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AccessLog[]; total: number }> => {
    const { data } = await api.get<{ logs: AccessLog[]; total: number }>('/logs', { params });
    return data;
  },

  exportCsv: (): void => {
    const token = localStorage.getItem('dms_token');
    const url = `${import.meta.env.VITE_API_URL}/logs/export`;
    // Trigger download by opening in a new tab with auth header via a fetch
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'access_logs.csv';
        a.click();
        URL.revokeObjectURL(a.href);
      });
  },
};
