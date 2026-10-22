import api from './api';

export interface UploadedFileResponse {
  name: string;
  url: string;
  size: number;
  type: string;
  filename?: string;
  originalName?: string;
  mimetype?: string;
}

export const uploadService = {
  /**
   * Tải các tệp đính kèm lên máy chủ lưu trữ trực tiếp vào ổ cứng
   * @param files Danh sách các tệp File cần tải lên
   * @returns Danh sách thông tin tệp đã lưu kèm URL đường dẫn trên server
   */
  uploadFiles: async (files: File[]): Promise<UploadedFileResponse[]> => {
    if (!files || files.length === 0) return [];

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const res = await api.post<{ success: boolean; data: UploadedFileResponse[] }>(
      '/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return res.data.data;
  },

  /**
   * Tải một tệp đơn lẻ lên máy chủ
   * @param file Tệp File cần tải lên
   * @returns Thông tin tệp đã lưu kèm URL
   */
  uploadFile: async (file: File): Promise<UploadedFileResponse> => {
    const res = await uploadService.uploadFiles([file]);
    if (!res || res.length === 0) {
      throw new Error('Tải tệp lên máy chủ không thành công');
    }
    return res[0];
  },
};
