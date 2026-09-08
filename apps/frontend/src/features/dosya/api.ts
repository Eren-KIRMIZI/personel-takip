import { api } from '@/lib/api';

export interface UploadResult {
  url: string;
}

export async function uploadFile(file: File, folder = 'leave-docs'): Promise<UploadResult> {
  const base64 = await fileToBase64(file);
  return api<UploadResult>('/api/uploads', {
    method: 'POST',
    body: {
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      base64,
      folder,
    },
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}