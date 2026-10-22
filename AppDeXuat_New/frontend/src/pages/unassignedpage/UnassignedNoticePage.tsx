import React from 'react';
import { ShieldAlert, LogOut, Mail, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const UnassignedNoticePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        padding: '2rem',
      }}
    >
      <div
        style={{
          maxWidth: '540px',
          width: '100%',
          backgroundColor: 'var(--surface-color)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          padding: '2.5rem',
          textAlign: 'center',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            color: '#f59e0b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto',
          }}
        >
          <ShieldAlert size={38} />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          Tài Khoản Chưa Được Gán Chức Danh Nghiệp Vụ
        </h2>

        <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Xin chào <strong>{user?.fullName}</strong> ({user?.email}), tài khoản của bạn hiện đang ở trạng thái{' '}
          <span style={{ color: '#f59e0b', fontWeight: 600 }}>Chưa gán chức danh (unassigned)</span>.
          Do đó, bạn chưa thể truy cập vào các chức năng lập hoặc phê duyệt hồ sơ mua sắm, thanh toán hay tạm ứng.
        </p>

        <div
          style={{
            padding: '1.25rem',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            textAlign: 'left',
            marginBottom: '1.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#a78bfa', fontWeight: 600, fontSize: '0.85rem' }}>
            <Mail size={16} />
            <span>Hướng Dẫn Kích Hoạt Quyền:</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <li>Vui lòng liên hệ <strong>Quản trị viên hệ thống (Admin)</strong> của công ty.</li>
            <li>Admin sẽ phân công 1 chức danh phù hợp (Nhân viên, Trưởng phòng, Thu mua, Kế toán, Giám đốc...).</li>
            <li>Sau khi được gán chức danh, bạn tải lại trang để bắt đầu làm việc.</li>
          </ul>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/profile')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <UserCheck size={16} />
            <span>Cập Nhật Thông Tin Cá Nhân</span>
          </button>

          <button
            type="button"
            className="btn btn-danger"
            onClick={logout}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <LogOut size={16} />
            <span>Đăng Xuất</span>
          </button>
        </div>
      </div>
    </div>
  );
};
