import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { purchaseProposalService, uploadService, paymentProposalService, advanceProposalService } from '../../services';
import { PurchaseProposal, PaymentProposal, AdvanceProposal } from '../../models';
import { StatusBadge, ApprovalFlowTracker, Modal, PurchasePrintModal, PaymentPrintModal, InvoiceDetailModal, WebReferenceModal, FilePreviewModal, PreviewFileItem, Pagination } from '../../component';
import { formatCurrency, formatDate, getRoleLabel } from '../../utils/formatters';
import {
  createLocalAttachments,
  uploadPendingLocalAttachments,
  revokeLocalAttachment,
  generatePriceProofCanvas,
  LocalAttachment,
} from '../../utils/clientAttachmentHelper';
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
  ShoppingBag,
  Crown,
  Camera,
  Monitor,
  Receipt,
  Banknote,
  Calculator,
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
  // [LUỒNG MỚI] Modal thực hiện mua sắm sau khi GĐ duyệt
  const [isProcurementExecutionOpen, setIsProcurementExecutionOpen] = useState(false);
  const [isAccountingOpen, setIsAccountingOpen] = useState(false);
  const [isFinalApproveOpen, setIsFinalApproveOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  // [LUỒNG MỚI] Modal nộp lại đơn khi bị Trưởng phòng từ chối (giữ nguyên mã đơn cũ)
  const [isResubmitOpen, setIsResubmitOpen] = useState(false);
  const [resubmitItems, setResubmitItems] = useState<any[]>([]);
  const [resubmitReason, setResubmitReason] = useState('');
  const [resubmitAttachments, setResubmitAttachments] = useState<LocalAttachment[]>([]);
  const [resubmitUploading, setResubmitUploading] = useState(false);

  // Quản lý dữ liệu nhập liệu trong các Modal
  const [comment, setComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [procurementPrices, setProcurementPrices] = useState<Record<string, number>>({});
  const [actionLoading, setActionLoading] = useState(false);

  // [LUỒNG MỚI] Văn bản giải trình lý do chọn NCC / giá tối ưu của Thu mua
  const [priceJustification, setPriceJustification] = useState('');

  // [LUỒNG MỚI] Dữ liệu thực hiện mua sắm của Thu mua (Lưu cục bộ ở client, bấm gửi mới upload lên server)
  const [executionActionType, setExecutionActionType] = useState<'advance' | 'invoice' | 'contract'>('invoice');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceAmount, setInvoiceAmount] = useState<number>(0);
  const [invoiceFiles, setInvoiceFiles] = useState<LocalAttachment[]>([]);
  const [contractNumber, setContractNumber] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [contractFiles, setContractFiles] = useState<LocalAttachment[]>([]);
  // [LUỒNG MỚI] Đính kèm đơn tạm ứng hợp đồng gắn với hóa đơn
  const [selectedAdvanceProposalId, setSelectedAdvanceProposalId] = useState<string>('');
  const [relatedAdvanceProposals, setRelatedAdvanceProposals] = useState<AdvanceProposal[]>([]);
  const [loadingAdvanceList, setLoadingAdvanceList] = useState(false);
  // [QUY TRÌNH MỚI] Kế toán lập đề xuất hoàn tạm ứng khi tạm ứng > hóa đơn, hoặc xác nhận hoàn thành khi vừa đủ
  const [isRequestSettlementOpen, setIsRequestSettlementOpen] = useState(false);
  const [requestSettlementNote, setRequestSettlementNote] = useState('');
  const [isConfirmExactOpen, setIsConfirmExactOpen] = useState(false);
  const [confirmExactComment, setConfirmExactComment] = useState('');
  const [isConfirmSettlementSubmittedOpen, setIsConfirmSettlementSubmittedOpen] = useState(false);
  const [confirmSettlementComment, setConfirmSettlementComment] = useState('');
  // [LUỒNG MỚI] Trạng thái tải lên tệp/ảnh hóa đơn và hợp đồng để kế toán kiểm chứng
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [uploadingContract, setUploadingContract] = useState(false);
  // [QUY TRÌNH MỚI] Trạng thái xác nhận đã được nhận tiền tạm ứng trước đó độc lập
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [advanceNote, setAdvanceNote] = useState('');

  // [LUỒNG MỚI] Phê duyệt / từ chối chi đề xuất thanh toán trực tiếp từ trang chi tiết mua sắm
  const [selectedPaymentForApproval, setSelectedPaymentForApproval] = useState<PaymentProposal | null>(null);
  const [isPaymentApproveOpen, setIsPaymentApproveOpen] = useState(false);
  const [isPaymentRejectOpen, setIsPaymentRejectOpen] = useState(false);
  const [paymentComment, setPaymentComment] = useState('');
  const [paymentRejectReason, setPaymentRejectReason] = useState('');

  // Quản lý 2 tùy chọn khảo giá: Dùng AI ('ai') hoặc Nhập thủ công ('manual')
  const [pricingMethod, setPricingMethod] = useState<'ai' | 'manual'>('manual');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  // [LUỒNG MỚI] Quản lý trạng thái quota/token của API AI
  const [aiQuotaExceeded, setAiQuotaExceeded] = useState(false);
  const [aiErrorMsg, setAiErrorMsg] = useState('');
  const [selectedSuppliers, setSelectedSuppliers] = useState<Record<string, { name: string; price: number; note?: string }>>({});
  // [TỐI ƯU CƠ CHẾ GỬI ẢNH] quotationAttachments lưu cục bộ ở máy khách, khi bấm Gửi mới upload lên máy chủ
  const [quotationAttachments, setQuotationAttachments] = useState<LocalAttachment[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<PreviewFileItem | null>(null);
  const [previewFileList, setPreviewFileList] = useState<PreviewFileItem[]>([]);
  const [previewFileIndex, setPreviewFileIndex] = useState(0);

  const handlePreviewFile = (fileItem: PreviewFileItem, list?: PreviewFileItem[], index?: number) => {
    setPreviewAttachment(fileItem);
    if (list && list.length > 0) {
      setPreviewFileList(list);
      setPreviewFileIndex(index !== undefined ? index : list.findIndex((f) => f.url === fileItem.url));
    } else {
      setPreviewFileList([fileItem]);
      setPreviewFileIndex(0);
    }
  };

  // [MỚI] Popup xem trang web nhà cung cấp và chụp giữ ảnh chứng từ khảo giá kèm ngày giờ & mức giá
  const [webPreviewModal, setWebPreviewModal] = useState<{
    isOpen: boolean;
    url: string;
    supplierName: string;
    price: number;
    itemName: string;
    itemQuantity: number;
    itemId: string;
  } | null>(null);

  // Danh sách các đề xuất thanh toán liên kết với đơn vật tư này (quản lý tại /payment)
  const [paymentProposals, setPaymentProposals] = useState<PaymentProposal[]>([]);

  // [MỚI] Quản lý phân trang cho bảng danh sách vật tư yêu cầu
  const [itemsPage, setItemsPage] = useState(1);
  const [itemsPageSize, setItemsPageSize] = useState(10);

  // [MỚI] Quản lý phân trang cho bảng đề xuất thanh toán liên kết
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsPageSize, setPaymentsPageSize] = useState(5);

  // [MỚI] Modal xem nhanh chi tiết hóa đơn / đề xuất thanh toán khi bấm vào bất kỳ dòng nào
  const [viewingPayment, setViewingPayment] = useState<PaymentProposal | null>(null);
  // [MỚI] Modal in phiếu đề xuất thanh toán / hóa đơn dạng PDF
  const [printPayment, setPrintPayment] = useState<PaymentProposal | null>(null);

  const fetchProposal = useCallback(async (propId: string) => {
    setLoading(true);
    try {
      const data = await purchaseProposalService.getById(propId);
      setProposal(data);
      // Tự động điền đơn giá thực tế nếu đã được khảo sát
      const initialPrices: Record<string, number> = {};
      data.items.forEach((item) => {
        if (item._id) {
          initialPrices[item._id] = Number(item.donGiaThucTe || item.donGiaDuKien || 0);
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

      // [QUY TRÌNH MỚI] Lấy danh sách đơn tạm ứng để có thể đính kèm vào hóa đơn đề xuất thanh toán
      try {
        setLoadingAdvanceList(true);
        const advances = await advanceProposalService.getAll();
        const related = advances.filter((adv: any) => {
          const advPpId = typeof adv.purchaseProposal === 'object' ? adv.purchaseProposal?._id : adv.purchaseProposal;
          const benPpId = typeof adv.beneficiaryInvoice?.purchaseProposal === 'object' ? adv.beneficiaryInvoice?.purchaseProposal?._id : adv.beneficiaryInvoice?.purchaseProposal;
          return advPpId === propId || benPpId === propId;
        });
        setRelatedAdvanceProposals(related.length > 0 ? related : advances);
      } catch (aErr) {
        console.error('Không thể tải danh sách đơn tạm ứng:', aErr);
      } finally {
        setLoadingAdvanceList(false);
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

  // Hàm kích hoạt AI tra cứu nhà cung cấp và so sánh giá (Tùy chọn on-demand)
  const handleFetchAISuggestions = async () => {
    if (!proposal) return;
    setAiLoading(true);
    setAiErrorMsg('');
    try {
      const suggestions = await purchaseProposalService.getAIPricingSuggestions(proposal._id);
      setAiSuggestions(suggestions);

      // Tự động chọn nhà cung cấp tối ưu nhất (isBestChoice) ban đầu nếu mục đó chưa được chọn
      const autoSelected = { ...selectedSuppliers };
      const autoPrices = { ...procurementPrices };

      suggestions.forEach((itemSug: any) => {
        const best = itemSug.suppliers.find((s: any) => s.isBestChoice) || itemSug.suppliers[0];
        if (best && !autoSelected[itemSug.itemId]) {
          const p = Number(best.price) || 0;
          autoSelected[itemSug.itemId] = {
            name: best.name,
            price: p,
            note: best.note,
          };
          autoPrices[itemSug.itemId] = p;
        }
      });

      setSelectedSuppliers(autoSelected);
      setProcurementPrices(autoPrices);
      setAiQuotaExceeded(false);
    } catch (err: any) {
      const errMsg = String(err.message || '').toLowerCase();
      if (
        errMsg.includes('quota') ||
        errMsg.includes('token') ||
        errMsg.includes('429') ||
        errMsg.includes('resource_exhausted') ||
        errMsg.includes('hạn mức') ||
        errMsg.includes('rate limit')
      ) {
        setAiQuotaExceeded(true);
        setAiErrorMsg('Hạn mức API AI (Quota/Token) tạm thời không khả dụng. Bạn có thể tự điền giá và đính kèm báo giá từ các nguồn khác.');
      } else {
        alert(err.message || 'Không thể tra cứu giá bằng AI lúc này');
      }
    } finally {
      setAiLoading(false);
    }
  };

  // [LUỒNG MỚI] Helper tự động lấy đơn giá hiện tại của vật tư từ mọi nguồn (AI, nhập tay hoặc đã lưu)
  const getPriceForItem = (item: any) => {
    if (!item) return 0;
    const idStr = String(item._id || '');
    if (procurementPrices[idStr] !== undefined && procurementPrices[idStr] !== null && Number(procurementPrices[idStr]) > 0) {
      return Number(procurementPrices[idStr]);
    }
    if (item._id && procurementPrices[item._id] !== undefined && procurementPrices[item._id] !== null && Number(procurementPrices[item._id]) > 0) {
      return Number(procurementPrices[item._id]);
    }
    return Number(item.donGiaThucTe) || 0;
  };

  // Người dùng chọn nhà cung cấp nào -> Tự động điền đơn giá thực tế của nhà cung cấp đó
  const handleSelectSupplier = (itemId: string, supplier: any) => {
    const rawPrice = Number(supplier.price) || 0;
    const idStr = String(itemId);
    setSelectedSuppliers((prev) => ({
      ...prev,
      [idStr]: {
        name: supplier.name,
        price: rawPrice,
        note: supplier.note || (supplier.url ? `Nguồn: ${supplier.url}` : ''),
      },
      [itemId]: {
        name: supplier.name,
        price: rawPrice,
        note: supplier.note || (supplier.url ? `Nguồn: ${supplier.url}` : ''),
      },
    }));
    setProcurementPrices((prev) => ({
      ...prev,
      [idStr]: rawPrice,
      [itemId]: rawPrice,
    }));
  };

  // Trạng thái đang tải tệp lên ổ cứng máy chủ
  const [fileUploading, setFileUploading] = useState(false);

  // [TỐI ƯU GỬI ẢNH] Lưu file chứng từ / báo giá cục bộ ở máy khách, khi bấm Gửi mới upload lên máy chủ
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    const { attachments: localFiles, oversizedCount } = createLocalAttachments(files);
    if (oversizedCount > 0) {
      alert(`Một số tệp vượt quá dung lượng tối đa 15MB đã bị bỏ qua.`);
    }

    setQuotationAttachments((prev) => [...prev, ...localFiles]);
    e.target.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setQuotationAttachments((prev) => {
      const target = prev[index];
      if (target) revokeLocalAttachment(target);
      return prev.filter((_, idx) => idx !== index);
    });
  };

  // [MỚI] Xử lý khi giữ ảnh chứng từ khảo giá từ Popup Web hoặc nút chụp nhanh
  const handleProofCaptured = (
    attachment: LocalAttachment,
    chosenPrice: number,
    suppName: string,
    targetItemId?: string
  ) => {
    setQuotationAttachments((prev) => [...prev, attachment]);
    const idToUpdate = targetItemId || webPreviewModal?.itemId;
    if (idToUpdate) {
      setSelectedSuppliers((prev) => ({
        ...prev,
        [idToUpdate]: { name: suppName, price: chosenPrice, note: `Khảo giá từ ${suppName}` },
      }));
      setProcurementPrices((prev) => ({
        ...prev,
        [idToUpdate]: chosenPrice,
      }));
    }
  };

  const handleProcurementSubmit = async () => {
    if (!proposal) return;
    if (!priceJustification.trim()) {
      alert('Vui lòng nhập văn bản giải trình lý do chọn mức giá / nhà cung cấp tối ưu');
      return;
    }

    // [LUỒNG MỚI] Kiểm tra từng dòng vật tư: bắt buộc phải có đơn giá khảo sát hợp lệ (> 0 VNĐ)
    for (let i = 0; i < proposal.items.length; i++) {
      const it = proposal.items[i];
      const p = getPriceForItem(it);
      if (p <= 0) {
        alert(`Vui lòng nhập hoặc chọn đơn giá hợp lệ (> 0 VNĐ) cho vật tư #${i + 1}: "${it.tenVatTu}"`);
        return;
      }
    }

    setActionLoading(true);
    try {
      // [TỐI ƯU CƠ CHẾ GỬI ẢNH] Chỉ khi người dùng bấm gửi mới tải các ảnh/chứng từ cục bộ lên server
      const serverQuotations = await uploadPendingLocalAttachments(quotationAttachments);

      // [LUỒNG MỚI] Tự động tổng hợp báo giá từ cả AI hoặc nhập tay từ các nguồn (loại bỏ hoàn toàn NaN)
      const itemsPayload = proposal.items.map((item, idx) => {
        const idStr = String(item._id || '');
        const itemSug = aiSuggestions.find((s: any) => String(s.itemId) === idStr);
        const chosenPrice = getPriceForItem(item);
        const suppInfo = selectedSuppliers[idStr] || selectedSuppliers[item._id!];
        const chosenSuppName = suppInfo?.name || item.nhaCungCap || 'Nhà cung cấp đã khảo sát';

        const supplierQuotes = itemSug?.suppliers && itemSug.suppliers.length > 0
          ? itemSug.suppliers.map((supp: any) => ({
            nccName: supp.name,
            donGia: Number(supp.price) || 0,
            url: supp.url || '',
            ghiChu: supp.note || '',
            isChosen: chosenSuppName === supp.name,
          }))
          : [{
            nccName: chosenSuppName,
            donGia: chosenPrice,
            ghiChu: suppInfo?.note || '',
            isChosen: true,
          }];

        return {
          _id: item._id,
          stt: item.stt || idx + 1,
          soLuong: Number(item.soLuong) || 1,
          donGiaThucTe: chosenPrice,
          nhaCungCap: chosenSuppName,
          ghiChuNhaCungCap: suppInfo?.note || '',
          supplierQuotes,
        };
      });

      // [LUỒNG MỚI] Gửi thêm priceJustification và serverQuotations lên Giám đốc
      await purchaseProposalService.submitProcurement(
        proposal._id,
        itemsPayload,
        pricingMethod,
        serverQuotations,
        priceJustification
      );
      setIsProcurementOpen(false);
      fetchProposal(proposal._id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // [QUY TRÌNH MỚI] Bước 4: Thu mua đề xuất thanh toán cho kế toán duyệt:
  // Bỏ hợp đồng, chỉ nộp thông tin hóa đơn (ngày, giá hóa đơn, ảnh minh chứng) và đính kèm tạm ứng hợp đồng
  const handleProcurementExecutionSubmit = async () => {
    if (!proposal) return;

    if (!invoiceDate) {
      alert('Vui lòng chọn ngày hóa đơn (mặc định là ngày làm hôm nay)');
      return;
    }

    const effectiveInvoiceAmount = Number(invoiceAmount) || 0;
    if (effectiveInvoiceAmount <= 0 && invoiceFiles.length === 0) {
      alert('Vui lòng nhập giá của hóa đơn hoặc tải tệp/ảnh minh chứng hóa đơn thanh toán');
      return;
    }

    setActionLoading(true);
    try {
      // Tải toàn bộ ảnh hóa đơn đang lưu cục bộ lên server
      const serverInvoices = await uploadPendingLocalAttachments(invoiceFiles);

      // Tìm thông tin đơn tạm ứng được đính kèm (nếu có)
      const selectedAdv = relatedAdvanceProposals.find((a) => a._id === selectedAdvanceProposalId);
      const hasAdvance = Boolean(selectedAdvanceProposalId || isAdvanced);
      const effectiveAdvAmount = selectedAdv ? selectedAdv.totalAmount : (Number(advanceAmount) || 0);
      const effectiveAdvNote = selectedAdv ? selectedAdv.proposalCode : (advanceNote || '');

      await purchaseProposalService.submitProcurementExecution(proposal._id, {
        actionType: 'invoice',
        invoiceInfo: {
          invoiceNumber: '',
          invoiceDate: new Date(invoiceDate),
          invoiceAmount: effectiveInvoiceAmount,
          files: serverInvoices,
        },
        contractInfo: undefined,
        isAdvanced: hasAdvance,
        advanceAmount: effectiveAdvAmount,
        advanceNote: effectiveAdvNote,
        advanceProposalId: selectedAdvanceProposalId || null,
      });

      // Dọn dẹp form sau khi nộp thành công
      setIsProcurementExecutionOpen(false);
      setInvoiceNumber('');
      setInvoiceDate(new Date().toISOString().slice(0, 10));
      setInvoiceAmount(0);
      setInvoiceFiles([]);
      setSelectedAdvanceProposalId('');
      setIsAdvanced(false);
      setAdvanceAmount(0);
      setAdvanceNote('');
      fetchProposal(proposal._id);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi nộp hồ sơ hóa đơn đề xuất thanh toán');
    } finally {
      setActionLoading(false);
    }
  };

  // [LUỒNG MỚI] Xử lý duyệt chi hoặc từ chối duyệt chi đề xuất thanh toán trực tiếp từ trang chi tiết mua sắm
  const handleApprovePayment = async () => {
    if (!selectedPaymentForApproval) return;
    setActionLoading(true);
    try {
      await paymentProposalService.approve(selectedPaymentForApproval._id, paymentComment);
      setIsPaymentApproveOpen(false);
      setPaymentComment('');
      setSelectedPaymentForApproval(null);
      if (id) fetchProposal(id);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi phê duyệt chi');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!selectedPaymentForApproval || !paymentRejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }
    setActionLoading(true);
    try {
      await paymentProposalService.reject(selectedPaymentForApproval._id, paymentRejectReason);
      setIsPaymentRejectOpen(false);
      setPaymentRejectReason('');
      setSelectedPaymentForApproval(null);
      if (id) fetchProposal(id);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi từ chối đề xuất thanh toán');
    } finally {
      setActionLoading(false);
    }
  };

  // [TỐI ƯU GỬI ẢNH] Lưu ảnh/file hóa đơn VAT cục bộ ở máy khách, khi bấm Gửi mới upload lên máy chủ
  const handleUploadInvoiceFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const { attachments: localFiles, oversizedCount } = createLocalAttachments(Array.from(files));
    if (oversizedCount > 0) {
      alert(`Một số tệp vượt quá dung lượng tối đa 15MB đã bị bỏ qua.`);
    }
    setInvoiceFiles((prev) => [...prev, ...localFiles]);
    e.target.value = '';
  };

  const handleRemoveInvoiceFile = (index: number) => {
    setInvoiceFiles((prev) => {
      const target = prev[index];
      if (target) revokeLocalAttachment(target);
      return prev.filter((_, idx) => idx !== index);
    });
  };

  // [TỐI ƯU GỬI ẢNH] Lưu file/ảnh hợp đồng kinh tế cục bộ ở máy khách, khi bấm Gửi mới upload lên máy chủ
  const handleUploadContractFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const { attachments: localFiles, oversizedCount } = createLocalAttachments(Array.from(files));
    if (oversizedCount > 0) {
      alert(`Một số tệp vượt quá dung lượng tối đa 15MB đã bị bỏ qua.`);
    }
    setContractFiles((prev) => [...prev, ...localFiles]);
    e.target.value = '';
  };

  const handleRemoveContractFile = (index: number) => {
    setContractFiles((prev) => {
      const target = prev[index];
      if (target) revokeLocalAttachment(target);
      return prev.filter((_, idx) => idx !== index);
    });
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

  // [QUY TRÌNH MỚI] Kế toán lập đề xuất hoàn tạm ứng đối với số tiền chênh lệch khi tạm ứng > hóa đơn
  const handleRequestSettlement = async () => {
    if (!proposal) return;
    const targetAdv = linkedAdvance || relatedAdvanceProposals[0];
    if (!targetAdv) {
      alert('Không tìm thấy thông tin đơn tạm ứng liên kết để lập đề xuất hoàn ứng');
      return;
    }
    setActionLoading(true);
    try {
      const diffVal = Math.abs(advanceDiff);
      await advanceProposalService.requestSettlement(targetAdv._id, {
        diffAmount: diffVal,
        note: requestSettlementNote.trim() || `Kế toán đề xuất hoàn tạm ứng số tiền chênh lệch ${formatCurrency(diffVal)}.`,
        actualInvoiceDate: proposal.procurementExecution?.invoiceInfo?.invoiceDate || new Date().toISOString().slice(0, 10),
        actualInvoiceAmount: invAmount,
        actualInvoiceFiles: proposal.procurementExecution?.invoiceInfo?.files || [],
      });
      setIsRequestSettlementOpen(false);
      setRequestSettlementNote('');
      alert(`Đã lập đề xuất hoàn tạm ứng ${formatCurrency(diffVal)} thành công! Yêu cầu nộp lại tiền thừa đã được chuyển cho bên Thu mua.`);
      fetchProposal(proposal._id);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lập đề xuất hoàn tạm ứng');
    } finally {
      setActionLoading(false);
    }
  };

  // [QUY TRÌNH MỚI] Kế toán xác nhận hoàn thành khi hóa đơn vừa đủ số tiền tạm ứng
  const handleConfirmExact = async () => {
    if (!proposal) return;
    setActionLoading(true);
    try {
      await purchaseProposalService.accountingConfirm(
        proposal._id,
        confirmExactComment.trim() || 'Kế toán xác nhận hoàn thành (hóa đơn vừa đủ số tiền tạm ứng)'
      );
      setIsConfirmExactOpen(false);
      setConfirmExactComment('');
      alert('Đã xác nhận hoàn thành hồ sơ mua sắm và hoàn tất quyết toán tạm ứng thành công!');
      fetchProposal(proposal._id);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xác nhận hoàn thành');
    } finally {
      setActionLoading(false);
    }
  };

  // [QUY TRÌNH MỚI] Kế toán xác nhận quyết toán hoàn ứng khi Thu mua đã nộp tiền thừa
  const handleConfirmSettlementSubmitted = async () => {
    if (!proposal) return;
    const targetAdv = linkedAdvance || relatedAdvanceProposals[0];
    if (!targetAdv) {
      alert('Không tìm thấy đơn tạm ứng liên kết');
      return;
    }
    setActionLoading(true);
    try {
      await advanceProposalService.confirmSettlement(
        targetAdv._id,
        confirmSettlementComment.trim() || 'Kế toán xác nhận hoàn tất hồ sơ quyết toán hoàn tạm ứng'
      );
      setIsConfirmSettlementSubmittedOpen(false);
      setConfirmSettlementComment('');
      alert('Đã xác nhận hoàn tất quyết toán hoàn tạm ứng thành công!');
      fetchProposal(proposal._id);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xác nhận quyết toán hoàn tạm ứng');
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

  // [LUỒNG MỚI] Mở modal chỉnh sửa và nộp lại đơn khi bị Trưởng phòng từ chối
  const openResubmitModal = () => {
    if (!proposal) return;
    setResubmitItems(
      proposal.items.map((it, idx) => ({
        stt: it.stt || idx + 1,
        tenVatTu: it.tenVatTu,
        yeuCauKiThuat: it.yeuCauKiThuat || '',
        phongBanSuDung: it.phongBanSuDung || proposal.department?.name || '',
        soLuong: it.soLuong,
        donGiaDuKien: 0,
      }))
    );
    setResubmitReason(proposal.necessityReason || '');
    setResubmitAttachments(
      (proposal.necessityAttachments || []).map((att: any) => ({
        name: att.name || '',
        url: att.url || '',
        size: att.size || 0,
        type: att.type || '',
      }))
    );
    setIsResubmitOpen(true);
  };

  const handleUploadResubmitFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const { attachments: localFiles, oversizedCount } = createLocalAttachments(Array.from(files));
    if (oversizedCount > 0) {
      alert(`Một số tệp vượt quá dung lượng tối đa 15MB đã bị bỏ qua.`);
    }
    setResubmitAttachments((prev) => [...prev, ...localFiles]);
    e.target.value = '';
  };

  const handleResubmit = async () => {
    if (!proposal) return;
    for (let i = 0; i < resubmitItems.length; i++) {
      if (!resubmitItems[i].tenVatTu.trim()) {
        alert(`Vui lòng nhập tên vật tư cho dòng số ${i + 1}`);
        return;
      }
      if (resubmitItems[i].soLuong <= 0) {
        alert(`Số lượng dòng số ${i + 1} phải lớn hơn 0`);
        return;
      }
    }

    setActionLoading(true);
    try {
      const serverResubmits = await uploadPendingLocalAttachments(resubmitAttachments);
      await purchaseProposalService.resubmit(proposal._id, {
        items: resubmitItems,
        necessityReason: resubmitReason,
        necessityAttachments: serverResubmits,
      });
      setIsResubmitOpen(false);
      fetchProposal(proposal._id);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi nộp lại yêu cầu');
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

  /*
   * [LUỒNG CŨ - ĐÃ COMMENT LẠI]:
   * const isPendingMyApproval = proposal.currentApprovalRole === user?.role && proposal.status === 'pending_approval';
   * const isProcurementTurn = user?.role === 'thu_mua' && proposal.status === 'procurement_review';
   * const isAccountingReviewTurn = user?.role === 'ke_toan' && proposal.status === 'accounting_review';
   * const isFinalApprovalTurn = proposal.status === 'pending_final_approval' && proposal.currentApprovalRole === user?.role;
   */

  // [LUỒNG CẬP NHẬT] Xác định quyền thao tác theo 5 bước chuẩn hóa:
  // Bước 1: Trưởng phòng trực tiếp duyệt yêu cầu nhân viên
  // Nếu trong approvalFlow bước truong_phong có approver cụ thể → chỉ người đó được duyệt
  // Nếu không có approver cụ thể → bất kỳ truong_phong nào cùng phòng đều được duyệt (tương thích cũ)
  const tpFlowStep = proposal.approvalFlow?.find(s => s.role === 'truong_phong' && s.status === 'pending');
  const assignedManagerId = tpFlowStep?.approver
    ? (typeof tpFlowStep.approver === 'object' ? (tpFlowStep.approver as any)._id : tpFlowStep.approver)
    : null;
  const isTpApprovalTurn =
    user?.role === 'truong_phong' &&
    (proposal.status === 'pending_tp_approval' || proposal.status === 'pending_approval') &&
    // Nếu có chỉ định directManager → chỉ người được chỉ định đó mới được duyệt
    // Nếu chưa có chỉ định → mọi trưởng phòng trong phòng ban đều được duyệt (tương thích cũ)
    (!assignedManagerId || String(assignedManagerId) === String(user?._id));

  // Bước 2: Thu mua lập 3-4 báo giá + văn bản giải trình
  const isProcurementTurn =
    user?.role === 'thu_mua' &&
    (proposal.status === 'procurement_pricing' || proposal.status === 'procurement_review' || proposal.status === 'rejected_by_director');

  // [LUỒNG MỚI] Tự động tổng hợp chi phí thực tế từ tất cả các vật tư
  const computedItemsActualTotal = (proposal.items || []).reduce((sum, item) => {
    const p = Number(item.donGiaThucTe) || 0;
    const q = Number(item.soLuong) || 1;
    return sum + (q * p);
  }, 0);
  const totalActual = (proposal.totalActualAmount && proposal.totalActualAmount > 0)
    ? proposal.totalActualAmount
    : (computedItemsActualTotal > 0 ? computedItemsActualTotal : (proposal.totalEstimatedAmount || 0));
  const remainingDisbursement = Math.max(0, totalActual - (proposal.totalDisbursed || 0));

  // [QUY TRÌNH MỚI] Thông tin đơn tạm ứng liên kết và đối soát hoàn tạm ứng
  const linkedAdvance = (relatedAdvanceProposals || []).find((adv: any) => {
    const pId = typeof adv.purchaseProposal === 'object' ? adv.purchaseProposal?._id : adv.purchaseProposal;
    const bId = typeof adv.beneficiaryInvoice?.purchaseProposal === 'object' ? adv.beneficiaryInvoice?.purchaseProposal?._id : adv.beneficiaryInvoice?.purchaseProposal;
    return adv._id === proposal.procurementExecution?.advanceProposalId || pId === proposal._id || bId === proposal._id;
  }) || (typeof proposal.procurementExecution?.advanceProposalId === 'object' ? (proposal.procurementExecution.advanceProposalId as any) : null);

  const hasAdvance = Boolean(
    proposal.procurementExecution?.isAdvanced ||
    proposal.procurementExecution?.advanceProposalId ||
    linkedAdvance
  );

  const advAmount = Number(
    linkedAdvance?.totalDisbursed > 0
      ? linkedAdvance.totalDisbursed
      : (linkedAdvance?.totalAmount || proposal.procurementExecution?.advanceAmount || 0)
  );

  const invAmount = Number(
    proposal.procurementExecution?.invoiceInfo?.invoiceAmount ||
    proposal.totalActualAmount ||
    totalActual ||
    0
  );

  // [CẬP NHẬT SỐ LIỆU] Hoàn tạm ứng = số tiền tạm ứng hợp đồng - giá của hóa đơn
  const advanceDiff = advAmount - invAmount;
  const isAdvanceGreater = hasAdvance && advAmount > 0 && invAmount > 0 && advanceDiff > 0;
  const isAdvanceExact = hasAdvance && advAmount > 0 && invAmount > 0 && advanceDiff === 0;
  const isAdvanceLesser = hasAdvance && advAmount > 0 && invAmount > 0 && advanceDiff < 0;

  const isAdvanceSettlementSubmitted = Boolean(linkedAdvance && linkedAdvance.status === 'settlement_submitted');
  const isAdvancePendingSettlement = Boolean(linkedAdvance && linkedAdvance.status === 'pending_settlement');

  // [LUỒNG MỚI] Hạn mức phân quyền duyệt mua theo giá trị hàng hóa khảo giá:
  // - Nếu tổng giá trị hàng hóa > 10.000.000 VNĐ: Quyền duyệt mua để làm hợp đồng do CHỦ TỊCH thực hiện, GIÁM ĐỐC KHÔNG DUYỆT.
  // - Nếu tổng giá trị hàng hóa <= 10.000.000 VNĐ: Giám đốc duyệt mua.
  const isOverTenMillion = totalActual > 10000000;
  const isPendingPricingApproval =
    proposal.status === 'pending_director_approval' ||
    proposal.status === 'pending_chairman_approval' ||
    proposal.status === 'pending_final_approval';

  // Bước 3: Duyệt báo giá & giải trình mua sắm:
  // Đơn > 10 triệu: CHỈ Chủ tịch có quyền duyệt mua, Giám đốc KHÔNG duyệt
  // Đơn <= 10 triệu: Giám đốc (hoặc Chủ tịch) duyệt
  const isDirectorApprovalTurn =
    isPendingPricingApproval &&
    ((isOverTenMillion && user?.role === 'chu_tich') ||
     (!isOverTenMillion && (user?.role === 'giam_doc' || user?.role === 'chu_tich')));

  // Cảnh báo khi Giám đốc đang xem đơn > 10 triệu (thuộc thẩm quyền Chủ tịch duyệt mua)
  const isDirectorWatchingOverLimit =
    isPendingPricingApproval && isOverTenMillion && user?.role === 'giam_doc';

  // Kế toán nhận bản sao theo dõi khi Lãnh đạo đang xem báo giá
  const isAccountantWatching =
    user?.role === 'ke_toan' &&
    isPendingPricingApproval;

  // Bước 4: Thu mua thực hiện mua sắm (chọn: ứng trước, hóa đơn, hoặc hợp đồng)
  const isProcurementExecutionTurn =
    user?.role === 'thu_mua' &&
    (proposal.status === 'procurement_execution' || proposal.status === 'rejected_by_accounting');

  // Bước 5: Kế toán xử lý chứng từ thanh toán / giải ngân
  const isAccountingProcessTurn =
    user?.role === 'ke_toan' &&
    (proposal.status === 'pending_accounting' || proposal.status === 'accounting_review');

  // [LUỒNG MỚI] Chỉ Kế toán có nghiệp vụ lập đề xuất thanh toán khi đơn ở khâu kế toán xử lý (pending_accounting)
  // Thu mua chỉ có chức năng Thực hiện mua sắm, KHÔNG có chức năng đề xuất thanh toán và nghiệp vụ thanh toán
  const canCreatePayment =
    user?.role === 'ke_toan' &&
    ['pending_accounting', 'accounting_review', 'procurement_execution', 'pending_payment', 'pending_payment_approval', 'disbursing', 'final_approved'].includes(proposal.status) &&
    remainingDisbursement > 0;
  const isDisbursingTurn = canCreatePayment;

  // [LUỒNG MỚI] Kiểm tra đề xuất thanh toán đang chờ duyệt chi và quyền duyệt chi của lãnh đạo (Chủ tịch / Giám đốc)
  const pendingPaymentForApproval = paymentProposals.find(
    (p) => p.status === 'pending_chairman' || p.status === 'pending_director'
  );

  const canUserApprovePayment = (pay: PaymentProposal) => {
    const isPayOver10M = (pay.amount || 0) > 10000000;
    if (pay.status === 'pending_chairman') return user?.role === 'chu_tich';
    if (pay.status === 'pending_director') {
      return isPayOver10M ? user?.role === 'chu_tich' : (user?.role === 'giam_doc' || user?.role === 'chu_tich');
    }
    return false;
  };

  const isLeaderPaymentApprovalTurn =
    Boolean(pendingPaymentForApproval && canUserApprovePayment(pendingPaymentForApproval));

  // [TINH GỌN GIAO DIỆN] Phân quyền xem các chi tiết thủ tục tiền tệ (Thanh toán, giải ngân, mã UNC ngân hàng)
  // Chỉ Kế toán, Giám đốc, Chủ tịch và Quản trị viên mới xem các bảng tiền bạc rườm rà này
  const canViewFinancialDetails = Boolean(
    user && ['ke_toan', 'giam_doc', 'chu_tich', 'admin'].includes(user.role)
  );

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
          {/* [LUỒNG MỚI] Bước 1: Trưởng phòng duyệt tính thỏa đáng */}
          {isTpApprovalTurn && (
            <>
              <button onClick={() => setIsApproveOpen(true)} className="btn btn-success">
                <CheckCircle2 size={16} />
                <span>Phê Duyệt Yêu Cầu (TP)</span>
              </button>
              <button onClick={() => setIsRejectOpen(true)} className="btn btn-danger">
                <XCircle size={16} />
                <span>Từ Chối</span>
              </button>
            </>
          )}

          {/* [LUỒNG MỚI] Bước 2: Thu mua lập 3-4 báo giá + văn bản giải trình */}
          {isProcurementTurn && (
            <button
              onClick={() => {
                setIsProcurementOpen(true);
                // [LUỒNG MỚI] Không tự động quét AI khi mở modal, AI là tùy chọn on-demand
              }}
              className="btn btn-warning"
              style={{ gap: '0.4rem' }}
            >
              <Sparkles size={16} />
              <span>{proposal.status === 'rejected_by_director' ? 'Khảo Sát Lại & Nộp Báo Giá Mới' : 'Khảo Sát Báo Giá & Lập Giải Trình'}</span>
            </button>
          )}

          {/* [LUỒNG MỚI] Bước 3: Giám đốc hoặc Chủ tịch duyệt báo giá để làm hợp đồng (đơn > 10tr: Chủ tịch duyệt, Giám đốc không duyệt) */}
          {isDirectorApprovalTurn && (
            <>
              <button onClick={() => setIsFinalApproveOpen(true)} className="btn btn-success">
                {isOverTenMillion ? <Crown size={16} /> : <CheckCircle2 size={16} />}
                <span>{isOverTenMillion ? 'Chủ Tịch Phê Duyệt Mua Sắm' : 'GĐ Phê Duyệt Mua Sắm'}</span>
              </button>
              <button onClick={() => setIsRejectOpen(true)} className="btn btn-danger">
                <XCircle size={16} />
                <span>Từ Chối Báo Giá</span>
              </button>
            </>
          )}

          {/* [LUỒNG MỚI] Bước 4: Thu mua đề xuất thanh toán cho kế toán duyệt */}
          {isProcurementExecutionTurn && (
            <button
              onClick={() => {
                const todayStr = new Date().toISOString().slice(0, 10);
                if (proposal.procurementExecution) {
                  if (proposal.procurementExecution.invoiceInfo?.invoiceDate) {
                    setInvoiceDate(String(proposal.procurementExecution.invoiceInfo.invoiceDate).split('T')[0]);
                  } else {
                    setInvoiceDate(todayStr);
                  }
                  setInvoiceAmount(proposal.procurementExecution.invoiceInfo?.invoiceAmount || totalActual);
                  if (proposal.procurementExecution.advanceProposalId) {
                    const advId = typeof proposal.procurementExecution.advanceProposalId === 'object'
                      ? (proposal.procurementExecution.advanceProposalId as any)._id
                      : proposal.procurementExecution.advanceProposalId;
                    setSelectedAdvanceProposalId(advId || '');
                  }
                  if (proposal.procurementExecution.isAdvanced !== undefined) {
                    setIsAdvanced(Boolean(proposal.procurementExecution.isAdvanced));
                    setAdvanceAmount(Number(proposal.procurementExecution.advanceAmount) || 0);
                    setAdvanceNote(proposal.procurementExecution.advanceNote || '');
                  }
                } else {
                  setInvoiceDate(todayStr);
                  setInvoiceAmount(totalActual);
                }
                setIsProcurementExecutionOpen(true);
              }}
              className={proposal.status === 'rejected_by_accounting' ? 'btn btn-warning' : 'btn btn-primary'}
              style={{ gap: '0.4rem' }}
            >
              <Receipt size={16} />
              <span>{proposal.status === 'rejected_by_accounting' ? 'Chỉnh Sửa & Nộp Lại Hóa Đơn' : 'Đề Xuất Thanh Toán Cho Kế Toán'}</span>
            </button>
          )}

          {/* [QUY TRÌNH MỚI] Kế toán tiếp nhận hóa đơn / xử lý khi đơn ở pending_accounting */}
          {user?.role === 'ke_toan' &&
            ['pending_accounting', 'accounting_review'].includes(proposal.status) &&
            !proposal.isInvoiceCompleted && proposal.status !== 'completed' && (
            <>
              {/* TRƯỜNG HỢP CÓ TẠM ỨNG HÓA ĐƠN:
                  Kế toán xem 3 thông tin (Hóa đơn, Thông tin hóa đơn, Số tiền cần hoàn tạm ứng)
                  Kế toán chỉ cần:
                  - Bấm Xác nhận để hoàn thành (hoàn tất cả đơn mua sắm & đơn tạm ứng, không qua bước nộp tiền trung gian)
                  - Hoặc bấm Từ chối để yêu cầu Thu mua làm lại
              */}
              {hasAdvance && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmExactComment(
                        isAdvanceGreater
                          ? `Kế toán xác nhận hoàn tất hồ sơ mua sắm & quyết toán hoàn tạm ứng (Thu mua hoàn ứng số tiền chênh lệch ${formatCurrency(advanceDiff)}).`
                          : isAdvanceExact
                          ? 'Kế toán xác nhận hoàn tất hồ sơ mua sắm & tạm ứng (Hóa đơn khớp đúng 100% tiền tạm ứng).'
                          : `Kế toán xác nhận hoàn tất hồ sơ mua sắm (Tạm ứng thiếu ${formatCurrency(Math.abs(advanceDiff))}).`
                      );
                      setIsConfirmExactOpen(true);
                    }}
                    className="btn btn-success"
                    style={{ gap: '0.4rem', fontWeight: 700 }}
                  >
                    <CheckCircle2 size={16} />
                    <span>
                      {isAdvanceGreater
                        ? `Xác Nhận Hoàn Thành (Hoàn Ứng ${formatCurrency(advanceDiff)})`
                        : isAdvanceExact
                        ? 'Xác Nhận Hoàn Thành (Hóa Đơn Vừa Đủ)'
                        : `Xác Nhận Hoàn Thành (Thiếu ${formatCurrency(Math.abs(advanceDiff))})`}
                    </span>
                  </button>

                  {/* Nếu tạm ứng thiếu, Kế toán có tùy chọn lập đề xuất thanh toán chi bù */}
                  {isAdvanceLesser && (
                    <Link
                      to={`/payment/create?purchaseProposalId=${proposal._id}`}
                      className="btn btn-primary"
                      style={{ gap: '0.4rem' }}
                    >
                      <CreditCard size={16} />
                      <span>Lập Đề Xuất Thanh Toán Chi Bù ({formatCurrency(Math.abs(advanceDiff))})</span>
                    </Link>
                  )}
                </>
              )}

              {/* TRƯỜNG HỢP KHÔNG TẠM ỨNG (GIỮ NGUYÊN 100% LUỒNG CŨ) -> Tiếp nhận & Lập đề xuất thanh toán gửi Sếp */}
              {!hasAdvance && (
                <Link
                  to={`/payment/create?purchaseProposalId=${proposal._id}`}
                  className="btn btn-primary"
                  style={{ gap: '0.4rem' }}
                >
                  <CreditCard size={16} />
                  <span>Tiếp Nhận & Lập Đề Xuất Thanh Toán Gửi Sếp</span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => {
                  setRejectReason('');
                  setIsRejectOpen(true);
                }}
                className="btn btn-danger"
                style={{ gap: '0.4rem' }}
              >
                <XCircle size={16} />
                <span>Từ Chối Hóa Đơn (Yêu Cầu Làm Lại)</span>
              </button>
            </>
          )}

          {/* [QUY TRÌNH 2 MỚI] Liên kết tới đề xuất thanh toán đang được xử lý */}
          {pendingPaymentForApproval && (
            <Link
              to={`/payment/${pendingPaymentForApproval._id}`}
              className="btn btn-warning"
              style={{ gap: '0.4rem' }}
            >
              <CreditCard size={16} />
              <span>Xem Đề Xuất Thanh Toán ({pendingPaymentForApproval.proposalCode})</span>
            </Link>
          )}

          {/* [LUỒNG MỚI] Người tạo nộp lại đơn sau khi bị Trưởng phòng từ chối (giữ nguyên mã đơn cũ) */}
          {proposal.status === 'rejected_by_tp' &&
            (user?._id === proposal.creator?._id) && (
              <button onClick={openResubmitModal} className="btn btn-warning">
                <FileText size={16} />
                <span>Chỉnh Sửa & Gửi Lại Yêu Cầu</span>
              </button>
            )}

          {canCreatePayment && !isAccountingProcessTurn && !proposal.isInvoiceCompleted && proposal.status !== 'completed' && (
            <Link
              to={`/payment/create?purchaseProposalId=${proposal._id}`}
              className="btn btn-primary"
              style={{ gap: '0.4rem' }}
            >
              <CreditCard size={16} />
              <span>Lập Đề Xuất Thanh Toán Bổ Sung</span>
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

      {/* [LUỒNG MỚI] Banner thông báo lý do bị từ chối và trả về khâu trước đó */}
      {proposal.rejectionReason && (
        <div
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 'var(--radius-md)',
            color: '#fca5a5',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.85rem',
          }}
        >
          <AlertCircle size={22} color="var(--danger)" style={{ marginTop: '0.1rem', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.925rem', color: '#ffffff', marginBottom: '0.25rem' }}>
              {proposal.status === 'rejected_by_tp' && 'Yêu cầu vật tư đã bị Trưởng phòng từ chối'}
              {proposal.status === 'rejected_by_director' && 'Bảng báo giá trước đó đã bị Giám đốc / Chủ tịch từ chối phê duyệt'}
              {proposal.status === 'rejected_by_accounting' && 'Hóa đơn / hồ sơ mua sắm đã bị Kế toán từ chối, yêu cầu làm lại'}
              {proposal.status === 'rejected' && 'Đề xuất đã bị từ chối'}
              {!['rejected_by_tp', 'rejected_by_director', 'rejected_by_accounting', 'rejected'].includes(proposal.status) && 'Đơn có phản hồi yêu cầu điều chỉnh từ khâu trước'}
            </div>
            <div style={{ fontSize: '0.85rem', lineHeight: 1.5, color: '#fecaca' }}>
              <strong>Lý do từ chối:</strong> {proposal.rejectionReason}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              {proposal.status === 'rejected_by_tp' && 'Người tạo đơn có thể bấm "Chỉnh Sửa & Gửi Lại Yêu Cầu" để sửa lại danh mục và gửi lại (mã đơn vẫn được giữ nguyên).'}
              {proposal.status === 'rejected_by_director' && 'Thu mua vui lòng bấm "Khảo Sát Lại & Nộp Báo Giá Mới" để cập nhật lại 3-4 báo giá hoặc đàm phán lại mức giá và nộp lại lên Giám đốc / Chủ tịch.'}
              {proposal.status === 'rejected_by_accounting' && 'Thu mua vui lòng bấm "Chỉnh Sửa & Nộp Lại Hóa Đơn / HĐ" để cập nhật/bổ sung lại ảnh hóa đơn hoặc hợp đồng hợp lệ cho Kế toán.'}
            </div>
          </div>
        </div>
      )}

      {/* [LUỒNG MỚI] Thông báo cho Giám đốc khi xem đơn > 10 triệu: Đơn thuộc thẩm quyền Chủ tịch duyệt mua để làm hợp đồng */}
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
            <strong>Thông báo thẩm quyền phê duyệt:</strong> Đơn mua sắm có tổng giá trị hàng hóa khảo giá là{' '}
            <strong style={{ color: '#ffffff' }}>{formatCurrency(totalActual)}</strong> (&gt; 10.000.000 VNĐ).
            Theo quy định, quyền duyệt mua để làm hợp đồng do <strong>Chủ tịch</strong> trực tiếp phê duyệt (Giám đốc không phê duyệt đơn này).
          </span>
        </div>
      )}

      {/* [LUỒNG MỚI] Thông báo cho Kế toán theo dõi song song khi Giám đốc/Chủ tịch đang xem báo giá */}
      {isAccountantWatching && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#93c5fd',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <Clock size={20} color="#60a5fa" />
          <span style={{ fontSize: '0.875rem' }}>
            <strong>Bản sao theo dõi dành cho Kế toán:</strong> Thu mua đã nộp 3-4 báo giá kèm văn bản giải trình và đang trình{' '}
            <strong>{isOverTenMillion ? 'Chủ tịch' : 'Giám đốc'}</strong> xem xét phê duyệt mua sắm để làm hợp đồng.
          </span>
        </div>
      )}

      {/* [TINH GỌN GIAO DIỆN] Chỉ hiển thị thông báo duyệt chi cho Kế toán và Lãnh đạo có thẩm quyền duyệt */}
      {canViewFinancialDetails && proposal.status === 'pending_payment_approval' && (
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
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Clock size={20} color="#c084fc" />
            <span style={{ fontSize: '0.875rem' }}>
              <strong>Đơn đang chờ duyệt đề xuất thanh toán:</strong> Đề xuất thanh toán liên kết đã được Thu mua lập và đang chờ{' '}
              <strong>{proposal.currentApprovalRole === 'chu_tich' ? 'Chủ tịch' : 'Giám đốc'}</strong> xác nhận giải ngân.
            </span>
          </div>
          {isLeaderPaymentApprovalTurn && pendingPaymentForApproval && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  setSelectedPaymentForApproval(pendingPaymentForApproval);
                  setIsPaymentApproveOpen(true);
                }}
                className="btn btn-success btn-sm"
              >
                {user?.role === 'chu_tich' ? <Crown size={14} /> : <CheckCircle2 size={14} />}
                <span>{user?.role === 'chu_tich' ? 'Chủ Tịch Xác Nhận Giải Ngân' : 'GĐ Xác Nhận Giải Ngân'}</span>
              </button>
              <button
                onClick={() => {
                  setSelectedPaymentForApproval(pendingPaymentForApproval);
                  setIsPaymentRejectOpen(true);
                }}
                className="btn btn-danger btn-sm"
              >
                <XCircle size={14} />
                <span>Từ Chối</span>
              </button>
            </div>
          )}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingCart size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1.05rem', color: '#ffffff' }}>Chi Tiết Vật Tư Yêu Cầu</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  ↔ Cuộn ngang để xem đủ cột
                </span>
                <span className="badge badge-secondary">{proposal.items.length} hạng mục</span>
              </div>
            </div>

            {/* BẢNG VẬT TƯ CÓ CUỘN NGANG VÀ PHÂN TRANG */}
            <div className="table-container" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table
                className="table"
                style={{
                  minWidth:
                    proposal.status === 'pending_tp_approval' || proposal.status === 'draft' || proposal.status === 'rejected_by_tp'
                      ? '680px'
                      : '920px',
                }}
              >
                <thead>
                  {/* [LUỒNG MỚI] Khâu Trưởng phòng duyệt: ẩn hoàn toàn các cột giá dự kiến/tài chính */}
                  {(proposal.status === 'pending_tp_approval' || proposal.status === 'draft' || proposal.status === 'rejected_by_tp') ? (
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                      <th>Tên Vật Tư</th>
                      <th>Yêu Cầu Kĩ Thuật</th>
                      <th>Phòng Ban Sử Dụng</th>
                      <th style={{ textAlign: 'center' }}>Số Lượng</th>
                    </tr>
                  ) : (
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                      <th>Tên Vật Tư</th>
                      <th>Yêu Cầu Kĩ Thuật</th>
                      <th>Phòng Ban Sử Dụng</th>
                      <th style={{ textAlign: 'center' }}>Số Lượng</th>
                      <th>Đơn Giá Thực Tế</th>
                      <th>Nhà Cung Cấp</th>
                      <th>Thành Tiền Thực Tế</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {(() => {
                    const paginatedItems = proposal.items.slice(
                      (itemsPage - 1) * itemsPageSize,
                      itemsPage * itemsPageSize
                    );

                    return paginatedItems.map((item, idx) => {
                      const isTpStep = proposal.status === 'pending_tp_approval' || proposal.status === 'draft' || proposal.status === 'rejected_by_tp';
                      const lineAct = item.donGiaThucTe !== null && item.donGiaThucTe !== undefined
                        ? (Number(item.soLuong) || 1) * item.donGiaThucTe
                        : null;
                      const displayStt = (itemsPage - 1) * itemsPageSize + idx + 1;

                      if (isTpStep) {
                        return (
                          <tr key={item._id || item.stt || idx}>
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.stt || displayStt}</td>
                            <td style={{ fontWeight: 600 }}>{item.tenVatTu}</td>
                            <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              {item.yeuCauKiThuat || '—'}
                            </td>
                            <td>
                              <span style={{ fontSize: '0.85rem' }}>{item.phongBanSuDung || proposal.department?.name || '—'}</span>
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.soLuong || 1}</td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={item._id || item.stt || idx}>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.stt || displayStt}</td>
                          <td style={{ fontWeight: 600 }}>{item.tenVatTu}</td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {item.yeuCauKiThuat || '—'}
                          </td>
                          <td>
                            <span style={{ fontSize: '0.85rem' }}>{item.phongBanSuDung || proposal.department?.name || '—'}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>{item.soLuong || 1}</td>
                          <td className="font-mono">
                            {item.donGiaThucTe !== null && item.donGiaThucTe !== undefined && item.donGiaThucTe > 0 ? (
                              <span style={{ color: 'var(--success)', fontWeight: 700 }}>
                                {formatCurrency(item.donGiaThucTe)}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Chờ khảo giá</span>
                            )}
                          </td>
                          <td>
                            {item.nhaCungCap ? (
                              <div>
                                <span style={{ fontSize: '0.825rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                                  {item.nhaCungCap}
                                </span>
                                {item.supplierQuotes && item.supplierQuotes.length > 1 && (
                                  <div style={{ marginTop: '0.25rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    ({item.supplierQuotes.length} báo giá đối chiếu)
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                            )}
                          </td>
                          <td className="font-mono">
                            {lineAct !== null && lineAct > 0 ? (
                              <strong style={{ color: 'var(--success)' }}>{formatCurrency(lineAct)}</strong>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* THANH PHÂN TRANG DANH SÁCH VẬT TƯ */}
            {proposal.items.length > 5 && (
              <Pagination
                currentPage={itemsPage}
                totalItems={proposal.items.length}
                pageSize={itemsPageSize}
                onPageChange={setItemsPage}
                onPageSizeChange={setItemsPageSize}
                pageSizeOptions={[5, 10, 20, 50]}
                itemName="vật tư"
              />
            )}

            {/* [LUỒNG MỚI] Khâu Trưởng phòng duyệt: ẩn toàn bộ khối dự toán tài chính, hiển thị thông báo nghiệp vụ */}
            {(proposal.status === 'pending_tp_approval' || proposal.status === 'draft' || proposal.status === 'rejected_by_tp') ? (
              <div
                style={{
                  marginTop: '1.25rem',
                  padding: '1rem 1.25rem',
                  backgroundColor: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <CheckCircle2 size={18} color="var(--primary)" />
                  <span style={{ fontSize: '0.875rem', color: '#ffffff' }}>
                    <strong>Khâu Trưởng phòng xét duyệt:</strong> Xem xét mục đích sử dụng, yêu cầu kỹ thuật và số lượng vật tư của phòng ban (chưa thực hiện khảo sát giá).
                  </span>
                </div>
                <span className="badge badge-secondary">{proposal.items.length} hạng mục</span>
              </div>
            ) : (
              <div
                style={{
                  marginTop: '1.25rem',
                  padding: '1.25rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-md)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tổng Chi Phí Mua Sắm (Thực Tế)</div>
                  <div
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: totalActual > 0 ? 'var(--success)' : 'var(--text-muted)',
                    }}
                    className="font-mono"
                  >
                    {totalActual > 0 ? formatCurrency(totalActual) : 'Chờ Thu mua lập báo giá'}
                  </div>
                </div>

                {canViewFinancialDetails ? (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Đã Giải Ngân / Còn Lại</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-cyan)' }} className="font-mono">
                      {formatCurrency(proposal.totalDisbursed)} / {formatCurrency(remainingDisbursement)}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tình Trạng Mua Sắm</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: proposal.status === 'completed' ? 'var(--success)' : 'var(--warning)' }}>
                      {proposal.status === 'completed' ? '✓ Đã hoàn tất mua hàng' : 'Đang xử lý mua sắm'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* [LUỒNG MỚI] Lý do & Giải trình tính cần thiết của người đề xuất ban đầu kèm ảnh minh chứng */}
          {(proposal.necessityReason || (proposal.necessityAttachments && proposal.necessityAttachments.length > 0)) && (
            <div className="card" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <FileText size={18} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '1.05rem', color: '#ffffff' }}>
                  Lý Do & Giải Trình Tính Cần Thiết (Người Đề Xuất)
                </h3>
              </div>
              {proposal.necessityReason && (
                <div
                  style={{
                    padding: '1rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    marginBottom: proposal.necessityAttachments && proposal.necessityAttachments.length > 0 ? '1rem' : 0,
                  }}
                >
                  {proposal.necessityReason}
                </div>
              )}

              {proposal.necessityAttachments && proposal.necessityAttachments.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.65rem', fontWeight: 600 }}>
                    Ảnh / Tài liệu minh chứng hiện trạng ({proposal.necessityAttachments.length}):
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    {proposal.necessityAttachments.map((att: any, idx: number) => {
                      const isImg = att.type?.includes('image') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(att.name || att.url);
                      return (
                        <div
                          key={idx}
                          style={{
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden',
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          {isImg ? (
                            <div
                              onClick={() => handlePreviewFile(att, proposal.necessityAttachments, idx)}
                              style={{
                                height: 120,
                                cursor: 'pointer',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'rgba(0,0,0,0.3)',
                              }}
                              title="Bấm để xem ảnh phóng to"
                            >
                              <img
                                src={att.url}
                                alt={att.name || 'Minh chứng'}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </div>
                          ) : (
                            <div
                              onClick={() => handlePreviewFile(att, proposal.necessityAttachments, idx)}
                              style={{
                                height: 120,
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                color: 'var(--text-muted)',
                              }}
                            >
                              <FileText size={32} color="var(--primary)" />
                              <span style={{ fontSize: '0.75rem' }}>Tài liệu đính kèm</span>
                            </div>
                          )}
                          <div style={{ padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span
                              style={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }}
                              title={att.name}
                            >
                              {att.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => handlePreviewFile(att, proposal.necessityAttachments, idx)}
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '0.2rem' }}
                              title="Xem chi tiết"
                            >
                              <Eye size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* [LUỒNG MỚI] Văn bản giải trình lý do chọn báo giá của Thu mua */}
          {proposal.priceJustification && (
            <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <FileText size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1.05rem', color: '#ffffff' }}>
                  Văn Bản Giải Trình Của Thu Mua
                </h3>
              </div>
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {proposal.priceJustification}
              </div>
            </div>
          )}

          {/* [QUY TRÌNH 2 MỚI] Khối hiển thị lưu trữ Hóa Đơn & Hợp Đồng Đã Hoàn Thành */}
          {(proposal.isInvoiceCompleted || proposal.status === 'completed') && (
            <div
              className="card"
              style={{
                border: '2px solid rgba(16, 185, 129, 0.45)',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)',
                padding: '1.25rem 1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: '12px',
                      backgroundColor: 'rgba(16, 185, 129, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--success)',
                    }}
                  >
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', color: '#34d399', margin: 0, fontWeight: 700 }}>
                      Hóa Đơn / Hợp Đồng Đã Được Thanh Toán & Lưu Trữ Hoàn Tất
                    </h3>
                    <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      Đề xuất thanh toán đã được Giám đốc/Chủ tịch xác nhận giải ngân và Kế toán đã duyệt chi thành công cho Thu mua. Hóa đơn này đã được lưu vào mục "Hóa Đơn Đã Hoàn Thành".
                    </p>
                  </div>
                </div>
                <span className="badge badge-success" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                  ✓ ĐÃ LƯU TRỮ HOÀN TẤT
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  fontSize: '0.85rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid rgba(16, 185, 129, 0.2)',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Số hóa đơn VAT: </span>
                  <strong style={{ color: '#ffffff' }}>{proposal.procurementExecution?.invoiceInfo?.invoiceNumber || '—'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Tổng số tiền đã chi: </span>
                  <strong className="font-mono" style={{ color: 'var(--accent-cyan)' }}>
                    {formatCurrency(proposal.totalDisbursed || proposal.totalActualAmount || 0)}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Thời gian hoàn tất: </span>
                  <span>{formatDate(proposal.invoiceCompletedAt || proposal.updatedAt)}</span>
                </div>
              </div>
            </div>
          )}

          {/* [LUỒNG MỚI] Hồ sơ thực hiện mua sắm của Thu mua */}
          {proposal.procurementExecution?.actionType && (
            <div className="card" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
              {/* [QUY TRÌNH MỚI]: Kế toán tiếp nhận hóa đơn & lập đề xuất thanh toán */}
              {user?.role === 'ke_toan' && !proposal.isInvoiceCompleted && proposal.status !== 'completed' && (
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: 'rgba(168, 85, 247, 0.12)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Receipt size={20} color="var(--purple)" />
                    <span style={{ fontSize: '0.85rem', color: '#f3e8ff' }}>
                      <strong>Quy trình thanh toán:</strong> Thu mua đã nộp hồ sơ mua sắm. Kế toán tiếp nhận để lập Đề Xuất Thanh Toán trình Giám đốc/Chủ tịch xác nhận giải ngân.
                    </span>
                  </div>
                  <Link
                    to={`/payment/create?purchaseProposalId=${proposal._id}`}
                    className="btn btn-primary btn-sm"
                    style={{ gap: '0.4rem' }}
                  >
                    <CreditCard size={15} />
                    <span>Tiếp Nhận & Lập Đề Xuất Thanh Toán</span>
                  </Link>
                </div>
              )}

              {/* Thông báo tiến độ cho Thu mua: Thu mua đã hoàn thành khâu thực hiện mua sắm, hồ sơ đã chuyển sang Kế toán */}
              {user?.role === 'thu_mua' && !proposal.isInvoiceCompleted && proposal.status !== 'completed' && (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    color: '#bae6fd',
                    fontSize: '0.85rem',
                  }}
                >
                  <CheckCircle2 size={18} color="var(--accent-cyan)" />
                  <span>
                    Thu mua đã nộp đầy đủ hồ sơ mua sắm. Chứng từ đã được chuyển sang Kế toán tiếp nhận để thực hiện đề xuất thanh toán.
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Receipt size={18} color="var(--accent-cyan)" />
                  <h3 style={{ fontSize: '1.05rem', color: '#ffffff' }}>
                    Hồ Sơ Hóa Đơn Mua Sắm & Đề Xuất Thanh Toán
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-info">Hóa đơn thanh toán</span>
                  {Boolean(proposal.procurementExecution.isAdvanced || proposal.procurementExecution.advanceProposalId) && (
                    <span className="badge badge-warning">Đính kèm tạm ứng ({formatCurrency(proposal.procurementExecution.advanceAmount || 0)})</span>
                  )}
                </div>
              </div>

              {/* Thông tin ngày và giá của hóa đơn thanh toán */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Ngày hóa đơn: </span>
                  <strong style={{ color: '#ffffff' }}>
                    {proposal.procurementExecution.invoiceInfo?.invoiceDate
                      ? formatDate(proposal.procurementExecution.invoiceInfo.invoiceDate)
                      : formatDate(proposal.updatedAt)}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Giá của hóa đơn: </span>
                  <strong className="font-mono" style={{ color: '#86efac', fontSize: '0.95rem' }}>
                    {formatCurrency(proposal.procurementExecution.invoiceInfo?.invoiceAmount || totalActual)}
                  </strong>
                </div>

                {/* Đơn tạm ứng hợp đồng đính kèm & Đối soát chênh lệch hoàn tạm ứng */}
                {(proposal.procurementExecution.advanceProposalId || proposal.procurementExecution.isAdvanced) && (
                  (() => {
                    const advAmount = Number(proposal.procurementExecution.advanceAmount) || 0;
                    const invAmount = Number(proposal.procurementExecution.invoiceInfo?.invoiceAmount) || Number(totalActual) || 0;
                    // [CẬP NHẬT SỐ LIỆU] hoàn tạm ứng = số tiền tạm ứng hợp đồng - giá của hóa đơn
                    const diff = advAmount - invAmount;

                    return (
                      <div
                        style={{
                          gridColumn: '1 / -1',
                          padding: '1rem 1.25rem',
                          backgroundColor: diff > 0 ? 'rgba(234, 179, 8, 0.1)' : diff < 0 ? 'rgba(56, 189, 248, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          borderRadius: 'var(--radius-md)',
                          border: `1px solid ${diff > 0 ? 'rgba(234, 179, 8, 0.35)' : diff < 0 ? 'rgba(56, 189, 248, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '0.85rem',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: diff > 0 ? '#fef08a' : diff < 0 ? '#bae6fd' : '#86efac', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Calculator size={17} />
                            <span>Số Tiền Cần Hoàn Tạm Ứng (Tạm ứng - Giá hóa đơn thực tế)</span>
                          </div>
                          <div style={{ marginTop: '0.4rem', fontSize: '0.825rem', color: '#ffffff', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                            <span>
                              Số tiền tạm ứng: <strong className="font-mono" style={{ color: 'var(--accent-cyan)' }}>{formatCurrency(advAmount)}</strong>
                            </span>
                            <span>
                              • Giá hóa đơn thực tế: <strong className="font-mono" style={{ color: '#86efac' }}>{formatCurrency(invAmount)}</strong>
                            </span>
                            {invAmount > 0 && (
                              <span>
                                • <strong>
                                  {diff > 0
                                    ? `Thu mua hoàn tạm ứng: `
                                    : diff < 0
                                    ? `Công ty chi bù thêm: `
                                    : 'Khớp đúng 100%: '}
                                </strong>
                                <strong
                                  className="font-mono"
                                  style={{
                                    fontSize: '1rem',
                                    fontWeight: 800,
                                    color: diff > 0 ? '#f59e0b' : diff < 0 ? '#38bdf8' : '#22c55e',
                                  }}
                                >
                                  {diff > 0
                                    ? formatCurrency(diff)
                                    : diff < 0
                                    ? formatCurrency(Math.abs(diff))
                                    : '0 đ'}
                                </strong>
                              </span>
                            )}
                            {proposal.procurementExecution.advanceNote && (
                              <span style={{ color: 'var(--text-secondary)' }}>
                                (Mã: <strong className="font-mono" style={{ color: '#fef08a' }}>{proposal.procurementExecution.advanceNote}</strong>)
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                            📌 <em>Quy trình hoàn ứng trực tiếp: Kế toán chỉ cần bấm Xác Nhận Hoàn Thành để kết thúc đơn (không có bước xác nhận nộp lại tiền trung gian).</em>
                          </div>
                        </div>

                        {/* Nút xem chi tiết đơn tạm ứng 2 chiều */}
                        {Boolean(proposal.procurementExecution.advanceProposalId) && (
                          <Link
                            to={`/advance/${typeof proposal.procurementExecution.advanceProposalId === 'object' ? (proposal.procurementExecution.advanceProposalId as any)._id : proposal.procurementExecution.advanceProposalId}`}
                            target="_blank"
                            className="btn btn-warning btn-sm"
                            style={{
                              gap: '0.4rem',
                              backgroundColor: '#f59e0b',
                              color: '#000000',
                              fontWeight: 700,
                            }}
                          >
                            <ExternalLink size={13} />
                            <span>Xem Đơn Tạm Ứng (2 Chiều)</span>
                          </Link>
                        )}
                      </div>
                    );
                  })()
                )}
              </div>

              {/* [LUỒNG MỚI] Hiển thị ảnh/file hóa đơn thanh toán để kế toán kiểm chứng */}
              {proposal.procurementExecution.invoiceInfo?.files &&
                proposal.procurementExecution.invoiceInfo.files.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Ảnh / Tài liệu minh chứng hóa đơn thanh toán ({proposal.procurementExecution.invoiceInfo.files.length}):
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                      {proposal.procurementExecution.invoiceInfo.files.map((file: any, fIdx: number) => {
                        const isImg = file.type?.includes('image') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name || file.url);
                        return (
                          <div
                            key={fIdx}
                            style={{
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-md)',
                              overflow: 'hidden',
                              backgroundColor: 'rgba(255, 255, 255, 0.02)',
                              display: 'flex',
                              flexDirection: 'column',
                            }}
                          >
                            {isImg ? (
                              <div
                                onClick={() => handlePreviewFile(file, proposal.procurementExecution?.invoiceInfo?.files, fIdx)}
                                style={{
                                  height: 110,
                                  cursor: 'pointer',
                                  overflow: 'hidden',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: 'rgba(0,0,0,0.3)',
                                }}
                                title="Bấm để phóng to hóa đơn"
                              >
                                <img
                                  src={file.url}
                                  alt={file.name || 'Hóa đơn'}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              </div>
                            ) : (
                              <div
                                onClick={() => handlePreviewFile(file, proposal.procurementExecution?.invoiceInfo?.files, fIdx)}
                                style={{
                                  height: 110,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.4rem',
                                  color: 'var(--text-muted)',
                                }}
                              >
                                <FileText size={28} color="var(--primary)" />
                                <span style={{ fontSize: '0.75rem' }}>Tài liệu hóa đơn</span>
                              </div>
                            )}
                            <div style={{ padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span
                                style={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}
                                title={file.name}
                              >
                                {file.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => handlePreviewFile(file, proposal.procurementExecution?.invoiceInfo?.files, fIdx)}
                                className="btn btn-ghost btn-sm"
                                style={{ padding: '0.2rem', color: '#f59e0b' }}
                                title="Xem hóa đơn"
                              >
                                <Eye size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>
          )}

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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
                {proposal.quotationAttachments.map((att: any, aIdx: number) => (
                  <div
                    key={aIdx}
                    style={{
                      padding: '0.85rem 1rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                        {att.capturedAt ? <Camera size={16} color="#10b981" /> : <FileText size={16} color="var(--primary)" />}
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '170px' }} title={att.name}>
                          {att.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => handlePreviewFile(att, proposal.quotationAttachments, aIdx)}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '0.3rem', color: 'var(--accent-cyan)' }}
                          title="Xem chứng từ"
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

                    {/* Huy hiệu chi tiết ngày giờ chụp và giá đã chọn gửi cho Giám đốc/Chủ tịch */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {att.capturedAt && (
                        <span className="badge badge-success" style={{ fontSize: '0.675rem', padding: '0.15rem 0.45rem' }}>
                          🕒 Chụp lúc: {formatDate(att.capturedAt)} {new Date(att.capturedAt).toLocaleTimeString('vi-VN')}
                        </span>
                      )}
                      {att.selectedPrice !== undefined && att.selectedPrice > 0 && (
                        <span className="badge badge-info font-mono" style={{ fontSize: '0.675rem', padding: '0.15rem 0.45rem' }}>
                          💰 Giá ghi nhận: {formatCurrency(att.selectedPrice)}
                        </span>
                      )}
                      {att.supplierName && (
                        <span className="badge badge-secondary" style={{ fontSize: '0.675rem', padding: '0.15rem 0.45rem' }}>
                          🏢 {att.supplierName}
                        </span>
                      )}
                      {att.sourceUrl && (
                        <a
                          href={att.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '0.675rem',
                            color: '#38bdf8',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            textDecoration: 'none',
                            backgroundColor: 'rgba(56, 189, 248, 0.12)',
                            padding: '0.15rem 0.45rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                          }}
                          title="Mở trang web nguồn khảo giá trong tab mới"
                        >
                          <ExternalLink size={11} />
                          <span>Truy cập trang</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* [TINH GỌN GIAO DIỆN] Thẻ danh sách các đề xuất thanh toán & giải ngân: Chỉ hiển thị cho Kế toán, Lãnh đạo */}
          {canViewFinancialDetails ? (
            <>
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

              {canCreatePayment && (
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
                {canCreatePayment && (
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
              <div>
                <div className="table-container" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table className="table" style={{ minWidth: '780px' }}>
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
                      {paymentProposals
                        .slice((paymentsPage - 1) * paymentsPageSize, paymentsPage * paymentsPageSize)
                        .map((pay) => (
                          <tr
                            key={pay._id}
                            onClick={() => setViewingPayment(pay)}
                            style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                            title="Bấm vào dòng này để xem chi tiết hóa đơn &amp; in thông tin"
                            className="table-row-clickable"
                          >
                            <td>
                              <span
                                className="font-mono"
                                style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}
                              >
                                {pay.proposalCode || `TT-${pay._id.slice(-6).toUpperCase()}`}
                              </span>
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
                              <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                                {canUserApprovePayment(pay) && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPaymentForApproval(pay);
                                        setIsPaymentApproveOpen(true);
                                      }}
                                      className="btn btn-success btn-sm"
                                      style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', gap: '0.25rem' }}
                                      title="Xác nhận phê duyệt chi"
                                    >
                                      {user?.role === 'chu_tich' ? <Crown size={13} /> : <CheckCircle2 size={13} />}
                                      <span>Duyệt Chi</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPaymentForApproval(pay);
                                        setIsPaymentRejectOpen(true);
                                      }}
                                      className="btn btn-danger btn-sm"
                                      style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem' }}
                                      title="Từ chối duyệt chi"
                                    >
                                      <XCircle size={13} />
                                      <span>Từ chối</span>
                                    </button>
                                  </>
                                )}
                                {pay.attachments && pay.attachments.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePreviewFile(pay.attachments![0]);
                                    }}
                                    className="btn btn-ghost btn-sm"
                                    style={{ padding: '0.25rem 0.4rem', fontSize: '0.75rem' }}
                                    title="Xem hóa đơn/chứng từ đính kèm"
                                  >
                                    <Eye size={14} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPrintPayment(pay);
                                  }}
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--accent-cyan)', gap: '0.25rem' }}
                                  title="In biểu mẫu đề nghị thanh toán / hóa đơn (PDF)"
                                >
                                  <Printer size={13} />
                                  <span>In PDF</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingPayment(pay);
                                  }}
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', gap: '0.35rem' }}
                                >
                                  <Eye size={13} />
                                  <span>Chi tiết</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* THANH PHÂN TRANG DANH SÁCH ĐỀ XUẤT THANH TOÁN */}
                {paymentProposals.length > 5 && (
                  <Pagination
                    currentPage={paymentsPage}
                    totalItems={paymentProposals.length}
                    pageSize={paymentsPageSize}
                    onPageChange={setPaymentsPage}
                    onPageSizeChange={setPaymentsPageSize}
                    pageSizeOptions={[5, 10, 20]}
                    itemName="đề xuất thanh toán"
                  />
                )}
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
        </>
      ) : (
            /* Thông báo tóm tắt ngắn gọn, lịch sự cho Nhân viên đề xuất và Trưởng phòng */
            proposal.status === 'completed' ? (
              <div
                className="card"
                style={{
                  padding: '1.1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                <CheckCircle2 size={22} color="var(--success)" />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--success)', fontSize: '0.95rem' }}>
                    Vật tư đã được hoàn tất mua sắm và thanh toán
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Bộ phận Thu mua và Kế toán đã hoàn tất mọi thủ tục mua sắm &amp; thanh toán cho đơn hàng này.
                  </div>
                </div>
              </div>
            ) : null
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

      {/* 2. MODAL TỪ CHỐI ĐỀ XUẤT (TRẢ VỀ KHÂU TRƯỚC ĐÓ) */}
      <Modal
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        title={user?.role === 'ke_toan' ? 'Kế Toán Từ Chối Hóa Đơn & Yêu Cầu Làm Lại' : 'Từ Chối & Chuyển Về Khâu Trước'}
      >
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {proposal.status === 'pending_tp_approval' && 'Đơn sẽ được chuyển trả về cho Người tạo đơn (nhân viên) để chỉnh sửa lại danh mục hoặc giải trình (mã đơn vẫn giữ nguyên).'}
            {(proposal.status === 'pending_director_approval' || proposal.status === 'pending_chairman_approval') && 'Báo giá sẽ được chuyển trả về cho bộ phận Thu mua để khảo sát lại 3-4 nhà cung cấp khác hoặc đàm phán lại giá.'}
            {(proposal.status === 'pending_accounting' || proposal.status === 'accounting_review') && 'Hồ sơ chứng từ sẽ được chuyển trả về cho Thu mua để bổ sung/sửa đổi hóa đơn VAT hoặc hợp đồng hợp lệ.'}
            {!['pending_tp_approval', 'pending_director_approval', 'pending_chairman_approval', 'pending_accounting', 'accounting_review'].includes(proposal.status) && 'Vui lòng nêu rõ lý do từ chối để người chịu trách nhiệm ở khâu trước đó tiếp nhận và xử lý lại:'}
          </p>
        </div>
        <div className="form-group">
          <label className="form-label">{user?.role === 'ke_toan' ? 'Lý do từ chối hóa đơn / hồ sơ' : 'Lý do từ chối'} <span className="required">*</span></label>
          <textarea
            className="form-textarea"
            required
            rows={3}
            placeholder={user?.role === 'ke_toan' ? 'Nhập lý do từ chối hóa đơn / chứng từ (VD: Hóa đơn mờ, sai MST, số tiền không khớp hợp đồng...)...' : 'Nêu rõ lý do từ chối để người ở khâu trước đó biết cần chỉnh sửa hoặc bổ sung những gì...'}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </div>
        <div className="modal-footer" style={{ margin: '1.5rem -1.65rem -1.65rem -1.65rem' }}>
          <button onClick={() => setIsRejectOpen(false)} className="btn btn-secondary">Hủy</button>
          <button onClick={handleReject} disabled={actionLoading || !rejectReason.trim()} className="btn btn-danger">
            {actionLoading ? 'Đang xử lý...' : (user?.role === 'ke_toan' ? 'Xác Nhận Từ Chối & Yêu Cầu Thu Mua Sửa' : 'Xác Nhận Từ Chối & Chuyển Về Khâu Trước')}
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
          {aiQuotaExceeded ? (
            <button
              type="button"
              className="btn btn-secondary disabled"
              disabled
              style={{ padding: '0.75rem', justifyContent: 'center', opacity: 0.65, cursor: 'not-allowed' }}
              title={aiErrorMsg || 'Hạn mức AI tạm không khả dụng'}
            >
              <AlertCircle size={17} color="var(--warning)" />
              <span>1. AI Tra Giá (Hết Quota/Token - Không khả dụng)</span>
            </button>
          ) : (
            <button
              type="button"
              className={`btn ${pricingMethod === 'ai' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPricingMethod('ai')}
              style={{ padding: '0.75rem', justifyContent: 'center' }}
            >
              <Sparkles size={17} />
              <span>1. Dùng AI Tự Động Tra Giá (Tùy Chọn)</span>
            </button>
          )}

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

        {/* Thông báo cảnh báo nếu hết Quota / Token */}
        {aiQuotaExceeded && (
          <div
            style={{
              padding: '0.85rem 1.15rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}
          >
            <AlertCircle size={18} color="var(--danger)" />
            <span>
              <strong>Thông báo hạn mức:</strong> Hạn mức API AI (Quota/Token) tạm thời không khả dụng. Bạn có thể chuyển sang phương thức <strong>"Điền Giá Thủ Công & Đính Kèm File Báo Giá"</strong> để tiếp tục lập báo giá bình thường.
            </span>
          </div>
        )}

        {/* === OPTION 1: DÙNG AI TỰ ĐỘNG TRA CỨU GIÁ NHÀ CUNG CẤP (TÙY CHỌN) === */}
        {pricingMethod === 'ai' && (
          <div>
            {!aiQuotaExceeded && (
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
                    {aiSuggestions.length > 0
                      ? 'AI đã quét và trích xuất bảng chào giá từ các nhà cung cấp uy tín:'
                      : 'Tính năng khảo giá AI (tùy chọn - chỉ chạy khi bạn yêu cầu):'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleFetchAISuggestions}
                  disabled={aiLoading}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '0.75rem' }}
                >
                  {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  <span>{aiSuggestions.length > 0 ? 'Quét lại giá AI' : 'Bắt đầu quét giá AI'}</span>
                </button>
              </div>
            )}

            {aiLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0', gap: '0.75rem' }}>
                <Loader2 size={36} className="animate-spin" color="var(--primary)" />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  AI đang tra cứu cơ sở dữ liệu nhà cung cấp & so sánh đơn giá thị trường...
                </span>
              </div>
            ) : aiSuggestions.length === 0 ? (
              <div
                style={{
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px dashed var(--border-color)',
                  marginBottom: '1rem',
                }}
              >
                <Sparkles size={36} color="var(--primary)" style={{ margin: '0 auto 0.75rem auto' }} />
                <h4 style={{ color: '#ffffff', marginBottom: '0.4rem', fontSize: '1rem' }}>
                  Khảo Sát Đơn Giá Thị Trường Tự Động Bằng AI
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 1.25rem auto' }}>
                  Nhấn nút bên dưới để AI tự động tìm kiếm bảng giá và đề xuất ít nhất 3 nhà cung cấp cho mỗi hạng mục vật tư trong đơn. Nếu không muốn dùng AI, bạn có thể chuyển sang tab <strong>Điền Giá Thủ Công</strong>.
                </p>
                <button
                  type="button"
                  onClick={handleFetchAISuggestions}
                  className="btn btn-primary"
                >
                  <Sparkles size={16} />
                  <span>Kích Hoạt Khảo Giá Bằng AI</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '55vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {aiSuggestions.map((itemSug: any, idx: number) => {
                  const itemId = itemSug.itemId || proposal.items[idx]?._id;
                  const currentSelected = selectedSuppliers[itemId];

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
                            Số lượng: <strong>{itemSug.soLuong}</strong>
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
                                    <div style={{ marginBottom: '0.45rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                      {/* [NÚT MỚI] TRUY CẬP TRANG TRỰC TIẾP TRONG TAB MỚI ĐỂ CHECK GIÁ NHANH */}
                                      <a
                                        href={supp.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '0.3rem',
                                          color: '#ffffff',
                                          fontSize: '0.725rem',
                                          fontWeight: 600,
                                          backgroundColor: '#0284c7',
                                          padding: '0.25rem 0.55rem',
                                          borderRadius: 'var(--radius-sm)',
                                          border: '1px solid #38bdf8',
                                          textDecoration: 'none',
                                          cursor: 'pointer',
                                          boxShadow: '0 2px 6px rgba(2, 132, 199, 0.35)',
                                        }}
                                        title={`Mở trực tiếp trang web của ${supp.name} trong tab mới ngoài trình duyệt để kiểm tra giá`}
                                      >
                                        <ExternalLink size={12} />
                                        <span>🔗 Truy Cập Trang</span>
                                      </a>

                                      {/* [NÚT 2] XEM TRONG POPUP & CHỤP GIỮ ẢNH CÓ DẤU GIÁ VÀ GIỜ */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setWebPreviewModal({
                                            isOpen: true,
                                            url: supp.url,
                                            supplierName: supp.name,
                                            price: Number(supp.price) || 0,
                                            itemName: itemSug.tenVatTu,
                                            itemQuantity: itemSug.soLuong || 1,
                                            itemId: String(itemId),
                                          });
                                        }}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '0.3rem',
                                          color: '#38bdf8',
                                          fontSize: '0.725rem',
                                          fontWeight: 600,
                                          backgroundColor: 'rgba(56, 189, 248, 0.12)',
                                          padding: '0.25rem 0.55rem',
                                          borderRadius: 'var(--radius-sm)',
                                          border: '1px solid rgba(56, 189, 248, 0.3)',
                                          cursor: 'pointer',
                                        }}
                                        title="Bấm để mở popup xem trang web và chụp giữ ảnh chứng từ lưu vào đơn"
                                      >
                                        <Monitor size={12} />
                                        <span>🌐 Xem Web &amp; Chụp Giữ Ảnh</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          try {
                                            const now = new Date();
                                            const proofFile = await generatePriceProofCanvas({
                                              itemName: itemSug.tenVatTu,
                                              itemQuantity: itemSug.soLuong || 1,
                                              supplierName: supp.name,
                                              price: Number(supp.price) || 0,
                                              sourceUrl: supp.url,
                                              capturedAtDate: now,
                                            });
                                            const localAtt: LocalAttachment = {
                                              file: proofFile,
                                              name: proofFile.name,
                                              url: URL.createObjectURL(proofFile),
                                              size: proofFile.size,
                                              type: 'image/png',
                                              isLocal: true,
                                              capturedAt: now.toISOString(),
                                              selectedPrice: Number(supp.price) || 0,
                                              supplierName: supp.name,
                                              sourceUrl: supp.url,
                                            };
                                            handleProofCaptured(localAtt, Number(supp.price) || 0, supp.name, String(itemId));
                                            alert(`Đã giữ ảnh chứng từ giá cho ${supp.name} (${formatCurrency(Number(supp.price) || 0)}) kèm ngày giờ chụp!`);
                                          } catch (err: any) {
                                            alert('Lỗi tạo chứng từ: ' + err.message);
                                          }
                                        }}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '0.25rem',
                                          color: '#10b981',
                                          fontSize: '0.7rem',
                                          fontWeight: 600,
                                          backgroundColor: 'rgba(16, 185, 129, 0.12)',
                                          padding: '0.25rem 0.45rem',
                                          borderRadius: 'var(--radius-sm)',
                                          border: '1px solid rgba(16, 185, 129, 0.3)',
                                          cursor: 'pointer',
                                        }}
                                        title="Chụp ngay ảnh chứng từ khảo giá kèm ngày giờ & giá chọn"
                                      >
                                        <Camera size={12} />
                                        <span>📸 Giữ Ảnh</span>
                                      </button>
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
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div style={{ gridColumn: '1 / -1', padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                            Chưa có dữ liệu nhà cung cấp cho mục này.
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '40vh', overflowY: 'auto', marginBottom: '1.25rem' }}>
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
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      #{item.stt || idx + 1}. {item.tenVatTu}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      PB: {item.phongBanSuDung || '—'} • SL: <strong>{item.soLuong || 1}</strong>
                      {item.yeuCauKiThuat ? ` • Yêu cầu: ${item.yeuCauKiThuat}` : ''}
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
                      value={selectedSuppliers[String(item._id)]?.name || selectedSuppliers[item._id!]?.name || item.nhaCungCap || ''}
                      onChange={(e) => {
                        const suppName = e.target.value;
                        const idStr = String(item._id || '');
                        const p = getPriceForItem(item);
                        setSelectedSuppliers((prev) => ({
                          ...prev,
                          [idStr]: { name: suppName, price: p },
                          [item._id!]: { name: suppName, price: p },
                        }));
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      Đơn giá thực tế (VNĐ) <span style={{ color: 'var(--danger)' }}>*</span>:
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Nhập đơn giá..."
                      className="form-input font-mono"
                      value={getPriceForItem(item) > 0 ? getPriceForItem(item) : ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        const cleanPrice = isNaN(val) ? 0 : val;
                        const idStr = String(item._id || '');
                        setProcurementPrices((prev) => ({
                          ...prev,
                          [idStr]: cleanPrice,
                          [item._id!]: cleanPrice,
                        }));
                        setSelectedSuppliers((prev) => ({
                          ...prev,
                          [idStr]: {
                            name: prev[idStr]?.name || prev[item._id!]?.name || item.nhaCungCap || '',
                            price: cleanPrice,
                          },
                          [item._id!]: {
                            name: prev[idStr]?.name || prev[item._id!]?.name || item.nhaCungCap || '',
                            price: cleanPrice,
                          },
                        }));
                      }}
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
                  Chưa có tài liệu đính kèm. Vui lòng tải lên bảng chào giá từ đối tác hoặc dùng nút <strong>"📸 Giữ Ảnh"</strong> trong phần Khảo giá bằng AI để chụp lại màn hình chứng từ.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.65rem' }}>
                  {quotationAttachments.map((file, fIdx) => (
                    <div
                      key={fIdx}
                      style={{
                        padding: '0.55rem 0.75rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.75rem',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                          {file.capturedAt ? <Camera size={14} color="#10b981" /> : <FileText size={14} color="var(--primary)" />}
                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '160px', fontWeight: 600, color: '#ffffff' }} title={file.name}>
                            {file.name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <button
                            type="button"
                            onClick={() => setPreviewAttachment({ name: file.name, url: file.url, type: file.type })}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '0.2rem', color: 'var(--accent-cyan)' }}
                            title="Xem trước ảnh/tài liệu"
                          >
                            <Eye size={13} />
                          </button>
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
                      </div>

                      {/* Thông tin ngày giờ chụp & giá khảo sát nếu có */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {file.isLocal && (
                          <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                            💾 Lưu tại máy
                          </span>
                        )}
                        {file.capturedAt && (
                          <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                            🕒 Chụp lúc: {formatDate(file.capturedAt)} {new Date(file.capturedAt).toLocaleTimeString('vi-VN')}
                          </span>
                        )}
                        {file.selectedPrice !== undefined && file.selectedPrice > 0 && (
                          <span className="badge badge-info font-mono" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                            💰 {formatCurrency(file.selectedPrice)}
                          </span>
                        )}
                        {file.supplierName && (
                          <span className="badge badge-secondary" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                            🏢 {file.supplierName}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* [LUỒNG MỚI] Văn bản giải trình lý do chọn nhà cung cấp / giá tối ưu */}
        <div className="form-group" style={{ marginTop: '1.25rem' }}>
          <label className="form-label" style={{ fontWeight: 600, color: '#ffffff' }}>
            Văn bản giải trình lý do chọn nhà cung cấp & giá tối ưu <span style={{ color: 'var(--danger)' }}>*</span>:
          </label>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="Giải trình: Đã so sánh giữa các nhà cung cấp, chọn NCC vì giá tốt nhất, thời gian giao hàng nhanh và chất lượng uy tín..."
            value={priceJustification}
            onChange={(e) => setPriceJustification(e.target.value)}
          />
        </div>

        {/* [LUỒNG MỚI] Khối tự động tổng hợp chi phí thực tế theo thời gian thực (từ mọi nguồn: AI hoặc nhập tay) */}
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
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tổng Hạng Mục Khảo Giá</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }} className="font-mono">
              {proposal.items.length} hạng mục vật tư
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tổng Tiền Thực Tế Sau Khảo Giá</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }} className="font-mono">
              {formatCurrency(
                proposal.items.reduce(
                  (sum, item) => sum + ((Number(item.soLuong) || 1) * getPriceForItem(item)),
                  0
                )
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ margin: '1.5rem -1.65rem -1.65rem -1.65rem' }}>
          <button onClick={() => setIsProcurementOpen(false)} className="btn btn-secondary">Hủy Bỏ</button>
          <button onClick={handleProcurementSubmit} disabled={actionLoading} className="btn btn-primary">
            {actionLoading ? 'Đang gửi...' : 'Gửi Báo Giá & Giải Trình Lên Giám Đốc'}
          </button>
        </div>
      </Modal>

      {/* [LUỒNG MỚI] BƯỚC 4: MODAL THU MUA ĐỀ XUẤT THANH TOÁN CHO KẾ TOÁN DUYỆT */}
      <Modal
        isOpen={isProcurementExecutionOpen}
        onClose={() => setIsProcurementExecutionOpen(false)}
        title="Thu Mua Đề Xuất Thanh Toán Cho Kế Toán Duyệt"
        maxWidth="720px"
      >
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Giám đốc đã phê duyệt mua sắm với tổng giá chốt: <strong style={{ color: 'var(--success)' }}>{formatCurrency(totalActual)}</strong>.
            Thu mua cung cấp thông tin Hóa đơn thanh toán kèm ảnh minh chứng và đính kèm đơn tạm ứng hợp đồng (nếu có) để gửi Kế toán làm thủ tục thanh toán:
          </p>
        </div>

        {/* Khối 1: THÔNG TIN HÓA ĐƠN THANH TOÁN */}
        <div className="card" style={{ padding: '1.15rem', marginBottom: '1.25rem', border: '1px solid rgba(56, 189, 248, 0.3)', backgroundColor: 'rgba(56, 189, 248, 0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#38bdf8', fontWeight: 700, fontSize: '0.95rem' }}>
            <Receipt size={18} />
            <span>THÔNG TIN HÓA ĐƠN THANH TOÁN</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.825rem' }}>
                Ngày Hóa Đơn <span className="required">*</span>
              </label>
              <input
                type="date"
                className="form-input"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                Mặc định là ngày làm hôm nay, có thể thay đổi theo ngày trên hóa đơn thực tế.
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.825rem' }}>
                Giá Của Hóa Đơn (VNĐ) <span className="required">*</span>
              </label>
              <input
                type="number"
                min="0"
                className="form-input font-mono"
                placeholder="Nhập giá trị hóa đơn..."
                value={invoiceAmount || ''}
                onChange={(e) => setInvoiceAmount(Number(e.target.value))}
              />
              <div style={{ fontSize: '0.75rem', color: '#86efac', fontWeight: 600, marginTop: '0.2rem' }}>
                {formatCurrency(invoiceAmount || totalActual)}
              </div>
            </div>
          </div>

          {/* Đính kèm ảnh / file minh chứng hóa đơn thanh toán */}
          <div style={{ padding: '0.85rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#ffffff' }}>
                Ảnh / Tài Liệu Minh Chứng Hóa Đơn (Kế toán kiểm chứng)
              </span>
              <label
                className={`btn btn-secondary btn-sm ${uploadingInvoice ? 'disabled' : ''}`}
                style={{ cursor: uploadingInvoice ? 'not-allowed' : 'pointer', fontSize: '0.75rem', gap: '0.35rem' }}
              >
                {uploadingInvoice ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                <span>{uploadingInvoice ? 'Đang tải...' : 'Tải Ảnh Hóa Đơn'}</span>
                <input
                  type="file"
                  multiple
                  disabled={uploadingInvoice}
                  accept="image/*,.pdf"
                  style={{ display: 'none' }}
                  onChange={handleUploadInvoiceFiles}
                />
              </label>
            </div>

            {invoiceFiles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '0.85rem 0', color: 'var(--text-muted)', fontSize: '0.775rem' }}>
                Chưa đính kèm ảnh minh chứng hóa đơn. Hãy bấm "Tải Ảnh Hóa Đơn" để gửi ảnh chụp hóa đơn cho Kế toán đối chiếu.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
                {invoiceFiles.map((file, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.35rem 0.6rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                      <FileText size={14} color="var(--primary)" />
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }} title={file.name}>
                        {file.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveInvoiceFile(idx)}
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--danger)', padding: '0.2rem' }}
                      title="Xóa"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Khối 2: ĐÍNH KÈM TẠM ỨNG HỢP ĐỒNG (Gắn với hóa đơn, duyệt quy trình như bình thường, có thêm trường hóa đơn thụ hưởng) */}
        <div
          className="card"
          style={{
            padding: '1.15rem',
            marginBottom: '1rem',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            backgroundColor: 'rgba(245, 158, 11, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontWeight: 700, fontSize: '0.95rem' }}>
              <Banknote size={18} />
              <span>ĐÍNH KÈM TẠM ỨNG HỢP ĐỒNG</span>
            </div>
            {/* Nút lập nhanh đơn tạm ứng hợp đồng gắn với hóa đơn này */}
            <Link
              to={`/advance/create?purchaseProposalId=${proposal._id}&invoiceDate=${encodeURIComponent(invoiceDate)}&invoiceAmount=${invoiceAmount || totalActual}`}
              target="_blank"
              className="btn btn-warning btn-sm"
              style={{
                fontSize: '0.75rem',
                gap: '0.35rem',
                backgroundColor: '#f59e0b',
                color: '#000000',
                fontWeight: 700,
                padding: '0.35rem 0.75rem',
              }}
              title="Lập mới 1 đơn tạm ứng hợp đồng gắn trực tiếp thông tin hóa đơn thụ hưởng này"
            >
              <PlusCircle size={14} />
              <span>+ Lập Đơn Tạm Ứng Gắn Với Hóa Đơn Này</span>
            </Link>
          </div>

          <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginBottom: '0.85rem', lineHeight: 1.45 }}>
            Đơn tạm ứng hợp đồng là đơn tạm ứng gắn liền với hóa đơn thụ hưởng này, được duyệt theo quy trình tạm ứng bình thường (Lãnh đạo → Kế toán giải ngân → Hoàn ứng) và có thể tra cứu qua lại 2 chiều.
          </p>

          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
            <label className="form-label" style={{ fontSize: '0.825rem' }}>
              Chọn Đơn Tạm Ứng Hợp Đồng Để Đính Kèm:
            </label>
            <select
              className="form-select"
              value={selectedAdvanceProposalId}
              onChange={(e) => {
                const advId = e.target.value;
                setSelectedAdvanceProposalId(advId);
                if (advId) {
                  const target = relatedAdvanceProposals.find((a) => a._id === advId);
                  if (target) {
                    setIsAdvanced(true);
                    setAdvanceAmount(target.totalAmount);
                    setAdvanceNote(target.proposalCode);
                  }
                } else {
                  setIsAdvanced(false);
                  setAdvanceAmount(0);
                  setAdvanceNote('');
                }
              }}
            >
              <option value="">-- Không đính kèm đơn tạm ứng --</option>
              {relatedAdvanceProposals.map((adv) => (
                <option key={adv._id} value={adv._id}>
                  {adv.proposalCode} — Số tiền: {Number(adv.totalAmount || 0).toLocaleString('vi-VN')} đ — [{adv.status === 'completed' ? 'Đã hoàn tất' : adv.status === 'disbursed' ? 'Đã giải ngân' : adv.status === 'approved' ? 'Đã duyệt' : 'Đang xử lý'}]
                </option>
              ))}
            </select>
          </div>

          {/* Chi tiết đơn tạm ứng được chọn và nút xem 2 chiều */}
          {selectedAdvanceProposalId && (
            (() => {
              const selectedAdv = relatedAdvanceProposals.find((a) => a._id === selectedAdvanceProposalId);
              if (!selectedAdv) return null;
              return (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.65rem',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                      Đơn tạm ứng: <strong className="font-mono" style={{ color: '#fef08a' }}>{selectedAdv.proposalCode}</strong>
                    </div>
                    <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      Số tiền: <strong className="font-mono" style={{ color: '#86efac' }}>{formatCurrency(selectedAdv.totalAmount)}</strong>
                      {' • '}Người lập: <strong>{selectedAdv.creator?.fullName || 'Thu mua'}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Link
                      to={`/advance/${selectedAdv._id}`}
                      target="_blank"
                      className="btn btn-secondary btn-sm"
                      style={{ gap: '0.35rem', fontSize: '0.75rem' }}
                      title="Xem chi tiết đơn tạm ứng này trên tab mới"
                    >
                      <ExternalLink size={13} />
                      <span>Xem Đơn Tạm Ứng (2 Chiều)</span>
                    </Link>
                  </div>
                </div>
              );
            })()
          )}
        </div>

        {/* [QUY TRÌNH MỚI] Hệ thống tự động tính số tiền cần hoàn trả và in ra màn hình */}
        {(selectedAdvanceProposalId || isAdvanced || (advanceAmount > 0)) && (
          (() => {
            const currentAdv = Number(advanceAmount) || 0;
            const currentInv = Number(invoiceAmount || totalActual) || 0;
            const diff = currentAdv - currentInv; // Hoàn tạm ứng = tiền tạm ứng - giá hóa đơn thực tế

            return (
              <div
                style={{
                  padding: '1rem 1.15rem',
                  backgroundColor: diff > 0 ? 'rgba(245, 158, 11, 0.12)' : diff < 0 ? 'rgba(56, 189, 248, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${diff > 0 ? 'rgba(245, 158, 11, 0.4)' : diff < 0 ? 'rgba(56, 189, 248, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem', color: diff > 0 ? '#fef08a' : diff < 0 ? '#bae6fd' : '#86efac', marginBottom: '0.5rem' }}>
                  <Calculator size={18} />
                  <span>KẾT QUẢ TỰ ĐỘNG TÍNH SỐ TIỀN CẦN HOÀN TRẢ TẠM ỨNG</span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.825rem', marginBottom: '0.65rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Số tiền đã tạm ứng:</span>
                    <div className="font-mono" style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.95rem' }}>
                      {formatCurrency(currentAdv)}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Giá hóa đơn thực tế:</span>
                    <div className="font-mono" style={{ fontWeight: 700, color: '#86efac', fontSize: '0.95rem' }}>
                      {formatCurrency(currentInv)}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {diff > 0 ? 'Số tiền cần hoàn tạm ứng (Dư):' : diff < 0 ? 'Số tiền công ty cần chi bù (Thiếu):' : 'Đối soát tạm ứng:'}
                    </span>
                    <div
                      className="font-mono"
                      style={{
                        fontWeight: 800,
                        fontSize: '1.05rem',
                        color: diff > 0 ? '#f59e0b' : diff < 0 ? '#38bdf8' : '#22c55e',
                      }}
                    >
                      {diff > 0
                        ? formatCurrency(diff)
                        : diff < 0
                        ? formatCurrency(Math.abs(diff))
                        : '0 đ (Vừa đủ 100%)'}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.45, borderTop: '1px dashed rgba(255, 255, 255, 0.1)', paddingTop: '0.45rem' }}>
                  💡 <em>
                    {diff > 0
                      ? `Tạm ứng dư ${formatCurrency(diff)}. Chương trình sẽ gửi 3 thông tin (Hóa đơn, Thông tin hóa đơn, Số tiền cần hoàn tạm ứng: ${formatCurrency(diff)}) trực tiếp cho Kế toán. Kế toán chỉ cần bấm xác nhận để hoàn thành hoặc từ chối để thu mua làm lại (không có bước yêu cầu kế toán xác nhận đã chuyển trả lại kế toán).`
                      : diff < 0
                      ? `Hóa đơn thực tế cao hơn tiền tạm ứng ${formatCurrency(Math.abs(diff))}. Kế toán sẽ nhận được thông tin để xác nhận hoặc lập đề xuất thanh toán chi bù.`
                      : 'Hóa đơn vừa khớp đúng 100% số tiền đã tạm ứng. Kế toán chỉ cần bấm Xác nhận để hoàn thành.'}
                  </em>
                </div>
              </div>
            );
          })()
        )}

        {/* Tóm tắt hồ sơ đề xuất thanh toán sẽ gửi sang Kế toán */}
        <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Tóm tắt hồ sơ đề xuất thanh toán gửi Kế toán:</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className={`badge ${invoiceDate ? 'badge-primary' : 'badge-secondary'}`}>
              Ngày HĐ: {invoiceDate ? formatDate(invoiceDate) : 'Chưa chọn'}
            </span>
            <span className={`badge ${invoiceAmount ? 'badge-info' : 'badge-secondary'}`}>
              Giá HĐ: {formatCurrency(invoiceAmount || totalActual)}
            </span>
            <span className={`badge ${invoiceFiles.length > 0 ? 'badge-success' : 'badge-secondary'}`}>
              Ảnh minh chứng: {invoiceFiles.length} tệp
            </span>
            <span className={`badge ${selectedAdvanceProposalId || isAdvanced ? 'badge-warning' : 'badge-secondary'}`}>
              Tạm ứng hợp đồng: {selectedAdvanceProposalId ? `Đã đính kèm (${formatCurrency(advanceAmount || 0)})` : 'Không'}
            </span>
          </div>
        </div>

        <div className="modal-footer" style={{ margin: '1.5rem -1.65rem -1.65rem -1.65rem' }}>
          <button onClick={() => setIsProcurementExecutionOpen(false)} className="btn btn-secondary">Hủy</button>
          <button onClick={handleProcurementExecutionSubmit} disabled={actionLoading} className="btn btn-primary">
            {actionLoading ? 'Đang nộp...' : 'Nộp Đề Xuất Thanh Toán Sang Kế Toán'}
          </button>
        </div>
      </Modal>

      {/* [LUỒNG MỚI] BƯỚC 5: MODAL KẾ TOÁN XỬ LÝ CHỨNG TỪ & TẤT TOÁN */}
      <Modal isOpen={isAccountingOpen} onClose={() => setIsAccountingOpen(false)} title="Kế Toán Xử Lý Chứng Từ & Tất Toán">
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Kế toán kiểm tra chứng từ do Thu mua nộp với tổng giá trị: <strong>{formatCurrency(totalActual)}</strong> để hoàn tất thanh toán / tất toán hồ sơ.
          </p>
        </div>
        <div className="form-group">
          <label className="form-label">Ý kiến / Ghi chú kế toán:</label>
          <textarea
            className="form-textarea"
            placeholder="Đã đối chiếu chứng từ hóa đơn, đã chi tiền / hoàn tất đề xuất..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        <div className="modal-footer" style={{ margin: '1.5rem -1.65rem -1.65rem -1.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button onClick={() => setIsAccountingOpen(false)} className="btn btn-secondary">Hủy</button>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setIsAccountingOpen(false);
                setRejectReason('');
                setIsRejectOpen(true);
              }}
              className="btn btn-danger"
              style={{ gap: '0.35rem' }}
            >
              <XCircle size={15} />
              <span>Từ Chối Hóa Đơn</span>
            </button>
            <Link
              to={`/payment/create?purchaseProposalId=${proposal._id}`}
              className="btn btn-secondary"
              style={{ gap: '0.35rem', color: 'var(--accent-cyan)' }}
            >
              <CreditCard size={15} />
              <span>Lập Đề Xuất Thanh Toán</span>
            </Link>
            <button onClick={handleAccountingConfirm} disabled={actionLoading} className="btn btn-primary">
              {actionLoading ? 'Đang xử lý...' : 'Xác Nhận & Hoàn Tất Đề Xuất'}
            </button>
          </div>
        </div>
      </Modal>

      {/* [LUỒNG MỚI] BƯỚC 3: MODAL GIÁM ĐỐC / CHỦ TỊCH PHÊ DUYỆT BÁO GIÁ ĐỂ LÀM HỢP ĐỒNG */}
      <Modal
        isOpen={isFinalApproveOpen}
        onClose={() => setIsFinalApproveOpen(false)}
        title={isOverTenMillion ? 'Chủ Tịch Phê Duyệt Mua Sắm & Làm Hợp Đồng' : 'Giám Đốc Phê Duyệt Mua Sắm & Làm Hợp Đồng'}
      >
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Với tư cách <strong>{getRoleLabel(user?.role)}</strong>, bạn xem xét 3-4 báo giá và giải trình của Thu mua, phê duyệt tổng số tiền{' '}
            <strong style={{ color: 'var(--success)' }}>{formatCurrency(totalActual)}</strong> để Thu mua tiến hành làm hợp đồng và mua sắm.
          </p>
          {isOverTenMillion && (
            <p style={{ fontSize: '0.8rem', color: '#facc15', marginTop: '0.35rem' }}>
              ⭐ Đơn mua sắm có tổng giá trị hàng hóa &gt; 10.000.000 VNĐ thuộc thẩm quyền phê duyệt trực tiếp của Chủ tịch.
            </p>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Ý kiến chỉ đạo:</label>
          <textarea
            className="form-textarea"
            placeholder="Đồng ý mua theo báo giá của nhà cung cấp tối ưu để tiến hành làm hợp đồng mua sắm..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        <div className="modal-footer" style={{ margin: '1.5rem -1.65rem -1.65rem -1.65rem' }}>
          <button onClick={() => setIsFinalApproveOpen(false)} className="btn btn-secondary">Hủy</button>
          <button onClick={handleFinalApprove} disabled={actionLoading} className="btn btn-success">
            {actionLoading ? 'Đang duyệt...' : (isOverTenMillion ? 'Chủ Tịch Phê Duyệt & Cho Phép Mua' : 'GĐ Phê Duyệt & Cho Phép Mua')}
          </button>
        </div>
      </Modal>

      {/* 6. MODAL XEM TRỰC TIẾP FILE BÁO GIÁ / HÓA ĐƠN / HỢP ĐỒNG (HỖ TRỢ ZOOM, XOAY, FULLSCREEN) */}
      <FilePreviewModal
        isOpen={!!previewAttachment}
        onClose={() => setPreviewAttachment(null)}
        file={previewAttachment}
        files={previewFileList}
        initialIndex={previewFileIndex}
        title="Kiểm Tra Chứng Từ / Báo Giá / Hóa Đơn"
      />

      {/* [LUỒNG MỚI] MODAL NGƯỜI TẠO ĐƠN CHỈNH SỬA & GỬI LẠI ĐƠN KHI BỊ TRƯỞNG PHÒNG TỪ CHỐI */}
      <Modal
        isOpen={isResubmitOpen}
        onClose={() => setIsResubmitOpen(false)}
        title={`Chỉnh Sửa & Gửi Lại Yêu Cầu (${proposal.proposalCode})`}
        maxWidth="800px"
      >
        <div style={{ marginBottom: '1.25rem' }}>
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#fca5a5',
              fontSize: '0.825rem',
              marginBottom: '1rem',
            }}
          >
            <strong>Lý do Trưởng phòng từ chối trước đó:</strong> {proposal.rejectionReason}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Vui lòng rà soát, chỉnh sửa danh mục vật tư hoặc bổ sung lý do cần thiết và gửi lại. Đơn sẽ được chuyển tới Trưởng phòng duyệt lại từ đầu nhưng vẫn mang mã cũ: <strong style={{ color: '#ffffff' }} className="font-mono">{proposal.proposalCode}</strong>.
          </p>
        </div>

        {/* Danh sách vật tư chỉnh sửa */}
        <div className="card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff' }}>Danh Mục Vật Tư Yêu Cầu</span>
            <button
              type="button"
              onClick={() =>
                setResubmitItems((prev) => [
                  ...prev,
                  {
                    stt: prev.length + 1,
                    tenVatTu: '',
                    yeuCauKiThuat: '',
                    phongBanSuDung: proposal.department?.name || '',
                    soLuong: 1,
                    donGiaDuKien: 0,
                  },
                ])
              }
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem' }}
            >
              + Thêm dòng vật tư
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {resubmitItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1.5fr 1fr 90px 40px',
                  gap: '0.5rem',
                  alignItems: 'center',
                  padding: '0.5rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ textAlign: 'center', fontWeight: 600, fontSize: '0.8rem' }}>{idx + 1}</span>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                  placeholder="Tên vật tư *"
                  value={item.tenVatTu}
                  onChange={(e) => {
                    const next = [...resubmitItems];
                    next[idx].tenVatTu = e.target.value;
                    setResubmitItems(next);
                  }}
                />
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                  placeholder="Yêu cầu kĩ thuật"
                  value={item.yeuCauKiThuat}
                  onChange={(e) => {
                    const next = [...resubmitItems];
                    next[idx].yeuCauKiThuat = e.target.value;
                    setResubmitItems(next);
                  }}
                />
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem', textAlign: 'center' }}
                  value={item.soLuong}
                  onChange={(e) => {
                    const next = [...resubmitItems];
                    next[idx].soLuong = Number(e.target.value);
                    setResubmitItems(next);
                  }}
                />
                {resubmitItems.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setResubmitItems((prev) => prev.filter((_, i) => i !== idx))}
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--danger)', padding: '0.2rem' }}
                  >
                    <Trash2 size={14} />
                  </button>
                ) : <div />}
              </div>
            ))}
          </div>
        </div>

        {/* Giải trình tính cần thiết */}
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label">Giải trình lý do / tính cần thiết:</label>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="Giải trình bổ sung để Trưởng phòng phê duyệt..."
            value={resubmitReason}
            onChange={(e) => setResubmitReason(e.target.value)}
          />
        </div>

        {/* Ảnh minh chứng */}
        <div className="card" style={{ padding: '0.85rem', border: '1px dashed var(--border-color)', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#ffffff' }}>
              Ảnh / Tài liệu minh chứng ({resubmitAttachments.length})
            </span>
            <label
              className={`btn btn-secondary btn-sm ${resubmitUploading ? 'disabled' : ''}`}
              style={{ cursor: resubmitUploading ? 'not-allowed' : 'pointer', fontSize: '0.75rem', gap: '0.35rem' }}
            >
              {resubmitUploading ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
              <span>{resubmitUploading ? 'Đang tải...' : 'Tải thêm ảnh'}</span>
              <input
                type="file"
                multiple
                disabled={resubmitUploading}
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                onChange={handleUploadResubmitFiles}
              />
            </label>
          </div>

          {resubmitAttachments.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
              {resubmitAttachments.map((file, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.35rem 0.6rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                    <FileText size={14} color="var(--primary)" />
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }} title={file.name}>
                      {file.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResubmitAttachments((prev) => prev.filter((_, i) => i !== idx))}
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--danger)', padding: '0.2rem' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ margin: '1.5rem -1.65rem -1.65rem -1.65rem' }}>
          <button onClick={() => setIsResubmitOpen(false)} className="btn btn-secondary">Hủy</button>
          <button onClick={handleResubmit} disabled={actionLoading} className="btn btn-primary">
            {actionLoading ? 'Đang gửi...' : 'Gửi Lại Yêu Cầu Cho Trưởng Phòng Duyệt'}
          </button>
        </div>
      </Modal>

      {/* [LUỒNG MỚI] MODAL DUYỆT CHI ĐỀ XUẤT THANH TOÁN (CHỦ TỊCH / GIÁM ĐỐC) */}
      <Modal
        isOpen={isPaymentApproveOpen}
        onClose={() => {
          setIsPaymentApproveOpen(false);
          setSelectedPaymentForApproval(null);
        }}
        title={
          user?.role === 'chu_tich'
            ? '👑 Chủ Tịch Xác Nhận Giải Ngân'
            : 'Xác Nhận Giải Ngân Đề Xuất Thanh Toán'
        }
      >
        {selectedPaymentForApproval && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mã đề xuất thanh toán:</span>
                <span className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                  {selectedPaymentForApproval.proposalCode || `TT-${selectedPaymentForApproval._id.slice(-6).toUpperCase()}`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Số tiền duyệt chi:</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--success)' }} className="font-mono">
                  {formatCurrency(selectedPaymentForApproval.amount)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cấp thẩm quyền duyệt:</span>
                <span className={selectedPaymentForApproval.amount > 10000000 ? 'badge badge-purple' : 'badge badge-info'}>
                  {selectedPaymentForApproval.amount > 10000000 ? '👑 Chủ tịch duyệt (> 10 triệu)' : 'Giám đốc duyệt (≤ 10 triệu)'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Đơn vị / Người thụ hưởng:</span>
                <span style={{ fontWeight: 600, color: '#ffffff' }}>
                  {selectedPaymentForApproval.beneficiary?.name || '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Số tài khoản:</span>
                <span className="font-mono" style={{ color: '#ffffff' }}>
                  {selectedPaymentForApproval.beneficiary?.accountNumber} - {selectedPaymentForApproval.beneficiary?.bankName}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nội dung chi:</span>
                <span style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '65%' }}>
                  {selectedPaymentForApproval.paymentReason}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Ý kiến chỉ đạo / Ghi chú phê duyệt chi (tùy chọn):</label>
              <textarea
                className="form-textarea"
                placeholder="Nhập ý kiến chỉ đạo (VD: Đồng ý duyệt chi chuyển khoản đúng tiến độ)..."
                value={paymentComment}
                onChange={(e) => setPaymentComment(e.target.value)}
                rows={3}
              />
            </div>

            <div className="modal-footer" style={{ margin: '0.5rem -1.65rem -1.65rem -1.65rem' }}>
              <button
                type="button"
                onClick={() => {
                  setIsPaymentApproveOpen(false);
                  setSelectedPaymentForApproval(null);
                }}
                className="btn btn-secondary"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleApprovePayment}
                disabled={actionLoading}
                className="btn btn-success"
                style={{ gap: '0.4rem' }}
              >
                {user?.role === 'chu_tich' ? <Crown size={15} /> : <CheckCircle2 size={15} />}
                <span>
                  {actionLoading
                    ? 'Đang xử lý...'
                    : user?.role === 'chu_tich'
                    ? 'Chủ Tịch Xác Nhận Giải Ngân'
                    : 'GĐ Xác Nhận Giải Ngân'}
                </span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* [LUỒNG MỚI] MODAL TỪ CHỐI DUYỆT CHI ĐỀ XUẤT THANH TOÁN */}
      <Modal
        isOpen={isPaymentRejectOpen}
        onClose={() => {
          setIsPaymentRejectOpen(false);
          setSelectedPaymentForApproval(null);
        }}
        title="Từ Chối Phê Duyệt Chi Đề Xuất Thanh Toán"
      >
        {selectedPaymentForApproval && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                padding: '0.85rem 1rem',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                fontSize: '0.85rem',
              }}
            >
              Bạn đang thực hiện <strong>từ chối phê duyệt chi</strong> cho đơn đề xuất thanh toán{' '}
              <strong className="font-mono">{selectedPaymentForApproval.proposalCode}</strong> (
              {formatCurrency(selectedPaymentForApproval.amount)}).
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--danger)' }}>
                Lý do từ chối duyệt chi (bắt buộc):
              </label>
              <textarea
                className="form-textarea"
                placeholder="Nhập chi tiết lý do từ chối (VD: Hồ sơ chứng từ chưa hợp lệ, thiếu hóa đơn gốc...)..."
                value={paymentRejectReason}
                onChange={(e) => setPaymentRejectReason(e.target.value)}
                rows={3}
                required
              />
            </div>

            <div className="modal-footer" style={{ margin: '0.5rem -1.65rem -1.65rem -1.65rem' }}>
              <button
                type="button"
                onClick={() => {
                  setIsPaymentRejectOpen(false);
                  setSelectedPaymentForApproval(null);
                }}
                className="btn btn-secondary"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleRejectPayment}
                disabled={actionLoading || !paymentRejectReason.trim()}
                className="btn btn-danger"
                style={{ gap: '0.4rem' }}
              >
                <XCircle size={15} />
                <span>{actionLoading ? 'Đang xử lý...' : 'Xác Nhận Từ Chối'}</span>
              </button>
            </div>
          </div>
        )}
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
              <span style={{ color: 'var(--text-muted)' }}>Số tiền đã tạm ứng hóa đơn:</span>
              <strong className="font-mono" style={{ color: 'var(--accent-cyan)' }}>
                {formatCurrency(advAmount)}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Giá của hóa đơn thực tế:</span>
              <strong className="font-mono" style={{ color: '#86efac' }}>
                {formatCurrency(invAmount)}
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
                {formatCurrency(Math.abs(advanceDiff))}
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
              <span>{actionLoading ? 'Đang gửi...' : 'Gửi Đề Xuất Hoàn Ứng Cho Thu Mua'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* [QUY TRÌNH MỚI] MODAL KẾ TOÁN XÁC NHẬN HOÀN THÀNH (ĐỐI SOÁT 3 THÔNG TIN TẠM ỨNG & HÓA ĐƠN) */}
      <Modal
        isOpen={isConfirmExactOpen}
        onClose={() => setIsConfirmExactOpen(false)}
        title="Kế Toán Xác Nhận Quyết Toán & Hoàn Thành Hồ Sơ"
        maxWidth="680px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Thông báo quy trình đơn giản hóa */}
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Thu mua đã nộp hồ sơ hóa đơn thực tế. Kế toán kiểm tra 3 thông tin dưới đây và bấm <strong>Xác Nhận Hoàn Thành</strong> để kết thúc hồ sơ (hoặc Từ Chối để yêu cầu Thu mua làm lại):
          </p>

          {/* 3 THÔNG TIN CỦA HỒ SƠ */}
          <div
            style={{
              padding: '1rem 1.15rem',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            {/* THÔNG TIN 1: HÓA ĐƠN THỰC TẾ (FILE / ẢNH) */}
            <div>
              <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Receipt size={16} />
                <span>1. Hóa Đơn Thực Tế ({proposal.procurementExecution?.invoiceInfo?.files?.length || 0} tệp minh chứng):</span>
              </div>
              {proposal.procurementExecution?.invoiceInfo?.files && proposal.procurementExecution.invoiceInfo.files.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {proposal.procurementExecution.invoiceInfo.files.map((file: any, fIdx: number) => (
                    <button
                      key={fIdx}
                      type="button"
                      onClick={() => handlePreviewFile(file, proposal.procurementExecution?.invoiceInfo?.files, fIdx)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', gap: '0.35rem', padding: '0.35rem 0.65rem' }}
                      title="Xem trực tiếp hóa đơn này"
                    >
                      <Eye size={13} color="var(--primary)" />
                      <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.name || `Hóa đơn ${fIdx + 1}`}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  (Không có tệp đính kèm hóa đơn)
                </div>
              )}
            </div>

            {/* THÔNG TIN 2: THÔNG TIN HÓA ĐƠN */}
            <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '0.75rem' }}>
              <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FileText size={16} color="#86efac" />
                <span>2. Thông Tin Hóa Đơn:</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', fontSize: '0.825rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Ngày hóa đơn: </span>
                  <strong style={{ color: '#ffffff' }}>
                    {proposal.procurementExecution?.invoiceInfo?.invoiceDate
                      ? formatDate(proposal.procurementExecution.invoiceInfo.invoiceDate)
                      : formatDate(proposal.updatedAt)}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Giá của hóa đơn thực tế: </span>
                  <strong className="font-mono" style={{ color: '#86efac', fontSize: '0.95rem' }}>
                    {formatCurrency(invAmount)}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Số tiền đã tạm ứng: </span>
                  <strong className="font-mono" style={{ color: 'var(--accent-cyan)' }}>
                    {formatCurrency(advAmount)}
                  </strong>
                </div>
              </div>
            </div>

            {/* THÔNG TIN 3: SỐ TIỀN CẦN HOÀN TẠM ỨNG */}
            <div
              style={{
                borderTop: '1px dashed var(--border-subtle)',
                paddingTop: '0.75rem',
                backgroundColor: advanceDiff > 0 ? 'rgba(245, 158, 11, 0.08)' : advanceDiff < 0 ? 'rgba(56, 189, 248, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                padding: '0.75rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ fontSize: '0.825rem', fontWeight: 700, color: advanceDiff > 0 ? '#fef08a' : advanceDiff < 0 ? '#bae6fd' : '#86efac', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calculator size={16} />
                <span>3. Số Tiền Cần Hoàn Tạm Ứng (Tạm ứng - Giá hóa đơn):</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span
                  className="font-mono"
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: advanceDiff > 0 ? '#f59e0b' : advanceDiff < 0 ? '#38bdf8' : '#22c55e',
                  }}
                >
                  {advanceDiff > 0
                    ? formatCurrency(advanceDiff)
                    : advanceDiff < 0
                    ? `${formatCurrency(Math.abs(advanceDiff))} (Công ty chi bù)`
                    : '0 đ (Vừa đủ 100%)'}
                </span>
                <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                  {advanceDiff > 0
                    ? `(Tạm ứng dư: ${formatCurrency(advAmount)} - Hóa đơn: ${formatCurrency(invAmount)})`
                    : advanceDiff < 0
                    ? `(Tạm ứng thiếu: ${formatCurrency(advAmount)} < Hóa đơn: ${formatCurrency(invAmount)})`
                    : '(Khớp đúng tuyệt đối số tiền tạm ứng)'}
                </span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.825rem' }}>
              Ghi chú xác nhận hoàn thành (tùy chọn):
            </label>
            <textarea
              className="form-textarea"
              placeholder="Nhập ghi chú xác nhận hoàn thành hồ sơ..."
              value={confirmExactComment}
              onChange={(e) => setConfirmExactComment(e.target.value)}
              rows={2}
            />
          </div>

          <div className="modal-footer" style={{ margin: '0.5rem -1.65rem -1.65rem -1.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setIsConfirmExactOpen(false)}
              className="btn btn-secondary"
            >
              Đóng
            </button>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmExactOpen(false);
                  setRejectReason('');
                  setIsRejectOpen(true);
                }}
                className="btn btn-danger"
                style={{ gap: '0.35rem' }}
              >
                <XCircle size={15} />
                <span>Từ Chối (Yêu Cầu Làm Lại)</span>
              </button>
              <button
                type="button"
                onClick={handleConfirmExact}
                disabled={actionLoading}
                className="btn btn-success"
                style={{ gap: '0.4rem', fontWeight: 700 }}
              >
                <CheckCircle2 size={16} />
                <span>{actionLoading ? 'Đang xử lý...' : 'Xác Nhận Hoàn Thành'}</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* [QUY TRÌNH MỚI] MODAL KẾ TOÁN XÁC NHẬN QUYẾT TOÁN KHI THU MUA ĐÃ NỘP HOÀN ỨNG */}
      <Modal
        isOpen={isConfirmSettlementSubmittedOpen}
        onClose={() => setIsConfirmSettlementSubmittedOpen(false)}
        title="Xác Nhận Quyết Toán Hoàn Tạm Ứng"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
            }}
          >
            <div style={{ fontSize: '0.875rem', color: '#ffffff', marginBottom: '0.4rem' }}>
              Thu mua đã nộp hoàn trả số tiền thừa: <strong className="font-mono" style={{ color: '#f59e0b', fontSize: '1rem' }}>{formatCurrency(Math.abs(advanceDiff))}</strong>
            </div>
            {linkedAdvance?.settlement?.purchaserNote && (
              <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                <strong>Ghi chú của Thu mua:</strong> {linkedAdvance.settlement.purchaserNote}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Ghi chú hoàn tất của kế toán (tùy chọn):
            </label>
            <textarea
              className="form-textarea"
              placeholder="Nhập ghi chú quyết toán hoàn ứng..."
              value={confirmSettlementComment}
              onChange={(e) => setConfirmSettlementComment(e.target.value)}
              rows={2}
            />
          </div>

          <div className="modal-footer" style={{ margin: '0.5rem -1.65rem -1.65rem -1.65rem' }}>
            <button
              type="button"
              onClick={() => setIsConfirmSettlementSubmittedOpen(false)}
              className="btn btn-secondary"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirmSettlementSubmitted}
              disabled={actionLoading}
              className="btn btn-success"
              style={{ gap: '0.4rem', fontWeight: 700 }}
            >
              <CheckCircle2 size={16} />
              <span>{actionLoading ? 'Đang xử lý...' : 'Xác Nhận Hoàn Tất Quyết Toán'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* [MỚI] POPUP XEM TRANG WEB NHÀ CUNG CẤP VÀ NÚT GIỮ ẢNH CHỨNG TỪ KHẢO GIÁ */}
      {webPreviewModal && (
        <WebReferenceModal
          isOpen={webPreviewModal.isOpen}
          onClose={() => setWebPreviewModal(null)}
          url={webPreviewModal.url}
          supplierName={webPreviewModal.supplierName}
          price={webPreviewModal.price}
          itemName={webPreviewModal.itemName}
          itemQuantity={webPreviewModal.itemQuantity}
          onCaptureSuccess={(att, p, s) => {
            handleProofCaptured(att, p, s, webPreviewModal.itemId);
          }}
        />
      )}

      {/* MODAL XEM TRƯỚC VÀ IN BIỂU MẪU ĐỀ XUẤT MUA SẮM VẬT TƯ */}
      <PurchasePrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        proposal={proposal}
      />

      {/* MODAL XEM TRƯỚC TÀI LIỆU, ẢNH HÓA ĐƠN, HỢP ĐỒNG, BÁO GIÁ */}
      <FilePreviewModal
        isOpen={Boolean(previewAttachment)}
        onClose={() => setPreviewAttachment(null)}
        file={previewAttachment}
        files={previewFileList}
        initialIndex={previewFileIndex}
        title="Xem Chi Tiết Tài Liệu / Chứng Từ"
      />

      {/* [MỚI] MODAL XEM CHI TIẾT HÓA ĐƠN / ĐỀ XUẤT THANH TOÁN KHI BẤM VÀO DÒNG */}
      <InvoiceDetailModal
        isOpen={Boolean(viewingPayment)}
        onClose={() => setViewingPayment(null)}
        payment={viewingPayment}
        onPrint={(pay) => setPrintPayment(pay)}
        onPreviewFile={(f) => handlePreviewFile(f)}
      />

      {/* [MỚI] MODAL IN PHIẾU ĐỀ NGHỊ THANH TOÁN / HÓA ĐƠN DẠNG PDF */}
      <PaymentPrintModal
        isOpen={Boolean(printPayment)}
        onClose={() => setPrintPayment(null)}
        proposal={printPayment}
      />
    </div>
  );
};

