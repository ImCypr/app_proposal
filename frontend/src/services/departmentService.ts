import api from './api';
import { Department } from '../models';

export const departmentService = {
  getAll: async (): Promise<Department[]> => {
    const res = await api.get<{ success: boolean; data: Department[] }>('/departments');
    return res.data.data;
  },

  getById: async (id: string): Promise<Department> => {
    const res = await api.get<{ success: boolean; data: Department }>(`/departments/${id}`);
    return res.data.data;
  },

  create: async (data: Partial<Department>): Promise<Department> => {
    const res = await api.post<{ success: boolean; data: Department }>('/departments', data);
    return res.data.data;
  },

  update: async (id: string, data: Partial<Department>): Promise<Department> => {
    const res = await api.put<{ success: boolean; data: Department }>(`/departments/${id}`, data);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/departments/${id}`);
  },
};
