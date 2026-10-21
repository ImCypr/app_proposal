import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { purchaseProposalService, uploadService } from '../../services';
import { formatCurrency } from '../../utils/formatters';
import {
  createLocalAttachments,
  uploadPendingLocalAttachments,
  revokeLocalAttachment,
  LocalAttachment,
} from '../../utils/clientAttachmentHelper';
import { useAuth } from '../../context/AuthContext';
import {
  ShoppingCart,
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  UploadCloud,
  FileText,
  Loader2,
} from 'lucide-react';

interface PurchaseFormItem {
  id: string;
  tenVatTu: string;
  yeuCauKiThuat: string;
  phongBanSuDung: string;
  soLuong: number;
  donGiaDuKien: number;
}

export const CreatePurchasePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const defaultDepartment = (user?.department && typeof user.department === 'object' && 'name' in user.department)
    ? (user.department as any).name
    : '';

  const [items, setItems] = useState<PurchaseFormItem[]>([
    {
      id: '1',
      tenVatTu: '',
      yeuCauKiThuat: '',
      phongBanSuDung: defaultDepartment,
      soLuong: 1,
      donGiaDuKien: 0,
    },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // [TỐI ƯU CƠ CHẾ GỬI ẢNH] Lưu ảnh minh chứng cục bộ ở máy khách, khi bấm Gửi mới upload lên máy chủ
  const [necessityReason, setNecessityReason] = useState('');
  const [necessityAttachments, setNecessityAttachments] = useState<LocalAttachment[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        tenVatTu: '',
        yeuCauKiThuat: '',
        phongBanSuDung: prev[prev.length - 1]?.phongBanSuDung || defaultDepartment,
        soLuong: 1,
        donGiaDuKien: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateItem = (index: number, field: keyof PurchaseFormItem, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // [LUỒNG MỚI] Bỏ phần ước tính chi phí khi nhân viên tạo yêu cầu vật tư gửi lên trưởng phòng
  const totalEstimatedAmount = 0;

  // [LUỒNG MỚI] Luồng 5 bước cố định, luôn bắt đầu bằng Trưởng phòng kiểm tra tính thỏa đáng
  const approverPreview = 'Trưởng phòng kiểm tra tính thỏa đáng của yêu cầu vật tư';

  // [TỐI ƯU GỬI ẢNH] Lưu tệp minh chứng cục bộ ở máy khách, không upload ngay
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    const { attachments: localFiles, oversizedCount } = createLocalAttachments(files);
    if (oversizedCount > 0) {
      alert('Một số tệp vượt quá dung lượng tối đa 15MB đã bị bỏ qua.');
    }
    setNecessityAttachments((prev) => [...prev, ...localFiles]);
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setNecessityAttachments((prev) => {
      const target = prev[index];
      if (target) revokeLocalAttachment(target);
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Kiểm tra tính hợp lệ của dữ liệu nhập (Validation)
    for (let i = 0; i < items.length; i++) {
      if (!items[i].tenVatTu.trim()) {
        setError(`Vui lòng nhập tên vật tư cho dòng số ${i + 1}`);
        return;
      }
      if (!items[i].phongBanSuDung.trim()) {
        setError(`Vui lòng nhập phòng ban sử dụng cho dòng số ${i + 1}`);
        return;
      }
      if (items[i].soLuong <= 0) {
        setError(`Số lượng dòng số ${i + 1} phải lớn hơn 0`);
        return;
      }
    }

    setSubmitting(true);
    try {
      // [TỐI ƯU CƠ CHẾ GỬI ẢNH] Chỉ khi người dùng bấm gửi mới tải các ảnh minh chứng lên server
      const serverAttachments = await uploadPendingLocalAttachments(necessityAttachments);

      const payload = {
        items: items.map((item, index) => ({
          stt: index + 1,
          tenVatTu: item.tenVatTu.trim(),
          yeuCauKiThuat: item.yeuCauKiThuat.trim(),
          phongBanSuDung: item.phongBanSuDung.trim(),
          soLuong: Number(item.soLuong),
          donGiaDuKien: 0,
        })),
        necessityReason: necessityReason.trim(),
        necessityAttachments: serverAttachments,
      };

      const result = await purchaseProposalService.create(payload);
      navigate(`/purchase/${result._id}`);
    } catch (err: any) {
      setError(err.message || 'Không thể tạo đề xuất mua sắm');
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Tiêu đề trang */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to="/purchase" className="btn btn-ghost btn-sm" style={{ padding: '0.4rem' }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 style={{ fontSize: '1.5rem', color: '#ffffff' }}>Tạo Đề Xuất Mua Sắm Mới</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Điền danh mục vật tư cần mua và giải trình tính cần thiết. Đơn sẽ chuyển tới Trưởng phòng duyệt tính thỏa đáng trước khi Thu mua khảo sát giá.
          </p>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            borderRadius: 'var(--radius-md)',
            color: '#f87171',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Bảng danh sách vật tư hàng hóa */}
        <div className="card" style={{ marginBottom: '1.75rem', padding: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingCart size={18} color="var(--primary)" />
              <h3 style={{ fontSize: '1.1rem', color: '#ffffff' }}>Danh Mục Vật Tư / Hàng Hóa</h3>
            </div>
            <button type="button" onClick={addItem} className="btn btn-secondary btn-sm">
              <Plus size={15} />
              <span>Thêm dòng vật tư</span>
            </button>
          </div>

          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                  <th style={{ minWidth: '220px' }}>Tên Vật Tư <span style={{ color: 'var(--danger)' }}>*</span></th>
                  <th style={{ minWidth: '200px' }}>Yêu Cầu Kĩ Thuật</th>
                  <th style={{ minWidth: '180px' }}>Phòng Ban Sử Dụng <span style={{ color: 'var(--danger)' }}>*</span></th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Số Lượng <span style={{ color: 'var(--danger)' }}>*</span></th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  return (
                    <tr key={item.id}>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{index + 1}</td>
                      <td>
                        <input
                          type="text"
                          required
                          className="form-input"
                          placeholder="Ví dụ: Giấy in A4 Double A..."
                          value={item.tenVatTu}
                          onChange={(e) => updateItem(index, 'tenVatTu', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Quy cách, tiêu chuẩn kĩ thuật..."
                          value={item.yeuCauKiThuat}
                          onChange={(e) => updateItem(index, 'yeuCauKiThuat', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          required
                          className="form-input"
                          placeholder="Phòng ban sử dụng..."
                          value={item.phongBanSuDung}
                          onChange={(e) => updateItem(index, 'phongBanSuDung', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          required
                          className="form-input"
                          style={{ textAlign: 'center' }}
                          value={item.soLuong}
                          onChange={(e) => updateItem(index, 'soLuong', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--danger)', padding: '0.4rem' }}
                            title="Xóa dòng này"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* [LUỒNG MỚI] Giải trình tính cần thiết & Đính kèm ảnh minh chứng (không cần nhập số tiền tạm ứng) */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <FileText size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '1rem', color: '#ffffff', margin: 0 }}>
              Giải Trình Tính Cần Thiết Của Đề Xuất Mua Sắm
            </h3>
          </div>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Nêu rõ mục đích sử dụng, lý do cần thiết phải mua sắm vật tư/thiết bị này (ví dụ: vật tư cũ hỏng hóc, phòng ban mở rộng, vật tư tiêu hao hết...).
          </p>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Nhập lý do / giải trình tính cần thiết tại sao cần mua sắm các vật tư trên..."
              value={necessityReason}
              onChange={(e) => setNecessityReason(e.target.value)}
            />
          </div>

          {/* Đính kèm ảnh minh chứng */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>
                Ảnh / Tài liệu minh chứng (Ảnh hiện trạng hư hỏng, ảnh mẫu vật tư...):
              </label>
              <label
                className={`btn btn-secondary btn-sm ${uploadingImage ? 'disabled' : ''}`}
                style={{ cursor: uploadingImage ? 'not-allowed' : 'pointer', fontSize: '0.75rem', gap: '0.35rem' }}
              >
                {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                <span>{uploadingImage ? 'Đang tải ảnh lên...' : 'Tải lên ảnh / file minh chứng'}</span>
                <input
                  type="file"
                  multiple
                  disabled={uploadingImage}
                  accept=".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            {necessityAttachments.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
                {necessityAttachments.map((att, aIdx) => (
                  <div
                    key={aIdx}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                      position: 'relative',
                    }}
                  >
                    {att.type?.includes('image') || /\.(png|jpg|jpeg|webp)$/i.test(att.name) ? (
                      <img
                        src={att.url}
                        alt={att.name}
                        style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '4px' }}
                      />
                    ) : (
                      <div style={{ height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                        <FileText size={28} color="var(--primary)" />
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }} title={att.name}>
                        {att.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(aIdx)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '0.2rem', color: 'var(--danger)' }}
                        title="Xóa tệp này"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.25rem' }}>
                Chưa có ảnh/tài liệu đính kèm. Bạn có thể đính kèm ảnh hiện trạng hư hỏng hoặc mẫu vật tư để Trưởng phòng và Thu mua dễ nắm bắt.
              </div>
            )}
          </div>
        </div>

        {/* Khối tổng kết ngân sách và thẩm quyền duyệt */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          {/* Hướng dẫn thẩm quyền duyệt */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <HelpCircle size={18} color="var(--primary)" />
              <h4 style={{ fontSize: '0.95rem', color: '#ffffff' }}>Quy Trình Phê Duyệt Mua Sắm</h4>
            </div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Đề xuất sẽ được xử lý tuần tự qua 5 bước chuẩn hóa:
              <div
                style={{
                  marginTop: '0.65rem',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  color: '#ffffff',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <CheckCircle size={16} color="var(--primary)" />
                <span>Bước 1: {approverPreview}</span>
              </div>
              <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Sau đó: Thu mua lập 3-4 báo giá ➔ Giám đốc duyệt ➔ Thu mua thực hiện ➔ Kế toán giải ngân.
              </div>
            </div>
          </div>

          {/* [LUỒNG MỚI] Tổng số hạng mục vật tư yêu cầu (bỏ ước tính chi phí ở bước nhân viên tạo) */}
          <div
            className="card"
            style={{
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Tổng Hạng Mục Yêu Cầu Mua Sắm
              </div>
              <div
                style={{
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: 'var(--accent-cyan)',
                  letterSpacing: '-0.02em',
                  marginTop: '0.25rem',
                }}
                className="font-mono"
              >
                {items.length} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>hạng mục</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', lineHeight: 1.4 }}>
                {['truong_phong', 'giam_doc', 'chu_tich'].includes(user?.role || '')
                  ? '⚡ Với vai trò quản lý, đơn của bạn sẽ được chuyển thẳng tới Thu mua để lập báo giá (bỏ qua bước Trưởng phòng duyệt).'
                  : `ℹ️ Đơn sẽ được gửi đến Trưởng phòng trực tiếp${user?.directManager && typeof user.directManager === 'object' ? ` (${(user.directManager as any).fullName})` : ''} để duyệt. Sau đó Thu mua sẽ khảo sát 3-4 báo giá và trình Giám đốc.`
                }
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <Link to="/purchase" className="btn btn-secondary">
                Hủy Bỏ
              </Link>
              <button
                type="submit"
                disabled={submitting || items.length === 0}
                className="btn btn-primary"
                style={{ padding: '0.75rem 1.5rem' }}
              >
                <Save size={16} />
                <span>{submitting ? 'Đang gửi...' : (['truong_phong', 'giam_doc', 'chu_tich'].includes(user?.role || '') ? 'Gửi Yêu Cầu Lên Thu Mua' : 'Gửi Yêu Cầu Lên Trưởng Phòng Duyệt')}</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
