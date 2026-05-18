import api from './api';

export interface ShareLink {
  id: string;
  pin: string;
  folder_id: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
  created_at: string;
  folders?: { id: string; name: string };
  profiles?: { full_name: string };
}

export interface ValidatePinResponse {
  token: string;
  folder: { id: string; name: string; description: string | null };
}

export const shareService = {
  list: async (folderId?: string): Promise<ShareLink[]> => {
    const params = folderId ? { folder_id: folderId } : {};
    const { data } = await api.get<{ share_links: ShareLink[] }>('/share', { params });
    return data.share_links;
  },

  create: async (payload: {
    folder_id: string;
    expires_at?: string | null;
    max_uses?: number | null;
  }): Promise<{ share_link: ShareLink; pin: string; url: string; folder: { name: string } }> => {
    const { data } = await api.post('/share', payload);
    return data;
  },

  update: async (
    id: string,
    payload: { expires_at?: string | null; max_uses?: number | null; is_active?: boolean }
  ): Promise<ShareLink> => {
    const { data } = await api.patch<{ share_link: ShareLink }>(`/share/${id}`, payload);
    return data.share_link;
  },

  revoke: async (id: string): Promise<void> => {
    await api.delete(`/share/${id}`);
  },

  validatePin: async (pin: string): Promise<ValidatePinResponse> => {
    const { data } = await api.post<ValidatePinResponse>('/share/access/validate', { pin });
    // Store PIN session token for subsequent requests
    sessionStorage.setItem('dms_pin_token', data.token);
    sessionStorage.setItem('dms_pin_folder', JSON.stringify(data.folder));
    return data;
  },
};
