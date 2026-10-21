export type Role =
  | 'nhan_vien'
  | 'truong_phong'
  | 'thu_mua'
  | 'ke_toan'
  | 'giam_doc'
  | 'chu_tich';

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
  department: {
    _id: string;
    name: string;
    description?: string;
  } | string;
  // Trưởng phòng trực tiếp của nhân viên này (nếu có).
  // Khi thiết lập, đơn mua sắm của nhân viên sẽ yêu cầu người này duyệt trước.
  directManager?: {
    _id: string;
    fullName: string;
    email: string;
    role: Role;
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
