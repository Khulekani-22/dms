import api from './api';

export interface Document {
  id: string;
  folder_id?: string;
  original_name: string;
  mime_type: string | null;
  size: number | null;
  storage_path?: string;
  uploaded_at: string;
  profiles?: { full_name: string };
}

export const documentService = {
  listByFolder: async (folderId: string): Promise<Document[]> => {
    const { data } = await api.get<{ documents: Document[] }>(`/documents/folder/${folderId}`);
    return data.documents;
  },

  upload: async (
    folderId: string,
    files: File[],
    onProgress?: (pct: number) => void
  ): Promise<{ uploaded: Document[]; failed: object[] }> => {
    const formData = new FormData();
    formData.append('folder_id', folderId);
    files.forEach((f) => formData.append('files', f));

    const { data } = await api.post<{ uploaded: Document[]; failed: object[] }>(
      '/documents/upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (onProgress && evt.total) {
            onProgress(Math.round((evt.loaded * 100) / evt.total));
          }
        },
      }
    );
    return data;
  },

  getDownloadUrl: async (docId: string): Promise<{ url: string; filename: string }> => {
    const { data } = await api.get<{ url: string; filename: string }>(
      `/documents/${docId}/download`
    );
    return data;
  },

  delete: async (docId: string): Promise<void> => {
    await api.delete(`/documents/${docId}`);
  },

  // ── PIN user methods ──────────────────────────────────────────

  listByPin: async (pin: string): Promise<Document[]> => {
    const { data } = await api.get<{ documents: Document[] }>(
      `/share/access/${pin}/documents`
    );
    return data.documents;
  },

  getDownloadUrlByPin: async (
    pin: string,
    docId: string
  ): Promise<{ url: string; filename: string }> => {
    const { data } = await api.get<{ url: string; filename: string }>(
      `/share/access/${pin}/download/${docId}`
    );
    return data;
  },
};
