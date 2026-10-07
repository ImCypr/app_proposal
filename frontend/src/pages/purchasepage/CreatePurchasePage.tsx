import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { purchaseProposalService } from '../../services';
import { formatCurrency } from '../../utils/formatters';
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
} from 'lucide-react';

interface PurchaseFormItem {
  id: string;
  tenVatTu: string;
  soLuong: number;
  donVi: string;
  donGiaDuDoan: number;
  yeuCau: string;
}

export const CreatePurchasePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<PurchaseFormItem[]>([
    {
      id: '1',
      tenVatTu: '',
      soLuong: 1,
      donVi: 'Cái',
      donGiaDuDoan: 0,
      yeuCau: '',
    },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        tenVatTu: '',
        soLuong: 1,
        donVi: 'Cái',
        donGiaDuDoan: 0,
        yeuCau: '',
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

  const totalEstimatedAmount = items.reduce(
    (sum, item) => sum + (Number(item.soLuong) || 0) * (Number(item.donGiaDuDoan) || 0),
    0
  );

  // Determine initial approver preview based on user role and amount
  let approverPreview = 'Trưởng phòng';
  if (user?.role === 'nhan_vien') {
    if (totalEstimatedAmount <= 1000000) approverPreview = 'Trưởng phòng';
    else if (totalEstimatedAmount <= 10000000) approverPreview = 'Giám đốc';
    else approverPreview = 'Chủ tịch';
  } else if (user?.role === 'truong_phong') {
    if (totalEstimatedAmount <= 1000000) approverPreview = 'Thu mua (Tự động thông qua)';
    else if (totalEstimatedAmount <= 10000000) approverPreview = 'Giám đốc';
    else approverPreview = 'Chủ tịch';
  } else if (user?.role === 'giam_doc') {
    if (totalEstimatedAmount <= 10000000) approverPreview = 'Thu mua (Tự động thông qua)';
    else approverPreview = 'Chủ tịch';
  } else if (user?.role === 'chu_tich') {
    approverPreview = 'Thu mua (Duyệt ngay)';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    for (let i = 0; i < items.length; i++) {
      if (!items[i].tenVatTu.trim()) {
        setError(`Vui lòng nhập tên vật tư cho dòng số ${i + 1}`);
        return;
      }
      if (items[i].soLuong <= 0) {
        setError(`Số lượng dòng số ${i + 1} phải lớn hơn 0`);
        return;
      }
      if (items[i].donGiaDuDoan <= 0) {
        setError(`Đơn giá dự kiến dòng số ${i + 1} phải lớn hơn 0`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        items: items.map((item, index) => ({
          stt: index + 1,
          tenVatTu: item.tenVatTu.trim(),
          soLuong: Number(item.soLuong),
          donVi: item.donVi.trim(),
          donGiaDuDoan: Number(item.donGiaDuDoan),
          yeuCau: item.yeuCau.trim(),
        })),
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
      {/* Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to="/purchase" className="btn btn-ghost btn-sm" style={{ padding: '0.4rem' }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 style={{ fontSize: '1.5rem', color: '#ffffff' }}>Tạo Đề Xuất Mua Sắm Mới</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Điền danh mục vật tư cần mua sắm. Hệ thống sẽ tự động xác định luồng duyệt theo định mức giá.
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
        {/* Items Table Card */}
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
                  <th style={{ width: '100px' }}>Số Lượng</th>
                  <th style={{ width: '110px' }}>Đơn Vị</th>
                  <th style={{ width: '160px' }}>Đơn Giá Dự Đoán (VNĐ)</th>
                  <th style={{ width: '160px' }}>Thành Tiền Dự Kiến</th>
                  <th style={{ minWidth: '180px' }}>Yêu Cầu / Ghi Chú</th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const lineTotal = (Number(item.soLuong) || 0) * (Number(item.donGiaDuDoan) || 0);
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
                          type="number"
                          min="1"
                          required
                          className="form-input"
                          value={item.soLuong}
                          onChange={(e) => updateItem(index, 'soLuong', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          required
                          className="form-input"
                          placeholder="Ram / Cái..."
                          value={item.donVi}
                          onChange={(e) => updateItem(index, 'donVi', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          required
                          className="form-input font-mono"
                          placeholder="0"
                          value={item.donGiaDuDoan || ''}
                          onChange={(e) => updateItem(index, 'donGiaDuDoan', Number(e.target.value))}
                        />
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }} className="font-mono">
                        {formatCurrency(lineTotal)}
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Quy cách, chủng loại..."
                          value={item.yeuCau}
                          onChange={(e) => updateItem(index, 'yeuCau', e.target.value)}
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

        {/* Calculation & Workflow Summary Footer */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          {/* Workflow Guide */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <HelpCircle size={18} color="var(--primary)" />
              <h4 style={{ fontSize: '0.95rem', color: '#ffffff' }}>Thẩm Quyền Duyệt Dự Kiến</h4>
            </div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Căn cứ hạn mức tổng dự toán của bạn ({formatCurrency(totalEstimatedAmount)}):
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
                <span>Cấp duyệt vòng 1: {approverPreview}</span>
              </div>
            </div>
          </div>

          {/* Budget Grand Total */}
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
                Tổng Dự Toán Dự Kiến ({items.length} hạng mục)
              </div>
              <div
                style={{
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  marginTop: '0.25rem',
                }}
                className="font-mono"
              >
                {formatCurrency(totalEstimatedAmount)}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <Link to="/purchase" className="btn btn-secondary">
                Hủy Bỏ
              </Link>
              <button
                type="submit"
                disabled={submitting || totalEstimatedAmount <= 0}
                className="btn btn-primary"
                style={{ padding: '0.75rem 1.5rem' }}
              >
                <Save size={16} />
                <span>{submitting ? 'Đang gửi...' : 'Gửi Phê Duyệt'}</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
