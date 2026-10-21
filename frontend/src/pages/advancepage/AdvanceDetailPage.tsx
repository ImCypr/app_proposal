import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { advanceProposalService, uploadService } from '../../services';
import { AdvanceProposal, SettlementType, SettlementAttachment } from '../../models';
import { StatusBadge, ApprovalFlowTracker, Modal, AdvancePrintModal, FilePreviewModal, PreviewFileItem } from '../../component';
import { formatCurrency, formatDate, getRoleLabel, formatFileSize } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  XCircle,
  CreditCard,
  User as UserIcon,
  Loader2,
  AlertCircle,
  FileCheck,
  Receipt,
  Paperclip,
  UploadCloud,
  Download,
  Eye,
  ExternalLink,
  FileSpreadsheet,
  Image as ImageIcon,
  FileText,
  X,
  Printer,
  Crown,
  Plus,
  Trash2,
} from 'lucide-react';

const getFileIcon = (fileName: string, type?: string) => {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf' || type?.includes('pdf')) {
    return <FileText size={20} color="#f87171" />;
  }
  if (['xls', 'xlsx', 'csv'].includes(ext || '') || type?.includes('sheet') || type?.includes('excel')) {
    return <FileSpreadsheet size={20} color="#34d399" />;
  }
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext || '') || type?.includes('image')) {
    return <ImageIcon size={20} color="#38bdf8" />;
  }
  return <FileText size={20} color="var(--primary)" />;
};


export const AdvanceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [proposal, setProposal] = useState<AdvanceProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quản lý trạng thái mở/đóng các Modal
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isDisburseOpen, setIsDisburseOpen] = useState(false);
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [isConfirmSettlementOpen, setIsConfirmSettlementOpen] = useState(false);
  const [isDisburseSuccessOpen, setIsDisburseSuccessOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  // [QUY TRÌNH MỚI] Modal chỉnh sửa và nộp lại đơn tạm ứng khi bị từ chối
  const [isResubmitOpen, setIsResubmitOpen] = useState(false);
  const [resubmitItems, setResubmitItems] = useState<Array<{ id: string; mucDich: string; soTien: number }>>([]);
  const [resubmitBankAccount, setResubmitBankAccount] = useState({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
  });

  // [QUY TRÌNH MỚI] Modal Kế toán từ chối hoàn tạm ứng
  const [isRejectSettlementOpen, setIsRejectSettlementOpen] = useState(false);
  const [rejectSettlementReason, setRejectSettlementReason] = useState('');

  const [disburseSuccessInfo, setDisburseSuccessInfo] = useState<{
    code: string;
    amount: number;
    beneficiaryName: string;
    accountNumber: string;
    bankName: string;
    note: string;
  } | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<PreviewFileItem | null>(null);
  const [previewFileList, setPreviewFileList] = useState<PreviewFileItem[]>([]);
  const [previewFileIndex, setPreviewFileIndex] = useState(0);

  const handleOpenPreview = (name: string, url: string, type?: string, list?: PreviewFileItem[], index?: number) => {
    const item: PreviewFileItem = { name, url, type };
    setPreviewAttachment(item);
    if (list && list.length > 0) {
      setPreviewFileList(list);
      setPreviewFileIndex(index !== undefined ? index : list.findIndex((f) => f.url === url));
    } else {
      setPreviewFileList([item]);
      setPreviewFileIndex(0);
    }
  };

  // Dữ liệu biểu mẫu trong các Modal
  const [comment, setComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [disburseNote, setDisburseNote] = useState('');
  const [disburseAmount, setDisburseAmount] = useState<number>(0);

  // Dữ liệu biểu mẫu hoàn ứng
  // Dữ liệu biểu mẫu hoàn ứng và gửi hóa đơn mua sắm thực tế
  const [settlementType, setSettlementType] = useState<SettlementType>('exact');
  const [settlementAmount, setSettlementAmount] = useState<number>(0);
  const [settlementNote, setSettlementNote] = useState('');
  const [settlementAttachments, setSettlementAttachments] = useState<SettlementAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);

  // [LUỒNG MỚI] Dữ liệu hóa đơn thực tế và bước xác nhận hoàn tạm ứng của Thu mua
  const [actualInvoiceDate, setActualInvoiceDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [actualInvoiceAmount, setActualInvoiceAmount] = useState<number>(0);
  const [actualInvoiceFiles, setActualInvoiceFiles] = useState<SettlementAttachment[]>([]);
  const [actualInvoiceUploading, setActualInvoiceUploading] = useState(false);
  const [purchaserConfirmType, setPurchaserConfirmType] = useState<'received_additional' | 'refunded_surplus' | 'exact_matched'>('exact_matched');
  const [purchaserConfirmProof, setPurchaserConfirmProof] = useState<SettlementAttachment[]>([]);
  const [proofUploading, setProofUploading] = useState(false);
  const [purchaserNote, setPurchaserNote] = useState('');
  // [QUY TRÌNH MỚI] Kế toán lập đề xuất hoàn tạm ứng đối với số tiền chênh lệch (khi tạm ứng > hóa đơn)
  const [isRequestSettlementOpen, setIsRequestSettlementOpen] = useState(false);
  const [requestSettlementNote, setRequestSettlementNote] = useState('');

  // Xử lý upload danh sách tệp đính kèm hoàn ứng lưu thẳng vào ổ cứng máy chủ
  const processFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!files || files.length === 0) return;

    // Kiểm tra dung lượng từng tệp không vượt quá 15MB
    const oversizedFiles = files.filter((f) => f.size > 15 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      alert(`Một số tệp vượt quá dung lượng tối đa 15MB: ${oversizedFiles.map((f) => f.name).join(', ')}`);
      return;
    }

    setFileUploading(true);
    try {
      const uploadedResults = await uploadService.uploadFiles(files);
      setSettlementAttachments((prev) => [
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
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setSettlementAttachments((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Upload ảnh hóa đơn mua sắm thực tế
  const processActualInvoiceFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!files || files.length === 0) return;
    setActualInvoiceUploading(true);
    try {
      const uploaded = await uploadService.uploadFiles(files);
      setActualInvoiceFiles((prev) => [
        ...prev,
        ...uploaded.map((f) => ({ name: f.name, url: f.url, size: f.size, type: f.type })),
      ]);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tải ảnh hóa đơn');
    } finally {
      setActualInvoiceUploading(false);
    }
  };

  // Upload ảnh biên lai chuyển tiền hoàn ứng / nhận thêm tiền
  const processProofFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!files || files.length === 0) return;
    setProofUploading(true);
    try {
      const uploaded = await uploadService.uploadFiles(files);
      setPurchaserConfirmProof((prev) => [
        ...prev,
        ...uploaded.map((f) => ({ name: f.name, url: f.url, size: f.size, type: f.type })),
      ]);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tải biên lai xác nhận');
    } finally {
      setProofUploading(false);
    }
  };

  const [actionLoading, setActionLoading] = useState(false);


  const fetchProposal = useCallback(async (propId: string) => {
    setLoading(true);
    try {
      const data = await advanceProposalService.getById(propId);
      setProposal(data);
      setDisburseAmount(data.totalAmount);
    } catch (err: any) {
      setError(err.message || 'Không thể tải chi tiết đề xuất tạm ứng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) fetchProposal(id);
  }, [id, fetchProposal]);

  // Các hàm xử lý hành động người dùng
  const handleApprove = async () => {
    if (!proposal) return;
    setActionLoading(true);
    try {
      await advanceProposalService.approve(proposal._id, comment);
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
      await advanceProposalService.reject(proposal._id, rejectReason);
      setIsRejectOpen(false);
      setRejectReason('');
      fetchProposal(proposal._id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccountingDisburse = async () => {
    if (!proposal) return;
    setActionLoading(true);
    try {
      const savedAmount = disburseAmount;
      const savedNote = disburseNote || `Giải ngân tạm ứng chuyển vào STK ${proposal.bankAccount?.accountNumber}`;
      await advanceProposalService.accountingDisburse(
        proposal._id,
        savedAmount,
        savedNote
      );
      setDisburseSuccessInfo({
        code: proposal.proposalCode,
        amount: savedAmount,
        beneficiaryName: proposal.creator?.fullName || '',
        accountNumber: proposal.bankAccount?.accountNumber || '',
        bankName: proposal.bankAccount?.bankName || '',
        note: savedNote,
      });
      setIsDisburseOpen(false);
      setDisburseNote('');
      setIsDisburseSuccessOpen(true);
      fetchProposal(proposal._id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitSettlement = async () => {
    if (!proposal) return;
    if (!actualInvoiceDate) {
      alert('Vui lòng chọn ngày hóa đơn mua sắm thực tế');
      return;
    }
    const effectiveInvAmount = Number(actualInvoiceAmount) || 0;
    if (effectiveInvAmount <= 0 && actualInvoiceFiles.length === 0) {
      alert('Vui lòng nhập đơn giá/giá trị hóa đơn thực tế hoặc tải ảnh minh chứng hóa đơn');
      return;
    }

    const advanceVal = proposal.totalDisbursed > 0 ? proposal.totalDisbursed : proposal.totalAmount;
    // [CẬP NHẬT SỐ LIỆU] hoàn tạm ứng = số tiền tạm ứng hợp đồng - giá của hóa đơn
    const diff = advanceVal - effectiveInvAmount;

    // Cảnh báo nếu tạm ứng dư (diff > 0) nhưng chưa tải ảnh biên lai chuyển tiền hoàn ứng
    if (diff > 0 && purchaserConfirmProof.length === 0) {
      const confirmContinue = window.confirm(
        `Số tiền tạm ứng dư là ${formatCurrency(diff)}. Bạn có muốn tiếp tục gửi khi chưa đính kèm ảnh biên lai/chứng từ chuyển tiền hoàn ứng không?`
      );
      if (!confirmContinue) return;
    }

    setActionLoading(true);
    try {
      const payload: any = {
        actualInvoiceDate,
        actualInvoiceAmount: effectiveInvAmount,
        actualInvoiceFiles,
        purchaserConfirmType: diff < 0 ? 'received_additional' : diff > 0 ? 'refunded_surplus' : 'exact_matched',
        purchaserConfirmProof,
        purchaserNote,
        attachments: [...actualInvoiceFiles, ...purchaserConfirmProof, ...settlementAttachments],
        note: purchaserNote || settlementNote,
      };
      await advanceProposalService.submitSettlement(proposal._id, payload);
      setIsSettlementOpen(false);
      fetchProposal(proposal._id);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi gửi hóa đơn và xác nhận hoàn tạm ứng');
    } finally {
      setActionLoading(false);
    }
  };

  // [QUY TRÌNH MỚI] Tính toán đối soát tạm ứng và hóa đơn thực tế
  const advTotal = Number(proposal?.totalDisbursed && proposal.totalDisbursed > 0 ? proposal.totalDisbursed : proposal?.totalAmount || 0);
  const actualInvAmount = Number(proposal?.beneficiaryInvoice?.actualInvoiceAmount || proposal?.settlement?.invoiceAmount || 0);
  const diffAdv = advTotal - actualInvAmount;
  const isAdvanceDiffSurplus = advTotal > 0 && actualInvAmount > 0 && diffAdv > 0;
  const isAdvanceDiffExact = (advTotal > 0 && actualInvAmount > 0 && diffAdv === 0) || proposal?.settlement?.type === 'exact';

  const handleConfirmSettlement = async () => {
    if (!proposal) return;
    setActionLoading(true);
    try {
      await advanceProposalService.confirmSettlement(proposal._id, comment);
      setIsConfirmSettlementOpen(false);
      setComment('');
      fetchProposal(proposal._id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // [QUY TRÌNH MỚI] Kế toán lập đề xuất hoàn tạm ứng đối với số tiền chênh lệch khi tạm ứng > hóa đơn
  const handleRequestSettlement = async () => {
    if (!proposal) return;
    setActionLoading(true);
    try {
      await advanceProposalService.requestSettlement(proposal._id, {
        diffAmount: diffAdv,
        note: requestSettlementNote.trim() || `Kế toán đề xuất hoàn tạm ứng số tiền chênh lệch ${formatCurrency(diffAdv)}.`,
        actualInvoiceDate: proposal.beneficiaryInvoice?.actualInvoiceDate || new Date().toISOString().slice(0, 10),
        actualInvoiceAmount: actualInvAmount,
        actualInvoiceFiles: proposal.beneficiaryInvoice?.actualInvoiceFiles || [],
      });
      setIsRequestSettlementOpen(false);
      setRequestSettlementNote('');
      alert(`Đã lập đề xuất hoàn tạm ứng ${formatCurrency(diffAdv)} thành công! Yêu cầu nộp lại tiền thừa đã được chuyển cho Thu mua.`);
      fetchProposal(proposal._id);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lập đề xuất hoàn tạm ứng');
    } finally {
      setActionLoading(false);
    }
  };

  // [QUY TRÌNH MỚI] Mở modal chỉnh sửa và làm lại đơn tạm ứng khi bị từ chối
  const handleOpenResubmitModal = () => {
    if (!proposal) return;
    setResubmitItems(
      proposal.items && proposal.items.length > 0
        ? proposal.items.map((item, idx) => ({
            id: String(item._id || idx + 1),
            mucDich: item.mucDich,
            soTien: item.soTien,
          }))
        : [{ id: '1', mucDich: '', soTien: 0 }]
    );
    setResubmitBankAccount({
      bankName: proposal.bankAccount?.bankName || '',
      accountNumber: proposal.bankAccount?.accountNumber || '',
      accountHolder: proposal.bankAccount?.accountHolder || proposal.creator?.fullName || '',
    });
    setIsResubmitOpen(true);
  };

  const handleAddResubmitItem = () => {
    setResubmitItems((prev) => [
      ...prev,
      { id: Date.now().toString(), mucDich: '', soTien: 0 },
    ]);
  };

  const handleRemoveResubmitItem = (index: number) => {
    if (resubmitItems.length === 1) return;
    setResubmitItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateResubmitItem = (index: number, field: 'mucDich' | 'soTien', value: any) => {
    setResubmitItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleResubmit = async () => {
    if (!proposal) return;
    if (!resubmitBankAccount.bankName.trim() || !resubmitBankAccount.accountNumber.trim()) {
      alert('Vui lòng điền đầy đủ Tên ngân hàng và Số tài khoản nhận tiền');
      return;
    }
    for (let i = 0; i < resubmitItems.length; i++) {
      if (!resubmitItems[i].mucDich.trim()) {
        alert(`Vui lòng nhập mục đích tạm ứng cho dòng số ${i + 1}`);
        return;
      }
      if (Number(resubmitItems[i].soTien) <= 0) {
        alert(`Số tiền dòng số ${i + 1} phải lớn hơn 0`);
        return;
      }
    }
    setActionLoading(true);
    try {
      await advanceProposalService.resubmit(proposal._id, {
        items: resubmitItems.map((item, idx) => ({
          mucDich: item.mucDich.trim(),
          soTien: Number(item.soTien),
        })),
        bankAccount: resubmitBankAccount,
      });
      setIsResubmitOpen(false);
      fetchProposal(proposal._id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // [QUY TRÌNH MỚI] Mở modal hoàn tạm ứng (prefill dữ liệu cũ nếu có)
  const handleOpenSettlementModal = () => {
    if (!proposal) return;
    const inv = proposal.beneficiaryInvoice;
    const sett = proposal.settlement;
    const advanceVal = proposal.totalDisbursed > 0 ? proposal.totalDisbursed : proposal.totalAmount;

    // Prefill ngày hóa đơn
    if (inv?.actualInvoiceDate) {
      setActualInvoiceDate(new Date(inv.actualInvoiceDate).toISOString().slice(0, 10));
    } else if (inv?.invoiceDate) {
      setActualInvoiceDate(new Date(inv.invoiceDate).toISOString().slice(0, 10));
    } else {
      setActualInvoiceDate(new Date().toISOString().slice(0, 10));
    }

    // Prefill giá trị hóa đơn thực tế
    const effectiveInv = sett?.invoiceAmount || inv?.actualInvoiceAmount || inv?.invoiceAmount || advanceVal;
    setActualInvoiceAmount(Number(effectiveInv) || 0);

    // Prefill tệp hóa đơn và biên lai hoàn ứng
    setActualInvoiceFiles((inv?.actualInvoiceFiles as any) || (sett?.attachments as any) || []);
    setPurchaserConfirmProof((sett?.purchaserConfirmProof as any) || []);
    setPurchaserNote(sett?.purchaserNote || sett?.note || '');

    // Tính chênh lệch và prefill confirm type
    const diff = (Number(effectiveInv) || 0) - advanceVal;
    if (diff > 0) {
      setPurchaserConfirmType('received_additional');
      setSettlementType('deficit');
      setSettlementAmount(diff);
    } else if (diff < 0) {
      setPurchaserConfirmType('refunded_surplus');
      setSettlementType('surplus');
      setSettlementAmount(Math.abs(diff));
    } else {
      setPurchaserConfirmType('exact_matched');
      setSettlementType('exact');
      setSettlementAmount(0);
    }

    setSettlementNote(sett?.note || '');
    setSettlementAttachments(sett?.attachments || []);
    setIsSettlementOpen(true);
  };

  // [QUY TRÌNH MỚI] Kế toán từ chối hoàn tạm ứng
  const handleRejectSettlement = async () => {
    if (!proposal || !rejectSettlementReason.trim()) {
      alert('Vui lòng nhập lý do từ chối báo cáo hoàn tạm ứng');
      return;
    }
    setActionLoading(true);
    try {
      await advanceProposalService.rejectSettlement(proposal._id, rejectSettlementReason);
      setIsRejectSettlementOpen(false);
      setRejectSettlementReason('');
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
        <Link to="/advance" className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  // [LUỒNG MỚI] Phân quyền duyệt đơn tạm ứng theo hạn mức 10 triệu VNĐ
  const isOverTenMillion = (proposal.totalAmount || 0) > 10000000;

  // Cảnh báo khi Giám đốc đang xem đơn > 10 triệu (thuộc thẩm quyền Chủ tịch phê duyệt)
  const isDirectorWatchingOverLimit =
    (proposal.status === 'pending_chairman' || proposal.status === 'pending_director') &&
    isOverTenMillion &&
    user?.role === 'giam_doc';

  // Điều kiện lãnh đạo được bấm nút duyệt/từ chối theo phân quyền 10 triệu
  const canUserApproveAdvance = () => {
    if (proposal.status !== 'pending_director' && proposal.status !== 'pending_chairman') {
      return false;
    }
    if (isOverTenMillion) {
      // Đơn > 10 triệu: Chỉ Chủ tịch được duyệt
      return user?.role === 'chu_tich';
    }
    // Đơn <= 10 triệu: Sếp (Giám đốc) duyệt, Chủ tịch cũng có thể duyệt
    return user?.role === 'giam_doc' || user?.role === 'chu_tich';
  };

  // [QUY TRÌNH MỚI] Kiểm tra trạng thái bị từ chối
  const isProposalRejected = [
    'rejected',
    'rejected_by_director',
    'rejected_by_chairman',
    'rejected_by_accounting',
  ].includes(proposal.status);

  const isSettlementRejected = proposal.status === 'rejected_settlement';

  // Người tạo (hoặc lãnh đạo) có quyền chỉnh sửa & nộp lại đơn khi bị từ chối
  const isCreatorTurnToResubmit =
    isProposalRejected &&
    (proposal.creator?._id === user?._id || user?.role === 'truong_phong' || user?.role === 'chu_tich');

  const isAccountingDisburseTurn =
    user?.role === 'ke_toan' &&
    proposal.status === 'pending_accounting';

  const isCreatorSettlementTurn =
    (proposal.status === 'pending_settlement' || proposal.status === 'rejected_settlement') &&
    proposal.creator?._id === user?._id;

  const isAccountingSettlementConfirmTurn =
    user?.role === 'ke_toan' &&
    proposal.status === 'settlement_submitted';

  // [QUY TRÌNH MỚI] Kế toán lập đề xuất hoàn tạm ứng khi tạm ứng > hóa đơn
  const isAccountingRequestSettlementTurn =
    user?.role === 'ke_toan' &&
    isAdvanceDiffSurplus &&
    proposal.status !== 'completed' &&
    proposal.status !== 'settlement_submitted';

  // [QUY TRÌNH MỚI] Kế toán xác nhận hoàn thành khi vừa đủ
  const isAccountingExactConfirmTurn =
    user?.role === 'ke_toan' &&
    isAdvanceDiffExact &&
    proposal.status !== 'completed' &&
    proposal.status !== 'draft';

  const resubmitTotalAmount = resubmitItems.reduce(
    (sum, item) => sum + (Number(item.soTien) || 0),
    0
  );
  const isResubmitOverTenMillion = resubmitTotalAmount > 10000000;

  return (
    <div>
      {/* Thanh tiêu đề và nút quay lại */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/advance" className="btn btn-ghost btn-sm" style={{ padding: '0.4rem' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h1 style={{ fontSize: '1.5rem', color: '#ffffff' }} className="font-mono">
                {proposal.proposalCode}
              </h1>
              <StatusBadge status={proposal.status} type="advance" />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', marginTop: '0.2rem' }}>
              <span>Ngày tạo: {formatDate(proposal.createdAt)}</span>
              <span>•</span>
              <span>Phòng ban: {proposal.department?.name}</span>
            </div>
          </div>
        </div>

        {/* Thanh công cụ nút thao tác */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {isCreatorTurnToResubmit && (
            <button
              onClick={handleOpenResubmitModal}
              className="btn btn-warning"
              style={{
                gap: '0.4rem',
                backgroundColor: '#f59e0b',
                borderColor: '#d97706',
                color: '#000000',
                fontWeight: 700,
              }}
            >
              <FileCheck size={16} />
              <span>Chỉnh Sửa & Gửi Lại Đơn Tạm Ứng</span>
            </button>
          )}

          {canUserApproveAdvance() && (
            <>
              <button onClick={() => setIsApproveOpen(true)} className="btn btn-success" style={{ gap: '0.4rem' }}>
                {isOverTenMillion ? <Crown size={16} /> : <CheckCircle2 size={16} />}
                <span>{isOverTenMillion ? 'Chủ Tịch Duyệt Tạm Ứng' : 'Sếp Duyệt Tạm Ứng'}</span>
              </button>
              <button onClick={() => setIsRejectOpen(true)} className="btn btn-danger" style={{ gap: '0.4rem' }}>
                <XCircle size={16} />
                <span>Từ Chối</span>
              </button>
            </>
          )}

          {isAccountingDisburseTurn && (
            <>
              <button onClick={() => setIsDisburseOpen(true)} className="btn btn-success">
                <CheckCircle2 size={16} />
                <span>Duyệt & Giải Ngân Vào STK ({formatCurrency(proposal.totalAmount)})</span>
              </button>
              <button onClick={() => setIsRejectOpen(true)} className="btn btn-danger">
                <XCircle size={16} />
                <span>Từ Chối</span>
              </button>
            </>
          )}

          {isCreatorSettlementTurn && (
            <button onClick={handleOpenSettlementModal} className="btn btn-warning" style={{ gap: '0.4rem' }}>
              <Receipt size={16} />
              <span>{proposal.status === 'rejected_settlement' ? 'Làm Lại & Nộp Lại Báo Cáo Hoàn Ứng' : 'Nộp Báo Cáo Hoàn Tạm Ứng'}</span>
            </button>
          )}

          {/* [QUY TRÌNH MỚI] Kế toán kiểm tra 3 thông tin và chỉ cần bấm Xác Nhận Hoàn Thành hoặc Từ Chối */}
          {user?.role === 'ke_toan' &&
            proposal.status !== 'completed' &&
            ['settlement_submitted', 'disbursed', 'pending_settlement'].includes(proposal.status) &&
            actualInvAmount > 0 && (
            <>
              <button
                type="button"
                onClick={() => {
                  setComment(
                    diffAdv > 0
                      ? `Kế toán xác nhận hoàn tất hồ sơ tạm ứng & quyết toán hoàn ứng (Thu mua hoàn số tiền thừa ${formatCurrency(diffAdv)}).`
                      : diffAdv === 0
                      ? 'Kế toán xác nhận hoàn tất hồ sơ tạm ứng (Hóa đơn khớp đúng 100% số tiền tạm ứng).'
                      : `Kế toán xác nhận hoàn tất hồ sơ tạm ứng (Tạm ứng thiếu ${formatCurrency(Math.abs(diffAdv))}).`
                  );
                  setIsConfirmSettlementOpen(true);
                }}
                className="btn btn-success"
                style={{ gap: '0.4rem', fontWeight: 700 }}
              >
                <CheckCircle2 size={16} />
                <span>
                  {diffAdv > 0
                    ? `Xác Nhận Hoàn Thành (Hoàn Ứng ${formatCurrency(diffAdv)})`
                    : diffAdv === 0
                    ? 'Xác Nhận Hoàn Thành (Hóa Đơn Vừa Đủ)'
                    : `Xác Nhận Hoàn Thành (Thiếu ${formatCurrency(Math.abs(diffAdv))})`}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsRejectSettlementOpen(true)}
                className="btn btn-danger"
                style={{ gap: '0.4rem' }}
              >
                <XCircle size={16} />
                <span>Từ Chối (Yêu Cầu Làm Lại)</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsPrintOpen(true)}
            className="btn btn-secondary"
            style={{ gap: '0.4rem' }}
            title="Xem trước và in biểu mẫu giấy đề nghị tạm ứng PDF"
          >
            <Printer size={16} />
            <span>In / Xuất PDF</span>
          </button>
        </div>
      </div>

      {/* [QUY TRÌNH MỚI] Banner cảnh báo Đơn tạm ứng bị từ chối và hướng dẫn làm lại */}
      {isProposalRejected && (
        <div
          style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1.5px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: 1, minWidth: '280px' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                flexShrink: 0,
              }}
            >
              <AlertCircle size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f87171', marginBottom: '0.35rem' }}>
                Đề Xuất Tạm Ứng Đã Bị Từ Chối (Được Chuyển Trả Về Bước Làm Lại)
              </div>
              <div style={{ fontSize: '0.875rem', color: '#ffffff', marginBottom: '0.5rem' }}>
                <strong>Lý do từ chối:</strong> {proposal.rejectionReason || 'Chưa cung cấp lý do chi tiết'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Quy trình đã chuyển quyền xử lý về cho Người tạo đơn. Vui lòng rà soát lại thông tin (mục đích, số tiền, tài khoản nhận), bấm nút bên dưới để chỉnh sửa và nộp lại đề xuất.
              </div>
            </div>
          </div>

          {isCreatorTurnToResubmit && (
            <button
              onClick={handleOpenResubmitModal}
              className="btn btn-warning"
              style={{
                gap: '0.5rem',
                backgroundColor: '#f59e0b',
                borderColor: '#d97706',
                color: '#000000',
                fontWeight: 700,
                padding: '0.65rem 1.25rem',
              }}
            >
              <FileCheck size={18} />
              <span>Chỉnh Sửa & Gửi Lại Đơn Tạm Ứng</span>
            </button>
          )}
        </div>
      )}

      {/* [QUY TRÌNH MỚI] Banner cảnh báo Hoàn ứng bị từ chối */}
      {isSettlementRejected && (
        <div
          style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1.5px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: 1, minWidth: '280px' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                flexShrink: 0,
              }}
            >
              <AlertCircle size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f87171', marginBottom: '0.35rem' }}>
                Chứng Từ Hoàn Tạm Ứng Bị Kế Toán Từ Chối (Yêu Cầu Làm Lại)
              </div>
              <div style={{ fontSize: '0.875rem', color: '#ffffff', marginBottom: '0.5rem' }}>
                <strong>Lý do từ chối:</strong> {proposal.rejectionReason || 'Kế toán yêu cầu nộp lại chứng từ hoàn ứng'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Vui lòng kiểm tra lại số tiền chênh lệch thừa/thiếu và cập nhật các hóa đơn, chứng từ hợp lệ để gửi lại cho Kế toán xác nhận.
              </div>
            </div>
          </div>

          {isCreatorSettlementTurn && (
            <button
              onClick={handleOpenSettlementModal}
              className="btn btn-warning"
              style={{
                gap: '0.5rem',
                backgroundColor: '#f59e0b',
                borderColor: '#d97706',
                color: '#000000',
                fontWeight: 700,
                padding: '0.65rem 1.25rem',
              }}
            >
              <Receipt size={18} />
              <span>Chỉnh Sửa & Nộp Lại Báo Cáo Hoàn Ứng</span>
            </button>
          )}
        </div>
      )}

      {/* [QUY TRÌNH MỚI] Banner Kế toán đã lập đề xuất hoàn tạm ứng đối với số tiền chênh lệch */}
      {proposal.status === 'pending_settlement' && (proposal.settlement?.requestedBy || proposal.settlement?.accountantNote) && (
        <div
          style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: 'rgba(234, 179, 8, 0.12)',
            border: '1.5px solid rgba(234, 179, 8, 0.4)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: 1, minWidth: '280px' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: 'rgba(234, 179, 8, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#eab308',
                flexShrink: 0,
              }}
            >
              <Banknote size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fef08a', marginBottom: '0.35rem' }}>
                Kế Toán Đã Lập Đề Xuất Hoàn Tạm Ứng Số Tiền Chênh Lệch
              </div>
              <div style={{ fontSize: '0.875rem', color: '#ffffff', marginBottom: '0.4rem' }}>
                Số tiền chênh lệch cần hoàn ứng: <strong className="font-mono" style={{ color: '#f59e0b', fontSize: '1.05rem' }}>{formatCurrency(proposal.settlement?.amount || diffAdv)}</strong>
              </div>
              {proposal.settlement?.accountantNote && (
                <div style={{ fontSize: '0.85rem', color: '#fef9c3', marginBottom: '0.4rem', lineHeight: 1.5 }}>
                  <strong>Hướng dẫn của Kế toán:</strong> {proposal.settlement.accountantNote}
                </div>
              )}
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Thu mua vui lòng chuyển trả số tiền thừa vào tài khoản công ty và bấm nút bên dưới để tải lên biên lai chuyển khoản xác nhận hoàn tạm ứng.
              </div>
            </div>
          </div>

          {isCreatorSettlementTurn && (
            <button
              onClick={handleOpenSettlementModal}
              className="btn btn-warning"
              style={{
                gap: '0.5rem',
                backgroundColor: '#f59e0b',
                borderColor: '#d97706',
                color: '#000000',
                fontWeight: 700,
                padding: '0.65rem 1.25rem',
              }}
            >
              <Receipt size={18} />
              <span>Xác Nhận Nộp Hoàn Tạm Ứng</span>
            </button>
          )}
        </div>
      )}

      {/* [LUỒNG MỚI] Thông báo cho Giám đốc khi xem đơn tạm ứng > 10 triệu */}
      {isDirectorWatchingOverLimit && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: 'rgba(234, 179, 8, 0.12)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#fef08a',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <Crown size={20} color="#eab308" />
          <span style={{ fontSize: '0.875rem' }}>
            <strong>Thông báo thẩm quyền phê duyệt:</strong> Đơn tạm ứng có tổng số tiền là{' '}
            <strong style={{ color: '#ffffff' }}>{formatCurrency(proposal.totalAmount)}</strong> (&gt; 10.000.000 VNĐ).
            Theo quy định, quyền duyệt chi tạm ứng do <strong>Chủ tịch</strong> trực tiếp phê duyệt (Giám đốc không phê duyệt đơn này).
          </span>
        </div>
      )}

      {/* Bố cục nội dung chính */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.75rem' }}>
        {/* Cột bên trái: Chi tiết tạm ứng & Báo cáo hoàn ứng */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* [LUỒNG MỚI] Thông báo liên kết với đơn mua sắm vật tư gốc & Hợp đồng */}
          {/* [QUY TRÌNH MỚI] Thông báo liên kết Hóa Đơn Thụ Hưởng (Tra cứu 2 chiều) */}
          {proposal.beneficiaryInvoice && (
            <div
              style={{
                padding: '1rem 1.25rem',
                backgroundColor: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '8px',
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-cyan)',
                    flexShrink: 0,
                  }}
                >
                  <Receipt size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Đơn tạm ứng hợp đồng gắn với Hóa Đơn Thụ Hưởng:
                  </span>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff', marginTop: '0.15rem' }}>
                    Đơn mua sắm: <strong className="font-mono" style={{ color: 'var(--accent-cyan)' }}>{proposal.beneficiaryInvoice.proposalCode || (proposal.beneficiaryInvoice.purchaseProposal as any)?.proposalCode || 'Đơn mua sắm gốc'}</strong>
                    {proposal.beneficiaryInvoice.invoiceDate && (
                      <span style={{ marginLeft: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>
                        — Ngày HĐ: {formatDate(proposal.beneficiaryInvoice.invoiceDate)}
                      </span>
                    )}
                    {proposal.beneficiaryInvoice.invoiceAmount ? (
                      <span style={{ marginLeft: '0.75rem', color: '#86efac', fontWeight: 600, fontSize: '0.85rem' }}>
                        — Giá trị HĐ: {formatCurrency(proposal.beneficiaryInvoice.invoiceAmount)}
                      </span>
                    ) : null}
                  </div>
                  {proposal.beneficiaryInvoice.note && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {proposal.beneficiaryInvoice.note}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                  Tạm Ứng Hợp Đồng
                </span>
                {proposal.beneficiaryInvoice.purchaseProposal && (
                  <Link
                    to={`/purchase/${typeof proposal.beneficiaryInvoice.purchaseProposal === 'object' ? (proposal.beneficiaryInvoice.purchaseProposal as any)._id : proposal.beneficiaryInvoice.purchaseProposal}`}
                    className="btn btn-secondary btn-sm"
                    style={{ gap: '0.35rem' }}
                    title="Mở xem đơn mua sắm và hóa đơn gốc"
                  >
                    <ExternalLink size={14} />
                    <span>Xem Hóa Đơn & Đơn Mua Sắm (2 Chiều)</span>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* [DỮ LIỆU CŨ] Thông báo liên kết với đơn mua sắm vật tư gốc nếu không có beneficiaryInvoice */}
          {!proposal.beneficiaryInvoice && proposal.purchaseProposal && (
            <div
              style={{
                padding: '0.9rem 1.25rem',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {proposal.contractInfo?.contractNumber || proposal.purchaseProposal?.procurementExecution?.contractInfo?.contractNumber
                    ? 'Đơn tạm ứng phục vụ Hợp Đồng Kinh Tế:'
                    : 'Đơn tạm ứng khởi tạo từ Đề Xuất Mua Sắm:'}
                </span>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff', marginTop: '0.2rem' }}>
                  {proposal.contractInfo?.contractNumber
                    ? `Hợp đồng số: ${proposal.contractInfo.contractNumber}${proposal.contractInfo.partnerName ? ` — Đối tác: ${proposal.contractInfo.partnerName}` : ''}`
                    : (proposal.purchaseProposal?.procurementExecution?.contractInfo?.contractNumber
                      ? `Hợp đồng số: ${proposal.purchaseProposal.procurementExecution.contractInfo.contractNumber}${proposal.purchaseProposal.procurementExecution.contractInfo.partnerName ? ` — Đối tác: ${proposal.purchaseProposal.procurementExecution.contractInfo.partnerName}` : ''}`
                      : (proposal.purchaseProposal.proposalCode || 'Đơn mua sắm'))}
                </div>
                {proposal.purchaseProposal.proposalCode && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', marginTop: '0.15rem' }}>
                    Thuộc đơn mua sắm: {proposal.purchaseProposal.proposalCode}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {(proposal.contractInfo?.contractNumber || proposal.purchaseProposal?.procurementExecution?.contractInfo?.contractNumber) && (
                  <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                    Tạm Ứng Hợp Đồng
                  </span>
                )}
                <Link
                  to={`/purchase/${proposal.purchaseProposal._id || proposal.purchaseProposal}`}
                  className="btn btn-secondary btn-sm"
                  style={{ gap: '0.35rem' }}
                >
                  <ExternalLink size={14} />
                  <span>Xem Đơn Mua Sắm Gốc</span>
                </Link>
              </div>
            </div>
          )}

          {/* Thẻ thông tin người tạo & Tài khoản ngân hàng thụ hưởng */}
          <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1.5rem',
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
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Người Nhận Tạm Ứng</div>
                  <div style={{ fontWeight: 700, fontSize: '0.925rem' }}>{proposal.creator?.fullName}</div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                    {getRoleLabel(proposal.creator?.role)} • {proposal.department?.name}
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
                  <CreditCard size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tài Khoản Thụ Hưởng</div>
                  <div style={{ fontWeight: 700, fontSize: '0.925rem' }}>
                    {proposal.bankAccount?.bankName}: <span className="font-mono">{proposal.bankAccount?.accountNumber}</span>
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                    Chủ TK: {proposal.bankAccount?.accountHolder || proposal.creator?.fullName}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Items breakdown card */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Banknote size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1.05rem', color: '#ffffff' }}>Mục Đích Chi Tiết Tạm Ứng</h3>
              </div>
              <span className="badge badge-secondary">{proposal.items.length} mục</span>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                    <th>Nội Dung / Mục Đích Tạm Ứng</th>
                    <th style={{ textAlign: 'right', width: '200px' }}>Số Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.items.map((item) => (
                    <tr key={item._id || item.stt}>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.stt}</td>
                      <td style={{ fontWeight: 600 }}>{item.mucDich}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-cyan)' }} className="font-mono">
                        {formatCurrency(item.soTien)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tổng số tiền */}
            <div
              style={{
                marginTop: '1.25rem',
                padding: '1.25rem',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tổng Tiền Tạm Ứng</span>
                  <span className={`badge ${isOverTenMillion ? 'badge-purple' : 'badge-info'}`} style={{ fontSize: '0.675rem' }}>
                    {isOverTenMillion ? '👑 Cấp duyệt: Chủ tịch' : '👔 Cấp duyệt: Sếp (Giám đốc)'}
                  </span>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }} className="font-mono">
                  {formatCurrency(proposal.totalAmount)}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Thực Tế Đã Giải Ngân</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }} className="font-mono">
                  {formatCurrency(proposal.totalDisbursed)}
                </div>
              </div>
            </div>
          </div>

          {/* Thẻ chi tiết báo cáo hoàn tạm ứng nếu đã nộp */}
          {/* [LUỒNG MỚI] Khối hiển thị Đối Soát Hóa Đơn Mua Sắm & Quyết Toán Tạm Ứng Hợp Đồng */}
          {proposal.settlement && (proposal.settlement.submittedAt || proposal.settlement.purchaserConfirmed) ? (
            <div
              className="card"
              style={{
                border: '1.5px solid rgba(168, 85, 247, 0.35)',
                background: 'linear-gradient(180deg, rgba(168, 85, 247, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '8px',
                      backgroundColor: 'rgba(168, 85, 247, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--purple)',
                    }}
                  >
                    <Receipt size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', color: '#ffffff', margin: 0 }}>
                      Đối Soát Hóa Đơn Mua Sắm & Quyết Toán Tạm Ứng
                    </h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Căn cứ theo Giá hóa đơn thực tế và Số tiền đã tạm ứng
                    </div>
                  </div>
                </div>

                <span
                  className={`badge ${
                    proposal.settlement.type === 'surplus'
                      ? 'badge-warning'
                      : proposal.settlement.type === 'deficit'
                      ? 'badge-primary'
                      : 'badge-success'
                  }`}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                >
                  {proposal.settlement.type === 'surplus' && 'Tạm ứng dư: Yêu cầu Thu mua hoàn tạm ứng'}
                  {proposal.settlement.type === 'deficit' && 'Tạm ứng thiếu: Công ty chuyển thêm'}
                  {proposal.settlement.type === 'exact' && 'Khớp đúng 100%'}
                </span>
              </div>

              {/* Bảng 3 ô thống kê đối soát tự động */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ padding: '0.85rem 1rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Số Tiền Đã Tạm Ứng Hợp Đồng</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '0.2rem' }} className="font-mono">
                    {formatCurrency(proposal.settlement.advanceAmount || proposal.totalDisbursed || proposal.totalAmount)}
                  </div>
                </div>

                <div style={{ padding: '0.85rem 1rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Giá Của Hóa Đơn (Thực Tế)
                    {proposal.beneficiaryInvoice?.actualInvoiceDate && (
                      <span style={{ marginLeft: '0.4rem', color: 'var(--text-secondary)' }}>
                        ({formatDate(proposal.beneficiaryInvoice.actualInvoiceDate)})
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.2rem' }} className="font-mono">
                    {formatCurrency(proposal.settlement.invoiceAmount || proposal.beneficiaryInvoice?.actualInvoiceAmount || 0)}
                  </div>
                </div>

                <div
                  style={{
                    padding: '0.85rem 1rem',
                    backgroundColor:
                      proposal.settlement.type === 'surplus'
                        ? 'rgba(245, 158, 11, 0.08)'
                        : proposal.settlement.type === 'deficit'
                        ? 'rgba(16, 185, 129, 0.08)'
                        : 'rgba(99, 102, 241, 0.08)',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${
                      proposal.settlement.type === 'surplus'
                        ? 'rgba(245, 158, 11, 0.3)'
                        : proposal.settlement.type === 'deficit'
                        ? 'rgba(16, 185, 129, 0.3)'
                        : 'rgba(99, 102, 241, 0.3)'
                    }`,
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hoàn Tạm Ứng (Chênh Lệch)</div>
                  <div
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color:
                        proposal.settlement.type === 'surplus'
                          ? '#f59e0b'
                          : proposal.settlement.type === 'deficit'
                          ? 'var(--success)'
                          : 'var(--accent-cyan)',
                      marginTop: '0.2rem',
                    }}
                    className="font-mono"
                  >
                    {proposal.settlement.type === 'surplus'
                      ? `Thu mua hoàn tạm ứng (nộp lại): ${formatCurrency(proposal.settlement.amount || 0)}`
                      : proposal.settlement.type === 'deficit'
                      ? `Công ty chuyển thêm: ${formatCurrency(proposal.settlement.amount || 0)}`
                      : '0 VNĐ (Khớp đúng)'}
                  </div>
                </div>
              </div>

              {/* Thông tin xác nhận hoàn tạm ứng của Thu mua */}
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                    <CheckCircle2 size={16} color="var(--success)" />
                    <span>Thu Mua Xác Nhận Hoàn Tạm Ứng:</span>
                  </div>
                  {proposal.settlement.submittedAt && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Thời gian xác nhận: {formatDate(proposal.settlement.submittedAt)}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {proposal.settlement.purchaserConfirmType === 'refunded_surplus' && (
                    <div style={{ color: '#fef08a' }}>
                      ✓ Thu mua đã xác nhận <strong>hoàn tạm ứng (chuyển nộp lại số tiền tạm ứng dư)</strong> vào tài khoản công ty.
                    </div>
                  )}
                  {proposal.settlement.purchaserConfirmType === 'received_additional' && (
                    <div style={{ color: '#86efac' }}>
                      ✓ Thu mua đã xác nhận <strong>tạm ứng thiếu, đề nghị công ty chuyển thêm số tiền chênh lệch</strong> cho Thu mua.
                    </div>
                  )}
                  {proposal.settlement.purchaserConfirmType === 'exact_matched' && (
                    <div style={{ color: 'var(--accent-cyan)' }}>
                      ✓ Thu mua đã xác nhận <strong>đối chiếu khớp đúng số tiền</strong> giữa giá hóa đơn và số tiền tạm ứng.
                    </div>
                  )}
                  {proposal.settlement.purchaserNote && (
                    <div style={{ marginTop: '0.35rem', color: '#ffffff' }}>
                      <strong>Ghi chú:</strong> {proposal.settlement.purchaserNote}
                    </div>
                  )}
                </div>
              </div>

              {/* Khối chứng từ đính kèm (Ảnh hóa đơn mua sắm & Biên lai hoàn ứng) */}
              {proposal.settlement.attachments && proposal.settlement.attachments.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
                  <div
                    style={{
                      fontSize: '0.825rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      marginBottom: '0.65rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <Paperclip size={15} color="var(--purple)" />
                    <span>Hóa Đơn Mua Sắm & Biên Lai Xác Nhận ({proposal.settlement.attachments.length} file):</span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                      gap: '0.75rem',
                    }}
                  >
                    {proposal.settlement.attachments.map((att: any, idx: number) => {
                      const isObj = typeof att === 'object' && att !== null;
                      const fileName = isObj ? att.name : String(att);
                      const fileUrl = isObj ? att.url : '';
                      const fileSize = isObj ? att.size : 0;
                      const fileType = isObj ? att.type : '';
                      const isImage = fileType?.includes('image') || /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName);

                      return (
                        <div
                          key={idx}
                          style={{
                            padding: '0.75rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '0.5rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                            {getFileIcon(fileName, fileType)}
                            <div style={{ overflow: 'hidden', flex: 1 }}>
                              <div
                                style={{
                                  fontSize: '0.825rem',
                                  fontWeight: 600,
                                  color: '#ffffff',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={fileName}
                              >
                                {fileName}
                              </div>
                              {fileSize > 0 && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  {formatFileSize(fileSize)}
                                </div>
                              )}
                            </div>
                          </div>

                          {isImage && fileUrl && (
                            <div
                              style={{
                                width: '100%',
                                height: '90px',
                                borderRadius: 'var(--radius-sm)',
                                overflow: 'hidden',
                                backgroundColor: 'rgba(0,0,0,0.3)',
                                cursor: 'pointer',
                                position: 'relative',
                              }}
                              onClick={() => handleOpenPreview(fileName, fileUrl, fileType, proposal.settlement?.attachments, idx)}
                              title="Bấm để xem ảnh lớn"
                            >
                              <img
                                src={fileUrl}
                                alt={fileName}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                              <div
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  backgroundColor: 'rgba(0,0,0,0.35)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  opacity: 0,
                                  transition: 'opacity 0.2s',
                                  color: '#ffffff',
                                  fontSize: '0.75rem',
                                  gap: '0.3rem',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                              >
                                <Eye size={15} />
                                <span>Phóng to</span>
                              </div>
                            </div>
                          )}

                          {fileUrl && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: '0.4rem',
                                borderTop: '1px solid var(--border-subtle)',
                                paddingTop: '0.4rem',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => handleOpenPreview(fileName, fileUrl, fileType, proposal.settlement?.attachments, idx)}
                                className="btn btn-primary btn-sm"
                                style={{ fontSize: '0.725rem', padding: '0.25rem 0.6rem', gap: '0.3rem' }}
                                title="Xem trực tiếp không cần tải về"
                              >
                                <Eye size={13} />
                                <span>Xem</span>
                              </button>
                              <a
                                href={fileUrl}
                                download={fileName}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.725rem', padding: '0.25rem 0.5rem', gap: '0.25rem' }}
                                title="Tải về máy nếu cần"
                              >
                                <Download size={13} />
                                <span>Tải</span>
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Trạng thái xác nhận của Kế toán */}
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: proposal.settlement.confirmedAt ? 'rgba(16, 185, 129, 0.08)' : 'rgba(234, 179, 8, 0.08)',
                  border: `1px solid ${proposal.settlement.confirmedAt ? 'rgba(16, 185, 129, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: proposal.settlement.confirmedAt ? '#86efac' : '#fef08a' }}>
                    {proposal.settlement.confirmedAt
                      ? `✓ Kế toán đã xác nhận hoàn tất hồ sơ tạm ứng hợp đồng (${formatDate(proposal.settlement.confirmedAt)})`
                      : '⏳ Đang chờ Kế toán đối chiếu hóa đơn và xác nhận hoàn tất hồ sơ tạm ứng hợp đồng'}
                  </div>
                  {proposal.settlement.confirmedBy && (
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      Kế toán viên xác nhận: <strong>{(proposal.settlement.confirmedBy as any)?.fullName || 'Kế toán'}</strong>
                    </div>
                  )}
                </div>

                {isAccountingSettlementConfirmTurn && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={() => setIsConfirmSettlementOpen(true)} className="btn btn-success btn-sm" style={{ gap: '0.35rem' }}>
                      <FileCheck size={14} />
                      <span>Xác Nhận Hoàn Thành</span>
                    </button>
                    <button onClick={() => setIsRejectSettlementOpen(true)} className="btn btn-danger btn-sm" style={{ gap: '0.35rem' }}>
                      <XCircle size={14} />
                      <span>Từ Chối</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Khi chưa nộp hoàn tạm ứng nhưng đã giải ngân */
            (proposal.status === 'pending_settlement' || proposal.status === 'disbursed') && (
              <div
                className="card"
                style={{
                  border: '1.5px solid rgba(56, 189, 248, 0.35)',
                  backgroundColor: 'rgba(56, 189, 248, 0.05)',
                  padding: '1.25rem 1.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: 1, minWidth: '280px' }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: '8px',
                        backgroundColor: 'rgba(56, 189, 248, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-cyan)',
                        flexShrink: 0,
                      }}
                    >
                      <Receipt size={22} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#ffffff', marginBottom: '0.35rem' }}>
                        Bước Tiếp Theo: Thu Mua Gửi Hóa Đơn & Xác Nhận Hoàn Tạm Ứng
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        Kế toán đã giải ngân <strong>{formatCurrency(proposal.totalDisbursed || proposal.totalAmount)}</strong> cho Thu mua để thực hiện mua sắm.
                        Sau khi có hóa đơn từ nhà cung cấp, Thu mua vui lòng gửi thông tin hóa đơn (ngày, đơn giá, ảnh HĐ) và xác nhận chênh lệch hoàn tạm ứng để Kế toán hoàn thiện hồ sơ.
                      </div>
                    </div>
                  </div>

                  {isCreatorSettlementTurn && (
                    <button
                      onClick={handleOpenSettlementModal}
                      className="btn btn-warning"
                      style={{
                        gap: '0.45rem',
                        fontWeight: 700,
                        backgroundColor: '#f59e0b',
                        borderColor: '#d97706',
                        color: '#000000',
                      }}
                    >
                      <Receipt size={16} />
                      <span>Gửi Hóa Đơn & Xác Nhận Hoàn Tạm Ứng</span>
                    </button>
                  )}
                </div>
              </div>
            )
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
              <div style={{ fontWeight: 700, color: '#f87171', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertCircle size={16} />
                <span>Lý Do Từ Chối:</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#fca5a5', lineHeight: 1.5, marginBottom: isCreatorTurnToResubmit || (isCreatorSettlementTurn && isSettlementRejected) ? '0.75rem' : 0 }}>
                {proposal.rejectionReason}
              </div>

              {isCreatorTurnToResubmit && (
                <button
                  type="button"
                  onClick={handleOpenResubmitModal}
                  className="btn btn-warning btn-sm"
                  style={{ width: '100%', fontSize: '0.775rem', fontWeight: 700, gap: '0.35rem' }}
                >
                  <FileCheck size={14} />
                  <span>Sửa & Gửi Lại Đơn</span>
                </button>
              )}

              {isCreatorSettlementTurn && isSettlementRejected && (
                <button
                  type="button"
                  onClick={handleOpenSettlementModal}
                  className="btn btn-warning btn-sm"
                  style={{ width: '100%', fontSize: '0.775rem', fontWeight: 700, gap: '0.35rem' }}
                >
                  <Receipt size={14} />
                  <span>Làm Lại Hoàn Ứng</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 1. MODAL DUYỆT ĐỀ XUẤT TẠM ỨNG */}
      <Modal isOpen={isApproveOpen} onClose={() => setIsApproveOpen(false)} title="Duyệt Đơn Tạm Ứng">
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Bạn đồng ý duyệt đơn tạm ứng <strong>{proposal.proposalCode}</strong> số tiền{' '}
            <strong style={{ color: 'var(--accent-cyan)' }}>{formatCurrency(proposal.totalAmount)}</strong>.
          </p>
        </div>
        <div className="form-group">
          <label className="form-label">Ý kiến duyệt:</label>
          <textarea
            className="form-textarea"
            placeholder="Nhập ý kiến nếu có..."
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

      {/* 2. MODAL TỪ CHỐI ĐỀ XUẤT TẠM ỨNG */}
      <Modal isOpen={isRejectOpen} onClose={() => setIsRejectOpen(false)} title="Từ Chối Đề Xuất Tạm Ứng">
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Vui lòng nhập lý do từ chối:
          </p>
        </div>
        <div className="form-group">
          <label className="form-label">Lý do từ chối <span className="required">*</span></label>
          <textarea
            className="form-textarea"
            required
            placeholder="Lý do..."
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

      {/* 3. MODAL KẾ TOÁN GIẢI NGÂN TẠM ỨNG */}
      <Modal isOpen={isDisburseOpen} onClose={() => setIsDisburseOpen(false)} title="Kế Toán Giải Ngân Tạm Ứng">
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Kế toán xác nhận chuyển tiền tạm ứng vào tài khoản ngân hàng của người đề xuất:
          </p>
          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.85rem',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.825rem',
            }}
          >
            <div>Ngân hàng: <strong>{proposal.bankAccount?.bankName}</strong></div>
            <div>Số tài khoản: <strong className="font-mono">{proposal.bankAccount?.accountNumber}</strong></div>
            <div>Chủ tài khoản: <strong>{proposal.bankAccount?.accountHolder || proposal.creator?.fullName}</strong></div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Số tiền giải ngân (VNĐ) <span className="required">*</span></label>
          <input
            type="number"
            min="1000"
            required
            className="form-input font-mono"
            value={disburseAmount}
            onChange={(e) => setDisburseAmount(Number(e.target.value))}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Ghi chú / Số UNC:</label>
          <input
            type="text"
            className="form-input"
            placeholder="Ủy nhiệm chi số..."
            value={disburseNote}
            onChange={(e) => setDisburseNote(e.target.value)}
          />
        </div>

        <div className="modal-footer" style={{ margin: '1.5rem -1.65rem -1.65rem -1.65rem' }}>
          <button onClick={() => setIsDisburseOpen(false)} className="btn btn-secondary">Hủy</button>
          <button onClick={handleAccountingDisburse} disabled={actionLoading} className="btn btn-success">
            {actionLoading ? 'Đang giải ngân...' : 'Xác Nhận Chuyển Khoản & Mở Hoàn Ứng'}
          </button>
        </div>
      </Modal>

      {/* 4. [LUỒNG MỚI] MODAL THU MUA GỬI HÓA ĐƠN & XÁC NHẬN HOÀN TẠM ỨNG */}
      <Modal
        isOpen={isSettlementOpen}
        onClose={() => setIsSettlementOpen(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                backgroundColor: 'rgba(234, 179, 8, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#eab308',
              }}
            >
              <Receipt size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                Gửi Hóa Đơn Mua Sắm & Xác Nhận Hoàn Tạm Ứng
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Đơn tạm ứng: <strong className="font-mono" style={{ color: 'var(--accent-cyan)' }}>{proposal.proposalCode}</strong>
              </div>
            </div>
          </div>
        }
        maxWidth="760px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Tóm tắt số tiền đã được tạm ứng */}
          <div
            style={{
              padding: '0.9rem 1.25rem',
              backgroundColor: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Số Tiền Công Ty Đã Tạm Ứng Cho Thu Mua
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '0.15rem' }} className="font-mono">
                {formatCurrency(proposal.totalDisbursed > 0 ? proposal.totalDisbursed : proposal.totalAmount)}
              </div>
            </div>
            <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
              ✓ Kế toán đã chuyển tiền tạm ứng
            </span>
          </div>

          {/* Nhập thông tin Hóa Đơn Mua Sắm Thực Tế */}
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Receipt size={16} color="var(--primary)" />
              <span>1. THÔNG TIN HÓA ĐƠN MUA SẮM THỰC TẾ (TỪ NHÀ CUNG CẤP)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Ngày hóa đơn thực tế <span className="required">*</span></label>
                <input
                  type="date"
                  required
                  className="form-input"
                  value={actualInvoiceDate}
                  onChange={(e) => setActualInvoiceDate(e.target.value)}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                  Mặc định ngày hôm nay, có thể thay đổi theo ngày ghi trên HĐ
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Đơn giá / Tổng giá trị hóa đơn (VNĐ) <span className="required">*</span></label>
                <input
                  type="number"
                  min="0"
                  required
                  className="form-input font-mono"
                  style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f59e0b' }}
                  placeholder="Nhập giá trị hóa đơn..."
                  value={actualInvoiceAmount || ''}
                  onChange={(e) => setActualInvoiceAmount(Number(e.target.value))}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                  {actualInvoiceAmount > 0 ? formatCurrency(actualInvoiceAmount) : 'Nhập chính xác số tiền trên hóa đơn'}
                </span>
              </div>
            </div>

            {/* Tải ảnh / file hóa đơn VAT */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ImageIcon size={15} color="var(--accent-cyan)" />
                <span>Ảnh / Tệp Hóa Đơn VAT Mua Sắm:</span>
              </label>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1.5px dashed var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  gap: '0.3rem',
                }}
                onClick={() => {
                  const input = document.getElementById('actual-invoice-file-input') as HTMLInputElement;
                  if (input) input.click();
                }}
              >
                {actualInvoiceUploading ? (
                  <Loader2 size={24} className="animate-spin" color="var(--primary)" />
                ) : (
                  <UploadCloud size={24} color="var(--accent-cyan)" />
                )}
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff' }}>
                  {actualInvoiceUploading ? 'Đang tải tệp hóa đơn...' : 'Nhấp để chọn ảnh hóa đơn VAT / Phiếu thu'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Hỗ trợ định dạng JPG, PNG, PDF tối đa 15MB
                </div>
                <input
                  id="actual-invoice-file-input"
                  type="file"
                  multiple
                  disabled={actualInvoiceUploading}
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files) {
                      processActualInvoiceFiles(e.target.files);
                      e.target.value = '';
                    }
                  }}
                />
              </div>

              {actualInvoiceFiles.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.65rem' }}>
                  {actualInvoiceFiles.map((file, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.4rem 0.65rem',
                        backgroundColor: 'rgba(56, 189, 248, 0.08)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.75rem',
                      }}
                    >
                      <ImageIcon size={13} color="var(--accent-cyan)" />
                      <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActualInvoiceFiles((prev) => prev.filter((_, i) => i !== idx));
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 2. CHƯƠNG TRÌNH SO SÁNH GIÁ HÓA ĐƠN VỚI SỐ TIỀN ĐÃ TẠM ỨNG ĐỂ TÍNH HOÀN TẠM ỨNG */}
          {(() => {
            const advanceVal = proposal.totalDisbursed > 0 ? proposal.totalDisbursed : proposal.totalAmount;
            const invoiceVal = Number(actualInvoiceAmount) || 0;
            // Công thức: hoàn tạm ứng = số tiền tạm ứng hợp đồng - giá của hóa đơn
            const diff = advanceVal - invoiceVal;

            return (
              <div
                style={{
                  padding: '1.15rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor:
                    diff > 0
                      ? 'rgba(245, 158, 11, 0.08)'
                      : diff < 0
                      ? 'rgba(16, 185, 129, 0.08)'
                      : 'rgba(99, 102, 241, 0.08)',
                  border: `1.5px solid ${
                    diff > 0
                      ? 'rgba(245, 158, 11, 0.35)'
                      : diff < 0
                      ? 'rgba(16, 185, 129, 0.35)'
                      : 'rgba(99, 102, 241, 0.35)'
                  }`,
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Banknote size={16} color={diff > 0 ? '#f59e0b' : diff < 0 ? 'var(--success)' : 'var(--primary)'} />
                  <span>2. SO SÁNH TẠM ỨNG VÀ HÓA ĐƠN (HOÀN TẠM ỨNG = TẠM ỨNG - GIÁ HÓA ĐƠN):</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div style={{ padding: '0.65rem', backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tiền Đã Tạm Ứng Hợp Đồng</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-cyan)' }} className="font-mono">
                      {formatCurrency(advanceVal)}
                    </div>
                  </div>

                  <div style={{ padding: '0.65rem', backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Giá Của Hóa Đơn</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f59e0b' }} className="font-mono">
                      {formatCurrency(invoiceVal)}
                    </div>
                  </div>

                  <div style={{ padding: '0.65rem', backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Hoàn Tạm Ứng (Chênh Lệch)</div>
                    <div
                      style={{
                        fontSize: '0.95rem',
                        fontWeight: 800,
                        color: diff > 0 ? '#f59e0b' : diff < 0 ? 'var(--success)' : 'var(--accent-cyan)',
                      }}
                      className="font-mono"
                    >
                      {diff > 0 ? `+${formatCurrency(diff)} (Dư)` : diff < 0 ? `-${formatCurrency(Math.abs(diff))} (Thiếu)` : '0 VNĐ (Khớp)'}
                    </div>
                  </div>
                </div>

                {/* Kết luận hành động */}
                <div
                  style={{
                    padding: '0.75rem 0.9rem',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    lineHeight: 1.5,
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {diff > 0 && (
                    <div style={{ color: '#fde047' }}>
                      <strong>• Tạm ứng dư (Tạm ứng &gt; Hóa đơn):</strong> Yêu cầu Thu mua <strong>hoàn tạm ứng (nộp lại tiền thừa)</strong> số tiền{' '}
                      <strong className="font-mono" style={{ color: '#ffffff' }}>{formatCurrency(diff)}</strong> vào quỹ công ty.
                    </div>
                  )}

                  {diff < 0 && (
                    <div style={{ color: '#86efac' }}>
                      <strong>• Tạm ứng thiếu (Tạm ứng &lt; Hóa đơn):</strong> Công ty sẽ <strong>chuyển thêm cho Thu mua</strong> số tiền thiếu{' '}
                      <strong className="font-mono" style={{ color: '#ffffff' }}>{formatCurrency(Math.abs(diff))}</strong>.
                    </div>
                  )}

                  {diff === 0 && (
                    <div style={{ color: 'var(--accent-cyan)' }}>
                      <strong>• Khớp đúng 100%:</strong> Số tiền hóa đơn thực tế khớp hoàn toàn với số tiền tạm ứng hợp đồng. Không phát sinh chênh lệch thừa thiếu.
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 3. BƯỚC XÁC NHẬN HOÀN TẠM ỨNG CỦA THU MUA */}
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <CheckCircle2 size={16} color="var(--success)" />
              <span>3. THU MUA XÁC NHẬN HOÀN TẠM ỨNG (ĐÃ NHẬN / ĐÃ CHUYỂN TIỀN)</span>
            </div>

            {(() => {
              const advanceVal = proposal.totalDisbursed > 0 ? proposal.totalDisbursed : proposal.totalAmount;
              const invoiceVal = Number(actualInvoiceAmount) || 0;
              const diff = advanceVal - invoiceVal;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {diff > 0 && (
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.825rem',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#fef08a', marginBottom: '0.3rem' }}>
                        Yêu cầu Thu mua hoàn tạm ứng nộp lại tiền thừa ({formatCurrency(diff)}):
                      </div>
                      <div style={{ color: 'var(--text-secondary)', marginBottom: '0.65rem' }}>
                        Vui lòng chuyển khoản số tiền tạm ứng dư vào tài khoản công ty và tải ảnh chụp ủy nhiệm chi / biên lai chuyển khoản bên dưới để Kế toán xác nhận hoàn thành.
                      </div>

                      <div
                        style={{
                          padding: '0.75rem',
                          border: '1.5px dashed #f59e0b',
                          borderRadius: '6px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        }}
                        onClick={() => {
                          const input = document.getElementById('proof-file-input') as HTMLInputElement;
                          if (input) input.click();
                        }}
                      >
                        {proofUploading ? (
                          <Loader2 size={20} className="animate-spin" color="#f59e0b" style={{ margin: '0 auto' }} />
                        ) : (
                          <UploadCloud size={20} color="#f59e0b" style={{ margin: '0 auto' }} />
                        )}
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ffffff', marginTop: '0.2rem' }}>
                          Tải lên ảnh biên lai / UNC chuyển tiền hoàn ứng
                        </div>
                        <input
                          id="proof-file-input"
                          type="file"
                          multiple
                          disabled={proofUploading}
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            if (e.target.files) {
                              processProofFiles(e.target.files);
                              e.target.value = '';
                            }
                          }}
                        />
                      </div>

                      {purchaserConfirmProof.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                          {purchaserConfirmProof.map((f, i) => (
                            <div
                              key={i}
                              style={{
                                padding: '0.3rem 0.5rem',
                                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                                borderRadius: '4px',
                                fontSize: '0.725rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                              }}
                            >
                              <Paperclip size={12} color="#f59e0b" />
                              <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {f.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => setPurchaserConfirmProof((prev) => prev.filter((_, idx) => idx !== i))}
                                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0 }}
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {diff < 0 && (
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.825rem',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#86efac', marginBottom: '0.2rem' }}>
                        Xác nhận tạm ứng thiếu - Công ty chuyển thêm:
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        Hệ thống ghi nhận công ty sẽ chuyển thêm <strong>{formatCurrency(Math.abs(diff))}</strong> cho Thu mua. Thu mua xác nhận đề nghị chuyển khoản bổ sung vào STK đã đăng ký.
                      </div>
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Ghi chú xác nhận của Thu mua:</label>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      placeholder="Ghi chú thêm về việc hoàn tiền thừa hoặc nhận tiền thiếu..."
                      value={purchaserNote}
                      onChange={(e) => setPurchaserNote(e.target.value)}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="modal-footer" style={{ margin: '1.5rem -1.65rem -1.65rem -1.65rem' }}>
          <button onClick={() => setIsSettlementOpen(false)} className="btn btn-secondary">
            Hủy
          </button>
          <button onClick={handleSubmitSettlement} disabled={actionLoading} className="btn btn-primary" style={{ gap: '0.4rem' }}>
            {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <FileCheck size={16} />}
            <span>{actionLoading ? 'Đang gửi...' : 'Xác Nhận & Gửi Cho Kế Toán Duyệt'}</span>
          </button>
        </div>
      </Modal>

      {/* 5. [LUỒNG MỚI] MODAL KẾ TOÁN XÁC NHẬN HOÀN TẤT HỒ SƠ TẠM ỨNG HỢP ĐỒNG */}
      <Modal
        isOpen={isConfirmSettlementOpen}
        onClose={() => setIsConfirmSettlementOpen(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--success)',
              }}
            >
              <FileCheck size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                Kế Toán Xác Nhận Hoàn Thành Hồ Sơ Tạm Ứng Hợp Đồng
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Đơn: <strong className="font-mono">{proposal.proposalCode}</strong>
              </div>
            </div>
          </div>
        }
        maxWidth="720px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Kế toán rà soát chứng từ hóa đơn và xác nhận hoàn thành hồ sơ tạm ứng hợp đồng:
          </p>

          {/* Bảng đối soát trong modal kế toán xác nhận */}
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontSize: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Số tiền đã tạm ứng hợp đồng:</span>
              <strong className="font-mono" style={{ color: 'var(--accent-cyan)' }}>
                {formatCurrency(proposal.settlement?.advanceAmount || proposal.totalDisbursed || proposal.totalAmount)}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Giá của hóa đơn thực tế:</span>
              <strong className="font-mono" style={{ color: '#f59e0b' }}>
                {formatCurrency(proposal.settlement?.invoiceAmount || proposal.beneficiaryInvoice?.actualInvoiceAmount || proposal.beneficiaryInvoice?.invoiceAmount || 0)}
              </strong>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '0.5rem',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontWeight: 700, color: '#ffffff' }}>Kết quả đối soát (hoàn tạm ứng):</span>
              <span className={`badge ${proposal.settlement?.type === 'surplus' ? 'badge-warning' : proposal.settlement?.type === 'deficit' ? 'badge-primary' : 'badge-success'}`}>
                {proposal.settlement?.type === 'surplus' && `Tạm ứng dư (Thu mua nộp lại): ${formatCurrency(proposal.settlement?.amount || 0)}`}
                {proposal.settlement?.type === 'deficit' && `Tạm ứng thiếu (Công ty chuyển thêm): ${formatCurrency(proposal.settlement?.amount || 0)}`}
                {proposal.settlement?.type === 'exact' && 'Khớp đúng 100%'}
              </span>
            </div>

            {proposal.settlement?.purchaserNote && (
              <div style={{ paddingTop: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                <strong>Ghi chú của Thu mua:</strong> {proposal.settlement.purchaserNote}
              </div>
            )}
          </div>

          {/* Danh sách chứng từ đính kèm (hóa đơn & biên lai) */}
          {proposal.settlement?.attachments && proposal.settlement.attachments.length > 0 && (
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Paperclip size={14} color="var(--primary)" />
                <span>Hóa Đơn & Chứng Từ Biên Lai Xác Nhận ({proposal.settlement.attachments.length} file):</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto' }}>
                {proposal.settlement.attachments.map((att: any, idx: number) => {
                  const isObj = typeof att === 'object' && att !== null;
                  const fileName = isObj ? att.name : String(att);
                  const fileUrl = isObj ? att.url : '';
                  const fileSize = isObj ? att.size : 0;
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                        {getFileIcon(fileName, isObj ? att.type : undefined)}
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                          {fileName}
                        </span>
                        {fileSize > 0 && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>({formatFileSize(fileSize)})</span>
                        )}
                      </div>
                      {fileUrl && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(fileName, fileUrl, isObj ? att.type : undefined)}
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: '0.725rem', padding: '0.2rem 0.5rem', gap: '0.25rem' }}
                          >
                            <Eye size={12} />
                            <span>Xem</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Ý kiến xác nhận của Kế toán:</label>
            <textarea
              className="form-textarea"
              placeholder="Đã kiểm tra hóa đơn và xác nhận khớp chứng từ hoàn tạm ứng hợp đồng..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer" style={{ margin: '1.5rem -1.65rem -1.65rem -1.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button onClick={() => setIsConfirmSettlementOpen(false)} className="btn btn-secondary">
            Đóng
          </button>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setIsConfirmSettlementOpen(false);
                setIsRejectSettlementOpen(true);
              }}
              className="btn btn-danger"
              style={{ gap: '0.35rem' }}
            >
              <XCircle size={15} />
              <span>Từ Chối (Yêu Cầu Làm Lại)</span>
            </button>
            <button onClick={handleConfirmSettlement} disabled={actionLoading} className="btn btn-success" style={{ gap: '0.4rem', fontWeight: 700 }}>
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <FileCheck size={16} />}
              <span>{actionLoading ? 'Đang xác nhận...' : 'Xác Nhận Hoàn Thành'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* 7. MODAL CHỈNH SỬA VÀ GỬI LẠI ĐƠN TẠM ỨNG (KHI BỊ TỪ CHỐI) */}
      <Modal
        isOpen={isResubmitOpen}
        onClose={() => setIsResubmitOpen(false)}
        title="Chỉnh Sửa & Gửi Lại Đơn Tạm Ứng"
        maxWidth="750px"
      >
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Đơn của bạn đã được chuyển trả về để chỉnh sửa. Vui lòng rà soát lại thông tin tài khoản hoặc mục đích, số tiền tạm ứng rồi gửi lại để tiếp tục quy trình duyệt.
          </p>
          {proposal.rejectionReason && (
            <div
              style={{
                marginTop: '0.75rem',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.825rem',
                color: '#f87171',
              }}
            >
              <strong>Lý do từ chối trước đó:</strong> {proposal.rejectionReason}
            </div>
          )}
        </div>

        {/* Thông tin tài khoản thụ hưởng */}
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CreditCard size={16} color="var(--accent-cyan)" />
            <span>Thông Tin Tài Khoản Nhận Tạm Ứng</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.775rem' }}>Tên Ngân Hàng <span className="required">*</span></label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: MB Bank, Vietcombank..."
                value={resubmitBankAccount.bankName}
                onChange={(e) => setResubmitBankAccount({ ...resubmitBankAccount, bankName: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.775rem' }}>Số Tài Khoản <span className="required">*</span></label>
              <input
                type="text"
                className="form-input font-mono"
                placeholder="VD: 0987654321"
                value={resubmitBankAccount.accountNumber}
                onChange={(e) => setResubmitBankAccount({ ...resubmitBankAccount, accountNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.775rem' }}>Chủ Tài Khoản</label>
              <input
                type="text"
                className="form-input"
                placeholder="Tên chủ tài khoản..."
                value={resubmitBankAccount.accountHolder}
                onChange={(e) => setResubmitBankAccount({ ...resubmitBankAccount, accountHolder: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Danh sách mục chi tạm ứng */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Banknote size={16} color="var(--primary)" />
              <span>Nội Dung / Mục Đích Tạm Ứng Chi Tiết</span>
            </div>
            <button
              type="button"
              onClick={handleAddResubmitItem}
              className="btn btn-secondary btn-sm"
              style={{ gap: '0.35rem', fontSize: '0.75rem' }}
            >
              <Plus size={14} />
              <span>Thêm Dòng</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {resubmitItems.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 180px 36px',
                  gap: '0.5rem',
                  alignItems: 'center',
                }}
              >
                <div style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  #{idx + 1}
                </div>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Mục đích tạm ứng..."
                  value={item.mucDich}
                  onChange={(e) => handleUpdateResubmitItem(idx, 'mucDich', e.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  className="form-input font-mono"
                  placeholder="Số tiền..."
                  value={item.soTien || ''}
                  onChange={(e) => handleUpdateResubmitItem(idx, 'soTien', Number(e.target.value))}
                />
                <button
                  type="button"
                  disabled={resubmitItems.length === 1}
                  onClick={() => handleRemoveResubmitItem(idx)}
                  className="btn btn-ghost btn-sm"
                  style={{ color: resubmitItems.length === 1 ? 'var(--text-muted)' : 'var(--danger)', padding: '0.35rem' }}
                  title="Xóa dòng này"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Tổng tiền và cấp duyệt dự kiến */}
          <div
            style={{
              marginTop: '1rem',
              padding: '0.85rem 1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cấp phê duyệt theo số tiền mới:</span>
              <div style={{ marginTop: '0.2rem' }}>
                <span className={`badge ${isResubmitOverTenMillion ? 'badge-purple' : 'badge-info'}`}>
                  {isResubmitOverTenMillion ? '👑 Đơn > 10 triệu: Chủ tịch duyệt' : '👔 Đơn ≤ 10 triệu: Sếp (Giám đốc) duyệt'}
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tổng Tiền Mới:</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-cyan)' }} className="font-mono">
                {formatCurrency(resubmitTotalAmount)}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ margin: '1.5rem -1.65rem -1.65rem -1.65rem' }}>
          <button onClick={() => setIsResubmitOpen(false)} className="btn btn-secondary">Hủy</button>
          <button onClick={handleResubmit} disabled={actionLoading} className="btn btn-primary" style={{ gap: '0.4rem' }}>
            <FileCheck size={16} />
            <span>{actionLoading ? 'Đang gửi lại...' : 'Xác Nhận & Gửi Lại Đơn Tạm Ứng'}</span>
          </button>
        </div>
      </Modal>

      {/* 8. MODAL KẾ TOÁN TỪ CHỐI HOÀN TẠM ỨNG */}
      <Modal
        isOpen={isRejectSettlementOpen}
        onClose={() => setIsRejectSettlementOpen(false)}
        title="Từ Chối Chứng Từ Hoàn Tạm Ứng"
      >
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Kế toán từ chối hồ sơ hoàn tạm ứng và yêu cầu người tạo chỉnh sửa/bổ sung chứng từ làm lại:
          </p>
        </div>
        <div className="form-group">
          <label className="form-label">Lý do từ chối & Yêu cầu làm lại <span className="required">*</span></label>
          <textarea
            className="form-textarea"
            required
            rows={4}
            placeholder="VD: Hóa đơn chưa có thuế VAT hợp lệ / Số tiền thừa thực nộp thiếu 200.000đ, vui lòng kiểm tra và gửi lại..."
            value={rejectSettlementReason}
            onChange={(e) => setRejectSettlementReason(e.target.value)}
          />
        </div>
        <div className="modal-footer" style={{ margin: '1.5rem -1.65rem -1.65rem -1.65rem' }}>
          <button onClick={() => setIsRejectSettlementOpen(false)} className="btn btn-secondary">Hủy</button>
          <button
            onClick={handleRejectSettlement}
            disabled={actionLoading || !rejectSettlementReason.trim()}
            className="btn btn-danger"
          >
            {actionLoading ? 'Đang xử lý...' : 'Xác Nhận Từ Chối & Yêu Cầu Làm Lại'}
          </button>
        </div>
      </Modal>

      {/* 6. MODAL XEM TRỰC TIẾP TÀI LIỆU / ẢNH CHỨNG TỪ */}
      <Modal
        isOpen={!!previewAttachment}
        onClose={() => setPreviewAttachment(null)}
        title={`Xem Tài Liệu: ${previewAttachment?.name || ''}`}
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
                  {getFileIcon(previewAttachment.name, previewAttachment.type)}
                </div>
                <h4 style={{ color: '#ffffff', marginBottom: '0.5rem' }}>{previewAttachment.name}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Định dạng này (Excel/Word) cần mở bằng phần mềm chuyên dụng hoặc tải về máy để xem chi tiết.
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

            {/* Các nút thao tác dưới chân modal */}
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

      {/* MODAL POPUP XÁC NHẬN GIẢI NGÂN THÀNH CÔNG */}
      <Modal
        isOpen={isDisburseSuccessOpen}
        onClose={() => setIsDisburseSuccessOpen(false)}
        title="Giải Ngân Tạm Ứng Thành Công"
        maxWidth="500px"
      >
        <div style={{ textAlign: 'center', padding: '1rem 0.5rem 0.5rem 0.5rem' }}>
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
              color: 'var(--success)',
              boxShadow: '0 0 30px rgba(16, 185, 129, 0.25)',
            }}
          >
            <CheckCircle2 size={40} />
          </div>

          <h3 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '0.4rem', fontWeight: 700 }}>
            Giải Ngân Tạm Ứng Thành Công!
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Khoản tiền tạm ứng đã được xác nhận chuyển khoản cho nhân viên yêu cầu.
          </p>

          {disburseSuccessInfo && (
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                textAlign: 'left',
                marginBottom: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mã Đề Xuất:</span>
                <span className="font-mono" style={{ fontWeight: 700, color: '#ffffff' }}>
                  {disburseSuccessInfo.code}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Số Tiền Tạm Ứng:</span>
                <span className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--success)' }}>
                  {formatCurrency(disburseSuccessInfo.amount)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Người Nhận Tiền:</span>
                <span style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.875rem' }}>
                  {disburseSuccessInfo.beneficiaryName}
                </span>
              </div>
              {disburseSuccessInfo.accountNumber && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tài Khoản / Ngân Hàng:</span>
                  <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {disburseSuccessInfo.accountNumber} ({disburseSuccessInfo.bankName})
                  </span>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => setIsDisburseSuccessOpen(false)}
              className="btn btn-primary"
              style={{ minWidth: '140px', padding: '0.65rem 1.75rem', fontWeight: 600 }}
            >
              Hoàn Tất
            </button>
          </div>
        </div>
      </Modal>

      {/* [QUY TRÌNH MỚI] MODAL KẾ TOÁN LẬP ĐỀ XUẤT HOÀN TẠM ỨNG ĐỐI VỚI SỐ TIỀN CHÊNH LỆCH */}
      <Modal
        isOpen={isRequestSettlementOpen}
        onClose={() => setIsRequestSettlementOpen(false)}
        title="Lập Đề Xuất Hoàn Tạm Ứng Số Tiền Chênh Lệch"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'rgba(234, 179, 8, 0.1)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Số tiền đã tạm ứng:</span>
              <strong className="font-mono" style={{ color: 'var(--accent-cyan)' }}>
                {formatCurrency(advTotal)}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Giá của hóa đơn thực tế:</span>
              <strong className="font-mono" style={{ color: '#86efac' }}>
                {formatCurrency(actualInvAmount)}
              </strong>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '0.5rem',
                borderTop: '1px dashed rgba(234, 179, 8, 0.3)',
                marginTop: '0.4rem',
              }}
            >
              <span style={{ fontWeight: 700, color: '#fef08a' }}>Số tiền chênh lệch đề xuất hoàn ứng:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b' }} className="font-mono">
                {formatCurrency(diffAdv)}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>
              Ghi chú / Hướng dẫn hoàn tiền gửi cho Thu mua:
            </label>
            <textarea
              className="form-textarea"
              placeholder="Nhập thông tin hướng dẫn chuyển trả tiền thừa vào tài khoản công ty..."
              value={requestSettlementNote}
              onChange={(e) => setRequestSettlementNote(e.target.value)}
              rows={3}
            />
          </div>

          <div className="modal-footer" style={{ margin: '0.5rem -1.65rem -1.65rem -1.65rem' }}>
            <button
              type="button"
              onClick={() => setIsRequestSettlementOpen(false)}
              className="btn btn-secondary"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleRequestSettlement}
              disabled={actionLoading}
              className="btn btn-warning"
              style={{ gap: '0.4rem', backgroundColor: '#f59e0b', color: '#000000', fontWeight: 700 }}
            >
              <Receipt size={16} />
              <span>{actionLoading ? 'Đang gửi...' : 'Gửi Đề Xuất Cho Thu Mua'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL XEM TRƯỚC VÀ IN BIỂU MẪU GIẤY ĐỀ NGHỊ TẠM ỨNG */}
      <AdvancePrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        proposal={proposal}
      />

      {/* MODAL XEM TRƯỚC VÀ KIỂM TRA CHỨNG TỪ HOÀN ỨNG / HÓA ĐƠN */}
      <FilePreviewModal
        isOpen={!!previewAttachment}
        onClose={() => setPreviewAttachment(null)}
        file={previewAttachment}
        files={previewFileList}
        initialIndex={previewFileIndex}
        title="Kiểm Tra Chứng Từ Quyết Toán Hoàn Ứng"
      />
    </div>
  );
};
