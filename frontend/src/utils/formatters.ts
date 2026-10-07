import { Role } from '../models';

export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return String(dateString);
  }
};

export const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};


export const getRoleLabel = (role: Role | string | undefined): string => {
  switch (role) {
    case 'nhan_vien':
      return 'Nhân viên';
    case 'truong_phong':
      return 'Trưởng phòng';
    case 'thu_mua':
      return 'Thu mua';
    case 'ke_toan':
      return 'Kế toán';
    case 'giam_doc':
      return 'Giám đốc';
    case 'chu_tich':
      return 'Chủ tịch';
    default:
      return role || 'Chưa xác định';
  }
};

export const getRoleBadgeClass = (role: Role | string | undefined): string => {
  switch (role) {
    case 'nhan_vien':
      return 'badge-info';
    case 'truong_phong':
      return 'badge-primary';
    case 'thu_mua':
      return 'badge-warning';
    case 'ke_toan':
      return 'badge-success';
    case 'giam_doc':
      return 'badge-purple';
    case 'chu_tich':
      return 'badge-purple';
    default:
      return 'badge-info';
  }
};

export interface StatusMeta {
  label: string;
  badgeClass: string;
  dotColor: string;
}

export const getPurchaseStatusInfo = (status: string): StatusMeta => {
  switch (status) {
    case 'draft':
      return { label: 'Bản nháp', badgeClass: 'badge-secondary', dotColor: '#94a3b8' };
    case 'pending_approval':
      return { label: 'Chờ duyệt sơ bộ', badgeClass: 'badge-warning', dotColor: '#f59e0b' };
    case 'approved_initial':
      return { label: 'Đã duyệt lần 1', badgeClass: 'badge-primary', dotColor: '#6366f1' };
    case 'procurement_review':
      return { label: 'Thu mua khảo giá', badgeClass: 'badge-warning', dotColor: '#f59e0b' };
    case 'procurement_completed':
      return { label: 'Thu mua đã điền giá', badgeClass: 'badge-info', dotColor: '#3b82f6' };
    case 'accounting_review':
      return { label: 'Kế toán xác nhận giá', badgeClass: 'badge-warning', dotColor: '#f59e0b' };
    case 'pending_final_approval':
      return { label: 'Chờ duyệt giá chốt', badgeClass: 'badge-purple', dotColor: '#a855f7' };
    case 'final_approved':
      return { label: 'Đã duyệt giá chốt', badgeClass: 'badge-primary', dotColor: '#6366f1' };
    case 'disbursing':
      return { label: 'Đang giải ngân', badgeClass: 'badge-info', dotColor: '#06b6d4' };
    case 'completed':
      return { label: 'Hoàn thành', badgeClass: 'badge-success', dotColor: '#10b981' };
    case 'rejected':
      return { label: 'Từ chối', badgeClass: 'badge-danger', dotColor: '#ef4444' };
    default:
      return { label: status, badgeClass: 'badge-secondary', dotColor: '#94a3b8' };
  }
};

export const getAdvanceStatusInfo = (status: string): StatusMeta => {
  switch (status) {
    case 'draft':
      return { label: 'Bản nháp', badgeClass: 'badge-secondary', dotColor: '#94a3b8' };
    case 'pending_director':
      return { label: 'Chờ Giám đốc duyệt', badgeClass: 'badge-warning', dotColor: '#f59e0b' };
    case 'pending_chairman':
      return { label: 'Chờ Chủ tịch duyệt', badgeClass: 'badge-warning', dotColor: '#f59e0b' };
    case 'pending_accounting':
      return { label: 'Chờ Kế toán duyệt', badgeClass: 'badge-warning', dotColor: '#f59e0b' };
    case 'accounting_approved':
      return { label: 'Kế toán đã duyệt', badgeClass: 'badge-primary', dotColor: '#6366f1' };
    case 'disbursing':
      return { label: 'Đang giải ngân', badgeClass: 'badge-info', dotColor: '#06b6d4' };
    case 'disbursed':
      return { label: 'Đã giải ngân tiền', badgeClass: 'badge-info', dotColor: '#06b6d4' };
    case 'pending_settlement':
      return { label: 'Chờ hoàn tạm ứng', badgeClass: 'badge-purple', dotColor: '#a855f7' };
    case 'settlement_submitted':
      return { label: 'Đã nộp chứng từ hoàn', badgeClass: 'badge-warning', dotColor: '#f59e0b' };
    case 'completed':
      return { label: 'Hoàn thành', badgeClass: 'badge-success', dotColor: '#10b981' };
    case 'rejected':
      return { label: 'Từ chối', badgeClass: 'badge-danger', dotColor: '#ef4444' };
    default:
      return { label: status, badgeClass: 'badge-secondary', dotColor: '#94a3b8' };
  }
};

export interface DemoAccount {
  role: Role;
  name: string;
  email: string;
  password: string;
  department: string;
  description: string;
  badgeClass: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'nhan_vien',
    name: 'Nguyễn Văn An',
    email: 'nhanvien@demo.com',
    password: '123456',
    department: 'Phòng Kinh Doanh',
    description: 'Tạo đơn mua sắm & tạm ứng, hoàn tạm ứng',
    badgeClass: 'badge-info',
  },
  {
    role: 'truong_phong',
    name: 'Trần Thị Bình',
    email: 'truongphong@demo.com',
    password: '123456',
    department: 'Phòng Kinh Doanh',
    description: 'Duyệt đơn phòng ban <= 1.000.000đ',
    badgeClass: 'badge-primary',
  },
  {
    role: 'thu_mua',
    name: 'Lê Văn Cường',
    email: 'thuamua@demo.com',
    password: '123456',
    department: 'Phòng Thu Mua',
    description: 'Khảo giá thị trường, điền đơn giá thực tế',
    badgeClass: 'badge-warning',
  },
  {
    role: 'ke_toan',
    name: 'Phạm Thị Dung',
    email: 'ketoan@demo.com',
    password: '123456',
    department: 'Phòng Tài Chính',
    description: 'Xác nhận giá, giải ngân, duyệt hoàn ứng',
    badgeClass: 'badge-success',
  },
  {
    role: 'giam_doc',
    name: 'Hoàng Văn Em',
    email: 'giamdoc@demo.com',
    password: '123456',
    department: 'Ban Giám Đốc',
    description: 'Duyệt đơn mua sắm <= 10.000.000đ & tạm ứng',
    badgeClass: 'badge-purple',
  },
  {
    role: 'chu_tich',
    name: 'Đặng Thị Phúc',
    email: 'chutich@demo.com',
    password: '123456',
    department: 'Ban Giám Đốc',
    description: 'Thẩm quyền tối cao duyệt mọi đơn',
    badgeClass: 'badge-purple',
  },
];
