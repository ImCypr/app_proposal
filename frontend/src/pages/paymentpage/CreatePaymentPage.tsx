import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { purchaseProposalService, paymentProposalService, uploadService } from '../../services';
import { PurchaseProposal } from '../../models';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import {
  CreditCard,
  ArrowLeft,
  Save,
  AlertCircle,
  Loader2,
  FileText,
  Search,
  ChevronDown,
  Building,
  User as UserIcon,
  Paperclip,
  UploadCloud,
  Trash2,
  CheckCircle2,
  Info,
} from 'lucide-react';

export const CreatePaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPurchaseId = searchParams.get('purchaseProposalId');
  const { user } = useAuth();

  // Chỉ kế toán được truy cập trang này
  useEffect(() => {
    if (user && user.role !== 'ke_toan') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const [purchaseProposals, setPurchaseProposals] = useState<PurchaseProposal[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [selectedProposal, setSelectedProposal] = useState<PurchaseProposal | null>(null);
  const [searchPurchase, setSearchPurchase] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileUploading, setFileUploading] = useState(false);

  const [form, setForm] = useState({
    amount: 0,
    installmentNote: '',
    paymentReason: '',
    paymentMethod: 'bank_transfer' as 'bank_transfer' | 'cash',
    beneficiary: {
      name: '',
      accountNumber: '',
      bankName: '',
      branch: '',
    },
    attachments: [] as Array<{ name: string; url: string; size?: number; type?: string }>,
  });

  const handleSelectProposal = (proposal: PurchaseProposal) => {
    setSelectedProposal(proposal);
    setShowDropdown(false);
    setSearchPurchase('');

    const totalAmount = proposal.totalActualAmount || proposal.totalEstimatedAmount;
    const remaining = Math.max(0, totalAmount - (proposal.totalDisbursed || 0));

    // Điền sẵn thông tin người thụ hưởng theo người tạo đơn đề xuất mua sắm
    const creator = proposal.creator;
    const creatorBank = (creator as any)?.bankAccount;
    const beneficiaryName = creator?.fullName || creatorBank?.accountHolder || '';
    const accountNumber = creatorBank?.accountNumber || '';
    const bankName = creatorBank?.bankName || '';

    setForm((prev) => ({
      ...prev,
      amount: remaining,
      paymentReason: `Thanh toán chi phí mua sắm vật tư cho đơn ${proposal.proposalCode}`,
      installmentNote: '',
      beneficiary: {
        name: beneficiaryName,
        accountNumber: accountNumber,
        bankName: bankName,
        branch: prev.beneficiary.branch || '',
      },
    }));
  };

  const handleFillCreatorBeneficiary = () => {
    if (!selectedProposal?.creator) return;
    const creator = selectedProposal.creator;
    const creatorBank = (creator as any)?.bankAccount;
    setForm((prev) => ({
      ...prev,
      beneficiary: {
        name: creator?.fullName || creatorBank?.accountHolder || prev.beneficiary.name,
        accountNumber: creatorBank?.accountNumber || prev.beneficiary.accountNumber,
        bankName: creatorBank?.bankName || prev.beneficiary.bankName,
        branch: prev.beneficiary.branch || '',
      },
    }));
  };

  // Tải danh sách đơn mua sắm có status "pending_payment" hoặc "disbursing"
  useEffect(() => {
    const loadPurchaseProposals = async () => {
      setLoadingProposals(true);
      try {
        const data = await purchaseProposalService.getAll();
        // Lọc các đơn mua sắm đủ điều kiện để lập đề xuất thanh toán
        const eligible = data.filter((p) =>
          ['pending_payment', 'disbursing', 'final_approved'].includes(p.status)
        );
        setPurchaseProposals(eligible);

        if (preselectedPurchaseId) {
          const found = eligible.find((p) => p._id === preselectedPurchaseId);
          if (found) {
            handleSelectProposal(found);
          } else {
            try {
              const single = await purchaseProposalService.getById(preselectedPurchaseId);
              if (single) {
                setPurchaseProposals((prev) => [single, ...prev.filter((p) => p._id !== single._id)]);
                handleSelectProposal(single);
              }
            } catch (sErr) {
              console.error('Không tìm thấy đơn mua sắm chỉ định:', sErr);
            }
          }
        }
      } catch (err) {
        console.error('Error loading purchase proposals:', err);
      } finally {
        setLoadingProposals(false);
      }
    };
    loadPurchaseProposals();
  }, [preselectedPurchaseId]);

  const filteredPurchaseProposals = purchaseProposals.filter((p) =>
    p.proposalCode.toLowerCase().includes(searchPurchase.toLowerCase()) ||
    p.creator?.fullName?.toLowerCase().includes(searchPurchase.toLowerCase()) ||
    p.department?.name?.toLowerCase().includes(searchPurchase.toLowerCase())
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const oversizedFiles = Array.from(files).filter((f) => f.size > 15 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      alert(`Một số tệp vượt quá dung lượng tối đa 15MB: ${oversizedFiles.map((f) => f.name).join(', ')}`);
      return;
    }

    setFileUploading(true);
    try {
      const uploadedList = [...form.attachments];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await uploadService.uploadFile(file);
        uploadedList.push({
          name: res.name || file.name,
          url: res.url,
          size: res.size || file.size,
          type: res.type || file.type,
        });
      }
      setForm((prev) => ({ ...prev, attachments: uploadedList }));
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tải tệp lên máy chủ');
    } finally {
      setFileUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, idx) => idx !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedProposal) {
      setError('Vui lòng chọn đơn mua sắm gốc để lập đề xuất thanh toán.');
      return;
    }

    if (form.amount <= 0) {
      setError('Số tiền thanh toán phải lớn hơn 0.');
      return;
    }

    const totalAmount = selectedProposal.totalActualAmount || selectedProposal.totalEstimatedAmount;
    const remaining = Math.max(0, totalAmount - (selectedProposal.totalDisbursed || 0));
    if (form.amount > remaining) {
      setError(`Số tiền thanh toán vượt quá số tiền còn lại (${formatCurrency(remaining)}).`);
      return;
    }

    if (
      !form.beneficiary.name.trim() ||
      !form.beneficiary.accountNumber.trim() ||
      !form.beneficiary.bankName.trim()
    ) {
      setError('Vui lòng điền đầy đủ thông tin người thụ hưởng (Tên, Số tài khoản, Ngân hàng).');
      return;
    }

    if (!form.paymentReason.trim()) {
      setError('Vui lòng nhập nội dung thanh toán.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await paymentProposalService.create({
        purchaseProposalId: selectedProposal._id,
        amount: form.amount,
        installmentNote: form.installmentNote,
        paymentReason: form.paymentReason,
        paymentMethod: form.paymentMethod,
        beneficiary: form.beneficiary,
        attachments: form.attachments,
      });
      navigate(`/payment/${result._id}`);
    } catch (err: any) {
      setError(err.message || 'Không thể tạo đề xuất thanh toán. Vui lòng thử lại.');
      setSubmitting(false);
    }
  };

  const remainingAmount = selectedProposal
    ? Math.max(0, (selectedProposal.totalActualAmount || selectedProposal.totalEstimatedAmount) - (selectedProposal.totalDisbursed || 0))
    : 0;

  if (user?.role !== 'ke_toan') {
    return null;
  }

  return (
    <div>
      {/* Tiêu đề trang */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to="/payment" className="btn btn-ghost btn-sm" style={{ padding: '0.4rem' }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 style={{ fontSize: '1.5rem', color: '#ffffff' }}>Lập Đề Xuất Thanh Toán Mới</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Chọn đơn mua sắm đã được duyệt, nhập thông tin thanh toán và người thụ hưởng để gửi phê duyệt chi.
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
        {/* BƯỚC 1: Chọn đơn mua sắm gốc */}
        <div className="card" style={{ marginBottom: '1.75rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary) 0%, #818cf8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 800,
              }}
            >
              1
            </div>
            <h3 style={{ fontSize: '1.05rem', color: '#ffffff' }}>Chọn Đơn Mua Sắm Gốc</h3>
          </div>

          {loadingProposals ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', padding: '1rem 0' }}>
              <Loader2 size={18} className="animate-spin" />
              <span style={{ fontSize: '0.875rem' }}>Đang tải danh sách đơn mua sắm...</span>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => setShowDropdown(!showDropdown)}
                style={{
                  padding: '0.85rem 1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: selectedProposal
                    ? '1px solid rgba(99, 102, 241, 0.4)'
                    : '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'var(--transition)',
                }}
              >
                {selectedProposal ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                    <span className="font-mono" style={{ fontWeight: 700, color: '#ffffff' }}>
                      {selectedProposal.proposalCode}
                    </span>
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                      {selectedProposal.department?.name}
                    </span>
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>•</span>
                    <span className="font-mono" style={{ fontWeight: 600, color: 'var(--success)' }}>
                      {formatCurrency(selectedProposal.totalActualAmount || selectedProposal.totalEstimatedAmount)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                      (Còn lại: {formatCurrency(remainingAmount)})
                    </span>
                  </div>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Bấm để chọn đơn mua sắm cần lập thanh toán...
                  </span>
                )}
                <ChevronDown size={16} color="var(--text-muted)" />
              </div>

              {showDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '0.25rem',
                    backgroundColor: '#1a1f2e',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    maxHeight: '320px',
                    overflowY: 'auto',
                    zIndex: 100,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  }}
                >
                  <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ position: 'relative' }}>
                      <Search
                        size={14}
                        style={{
                          position: 'absolute',
                          left: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--text-muted)',
                        }}
                      />
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '32px', fontSize: '0.825rem' }}
                        placeholder="Tìm mã đơn, người tạo, phòng ban..."
                        value={searchPurchase}
                        onChange={(e) => setSearchPurchase(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>

                  {filteredPurchaseProposals.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Không tìm thấy đơn mua sắm nào đủ điều kiện thanh toán.
                    </div>
                  ) : (
                    filteredPurchaseProposals.map((p) => {
                      const total = p.totalActualAmount || p.totalEstimatedAmount;
                      const remaining = Math.max(0, total - (p.totalDisbursed || 0));
                      return (
                        <div
                          key={p._id}
                          onClick={() => handleSelectProposal(p)}
                          style={{
                            padding: '0.85rem 1rem',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--border-subtle)',
                            transition: 'var(--transition)',
                            backgroundColor: selectedProposal?._id === p._id ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.08)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              selectedProposal?._id === p._id ? 'rgba(99, 102, 241, 0.08)' : 'transparent';
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span className="font-mono" style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.9rem' }}>
                                {p.proposalCode}
                              </span>
                              <span style={{ marginLeft: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {p.creator?.fullName} — {p.department?.name}
                              </span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div className="font-mono" style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.875rem' }}>
                                {formatCurrency(total)}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: remaining > 0 ? 'var(--accent-cyan)' : 'var(--success)' }}>
                                {remaining > 0 ? `Còn lại: ${formatCurrency(remaining)}` : 'Đã giải ngân hết'}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* Thông tin tóm tắt đơn mua sắm đã chọn */}
          {selectedProposal && (
            <div
              style={{
                marginTop: '1rem',
                padding: '1rem 1.25rem',
                backgroundColor: 'rgba(99, 102, 241, 0.06)',
                border: '1px solid rgba(99, 102, 241, 0.15)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Người tạo đơn
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff' }}>
                    {selectedProposal.creator?.fullName}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Phòng ban
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff' }}>
                    {selectedProposal.department?.name}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Tổng giá trị
                  </div>
                  <div className="font-mono" style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--success)' }}>
                    {formatCurrency(selectedProposal.totalActualAmount || selectedProposal.totalEstimatedAmount)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Đã giải ngân
                  </div>
                  <div className="font-mono" style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {formatCurrency(selectedProposal.totalDisbursed || 0)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Số vật tư
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff' }}>
                    {selectedProposal.items?.length || 0} mục
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BƯỚC 2: Thông tin thanh toán */}
        <div className="card" style={{ marginBottom: '1.75rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 800,
              }}
            >
              2
            </div>
            <h3 style={{ fontSize: '1.05rem', color: '#ffffff' }}>Thông Tin Thanh Toán</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {/* Số tiền thanh toán */}
            <div>
              <label className="form-label">
                Số Tiền Thanh Toán (VNĐ) <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                className="form-input font-mono"
                placeholder="0"
                value={form.amount || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: Number(e.target.value) }))}
              />
              {selectedProposal && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                  Số tiền còn lại khả dụng: <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{formatCurrency(remainingAmount)}</span>
                </div>
              )}
            </div>

            {/* Phương thức thanh toán */}
            <div>
              <label className="form-label">Phương Thức Thanh Toán</label>
              <select
                className="form-select"
                value={form.paymentMethod}
                onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value as 'bank_transfer' | 'cash' }))}
              >
                <option value="bank_transfer">Chuyển khoản ngân hàng</option>
                <option value="cash">Tiền mặt</option>
              </select>
            </div>

            {/* Nội dung thanh toán */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">
                Nội Dung Thanh Toán <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="Mô tả nội dung khoản thanh toán..."
                value={form.paymentReason}
                onChange={(e) => setForm((prev) => ({ ...prev, paymentReason: e.target.value }))}
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Ghi chú đợt thanh toán */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Ghi Chú Đợt Thanh Toán</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ví dụ: Đợt 1 — Tạm ứng 50%"
                value={form.installmentNote}
                onChange={(e) => setForm((prev) => ({ ...prev, installmentNote: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* BƯỚC 3: Thông tin người thụ hưởng */}
        <div className="card" style={{ marginBottom: '1.75rem', padding: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                }}
              >
                3
              </div>
              <h3 style={{ fontSize: '1.05rem', color: '#ffffff' }}>Thông Tin Người Thụ Hưởng</h3>
            </div>

            {selectedProposal?.creator && (
              <button
                type="button"
                onClick={handleFillCreatorBeneficiary}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', gap: '0.4rem', padding: '0.35rem 0.75rem' }}
                title="Lấy lại thông tin theo người tạo đơn đề xuất mua sắm"
              >
                <UserIcon size={14} />
                <span>Điền theo người tạo ({selectedProposal.creator.fullName})</span>
              </button>
            )}
          </div>

          {selectedProposal?.creator && (
            <div
              style={{
                fontSize: '0.785rem',
                color: 'var(--text-secondary)',
                marginBottom: '1.25rem',
                padding: '0.65rem 0.9rem',
                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Info size={16} color="var(--primary)" />
              <span>
                Đã tự động điền sẵn thông tin theo người tạo đơn đề xuất mua sắm: <strong>{selectedProposal.creator.fullName}</strong>. Bạn có thể chỉnh sửa nếu đơn vị thụ hưởng thực tế là Nhà cung cấp hoặc đối tác.
              </span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label className="form-label">
                Tên Người Nhận <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="Tên cá nhân hoặc tổ chức thụ hưởng"
                value={form.beneficiary.name}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    beneficiary: { ...prev.beneficiary, name: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <label className="form-label">
                Số Tài Khoản <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                required
                className="form-input font-mono"
                placeholder="Số tài khoản ngân hàng"
                value={form.beneficiary.accountNumber}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    beneficiary: { ...prev.beneficiary, accountNumber: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <label className="form-label">
                Ngân Hàng <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="Tên ngân hàng (VD: Vietcombank)"
                value={form.beneficiary.bankName}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    beneficiary: { ...prev.beneficiary, bankName: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <label className="form-label">Chi Nhánh</label>
              <input
                type="text"
                className="form-input"
                placeholder="Chi nhánh ngân hàng (không bắt buộc)"
                value={form.beneficiary.branch}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    beneficiary: { ...prev.beneficiary, branch: e.target.value },
                  }))
                }
              />
            </div>
          </div>
        </div>

        {/* BƯỚC 4: Đính kèm chứng từ */}
        <div className="card" style={{ marginBottom: '1.75rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 800,
              }}
            >
              4
            </div>
            <h3 style={{ fontSize: '1.05rem', color: '#ffffff' }}>Đính Kèm Chứng Từ</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Không bắt buộc)</span>
          </div>

          <div
            style={{
              padding: '1.5rem',
              border: '2px dashed var(--border-color)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
              cursor: 'pointer',
              position: 'relative',
              transition: 'var(--transition)',
            }}
          >
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0,
                cursor: 'pointer',
              }}
            />
            {fileUploading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                <Loader2 size={20} className="animate-spin" />
                <span style={{ fontSize: '0.875rem' }}>Đang tải tệp lên...</span>
              </div>
            ) : (
              <>
                <UploadCloud size={28} color="var(--text-muted)" />
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  Kéo thả hoặc bấm để tải lên hóa đơn, bảng tính, chứng từ
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  PDF, DOC, XLS, JPG, PNG — Tối đa 15MB / tệp
                </div>
              </>
            )}
          </div>

          {form.attachments.length > 0 && (
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {form.attachments.map((file, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.85rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Paperclip size={14} color="var(--primary)" />
                    <span style={{ fontSize: '0.825rem', fontWeight: 500 }}>{file.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(idx)}
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--danger)', padding: '0.25rem' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Thanh tổng kết và nút gửi */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          {/* Hướng dẫn quy trình */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Info size={18} color="var(--primary)" />
              <h4 style={{ fontSize: '0.95rem', color: '#ffffff' }}>Luồng Phê Duyệt Chi</h4>
            </div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Sau khi gửi, đề xuất thanh toán sẽ được chuyển:
              <div style={{ marginTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CheckCircle2 size={13} color="var(--warning)" />
                  <span>Giám đốc / Chủ tịch <strong>phê duyệt chi</strong> (tùy theo mức tiền)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CheckCircle2 size={13} color="var(--accent-cyan)" />
                  <span>Kế toán <strong>xác nhận giải ngân</strong> và chuyển tiền</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tổng tiền thanh toán */}
          <div
            className="card"
            style={{
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 182, 212, 0.06) 100%)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Số Tiền Đề Xuất Thanh Toán
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
                {formatCurrency(form.amount)}
              </div>
              {selectedProposal && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Đơn gốc: {selectedProposal.proposalCode} • Phương thức: {form.paymentMethod === 'bank_transfer' ? 'Chuyển khoản' : 'Tiền mặt'}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <Link to="/payment" className="btn btn-secondary">
                Hủy Bỏ
              </Link>
              <button
                type="submit"
                disabled={submitting || !selectedProposal || form.amount <= 0}
                className="btn btn-primary"
                style={{ padding: '0.75rem 1.5rem' }}
              >
                <Save size={16} />
                <span>{submitting ? 'Đang gửi...' : 'Gửi Đề Xuất Thanh Toán'}</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
