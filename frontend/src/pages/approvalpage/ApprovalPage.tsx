import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { purchaseProposalService, advanceProposalService } from '../../services';
import { PurchaseProposal, AdvanceProposal } from '../../models';
import { StatusBadge } from '../../component';
import { formatCurrency, formatDate, getRoleLabel } from '../../utils/formatters';
import {
  CheckCircle2,
  ShoppingCart,
  Banknote,
  Eye,
  Loader2,
  Inbox,
} from 'lucide-react';

export const ApprovalPage: React.FC = () => {
  const { user } = useAuth();
  const [purchaseList, setPurchaseList] = useState<PurchaseProposal[]>([]);
  const [advanceList, setAdvanceList] = useState<AdvanceProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'purchase' | 'advance'>('all');

  const fetchPendingProposals = useCallback(async () => {
    setLoading(true);
    try {
      const [purchases, advances] = await Promise.all([
        purchaseProposalService.getAll(),
        advanceProposalService.getAll(),
      ]);

      const myPurchases = purchases.filter(
        (p) => p.currentApprovalRole === user?.role
      );

      const myAdvances = advances.filter(
        (a) =>
          a.currentApprovalRole === user?.role ||
          (a.currentApprovalRole === 'creator' && a.creator?._id === user?._id)
      );

      setPurchaseList(myPurchases);
      setAdvanceList(myAdvances);
    } catch (err) {
      console.error('Error fetching approval inbox:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPendingProposals();
  }, [fetchPendingProposals]);

  const totalPending = purchaseList.length + advanceList.length;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--warning)',
              }}
            >
              <CheckCircle2 size={20} />
            </div>
            <h1>Danh Sách Đề Xuất Cần Tôi Duyệt</h1>
          </div>
          <p style={{ fontSize: '0.875rem' }}>
            Hộp thư các đề xuất mua sắm & tạm ứng đang chờ xử lý theo vai trò{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{getRoleLabel(user?.role)}</strong> của bạn.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <button
          className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('all')}
          style={{ fontSize: '0.825rem' }}
        >
          <span>Tất Cả ({totalPending})</span>
        </button>
        <button
          className={`btn ${activeTab === 'purchase' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('purchase')}
          style={{ fontSize: '0.825rem' }}
        >
          <ShoppingCart size={15} />
          <span>Mua Sắm ({purchaseList.length})</span>
        </button>
        <button
          className={`btn ${activeTab === 'advance' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('advance')}
          style={{ fontSize: '0.825rem' }}
        >
          <Banknote size={15} />
          <span>Tạm Ứng ({advanceList.length})</span>
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}>
          <Loader2 size={36} className="animate-spin" color="var(--primary)" />
        </div>
      ) : totalPending === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
            <Inbox size={28} />
          </div>
          <h3 style={{ color: '#ffffff' }}>Tuyệt vời! Bạn không có đề xuất nào đang chờ xử lý</h3>
          <p style={{ fontSize: '0.85rem' }}>
            Toàn bộ đề xuất liên quan đến vai trò "{getRoleLabel(user?.role)}" đã được xử lý xong.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Purchase List awaiting approval */}
          {(activeTab === 'all' || activeTab === 'purchase') && purchaseList.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <ShoppingCart size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1.05rem', color: '#ffffff' }}>Đề Xuất Mua Sắm Chờ Duyệt ({purchaseList.length})</h3>
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mã Đơn</th>
                      <th>Người Tạo</th>
                      <th>Phòng Ban</th>
                      <th>Dự Toán</th>
                      <th>Trạng Thái Hiện Tại</th>
                      <th>Ngày Tạo</th>
                      <th style={{ textAlign: 'right' }}>Hành Động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseList.map((p) => (
                      <tr key={p._id}>
                        <td>
                          <Link to={`/purchase/${p._id}`} style={{ fontWeight: 700 }} className="font-mono">
                            {p.proposalCode}
                          </Link>
                        </td>
                        <td style={{ fontWeight: 600 }}>{p.creator?.fullName}</td>
                        <td>{p.department?.name}</td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }} className="font-mono">
                          {formatCurrency(p.totalEstimatedAmount)}
                        </td>
                        <td>
                          <StatusBadge status={p.status} type="purchase" />
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {formatDate(p.createdAt)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Link to={`/purchase/${p._id}`} className="btn btn-warning btn-sm">
                            <Eye size={14} />
                            <span>Xử lý ngay</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Advance List awaiting approval */}
          {(activeTab === 'all' || activeTab === 'advance') && advanceList.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Banknote size={18} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '1.05rem', color: '#ffffff' }}>Đề Xuất Tạm Ứng Chờ Xử Lý ({advanceList.length})</h3>
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mã Đơn</th>
                      <th>Người Nhận Tạm Ứng</th>
                      <th>Mục Đích</th>
                      <th>Số Tiền</th>
                      <th>Trạng Thái</th>
                      <th>Ngày Tạo</th>
                      <th style={{ textAlign: 'right' }}>Hành Động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {advanceList.map((a) => (
                      <tr key={a._id}>
                        <td>
                          <Link to={`/advance/${a._id}`} style={{ fontWeight: 700 }} className="font-mono">
                            {a.proposalCode}
                          </Link>
                        </td>
                        <td style={{ fontWeight: 600 }}>{a.creator?.fullName}</td>
                        <td style={{ fontSize: '0.85rem' }}>{a.items?.[0]?.mucDich || '—'}</td>
                        <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }} className="font-mono">
                          {formatCurrency(a.totalAmount)}
                        </td>
                        <td>
                          <StatusBadge status={a.status} type="advance" />
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {formatDate(a.createdAt)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Link to={`/advance/${a._id}`} className="btn btn-warning btn-sm">
                            <Eye size={14} />
                            <span>Xử lý ngay</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
