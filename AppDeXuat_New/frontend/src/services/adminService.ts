import api from './api';
import {
  User,
  Role,
  CreateUserDto,
  UpdateUserDto,
  RoleStatistics,
  EligibleManager,
} from '../models';

export interface UserFilterParams {
  search?: string;
  role?: string;
  department?: string;
  isActive?: boolean | string;
}

export const adminService = {
  /**
   * Lấy thống kê số lượng nhân sự theo từng role và trạng thái
   */
  getRoleStatistics: async (): Promise<RoleStatistics> => {
    const res = await api.get<{ success: boolean; data: RoleStatistics }>('/admin/stats');
    return res.data.data;
  },

  /**
   * Lấy danh sách toàn bộ người dùng có bộ lọc
   */
  getAllUsers: async (filters: UserFilterParams = {}): Promise<User[]> => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.role && filters.role !== 'all') params.append('role', filters.role);
    if (filters.department && filters.department !== 'all') params.append('department', filters.department);
    if (filters.isActive !== undefined && filters.isActive !== 'all') {
      params.append('isActive', String(filters.isActive));
    }

    const res = await api.get<{ success: boolean; data: User[] }>(`/admin/users?${params.toString()}`);
    return res.data.data;
  },

  /**
   * Lấy chi tiết thông tin một người dùng
   */
  getUserById: async (id: string): Promise<User> => {
    const res = await api.get<{ success: boolean; data: User }>(`/admin/users/${id}`);
    return res.data.data;
  },

  /**
   * Lấy danh sách các nhân sự quản lý có thể làm Trưởng phòng trực tiếp
   */
  getAvailableManagers: async (): Promise<EligibleManager[]> => {
    const res = await api.get<{ success: boolean; data: EligibleManager[] }>('/admin/managers');
    return res.data.data;
  },

  /**
   * Admin tạo người dùng mới và gán chức danh
   */
  createUser: async (userData: CreateUserDto): Promise<User> => {
    const res = await api.post<{ success: boolean; message: string; data: User }>('/admin/users', userData);
    return res.data.data;
  },

  /**
   * Admin cập nhật thông tin người dùng
   */
  updateUser: async (id: string, updateData: UpdateUserDto): Promise<User> => {
    const res = await api.put<{ success: boolean; message: string; data: User }>(`/admin/users/${id}`, updateData);
    return res.data.data;
  },

  /**
   * Admin gán hoặc thay đổi chức danh nghiệp vụ duy nhất
   */
  updateUserRole: async (id: string, role: Role): Promise<User> => {
    const res = await api.put<{ success: boolean; message: string; data: User }>(`/admin/users/${id}/role`, { role });
    return res.data.data;
  },

  /**
   * Admin xóa chức danh của người dùng (chuyển về 'unassigned')
   */
  removeUserRole: async (id: string): Promise<User> => {
    const res = await api.delete<{ success: boolean; message: string; data: User }>(`/admin/users/${id}/role`);
    return res.data.data;
  },

  /**
   * Admin gán hoặc hủy Trưởng phòng trực tiếp cho nhân viên
   */
  setDirectManager: async (id: string, managerId: string | null): Promise<User> => {
    const res = await api.put<{ success: boolean; message: string; data: User }>(`/admin/users/${id}/direct-manager`, {
      managerId,
    });
    return res.data.data;
  },

  /**
   * Bật/Tắt trạng thái hoạt động của tài khoản
   */
  toggleUserStatus: async (id: string): Promise<User> => {
    const res = await api.put<{ success: boolean; message: string; data: User }>(`/admin/users/${id}/status`);
    return res.data.data;
  },

  /**
   * Xóa vĩnh viễn tài khoản người dùng
   */
  deleteUser: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete<{ success: boolean; message: string }>(`/admin/users/${id}`);
    return res.data;
  },
};
