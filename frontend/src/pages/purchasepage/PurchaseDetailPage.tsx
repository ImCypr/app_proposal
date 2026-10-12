import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { purchaseProposalService, uploadService, paymentProposalService } from '../../services';
import { PurchaseProposal, PaymentProposal } from '../../models';
import { StatusBadge, ApprovalFlowTracker, Modal, PurchasePrintModal } from '../../component';
import { formatCurrency, formatDate, getRoleLabel } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft,
  ShoppingCart,
  CheckCircle2,
  XCircle,
  DollarSign,
  FileCheck2,
  Building,
  User as UserIcon,
  Loader2,
  AlertCircle,
  Sparkles,
  UploadCloud,
  Paperclip,
  FileText,
  Trash2,
  ExternalLink,
  Eye,
  Download,
  Store,
  CreditCard,
  PlusCircle,
  Clock,
  Printer,
} from 'lucide-react';

export const PurchaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [proposal, setProposal] = useState<PurchaseProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quản lý trạng thái mở/đóng các Modal của đơn mua sắm
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isProcurementOpen, setIsProcurementOpen] = useState(false);
  const [isAccountingOpen, setIsAccountingOpen] = useState(false);
  const [isFinalApproveOpen, setIsFinalApproveOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  // Quản lý dữ liệu nhập liệu trong các Modal
  const [comment, setComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [procurementPrices, setProcurementPrices] = useState<Record<string, number>>({});
  const [actionLoading, setActionLoading] = useState(false);

  // Quản lý 2 tùy chọn khảo giá: Dùng AI ('ai') hoặc Nhập thủ công ('manual')
  const [pricingMethod, setPricingMethod] = useState<'ai' | 'manual'>('ai');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<Record<string, { name: string; price: number; note?: string }>>({});
  const [quotationAttachments, setQuotationAttachments] = useState<Array<{ name: string; url: string; size: number; type: string }>>([]);
  const [previewAttachment, setPreviewAttachment] = useState<{ name: string; url: string; type?: string } | null>(null);

  // Danh sách các đề xuất thanh toán liên kết với đơn vật tư này (quản lý tại /payment)
  const [paymentProposals, setPaymentProposals] = useState<PaymentProposal[]>([]);

  const fetchProposal = useCallback(async (propId: string) => {
    setLoading(true);
    try {
      const data = await purchaseProposalService.getById(propId);
      setProposal(data);
      // Tự động điền đơn giá thực tế nếu đã được khảo sát
      const initialPrices: Record<string, number> = {};
      data.items.forEach((item) => {
        if (item._id) {
          initialPrices[item._id] = item.donGiaThucTe ?? item.donGiaDuKien;
        }
      });
      setProcurementPrices(initialPrices);

      // Lấy danh sách đề xuất thanh toán gắn với đơn mua sắm này
      try {
        const payments = await paymentProposalService.getAll({ purchaseProposalId: propId });
        setPaymentProposals(payments);
      } catch (pErr) {
        console.error('Không thể tải danh sách đề xuất thanh toán liên kết:', pErr);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tải chi tiết đề xuất');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) fetchProposal(id);
  }, [id, fetchProposal]);


  // Các hàm xử lý tương tác của người dùng
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

  // Hàm kích hoạt AI tra cứu nhà cung cấp và so sánh giá
  const handleFetchAISuggestions = async () => {
    if (!proposal) return;
    setAiLoading(true);
    try {
      const suggestions = await purchaseProposalService.getAIPricingSuggestions(proposal._id);
      setAiSuggestions(suggestions);

      // Tự động chọn nhà cung cấp tối ưu nhất (isBestChoice) ban đầu nếu mục đó chưa được chọn
      const autoSelected = { ...selectedSuppliers };
      const autoPrices = { ...procurementPrices };

      suggestions.forEach((itemSug: any) => {
        const best = itemSug.suppliers.find((s: any) => s.isBestChoice) || itemSug.suppliers[0];
        if (best && !autoSelected[itemSug.itemId]) {
          autoSelected[itemSug.itemId] = {
            name: best.name,
            price: best.price,
            note: best.note,
          };
          autoPrices[itemSug.itemId] = best.price;
        }
      });

      setSelectedSuppliers(autoSelected);
      setProcurementPrices(autoPrices);
    } catch (err: any) {
      alert(err.message || 'Không thể tra cứu giá bằng AI lúc này');
    } finally {
      setAiLoading(false);
    }
  };

  // Người dùng chọn nhà cung cấp nào -> Tự động điền đơn giá thực tế của nhà cung cấp đó
  const handleSelectSupplier = (itemId: string, supplier: any) => {
    setSelectedSuppliers((prev) => ({
      ...prev,
      [itemId]: {
        name: supplier.name,
        price: supplier.price,
        note: supplier.note || (supplier.url ? `Nguồn: ${supplier.url}` : ''),
      },
    }));
    setProcurementPrices((prev) => ({
      ...prev,
      [itemId]: supplier.price,
    }));
  };

  // Trạng thái đang tải tệp lên ổ cứng máy chủ
  const [fileUploading, setFileUploading] = useState(false);

  // Xử lý upload file chứng từ / báo giá lưu thẳng vào ổ cứng máy chủ
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    // Kiểm tra dung lượng từng file không vượt quá 15MB
    const oversizedFiles = files.filter((f) => f.size > 15 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      alert(`Một số tệp vượt quá dung lượng tối đa 15MB: ${oversizedFiles.map((f) => f.name).join(', ')}`);
      return;
    }

    setFileUploading(true);
    try {
      const uploadedResults = await uploadService.uploadFiles(files);
      setQuotationAttachments((prev) => [
        ...prev,
        ...uploadedResults.map((item) => ({
          name: item.name,
          url: item.url,
          size: item.size,
          type: item.type,
        })),
      ]);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tải tệp lên ổ cứng máy chủ');
    } finally {
      setFileUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setQuotationAttachments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleProcurementSubmit = async () => {
    if (!proposal) return;
    setActionLoading(true);
    try {
      const itemsPayload = proposal.items.map((item) => ({
        _id: item._id,
        donGiaThucTe: Number(procurementPrices[item._id!] ?? item.donGiaDuKien),
        nhaCungCap: selectedSuppliers[item._id!]?.name || item.nhaCungCap || '',
        ghiChuNhaCungCap: selectedSuppliers[item._id!]?.note || '',
      }));
      await purchaseProposalService.submitProcurement(
        proposal._id,
        itemsPayload,
        pricingMethod,
        quotationAttachments
      );
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

  // Xác định các hành động khả dụng của người dùng hiện tại
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
    (proposal.status === 'pending_payment' || proposal.status === 'disbursing' || proposal.status === 'final_approved');

  const totalActual = proposal.totalActualAmount ?? proposal.totalEstimatedAmount;
  const remainingDisbursement = Math.max(0, totalActual - proposal.totalDisbursed);

  return (
    <div>
      {/* Thanh điều hướng quay lại và Tiêu đề */}
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

        {/* Thanh công cụ chứa các nút thao tác */}
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
            <button
              onClick={() => {
                setIsProcurementOpen(true);
                if (aiSuggestions.length === 0) {
                  handleFetchAISuggestions();
                }
              }}
              className="btn btn-warning"
            >
              <Sparkles size={16} />
              <span>Khảo Sát & Nhập Giá (AI / Báo Giá)</span>
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
            <Link
              to={`/payment/create?purchaseProposalId=${proposal._id}`}
              className="btn btn-primary"
              style={{ gap: '0.4rem' }}
            >
              <CreditCard size={16} />
              <span>Lập Đề Xuất Thanh Toán</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setIsPrintOpen(true)}
            className="btn btn-secondary"
            style={{ gap: '0.4rem' }}
            title="Xem trước và in biểu mẫu đề xuất mua sắm PDF"
          >
            <Printer size={16} />
            <span>In / Xuất PDF</span>
          </button>
        </div>
      </div>

      {proposal.status === 'pending_payment_approval' && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: 'rgba(168, 85, 247, 0.12)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#d8b4fe',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <Clock size={20} color="#c084fc" />
          <span style={{ fontSize: '0.875rem' }}>
            <strong>Đơn đang chờ duyệt đề xuất thanh toán:</strong> Đề xuất thanh toán liên kết đã được kế toán lập và đang chờ Lãnh đạo ({proposal.currentApprovalRole === 'chu_tich' ? 'Chủ tịch' : 'Giám đốc'}) xem xét phê duyệt chi.
          </span>
        </div>
      )}

      {/* Bố cục chính: Thông tin chi tiết + Tiến trình phê duyệt */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.75rem' }}>
        {/* Cột bên trái: Chi tiết vật tư & Tổng quan tài chính */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Thẻ thông tin người tạo & Phòng ban */}
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

          {/* Thẻ bảng danh sách vật tư */}
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
                    <th>Yêu Cầu Kĩ Thuật</th>
                    <th>Phòng Ban Sử Dụng</th>
                    <th style={{ textAlign: 'center' }}>Số Lượng</th>
                    <th>Đơn Giá Dự Kiến</th>
                    <th>Đơn Giá Thực Tế</th>
                    <th>Nhà Cung Cấp</th>
                    <th>Thành Tiền Dự Kiến</th>
                    <th>Thành Tiền Thực Tế</th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.items.map((item) => {
                    const unitEst = item.donGiaDuKien || 0;
                    const lineEst = (item.soLuong || 0) * unitEst;
                    const lineAct = item.donGiaThucTe !== null && item.donGiaThucTe !== undefined
                      ? (item.soLuong || 0) * item.donGiaThucTe
                      : null;
                    return (
                      <tr key={item._id || item.stt}>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.stt}</td>
                        <td style={{ fontWeight: 600 }}>{item.tenVatTu}</td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {item.yeuCauKiThuat || '—'}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem' }}>{item.phongBanSuDung || proposal.department?.name || '—'}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>{item.soLuong}</td>
                        <td className="font-mono">{formatCurrency(unitEst)}</td>
                        <td className="font-mono">
                          {item.donGiaThucTe !== null && item.donGiaThucTe !== undefined ? (
                            <span style={{ color: 'var(--success)', fontWeight: 700 }}>
                              {formatCurrency(item.donGiaThucTe)}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Chờ khảo giá</span>
                          )}
                        </td>
                        <td>
                          {item.nhaCungCap ? (
                            <span style={{ fontSize: '0.825rem', color: 'var(--accent-cyan)', fontWeight: 500 }}>
                              {item.nhaCungCap}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Tổng kết tài chính */}
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

          {/* Thẻ tài liệu báo giá đính kèm nếu có */}
          {proposal.quotationAttachments && proposal.quotationAttachments.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Paperclip size={18} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.05rem', color: '#ffffff' }}>
                    Tài Liệu & Hồ Sơ Báo Giá Đính Kèm ({proposal.quotationAttachments.length})
                  </h3>
                </div>
                {proposal.pricingMethod && (
                  <span className={`badge ${proposal.pricingMethod === 'ai' ? 'badge-primary' : 'badge-secondary'}`}>
                    {proposal.pricingMethod === 'ai' ? '🤖 Khảo giá bằng AI' : '✍️ Khảo giá thủ công'}
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                {proposal.quotationAttachments.map((att: any, aIdx: number) => (
                  <div
                    key={aIdx}
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                      <FileText size={16} color="var(--primary)" />
                      <span style={{ fontSize: '0.8rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '130px' }} title={att.name}>
                        {att.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={() => setPreviewAttachment({ name: att.name, url: att.url, type: att.type })}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '0.3rem' }}
                        title="Xem tài liệu"
                      >
                        <Eye size={14} />
                      </button>
                      <a
                        href={att.url}
                        download={att.name}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '0.3rem' }}
                        title="Tải về máy"
                      >
                        <Download size={14} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Thẻ danh sách các đề xuất thanh toán gắn với đơn mua sắm vật tư này */}
          <div className="card">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CreditCard size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1.05rem', color: '#ffffff' }}>
                  Đề Xuất Thanh Toán Liên Kết ({paymentProposals.length})
                </h3>
              </div>

              {isDisbursingTurn && remainingDisbursement > 0 && (
                <Link
                  to={`/payment/create?purchaseProposalId=${proposal._id}`}
                  className="btn btn-primary btn-sm"
                  style={{ gap: '0.35rem' }}
                >
                  <PlusCircle size={14} />
                  <span>Tạo Đề Xuất Thanh Toán Mới</span>
                </Link>
              )}
            </div>

            {/* Hướng dẫn quy trình phân luồng duyệt chi */}
            <div
              style={{
                padding: '0.65rem 0.85rem',
                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <span>
                <strong>Quy trình phân luồng:</strong> Kế toán lập đề xuất ➔ ≤ 10 triệu (Giám đốc duyệt) / &gt; 10 triệu (Chủ tịch duyệt) ➔ Kế toán xác nhận giải ngân.
              </span>
              <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                1 đơn vật tư - Nhiều đợt thanh toán
              </span>
            </div>

            {paymentProposals.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '2rem 1rem',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.01)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-color)',
                }}
              >
                <CreditCard size={32} style={{ margin: '0 auto 0.5rem auto', opacity: 0.4 }} />
                <div>Chưa có đề xuất thanh toán nào được lập cho đơn vật tư này.</div>
                {isDisbursingTurn && remainingDisbursement > 0 && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                    <Link
                      to={`/payment/create?purchaseProposalId=${proposal._id}`}
                      style={{ color: 'var(--primary)', textDecoration: 'underline' }}
                    >
                      Bấm vào đây để kế toán lập hồ sơ trình lãnh đạo duyệt chi.
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mã Đơn</th>
                      <th>Đợt / Ghi Chú</th>
                      <th>Số Tiền</th>
                      <th>Cấp Phê Duyệt</th>
                      <th>Người Thụ Hưởng</th>
                      <th>Trạng Thái</th>
                      <th style={{ textAlign: 'right' }}>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentProposals.map((pay) => (
                      <tr key={pay._id}>
                        <td>
                          <Link
                            to={`/payment/${pay._id}`}
                            className="font-mono"
                            style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}
                          >
                            {pay.proposalCode || `TT-${pay._id.slice(-6).toUpperCase()}`}
                          </Link>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {formatDate(pay.createdAt)}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.825rem' }}>
                            {pay.installmentNote || 'Thanh toán'}
                          </div>
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-secondary)',
                              maxWidth: '180px',
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                            }}
                            title={pay.paymentReason}
                          >
                            {pay.paymentReason}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }} className="font-mono">
                          {formatCurrency(pay.amount)}
                        </td>
                        <td>
                          {pay.amount <= 10000000 ? (
                            <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                              ≤ 10tr (Giám đốc)
                            </span>
                          ) : (
                            <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                              &gt; 10tr (Chủ tịch)
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.775rem' }}>
                          <div style={{ fontWeight: 600 }}>{pay.beneficiary?.name}</div>
                          <div style={{ color: 'var(--text-muted)' }}>
                            {pay.beneficiary?.bankName} - {pay.beneficiary?.accountNumber}
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={pay.status} type="payment" />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                            {pay.attachments && pay.attachments.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setPreviewAttachment(pay.attachments![0])}
                                className="btn btn-ghost btn-sm"
                                style={{ padding: '0.25rem 0.4rem', fontSize: '0.75rem' }}
                                title="Xem hóa đơn/chứng từ đính kèm"
                              >
                                <Eye size={14} />
                              </button>
                            )}
                            <Link
                              to={`/payment/${pay._id}`}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', gap: '0.35rem' }}
                            >
                              <ExternalLink size={13} />
                              <span>Chi tiết & Xử lý</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Thẻ lịch sử các đợt giải ngân nếu có */}
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

        {/* Cột bên phải: Sơ đồ theo dõi luồng phê duyệt */}
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

      {/* 1. MODAL DUYỆT ĐỀ XUẤT */}
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

      {/* 2. MODAL TỪ CHỐI ĐỀ XUẤT */}
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

      {/* 3. MODAL THU MUA NHẬP ĐƠN GIÁ THỰC TẾ & KHẢO SÁT NHÀ CUNG CẤP */}
      <Modal
        isOpen={isProcurementOpen}
        onClose={() => setIsProcurementOpen(false)}
        title="Khảo Sát Giá Thị Trường & Lựa Chọn Nhà Cung Cấp"
        maxWidth="860px"
      >
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Bộ phận <strong>Thu Mua</strong> lựa chọn 1 trong 2 phương thức khảo giá dưới đây:
          </p>
        </div>

        {/* 2 Tabs chuyển đổi phương thức khảo giá */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button
            type="button"
            className={`btn ${pricingMethod === 'ai' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setPricingMethod('ai');
              if (aiSuggestions.length === 0) {
                handleFetchAISuggestions();
              }
            }}
            style={{ padding: '0.75rem', justifyContent: 'center' }}
          >
            <Sparkles size={17} />
            <span>1. Dùng AI Tự Động Tra Giá (Đề xuất 3 NCC)</span>
          </button>

          <button
            type="button"
            className={`btn ${pricingMethod === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPricingMethod('manual')}
            style={{ padding: '0.75rem', justifyContent: 'center' }}
          >
            <FileText size={17} />
            <span>2. Điền Giá Thủ Công & Đính Kèm File Báo Giá</span>
          </button>
        </div>

        {/* === OPTION 1: DÙNG AI TỰ ĐỘNG TRA CỨU GIÁ NHÀ CUNG CẤP === */}
        {pricingMethod === 'ai' && (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1.25rem',
                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Sparkles size={18} color="var(--primary)" />
                <span style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: 600 }}>
                  Trí tuệ nhân tạo (AI) đã quét và so sánh báo giá từ các nhà cung cấp uy tín:
                </span>
              </div>
              <button
                type="button"
                onClick={handleFetchAISuggestions}
                disabled={aiLoading}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem' }}
              >
                {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                <span>Quét lại giá AI</span>
              </button>
            </div>

            {aiLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0', gap: '0.75rem' }}>
                <Loader2 size={36} className="animate-spin" color="var(--primary)" />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  AI đang tra cứu cơ sở dữ liệu nhà cung cấp & so sánh đơn giá thị trường...
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '55vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {(aiSuggestions.length > 0 ? aiSuggestions : proposal.items.map(item => ({
                  itemId: item._id,
                  stt: item.stt,
                  tenVatTu: item.tenVatTu,
                  yeuCauKiThuat: item.yeuCauKiThuat,
                  phongBanSuDung: item.phongBanSuDung,
                  soLuong: item.soLuong,
                  donGiaDuKien: item.donGiaDuKien,
                  suppliers: []
                }))).map((itemSug: any, idx: number) => {
                  const itemId = itemSug.itemId || proposal.items[idx]?._id;
                  const itemOrig = proposal.items.find(i => i._id === itemId) || proposal.items[idx];
                  const currentSelected = selectedSuppliers[itemId];
                  const estPrice = itemSug.donGiaDuKien || itemOrig.donGiaDuKien || 0;

                  return (
                    <div
                      key={itemId || idx}
                      style={{
                        padding: '1.15rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      {/* Tiêu đề mục vật tư */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="badge badge-secondary">Mục #{itemSug.stt || idx + 1}</span>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>
                              {itemSug.tenVatTu}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Số lượng: <strong>{itemSug.soLuong}</strong> • Đơn giá dự kiến:{' '}
                            <strong className="font-mono">{formatCurrency(estPrice)}</strong>
                            {itemSug.yeuCauKiThuat ? ` • Yêu cầu: ${itemSug.yeuCauKiThuat}` : ''}
                          </div>
                        </div>

                        {currentSelected && (
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Đơn giá đã chọn:</span>
                            <div style={{ color: 'var(--success)', fontWeight: 800, fontSize: '1.05rem' }} className="font-mono">
                              {formatCurrency(currentSelected.price)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Lưới hiển thị ít nhất 3 nhà cung cấp để click chọn */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.75rem' }}>
                        {itemSug.suppliers && itemSug.suppliers.length > 0 ? (
                          itemSug.suppliers.map((supp: any) => {
                            const isSelected = currentSelected?.name === supp.name;
                            const diff = supp.price - estPrice;
                            const percent = estPrice > 0 ? Math.round((diff / estPrice) * 100) : 0;

                            return (
                              <div
                                key={supp.id || supp.name}
                                onClick={() => handleSelectSupplier(itemId, supp)}
                                style={{
                                  padding: '0.85rem 1rem',
                                  borderRadius: 'var(--radius-md)',
                                  border: isSelected
                                    ? '2px solid var(--primary)'
                                    : '1px solid var(--border-subtle)',
                                  backgroundColor: isSelected
                                    ? 'rgba(99, 102, 241, 0.12)'
                                    : 'rgba(255, 255, 255, 0.02)',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                      <input
                                        type="radio"
                                        name={`supp_${itemId}`}
                                        checked={isSelected}
                                        onChange={() => handleSelectSupplier(itemId, supp)}
                                        style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                                      />
                                      <Store size={14} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} />
                                    </div>

                                    {supp.isBestChoice ? (
                                      <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                                        Giá Tốt Nhất
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: '0.7rem', color: 'var(--warning)' }}>
                                        ⭐ {supp.rating || 4.8}
                                      </span>
                                    )}
                                  </div>

                                  <div style={{ fontWeight: 600, fontSize: '0.825rem', color: isSelected ? '#ffffff' : 'var(--text-primary)', marginBottom: '0.35rem' }}>
                                    {supp.name}
                                  </div>

                                  {supp.url && (
                                    <div style={{ marginBottom: '0.45rem' }}>
                                      <a
                                        href={supp.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '0.35rem',
                                          color: '#60a5fa',
                                          fontSize: '0.725rem',
                                          textDecoration: 'none',
                                          fontWeight: 500,
                                          backgroundColor: 'rgba(96, 165, 250, 0.12)',
                                          padding: '0.2rem 0.5rem',
                                          borderRadius: 'var(--radius-sm)',
                                          border: '1px solid rgba(96, 165, 250, 0.25)',
                                          maxWidth: '100%',
                                        }}
                                        title={supp.url}
                                      >
                                        <ExternalLink size={12} />
                                        <span>Xem link báo giá</span>
                                      </a>
                                    </div>
                                  )}

                                  {supp.note && (
                                    <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', lineHeight: 1.35 }}>
                                      {supp.note}
                                    </div>
                                  )}
                                </div>

                                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', marginTop: '0.25rem', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    Giao: {supp.deliveryDays || '1-2 ngày'}
                                  </span>
                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isSelected ? 'var(--primary)' : 'var(--text-primary)' }} className="font-mono">
                                      {formatCurrency(supp.price)}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: diff <= 0 ? 'var(--success)' : 'var(--warning)' }}>
                                      {diff <= 0 ? `Tiết kiệm ${Math.abs(percent)}%` : `+${percent}% dự toán`}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div style={{ gridColumn: '1 / -1', padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                            <button
                              type="button"
                              onClick={handleFetchAISuggestions}
                              className="btn btn-secondary btn-sm"
                            >
                              <Sparkles size={14} />
                              <span>Nhấn để AI đề xuất 3 nhà cung cấp cho mục này</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* === OPTION 2: NHẬP GIÁ THỦ CÔNG & TẢI FILE BÁO GIÁ === */}
        {pricingMethod === 'manual' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '35vh', overflowY: 'auto', marginBottom: '1.25rem' }}>
              {proposal.items.map((item, idx) => (
                <div
                  key={item._id || idx}
                  style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    display: 'grid',
                    gridTemplateColumns: '2fr 1.5fr 1.5fr',
                    gap: '1rem',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.tenVatTu}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      PB: {item.phongBanSuDung || '—'} • SL: {item.soLuong} • Dự kiến: {formatCurrency(item.donGiaDuKien)}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      Nhà cung cấp:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontSize: '0.825rem' }}
                      placeholder="Tên nhà cung cấp..."
                      value={selectedSuppliers[item._id!]?.name || ''}
                      onChange={(e) =>
                        setSelectedSuppliers({
                          ...selectedSuppliers,
                          [item._id!]: {
                            name: e.target.value,
                            price: procurementPrices[item._id!] ?? item.donGiaDuKien,
                          },
                        })
                      }
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      Đơn giá thực tế (VNĐ):
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="form-input font-mono"
                      value={procurementPrices[item._id!] ?? item.donGiaDuKien}
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

            {/* Khu vực upload tài liệu báo giá đính kèm */}
            <div className="card" style={{ padding: '1rem', border: '1px dashed var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Paperclip size={16} color="var(--primary)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>
                    Tài Liệu / File Báo Giá Từ Nhà Cung Cấp
                  </span>
                </div>
                <label
                  className={`btn btn-secondary btn-sm ${fileUploading ? 'disabled' : ''}`}
                  style={{ cursor: fileUploading ? 'not-allowed' : 'pointer', fontSize: '0.75rem', gap: '0.35rem' }}
                >
                  {fileUploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                  <span>{fileUploading ? 'Đang tải file báo giá lên...' : 'Tải lên file báo giá'}</span>
                  <input
                    type="file"
                    multiple
                    disabled={fileUploading}
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.docx,.doc"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                </label>
              </div>

              {quotationAttachments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.25rem 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Chưa có tài liệu đính kèm. Vui lòng tải lên bảng chào giá (PDF, Ảnh hoặc Excel) từ đối tác.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                  {quotationAttachments.map((file, fIdx) => (
                    <div
                      key={fIdx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.4rem 0.65rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                        <FileText size={14} color="var(--primary)" />
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }} title={file.name}>
                          {file.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(fIdx)}
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--danger)', padding: '0.2rem' }}
                        title="Xóa file"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Khối tổng kết nhanh ngân sách thực tế so với dự toán */}
        <div
          style={{
            marginTop: '1.25rem',
            padding: '1rem 1.25rem',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tổng Tiền Dự Toán Ban Đầu</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }} className="font-mono">
              {formatCurrency(proposal.totalEstimatedAmount)}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tổng Tiền Thực Tế Sau Khảo Giá</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }} className="font-mono">
              {formatCurrency(
                proposal.items.reduce(
                  (sum, item) => sum + (item.soLuong * (procurementPrices[item._id!] ?? item.donGiaDuKien)),
                  0
                )
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ margin: '1.5rem -1.65rem -1.65rem -1.65rem' }}>
          <button onClick={() => setIsProcurementOpen(false)} className="btn btn-secondary">Hủy Bỏ</button>
          <button onClick={handleProcurementSubmit} disabled={actionLoading} className="btn btn-primary">
            {actionLoading ? 'Đang lưu...' : 'Hoàn Thành Khảo Giá & Chuyển Kế Toán'}
          </button>
        </div>
      </Modal>

      {/* 4. MODAL KẾ TOÁN XÁC NHẬN GIÁ THỊ TRƯỜNG */}
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

      {/* 5. MODAL DUYỆT GIÁ CHỐT CUỐI CÙNG */}
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

      {/* 6. MODAL XEM TRỰC TIẾP FILE BÁO GIÁ / HÓA ĐƠN */}
      <Modal
        isOpen={!!previewAttachment}
        onClose={() => setPreviewAttachment(null)}
        title={`Xem Tài Liệu Báo Giá: ${previewAttachment?.name || ''}`}
        maxWidth="860px"
      >
        {previewAttachment && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            {previewAttachment.type?.includes('image') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(previewAttachment.name) ? (
              <div
                style={{
                  width: '100%',
                  maxHeight: '70vh',
                  overflow: 'auto',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  border: '1px solid var(--border-color)',
                }}
              >
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '65vh',
                    objectFit: 'contain',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                  }}
                />
              </div>
            ) : previewAttachment.type?.includes('pdf') || /\.pdf$/i.test(previewAttachment.name) ? (
              <div style={{ width: '100%', height: '70vh', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <iframe
                  src={previewAttachment.url}
                  title={previewAttachment.name}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              </div>
            ) : (
              <div
                style={{
                  padding: '3rem 2rem',
                  textAlign: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-md)',
                  width: '100%',
                  border: '1px dashed var(--border-color)',
                }}
              >
                <div style={{ marginBottom: '1rem' }}>
                  <FileText size={48} color="var(--primary)" />
                </div>
                <h4 style={{ color: '#ffffff', marginBottom: '0.5rem' }}>{previewAttachment.name}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Định dạng này cần tải về máy hoặc mở bằng ứng dụng văn phòng chuyên dụng.
                </p>
                <a
                  href={previewAttachment.url}
                  download={previewAttachment.name}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Download size={16} />
                  <span>Tải Về Máy</span>
                </a>
              </div>
            )}

            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {previewAttachment.name}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a
                  href={previewAttachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ gap: '0.35rem' }}
                >
                  <ExternalLink size={14} />
                  <span>Mở Tab Mới</span>
                </a>
                <a
                  href={previewAttachment.url}
                  download={previewAttachment.name}
                  className="btn btn-secondary btn-sm"
                  style={{ gap: '0.35rem' }}
                >
                  <Download size={14} />
                  <span>Tải Về</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="btn btn-primary btn-sm"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL XEM TRƯỚC VÀ IN BIỂU MẪU ĐỀ XUẤT MUA SẮM VẬT TƯ */}
      <PurchasePrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        proposal={proposal}
      />
    </div>
  );
};

