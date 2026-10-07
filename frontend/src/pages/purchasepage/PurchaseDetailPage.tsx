import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { purchaseProposalService } from '../../services';
import { PurchaseProposal } from '../../models';
import { StatusBadge, ApprovalFlowTracker, Modal } from '../../component';
import { formatCurrency, formatDate, getRoleLabel } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft,
  ShoppingCart,
  CheckCircle2,
  XCircle,
  ShoppingBag,
  DollarSign,
  FileCheck2,
  Building,
  User as UserIcon,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export const PurchaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [proposal, setProposal] = useState<PurchaseProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isProcurementOpen, setIsProcurementOpen] = useState(false);
  const [isAccountingOpen, setIsAccountingOpen] = useState(false);
  const [isFinalApproveOpen, setIsFinalApproveOpen] = useState(false);
  const [isDisburseOpen, setIsDisburseOpen] = useState(false);

  // Form states inside modals
  const [comment, setComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [procurementPrices, setProcurementPrices] = useState<Record<string, number>>({});
  const [disburseAmount, setDisburseAmount] = useState<number>(0);
  const [disburseNote, setDisburseNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProposal = useCallback(async (propId: string) => {
    setLoading(true);
    try {
      const data = await purchaseProposalService.getById(propId);
      setProposal(data);
      // Pre-fill procurement prices if existing
      const initialPrices: Record<string, number> = {};
      data.items.forEach((item) => {
        if (item._id) {
          initialPrices[item._id] = item.donGiaThucTe ?? item.donGiaDuDoan;
        }
      });
      setProcurementPrices(initialPrices);

      // Pre-fill remaining disbursement
      const totalAmount = data.totalActualAmount || data.totalEstimatedAmount;
      const remaining = Math.max(0, totalAmount - (data.totalDisbursed || 0));
      setDisburseAmount(remaining);
    } catch (err: any) {
      setError(err.message || 'Không thể tải chi tiết đề xuất');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) fetchProposal(id);
  }, [id, fetchProposal]);


  // Actions handlers
  const handleApprove = async () => {
    if (!proposal) return;
    setActionLoading(true);
    try {
      await purchaseProposalService.approve(proposal._id, comment);
      setIsApproveOpen(false);
      setComment('');
      fetchProposal(proposal._id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!proposal || !rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }
    setActionLoading(true);
    try {
      await purchaseProposalService.reject(proposal._id, rejectReason);
      setIsRejectOpen(false);
      setRejectReason('');
      fetchProposal(proposal._id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcurementSubmit = async () => {
    if (!proposal) return;
    setActionLoading(true);
    try {
      const itemsPayload = proposal.items.map((item) => ({
        _id: item._id,
        donGiaThucTe: Number(procurementPrices[item._id!] || item.donGiaDuDoan),
      }));
      await purchaseProposalService.submitProcurement(proposal._id, itemsPayload);
      setIsProcurementOpen(false);
      fetchProposal(proposal._id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccountingConfirm = async () => {
    if (!proposal) return;
    setActionLoading(true);
    try {
      await purchaseProposalService.accountingConfirm(proposal._id, comment);
      setIsAccountingOpen(false);
      setComment('');
      fetchProposal(proposal._id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalApprove = async () => {
    if (!proposal) return;
    setActionLoading(true);
    try {
      await purchaseProposalService.finalApprove(proposal._id, comment);
      setIsFinalApproveOpen(false);
      setComment('');
      fetchProposal(proposal._id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisburse = async () => {
    if (!proposal || disburseAmount <= 0) {
      alert('Vui lòng nhập số tiền giải ngân hợp lệ');
      return;
    }
    setActionLoading(true);
    try {
      await purchaseProposalService.disburse(proposal._id, disburseAmount, disburseNote);
      setIsDisburseOpen(false);
      setDisburseNote('');
      fetchProposal(proposal._id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}>
        <Loader2 size={36} className="animate-spin" color="var(--primary)" />
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <AlertCircle size={36} color="var(--danger)" style={{ margin: '0 auto 1rem auto' }} />
        <h3 style={{ color: '#ffffff' }}>{error || 'Không tìm thấy đề xuất'}</h3>
        <Link to="/purchase" className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  // Determine current user's available actions
  const isPendingMyApproval =
    proposal.currentApprovalRole === user?.role &&
    proposal.status === 'pending_approval';

  const isProcurementTurn =
    user?.role === 'thu_mua' &&
    proposal.status === 'procurement_review';

  const isAccountingReviewTurn =
    user?.role === 'ke_toan' &&
    proposal.status === 'accounting_review';

  const isFinalApprovalTurn =
    proposal.status === 'pending_final_approval' &&
    proposal.currentApprovalRole === user?.role;

  const isDisbursingTurn =
    user?.role === 'ke_toan' &&
    (proposal.status === 'disbursing' || proposal.status === 'final_approved');

  const totalActual = proposal.totalActualAmount ?? proposal.totalEstimatedAmount;
  const remainingDisbursement = Math.max(0, totalActual - proposal.totalDisbursed);

  return (
    <div>
      {/* Back and Header Bar */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/purchase" className="btn btn-ghost btn-sm" style={{ padding: '0.4rem' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h1 style={{ fontSize: '1.5rem', color: '#ffffff' }} className="font-mono">
                {proposal.proposalCode}
              </h1>
              <StatusBadge status={proposal.status} type="purchase" />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', marginTop: '0.2rem' }}>
              <span>Ngày lập: {formatDate(proposal.createdAt)}</span>
              <span>•</span>
              <span>Phòng ban: {proposal.department?.name}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {isPendingMyApproval && (
            <>
              <button onClick={() => setIsApproveOpen(true)} className="btn btn-success">
                <CheckCircle2 size={16} />
                <span>Duyệt Đề Xuất</span>
              </button>
              <button onClick={() => setIsRejectOpen(true)} className="btn btn-danger">
                <XCircle size={16} />
                <span>Từ Chối</span>
              </button>
            </>
          )}

          {isProcurementTurn && (
            <button onClick={() => setIsProcurementOpen(true)} className="btn btn-warning">
              <ShoppingBag size={16} />
              <span>Khảo Giá & Nhập Đơn Giá Thực Tế</span>
            </button>
          )}

          {isAccountingReviewTurn && (
            <button onClick={() => setIsAccountingOpen(true)} className="btn btn-primary">
              <FileCheck2 size={16} />
              <span>Xác Nhận Đơn Giá Thị Trường</span>
            </button>
          )}

          {isFinalApprovalTurn && (
            <>
              <button onClick={() => setIsFinalApproveOpen(true)} className="btn btn-success">
                <CheckCircle2 size={16} />
                <span>Phê Duyệt Giá Chốt & Cho Phép Giải Ngân</span>
              </button>
              <button onClick={() => setIsRejectOpen(true)} className="btn btn-danger">
                <XCircle size={16} />
                <span>Từ Chối</span>
              </button>
            </>
          )}

          {isDisbursingTurn && remainingDisbursement > 0 && (
            <button onClick={() => setIsDisburseOpen(true)} className="btn btn-success">
              <DollarSign size={16} />
              <span>Thực Hiện Giải Ngân ({formatCurrency(remainingDisbursement)})</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Info + Tracker */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.75rem' }}>
        {/* Left Column: Items Breakdown & Financial Overview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Creator & Department Card */}
          <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(99, 102, 241, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                  }}
                >
                  <UserIcon size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Người Tạo Đơn</div>
                  <div style={{ fontWeight: 700, fontSize: '0.925rem' }}>{proposal.creator?.fullName}</div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                    {getRoleLabel(proposal.creator?.role)} • {proposal.creator?.email}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(6, 182, 212, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-cyan)',
                  }}
                >
                  <Building size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phòng Ban Yêu Cầu</div>
                  <div style={{ fontWeight: 700, fontSize: '0.925rem' }}>{proposal.department?.name}</div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                    Mã đơn: {proposal.proposalCode}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table Card */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingCart size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1.05rem', color: '#ffffff' }}>Chi Tiết Vật Tư Yêu Cầu</h3>
              </div>
              <span className="badge badge-secondary">{proposal.items.length} hạng mục</span>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                    <th>Tên Vật Tư</th>
                    <th>Số Lượng</th>
                    <th>Đơn Vị</th>
                    <th>Đơn Giá Dự Kiến</th>
                    <th>Đơn Giá Thực Tế</th>
                    <th>Thành Tiền Dự Kiến</th>
                    <th>Thành Tiền Thực Tế</th>
                    <th>Yêu Cầu Ghi Chú</th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.items.map((item) => {
                    const lineEst = (item.soLuong || 0) * (item.donGiaDuDoan || 0);
                    const lineAct = item.donGiaThucTe !== null ? (item.soLuong || 0) * item.donGiaThucTe! : null;
                    return (
                      <tr key={item._id || item.stt}>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.stt}</td>
                        <td style={{ fontWeight: 600 }}>{item.tenVatTu}</td>
                        <td>{item.soLuong}</td>
                        <td>{item.donVi}</td>
                        <td className="font-mono">{formatCurrency(item.donGiaDuDoan)}</td>
                        <td className="font-mono">
                          {item.donGiaThucTe !== null ? (
                            <span style={{ color: 'var(--success)', fontWeight: 700 }}>
                              {formatCurrency(item.donGiaThucTe)}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Chờ khảo giá</span>
                          )}
                        </td>
                        <td className="font-mono">{formatCurrency(lineEst)}</td>
                        <td className="font-mono">
                          {lineAct !== null ? (
                            <strong style={{ color: 'var(--success)' }}>{formatCurrency(lineAct)}</strong>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {item.yeuCau || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div
              style={{
                marginTop: '1.25rem',
                padding: '1.25rem',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 'var(--radius-md)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tổng Dự Toán Ban Đầu</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }} className="font-mono">
                  {formatCurrency(proposal.totalEstimatedAmount)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tổng Thực Tế (Sau Khảo Giá)</div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: proposal.totalActualAmount ? 'var(--success)' : 'var(--text-muted)',
                  }}
                  className="font-mono"
                >
                  {proposal.totalActualAmount ? formatCurrency(proposal.totalActualAmount) : 'Chưa xác định'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Đã Giải Ngân / Còn Lại</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-cyan)' }} className="font-mono">
                  {formatCurrency(proposal.totalDisbursed)} / {formatCurrency(remainingDisbursement)}
                </div>
              </div>
            </div>
          </div>

          {/* Disbursements Table Card if any */}
          {proposal.disbursements && proposal.disbursements.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <DollarSign size={18} color="var(--success)" />
                <h3 style={{ fontSize: '1.05rem', color: '#ffffff' }}>Lịch Sử Các Đợt Giải Ngân</h3>
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Thời Gian</th>
                      <th>Số Tiền</th>
                      <th>Người Thực Hiện</th>
                      <th>Ghi Chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposal.disbursements.map((d, index) => (
                      <tr key={index}>
                        <td>{formatDate(d.date)}</td>
                        <td style={{ fontWeight: 700, color: 'var(--success)' }} className="font-mono">
                          {formatCurrency(d.amount)}
                        </td>
                        <td>{(d.processedBy as any)?.fullName || 'Kế toán'}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{d.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Approval Flow Tracker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#ffffff', marginBottom: '1.25rem' }}>
              Tiến Trình Phê Duyệt
            </h3>
            <ApprovalFlowTracker steps={proposal.approvalFlow} currentRole={proposal.currentApprovalRole} />
          </div>

          {proposal.rejectionReason && (
            <div
              style={{
                padding: '1.25rem',
                backgroundColor: 'var(--danger-bg)',
                border: '1px solid var(--danger-border)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <div style={{ fontWeight: 700, color: '#f87171', marginBottom: '0.35rem' }}>
                Lý Do Từ Chối:
              </div>
              <div style={{ fontSize: '0.85rem', color: '#fca5a5' }}>
                {proposal.rejectionReason}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 1. APPROVE MODAL */}
      <Modal isOpen={isApproveOpen} onClose={() => setIsApproveOpen(false)} title="Xác Nhận Phê Duyệt Đề Xuất">
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Bạn đang thực hiện phê duyệt đề xuất mua sắm <strong>{proposal.proposalCode}</strong> với tư cách là{' '}
            <strong>{getRoleLabel(user?.role)}</strong>.
          </p>
        </div>
        <div className="form-group">
          <label className="form-label">Ý kiến phê duyệt (tùy chọn):</label>
          <textarea
            className="form-textarea"
            placeholder="Nhập ghi chú hoặc ý kiến chỉ đạo nếu có..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        <div className="modal-footer" style={{ margin: '1.5rem -1.65rem -1.65rem -1.65rem' }}>
          <button onClick={() => setIsApproveOpen(false)} className="btn btn-secondary">Hủy</button>
          <button onClick={handleApprove} disabled={actionLoading} className="btn btn-success">
            {actionLoading ? 'Đang duyệt...' : 'Đồng Ý Phê Duyệt'}
          </button>
        </div>
      </Modal>

      {/* 2. REJECT MODAL */}
      <Modal isOpen={isRejectOpen} onClose={() => setIsRejectOpen(false)} title="Từ Chối Đề Xuất">
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Vui lòng nêu rõ lý do từ chối để người tạo đơn và các phòng ban liên quan được biết:
          </p>
        </div>
        <div className="form-group">
          <label className="form-label">Lý do từ chối <span className="required">*</span></label>
          <textarea
            className="form-textarea"
            required
            placeholder="Ví dụ: Vượt ngân sách dự chi quý, cần bổ sung bảng chào giá..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </div>
        <div className="modal-footer" style={{ margin: '1.5rem -1.65rem -1.65rem -1.65rem' }}>
          <button onClick={() => setIsRejectOpen(false)} className="btn btn-secondary">Hủy</button>
          <button onClick={handleReject} disabled={actionLoading || !rejectReason.trim()} className="btn btn-danger">
            {actionLoading ? 'Đang xử lý...' : 'Xác Nhận Từ Chối'}
          </button>
        </div>
      </Modal>

      {/* 3. PROCUREMENT PRICE FILL MODAL */}
      <Modal isOpen={isProcurementOpen} onClose={() => setIsProcurementOpen(false)} title="Khảo Sát & Nhập Đơn Giá Thực Tế" maxWidth="680px">
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Là nhân viên <strong>Thu Mua</strong>, bạn hãy khảo sát thị trường và điền đơn giá thực tế cho từng hạng mục dưới đây:
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '50vh', overflowY: 'auto' }}>
          {proposal.items.map((item, idx) => (
            <div
              key={item._id || idx}
              style={{
                padding: '0.85rem 1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1.5fr',
                gap: '1rem',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.tenVatTu}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  SL: {item.soLuong} {item.donVi} • Dự đoán: {formatCurrency(item.donGiaDuDoan)}
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Đơn giá thực tế:
              </div>

              <div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="form-input font-mono"
                  value={procurementPrices[item._id!] ?? item.donGiaDuDoan}
                  onChange={(e) =>
                    setProcurementPrices({
                      ...procurementPrices,
                      [item._id!]: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          ))}
        </div>

        <div className="modal-footer" style={{ margin: '1.5rem -1.65rem -1.65rem -1.65rem' }}>
          <button onClick={() => setIsProcurementOpen(false)} className="btn btn-secondary">Hủy</button>
          <button onClick={handleProcurementSubmit} disabled={actionLoading} className="btn btn-primary">
            {actionLoading ? 'Đang lưu...' : 'Hoàn Thành Khảo Giá & Gửi Kế Toán'}
          </button>
        </div>
      </Modal>

      {/* 4. ACCOUNTING CONFIRM MODAL */}
      <Modal isOpen={isAccountingOpen} onClose={() => setIsAccountingOpen(false)} title="Kế Toán Xác Nhận Giá Thị Trường">
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Kế toán kiểm tra tổng giá thực tế: <strong>{formatCurrency(totalActual)}</strong>.
            Hệ thống sẽ chuyển cấp duyệt cuối (Giám đốc nếu &le; 10tr hoặc Chủ tịch nếu &gt; 10tr).
          </p>
        </div>
        <div className="form-group">
          <label className="form-label">Ý kiến kế toán:</label>
          <textarea
            className="form-textarea"
            placeholder="Đã đối chiếu hóa đơn báo giá và kế hoạch ngân sách..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        <div className="modal-footer" style={{ margin: '1.5rem -1.65rem -1.65rem -1.65rem' }}>
          <button onClick={() => setIsAccountingOpen(false)} className="btn btn-secondary">Hủy</button>
          <button onClick={handleAccountingConfirm} disabled={actionLoading} className="btn btn-primary">
            {actionLoading ? 'Đang xử lý...' : 'Xác Nhận & Chuyển Duyệt Cuối'}
          </button>
        </div>
      </Modal>

      {/* 5. FINAL APPROVE MODAL */}
      <Modal isOpen={isFinalApproveOpen} onClose={() => setIsFinalApproveOpen(false)} title="Phê Duyệt Giá Chốt">
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Với tư cách <strong>{getRoleLabel(user?.role)}</strong>, bạn phê duyệt tổng số tiền thực tế{' '}
            <strong style={{ color: 'var(--success)' }}>{formatCurrency(totalActual)}</strong> và cho phép Kế toán tiến hành giải ngân.
          </p>
        </div>
        <div className="form-group">
          <label className="form-label">Ý kiến chỉ đạo:</label>
          <textarea
            className="form-textarea"
            placeholder="Duyệt chi theo báo giá..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        <div className="modal-footer" style={{ margin: '1.5rem -1.65rem -1.65rem -1.65rem' }}>
          <button onClick={() => setIsFinalApproveOpen(false)} className="btn btn-secondary">Hủy</button>
          <button onClick={handleFinalApprove} disabled={actionLoading} className="btn btn-success">
            {actionLoading ? 'Đang duyệt...' : 'Chấp Thuận & Chuyển Giải Ngân'}
          </button>
        </div>
      </Modal>

      {/* 6. DISBURSEMENT MODAL */}
      <Modal isOpen={isDisburseOpen} onClose={() => setIsDisburseOpen(false)} title="Thực Hiện Giải Ngân">
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Kế toán thực hiện giải ngân. Hệ thống hỗ trợ giải ngân 1 lần hoặc nhiều đợt.
          </p>
          <div style={{ marginTop: '0.5rem', fontSize: '0.825rem', color: 'var(--accent-cyan)' }}>
            Số tiền còn lại cần giải ngân: <strong>{formatCurrency(remainingDisbursement)}</strong>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Số tiền giải ngân đợt này (VNĐ) <span className="required">*</span></label>
          <input
            type="number"
            min="1000"
            max={remainingDisbursement}
            required
            className="form-input font-mono"
            value={disburseAmount}
            onChange={(e) => setDisburseAmount(Number(e.target.value))}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Ghi chú giải ngân / Số ủy nhiệm chi:</label>
          <input
            type="text"
            className="form-input"
            placeholder="UNC số 2026-..., chuyển khoản qua ngân hàng..."
            value={disburseNote}
            onChange={(e) => setDisburseNote(e.target.value)}
          />
        </div>

        <div className="modal-footer" style={{ margin: '1.5rem -1.65rem -1.65rem -1.65rem' }}>
          <button onClick={() => setIsDisburseOpen(false)} className="btn btn-secondary">Hủy</button>
          <button onClick={handleDisburse} disabled={actionLoading || disburseAmount <= 0} className="btn btn-success">
            {actionLoading ? 'Đang giải ngân...' : 'Xác Nhận Giải Ngân'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
