export type Role =
  | 'admin'
  | 'nhan_vien'
  | 'truong_phong'
  | 'thu_mua'
  | 'ke_toan'
  | 'giam_doc'
  | 'chu_tich'
  | 'unassigned';

export interface BankAccount {
  accountNumber: string;
  bankName: string;
  accountHolder?: string;
}

export interface User {
  _id: string;
  fullName: string;
  email: string;
  role: Role;
  department?: {
    _id: string;
    name: string;
    description?: string;
  } | string | null;
  // Trưởng phòng trực tiếp của nhân viên này (nếu có).
  // Khi thiết lập, đơn mua sắm của nhân viên sẽ yêu cầu người này duyệt trước.
  directManager?: {
    _id: string;
    fullName: string;
    email: string;
    role: Role;
    department?: {
      _id: string;
      name: string;
    } | string;
  } | string | null;
  bankAccount?: BankAccount;
  avatar?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface UpdateProfileDto {
  fullName?: string;
  bankAccount?: BankAccount;
}

export interface CreateUserDto {
  fullName: string;
  email: string;
  password?: string;
  role: Role;
  department?: string | null;
  directManager?: string | null;
  bankAccount?: BankAccount;
}

export interface UpdateUserDto {
  fullName?: string;
  email?: string;
  password?: string;
  role?: Role;
  department?: string | null;
  directManager?: string | null;
  bankAccount?: BankAccount;
  isActive?: boolean;
}

export interface RoleStatistics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  statsByRole: Record<Role, number>;
}

export interface EligibleManager {
  _id: string;
  fullName: string;
  email: string;
  role: Role;
  department?: {
    _id: string;
    name: string;
  };
}
