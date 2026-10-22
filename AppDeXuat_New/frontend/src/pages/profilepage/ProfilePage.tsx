import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services';
import { getRoleBadgeClass, getRoleLabel } from '../../utils/formatters';
import {
  User as UserIcon,
  CreditCard,
  Save,
  CheckCircle,
  Shield,
  HelpCircle,
} from 'lucide-react';


export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();

  const [bankAccount, setBankAccount] = useState({
    bankName: user?.bankAccount?.bankName || '',
    accountNumber: user?.bankAccount?.accountNumber || '',
    accountHolder: user?.bankAccount?.accountHolder || user?.fullName || '',
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updatedUser = await authService.updateBankAccount(bankAccount);
      updateUser(updatedUser);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(err.message || 'Không thể cập nhật thông tin ngân hàng');
    } finally {
      setSaving(false);
    }
  };

  const deptName =
    typeof user?.department === 'object' && user.department !== null
      ? user.department.name
      : 'Không xác định';

  return (
    <div>
      {/* Tiêu đề trang */}
      <div className="page-header">
        <div className="page-header-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
            >
              <UserIcon size={20} />
            </div>
            <h1>Hồ Sơ Cá Nhân & Thông Tin Ngân Hàng</h1>
          </div>
          <p style={{ fontSize: '0.875rem' }}>
            Quản lý tài khoản thụ hưởng nhận tiền giải ngân tạm ứng và xem quyền hạn phê duyệt của bạn.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.75rem' }}>
        {/* Thẻ thông tin nhân sự */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Shield size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '1.1rem', color: '#ffffff' }}>Thông Tin Nhân Sự</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.75rem' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.5rem',
                color: '#ffffff',
                border: '3px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              {user?.fullName.split(' ').slice(-1)[0][0]}
            </div>

            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                {user?.fullName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span className={`badge ${getRoleBadgeClass(user?.role)}`}>
                  {getRoleLabel(user?.role)}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {user?.email}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Phòng ban trực thuộc:</span>
              <strong style={{ color: '#ffffff' }}>{deptName}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Mã vai trò hệ thống:</span>
              <strong className="font-mono" style={{ color: 'var(--accent-cyan)' }}>{user?.role}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Trạng thái tài khoản:</span>
              <span className="badge badge-success">Đang hoạt động</span>
            </div>
          </div>

          <div
            style={{
              marginTop: '1.5rem',
              padding: '1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.825rem' }}>
              <HelpCircle size={15} color="var(--primary)" />
              <span>Quyền hạn theo thẩm quyền chức vụ:</span>
            </div>
            <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {user?.role === 'nhan_vien' && 'Khởi tạo đề xuất mua sắm & tạm ứng, thực hiện hoàn tạm ứng kèm chứng từ sau giải ngân.'}
              {user?.role === 'truong_phong' && 'Phê duyệt các đơn mua sắm của phòng ban có hạn mức dự toán <= 1.000.000 VNĐ.'}
              {user?.role === 'thu_mua' && 'Tiếp nhận đơn mua sắm đã qua vòng 1, tiến hành khảo giá và nhập đơn giá thực tế.'}
              {user?.role === 'ke_toan' && 'Xác nhận đơn giá thị trường, phê duyệt chi và thực hiện giải ngân tiền mua sắm/tạm ứng, xác nhận quyết toán hoàn ứng.'}
              {user?.role === 'giam_doc' && 'Phê duyệt mua sắm có hạn mức <= 10.000.000 VNĐ và phê duyệt các đơn xin tạm ứng.'}
              {user?.role === 'chu_tich' && 'Thẩm quyền tối cao, duyệt mọi đơn mua sắm vượt 10.000.000 VNĐ và phê duyệt tạm ứng.'}
            </p>
          </div>
        </div>

        {/* Thẻ cập nhật số tài khoản ngân hàng */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <CreditCard size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.1rem', color: '#ffffff' }}>Cập Nhật Số Tài Khoản Ngân Hàng</h3>
          </div>

          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Thông tin này sẽ được tự động điền khi bạn tạo đề xuất tạm ứng kinh phí để Kế toán giải ngân trực tiếp.
          </p>

          {success && (
            <div
              style={{
                padding: '0.85rem 1rem',
                backgroundColor: 'var(--success-bg)',
                border: '1px solid var(--success-border)',
                borderRadius: 'var(--radius-md)',
                color: '#34d399',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <CheckCircle size={16} />
              <span>Đã lưu thông tin tài khoản ngân hàng thành công!</span>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: '0.85rem 1rem',
                backgroundColor: 'var(--danger-bg)',
                border: '1px solid var(--danger-border)',
                borderRadius: 'var(--radius-md)',
                color: '#f87171',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSaveBank}>
            <div className="form-group">
              <label className="form-label">
                Tên Ngân Hàng <span className="required">*</span>
              </label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="Ví dụ: Vietcombank, Techcombank, MBBank..."
                value={bankAccount.bankName}
                onChange={(e) => setBankAccount({ ...bankAccount, bankName: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Số Tài Khoản <span className="required">*</span>
              </label>
              <input
                type="text"
                required
                className="form-input font-mono"
                placeholder="0123456789..."
                value={bankAccount.accountNumber}
                onChange={(e) => setBankAccount({ ...bankAccount, accountNumber: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.75rem' }}>
              <label className="form-label">Tên Chủ Tài Khoản (Không dấu)</label>
              <input
                type="text"
                className="form-input"
                placeholder="NGUYEN VAN A..."
                value={bankAccount.accountHolder}
                onChange={(e) => setBankAccount({ ...bankAccount, accountHolder: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem' }}
            >
              <Save size={16} />
              <span>{saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
