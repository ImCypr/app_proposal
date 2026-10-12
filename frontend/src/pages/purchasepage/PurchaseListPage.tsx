import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { purchaseProposalService } from '../../services';
import { PurchaseProposal } from '../../models';
import { StatusBadge, PurchasePrintModal } from '../../component';
import { formatCurrency, formatDate, getRoleLabel } from '../../utils/formatters';
import {
  ShoppingCart,
  PlusCircle,
  Search,
  Filter,
  Eye,
  Loader2,
  FileQuestion,
  Printer,
} from 'lucide-react';

export const PurchaseListPage: React.FC = () => {
  const [proposals, setProposals] = useState<PurchaseProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [printProposal, setPrintProposal] = useState<PurchaseProposal | null>(null);

  const loadProposals = async () => {
    setLoading(true);
    try {
      const data = await purchaseProposalService.getAll();
      setProposals(data);
    } catch (err) {
      console.error('Error loading purchase proposals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProposals();
  }, []);


  const filteredProposals = proposals.filter((p) => {
    const matchesSearch =
      p.proposalCode.toLowerCase().includes(search.toLowerCase()) ||
      p.creator?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      p.items.some((i) => i.tenVatTu.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalProposals = proposals.length;
  const pendingCount = proposals.filter((p) =>
    ['pending_approval', 'procurement_review', 'accounting_review', 'pending_final_approval', 'pending_payment', 'pending_payment_approval'].includes(p.status)
  ).length;
  const disbursingCount = proposals.filter((p) => p.status === 'disbursing').length;
  const completedCount = proposals.filter((p) => p.status === 'completed').length;

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
              <ShoppingCart size={20} />
            </div>
            <h1>Danh Sách Đề Xuất Mua Sắm</h1>
          </div>
          <p style={{ fontSize: '0.875rem' }}>
            Quản lý, theo dõi tiến độ khảo giá và duyệt chi các đề xuất vật tư trang thiết bị.
          </p>
        </div>

        <div className="page-header-actions">
          <Link to="/purchase/create" className="btn btn-primary">
            <PlusCircle size={17} />
            <span>Tạo Đơn Mua Sắm Mới</span>
          </Link>
        </div>
      </div>

      {/* Thẻ thống kê nhanh */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tổng Số Đơn</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>{totalProposals}</div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--warning)' }}>Đang Chờ Duyệt / Chi</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fbbf24' }}>{pendingCount}</div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>Đang Giải Ngân</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8' }}>{disbursingCount}</div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Đã Hoàn Thành</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399' }}>{completedCount}</div>
        </div>
      </div>

      {/* Thanh tìm kiếm và bộ lọc */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '38px' }}
            placeholder="Tìm theo mã đơn, người tạo hoặc tên vật tư..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <Filter size={15} />
            <span>Trạng thái:</span>
          </div>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '180px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending_approval">Chờ duyệt sơ bộ</option>
            <option value="procurement_review">Thu mua khảo giá</option>
            <option value="accounting_review">Kế toán xác nhận</option>
            <option value="pending_final_approval">Chờ duyệt giá chốt</option>
            <option value="pending_payment">Chờ kế toán lập thanh toán</option>
            <option value="pending_payment_approval">Chờ duyệt thanh toán</option>
            <option value="disbursing">Đang giải ngân</option>
            <option value="completed">Đã hoàn thành</option>
            <option value="rejected">Bị từ chối</option>
          </select>
        </div>
      </div>

      {/* Bảng danh sách các đề xuất mua sắm */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
          <Loader2 size={36} className="animate-spin" color="var(--primary)" />
        </div>
      ) : filteredProposals.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">
            <FileQuestion size={28} />
          </div>
          <h3 style={{ color: '#ffffff' }}>Không tìm thấy đề xuất mua sắm nào</h3>
          <p style={{ fontSize: '0.85rem' }}>
            {search || statusFilter !== 'all'
              ? 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.'
              : 'Hãy tạo đơn mua sắm vật tư đầu tiên cho phòng ban của bạn!'}
          </p>
          <Link to="/purchase/create" className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }}>
            <PlusCircle size={15} />
            <span>Tạo Đơn Mới</span>
          </Link>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Mã Đề Xuất</th>
                <th>Người Tạo</th>
                <th>Phòng Ban</th>
                <th>Số Vật Tư</th>
                <th>Dự Toán</th>
                <th>Thực Tế</th>
                <th>Trạng Thái</th>
                <th>Bước Kế Tiếp</th>
                <th style={{ textAlign: 'right' }}>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {filteredProposals.map((p) => (
                <tr key={p._id}>
                  <td>
                    <Link
                      to={`/purchase/${p._id}`}
                      style={{ fontWeight: 700, color: '#ffffff' }}
                      className="font-mono"
                    >
                      {p.proposalCode}
                    </Link>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                      {formatDate(p.createdAt)}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.creator?.fullName}</div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                      {getRoleLabel(p.creator?.role)}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem' }}>{p.department?.name}</span>
                  </td>
                  <td>
                    <span className="badge badge-secondary">{p.items?.length || 0} mục</span>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatCurrency(p.totalEstimatedAmount)}
                  </td>
                  <td>
                    {p.totalActualAmount ? (
                      <span style={{ fontWeight: 700, color: 'var(--success)' }}>
                        {formatCurrency(p.totalActualAmount)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>Chưa chốt</span>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={p.status} type="purchase" />
                  </td>
                  <td>
                    {p.currentApprovalRole ? (
                      <span className="badge badge-warning">
                        {getRoleLabel(p.currentApprovalRole)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => setPrintProposal(p)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '0.4rem 0.65rem', color: 'var(--accent-cyan)' }}
                        title="Xem trước và In biểu mẫu PDF"
                      >
                        <Printer size={14} />
                        <span>In PDF</span>
                      </button>
                      <Link
                        to={`/purchase/${p._id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.4rem 0.75rem' }}
                      >
                        <Eye size={14} />
                        <span>Chi tiết</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL XEM TRƯỚC VÀ IN BIỂU MẪU ĐỀ XUẤT MUA SẮM VẬT TƯ */}
      <PurchasePrintModal
        isOpen={!!printProposal}
        onClose={() => setPrintProposal(null)}
        proposal={printProposal}
      />
    </div>
  );
};
