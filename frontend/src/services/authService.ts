import api from './api';
import { AuthResponse, BankAccount, LoginCredentials, User } from '../models';

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const res = await api.post<{ success: boolean; data: AuthResponse }>('/auth/login', credentials);
    return res.data.data;
  },

  register: async (userData: any): Promise<AuthResponse> => {
    const res = await api.post<{ success: boolean; data: AuthResponse }>('/auth/register', userData);
    return res.data.data;
  },

  getProfile: async (): Promise<User> => {
    const res = await api.get<{ success: boolean; data: User }>('/auth/profile');
    return res.data.data;
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const res = await api.put<{ success: boolean; data: User }>('/auth/profile', data);
    return res.data.data;
  },

  updateBankAccount: async (bankAccount: BankAccount): Promise<User> => {
    const res = await api.put<{ success: boolean; data: User }>('/auth/bank-account', bankAccount);
    return res.data.data;
  },

  getAllUsers: async (): Promise<User[]> => {
    const res = await api.get<{ success: boolean; data: User[] }>('/auth/users');
    return res.data.data;
  },
};
