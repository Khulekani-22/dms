import api from './api';

export interface Folder {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  created_at: string;
  profiles?: { full_name: string };
  children?: Folder[];
  document_count?: number;
}

export const folderService = {
  list: async (parentId?: string): Promise<Folder[]> => {
    const params = parentId ? { parent_id: parentId } : {};
    const { data } = await api.get<{ folders: Folder[] }>('/folders', { params });
    return data.folders;
  },

  get: async (id: string): Promise<Folder> => {
    const { data } = await api.get<{ folder: Folder }>(`/folders/${id}`);
    return data.folder;
  },

  create: async (payload: {
    name: string;
    description?: string;
    parent_id?: string;
  }): Promise<Folder> => {
    const { data } = await api.post<{ folder: Folder }>('/folders', payload);
    return data.folder;
  },

  update: async (id: string, payload: { name?: string; description?: string }): Promise<Folder> => {
    const { data } = await api.patch<{ folder: Folder }>(`/folders/${id}`, payload);
    return data.folder;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/folders/${id}`);
  },
};
