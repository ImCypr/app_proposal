const PaymentProposal = require('../models/PaymentProposal');
const PurchaseProposal = require('../models/PurchaseProposal');
const User = require('../models/User');

class PaymentProposalService {
  /**
   * Khởi tạo đề xuất thanh toán gắn với một đề xuất mua sắm vật tư
   * Luồng:
   *  - Dưới hoặc bằng 10 triệu (<= 10.000.000 VNĐ) -> Gửi Giám đốc duyệt -> Kế toán giải ngân
   *  - Trên 10 triệu (> 10.000.000 VNĐ) -> Gửi Chủ tịch duyệt -> Kế toán giải ngân
   */
  async create(data, creatorId) {
    const {
      purchaseProposalId,
      beneficiary,
      paymentReason,
      paymentMethod = 'bank_transfer',
      amount,
      amountInWords = '',
      installmentNote = '',
      attachments = [],
      items: inputItems,
      quotationAttachments: inputQuotationAttachments,
      contractInfo: inputContractInfo,
      contractAttachments: inputContractAttachments,
      invoiceInfo: inputInvoiceInfo,
    } = data;

    // 1. Kiểm tra đơn đề xuất mua sắm vật tư căn cứ
    const purchaseProposal = await PurchaseProposal.findById(purchaseProposalId);
    if (!purchaseProposal) {
      throw new Error('Không tìm thấy đơn đề xuất mua sắm vật tư liên quan');
    }

    const creator = await User.findById(creatorId);
    if (!creator) {
      throw new Error('Người tạo đơn không tồn tại trong hệ thống');
    }

    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      throw new Error('Số tiền thanh toán phải lớn hơn 0');
    }

    // [LUỒNG MỚI] Tự động đồng bộ và kế thừa hồ sơ thanh toán:
    // 1. Danh mục yêu cầu vật tư (kế thừa từ đơn mua sắm gốc nếu không truyền)
    let finalItems = [];
    if (inputItems && Array.isArray(inputItems) && inputItems.length > 0) {
      finalItems = inputItems;
    } else if (purchaseProposal.items && purchaseProposal.items.length > 0) {
      finalItems = purchaseProposal.items.map((it, idx) => ({
        stt: it.stt || idx + 1,
        tenVatTu: it.tenVatTu,
        soLuong: Number(it.soLuong) || 1,
        donGiaThucTe: Number(it.donGiaThucTe) || 0,
        nhaCungCap: it.nhaCungCap || '',
        yeuCauKiThuat: it.yeuCauKiThuat || '',
        phongBanSuDung: it.phongBanSuDung || '',
        thanhTien: (Number(it.soLuong) || 1) * (Number(it.donGiaThucTe) || 0),
      }));
    }

    // 2. Bảng báo giá đối tác từ Thu mua
    let finalQuotationAttachments = [];
    if (inputQuotationAttachments && Array.isArray(inputQuotationAttachments) && inputQuotationAttachments.length > 0) {
      finalQuotationAttachments = inputQuotationAttachments;
    } else if (purchaseProposal.quotationAttachments && purchaseProposal.quotationAttachments.length > 0) {
      finalQuotationAttachments = purchaseProposal.quotationAttachments;
    }

    // 3. Hợp đồng kinh tế từ khâu Thu mua mua sắm
    const executionContract = purchaseProposal.procurementExecution?.contractInfo || {};
    const finalContractInfo = inputContractInfo || {
      contractNumber: executionContract.contractNumber || '',
      partnerName: executionContract.partnerName || '',
      files: executionContract.files || [],
    };
    const finalContractAttachments = inputContractAttachments || (finalContractInfo.files || []);

    // 4. Hóa đơn VAT do Thu mua cung cấp
    const executionInvoice = purchaseProposal.procurementExecution?.invoiceInfo || {};
    const finalInvoiceInfo = inputInvoiceInfo || {
      invoiceNumber: executionInvoice.invoiceNumber || '',
      invoiceDate: executionInvoice.invoiceDate || null,
      files: executionInvoice.files || [],
    };

    // [LUỒNG MỚI] TỰ ĐỘNG GOM TOÀN BỘ FILE HỢP ĐỒNG / HÓA ĐƠN DO THU MUA CUNG CẤP VÀO ATTACHMENTS
    // Kế toán không cần phải tải lên lại thủ công
    const autoCollectedAttachments = [...(attachments || [])];
    const existingUrls = new Set(autoCollectedAttachments.map((a) => a.url));

    // Thêm các file hóa đơn do Thu mua nộp
    if (finalInvoiceInfo.files && Array.isArray(finalInvoiceInfo.files)) {
      finalInvoiceInfo.files.forEach((f) => {
        if (f.url && !existingUrls.has(f.url)) {
          existingUrls.add(f.url);
          autoCollectedAttachments.push({
            name: f.name ? (f.name.includes('[Hóa đơn]') ? f.name : `[Hóa đơn Thu mua] ${f.name}`) : 'Hóa đơn VAT',
            url: f.url,
            size: f.size,
            type: f.type,
          });
        }
      });
    }

    // Thêm các file hợp đồng do Thu mua nộp
    if (finalContractInfo.files && Array.isArray(finalContractInfo.files)) {
      finalContractInfo.files.forEach((f) => {
        if (f.url && !existingUrls.has(f.url)) {
          existingUrls.add(f.url);
          autoCollectedAttachments.push({
            name: f.name ? (f.name.includes('[Hợp đồng]') ? f.name : `[Hợp đồng kinh tế] ${f.name}`) : 'Hợp đồng kinh tế',
            url: f.url,
            size: f.size,
            type: f.type,
          });
        }
      });
    }

    // Thêm các file bảng báo giá do Thu mua nộp
    if (finalQuotationAttachments && Array.isArray(finalQuotationAttachments)) {
      finalQuotationAttachments.forEach((f) => {
        if (f.url && !existingUrls.has(f.url)) {
          existingUrls.add(f.url);
          autoCollectedAttachments.push({
            name: f.name ? (f.name.includes('[Báo giá]') ? f.name : `[Bảng báo giá] ${f.name}`) : 'Bảng báo giá',
            url: f.url,
            size: f.size,
            type: f.type,
          });
        }
      });
    }

    // 2. Xác định cấp duyệt chi dựa trên hạn mức số tiền
    // Dưới hoặc bằng 10tr -> Giám đốc duyệt. Trên 10tr -> Chủ tịch duyệt.
    const isOverTenMillion = paymentAmount > 10000000;
    const initialStatus = isOverTenMillion ? 'pending_chairman' : 'pending_director';
    const initialRole = isOverTenMillion ? 'chu_tich' : 'giam_doc';

    const approvalFlow = [
      {
        step: 'duyet_chi',
        role: initialRole,
        status: 'pending',
        approver: null,
        comment: '',
        date: null,
      },
      {
        step: 'giai_ngan',
        role: 'ke_toan',
        status: 'pending',
        approver: null,
        comment: '',
        date: null,
      },
    ];

    // 3. Khởi tạo bản ghi đề xuất thanh toán đầy đủ hồ sơ (báo giá, hợp đồng, hóa đơn, yêu cầu vật tư)
    const paymentProposal = new PaymentProposal({
      purchaseProposal: purchaseProposalId,
      creator: creatorId,
      department: creator.department || purchaseProposal.department,
      beneficiary,
      paymentReason,
      paymentMethod,
      amount: paymentAmount,
      amountInWords,
      installmentNote,
      attachments: autoCollectedAttachments,
      items: finalItems,
      quotationAttachments: finalQuotationAttachments,
      contractInfo: finalContractInfo,
      contractAttachments: finalContractAttachments,
      invoiceInfo: finalInvoiceInfo,
      status: initialStatus,
      currentApprovalRole: initialRole,
      approvalFlow,
    });

    await paymentProposal.save();

    // 4. Cập nhật trạng thái đơn đề xuất mua sắm sang "Chờ duyệt đề xuất thanh toán"
    purchaseProposal.status = 'pending_payment_approval';
    purchaseProposal.currentApprovalRole = initialRole;
    await purchaseProposal.save();

    return await this.getById(paymentProposal._id);
  }

  /**
   * Lấy danh sách đề xuất thanh toán kèm phân quyền vai trò
   */
  async getAll(user, query = {}) {
    let filter = {};

    // Nếu lọc theo đơn đề xuất mua sắm cụ thể
    if (query.purchaseProposalId) {
      filter.purchaseProposal = query.purchaseProposalId;
    }

    // Nếu lọc theo trạng thái
    if (query.status && query.status !== 'all') {
      filter.status = query.status;
    }

    // Phân quyền theo vai trò
    if (user.role === 'nhan_vien') {
      // Nhân viên chỉ xem đơn thanh toán liên quan đến đề xuất mình tạo
      const myPurchases = await PurchaseProposal.find({ creator: user._id }).select('_id');
      filter.purchaseProposal = { $in: myPurchases.map((p) => p._id) };
    } else if (user.role === 'truong_phong') {
      // Trưởng phòng xem đơn thanh toán của phòng ban mình
      filter.department = user.department;
    }
    // Kế toán, Giám đốc, Chủ tịch có quyền xem toàn bộ đơn thanh toán

    return await PaymentProposal.find(filter)
      .populate('creator', 'fullName email role')
      .populate('department', 'name')
      .populate({
        path: 'purchaseProposal',
        select: 'proposalCode totalEstimatedAmount totalActualAmount totalDisbursed status',
      })
      .populate('approvalFlow.approver', 'fullName role')
      .populate('disbursementInfo.disbursedBy', 'fullName role')
      .sort({ createdAt: -1 });
  }

  /**
   * Lấy chi tiết một đề xuất thanh toán theo ID
   */
  async getById(id) {
    const proposal = await PaymentProposal.findById(id)
      .populate('creator', 'fullName email role')
      .populate('department', 'name')
      .populate({
        path: 'purchaseProposal',
        populate: [
          { path: 'creator', select: 'fullName email' },
          { path: 'department', select: 'name' },
        ],
      })
      .populate('approvalFlow.approver', 'fullName role')
      .populate('disbursementInfo.disbursedBy', 'fullName role');

    if (!proposal) {
      throw new Error('Đề xuất thanh toán không tồn tại');
    }

    return proposal;
  }

  /**
   * Giám đốc hoặc Chủ tịch phê duyệt chi đề xuất thanh toán
   * Sau khi duyệt thành công, đơn chuyển về Kế toán để thực hiện giải ngân
   */
  async approve(id, approverId, approverRole, comment = '') {
    const proposal = await PaymentProposal.findById(id);
    if (!proposal) {
      throw new Error('Đề xuất thanh toán không tồn tại');
    }

    // Xác thực quyền phê duyệt
    if (proposal.status === 'pending_director') {
      if (approverRole !== 'giam_doc' && approverRole !== 'chu_tich') {
        throw new Error('Bạn không có quyền duyệt đề xuất này (cần Giám đốc phê duyệt)');
      }
    } else if (proposal.status === 'pending_chairman') {
      if (approverRole !== 'chu_tich') {
        throw new Error('Bạn không có quyền duyệt đề xuất này (cần Chủ tịch phê duyệt)');
      }
    } else {
      throw new Error('Đề xuất không ở trạng thái chờ duyệt chi');
    }

    // Cập nhật bước duyệt chi
    const approveStep = proposal.approvalFlow.find((s) => s.step === 'duyet_chi');
    if (approveStep) {
      approveStep.status = 'approved';
      approveStep.approver = approverId;
      approveStep.comment = comment;
      approveStep.date = new Date();
    }

    // Sau khi duyệt chi, chuyển về cho Kế toán để xác nhận giải ngân
    proposal.status = 'pending_disbursement';
    proposal.currentApprovalRole = 'ke_toan';

    await proposal.save();

    // Đồng bộ trạng thái đơn mua sắm liên quan: chuyển sang đang giải ngân
    const purchaseProposal = await PurchaseProposal.findById(proposal.purchaseProposal);
    if (purchaseProposal) {
      purchaseProposal.status = 'disbursing';
      purchaseProposal.currentApprovalRole = 'ke_toan';
      await purchaseProposal.save();
    }

    return await this.getById(id);
  }

  /**
   * Từ chối đề xuất thanh toán
   */
  async reject(id, rejecterId, rejecterRole, reason = '') {
    const proposal = await PaymentProposal.findById(id);
    if (!proposal) {
      throw new Error('Đề xuất thanh toán không tồn tại');
    }

    if (!['pending_director', 'pending_chairman', 'pending_disbursement'].includes(proposal.status)) {
      throw new Error('Đề xuất không thể từ chối ở trạng thái hiện tại');
    }

    // Cập nhật bước hiện tại thành rejected
    const currentStep = proposal.approvalFlow.find(
      (s) => s.role === proposal.currentApprovalRole && s.status === 'pending'
    );
    if (currentStep) {
      currentStep.status = 'rejected';
      currentStep.approver = rejecterId;
      currentStep.comment = reason;
      currentStep.date = new Date();
    }

    proposal.status = 'rejected';
    proposal.currentApprovalRole = null;
    proposal.rejectionReason = reason;

    await proposal.save();

    // Nếu không còn đề xuất thanh toán nào khác đang chờ duyệt, chuyển lại trạng thái cho đơn mua sắm
    const remainingPending = await PaymentProposal.countDocuments({
      purchaseProposal: proposal.purchaseProposal,
      status: { $in: ['pending_director', 'pending_chairman'] },
      _id: { $ne: proposal._id },
    });
    if (remainingPending === 0) {
      const purchaseProposal = await PurchaseProposal.findById(proposal.purchaseProposal);
      if (purchaseProposal && purchaseProposal.status === 'pending_payment_approval') {
        purchaseProposal.status = (purchaseProposal.totalDisbursed > 0) ? 'disbursing' : 'pending_payment';
        purchaseProposal.currentApprovalRole = 'ke_toan';
        await purchaseProposal.save();
      }
    }

    return await this.getById(id);
  }

  /**
   * Kế toán xác nhận giải ngân / chuyển tiền
   * Cập nhật số tiền đã giải ngân vào đơn mua sắm vật tư tương ứng
   */
  async disburse(id, accountantId, disbursementData = {}) {
    const proposal = await PaymentProposal.findById(id);
    if (!proposal) {
      throw new Error('Đề xuất thanh toán không tồn tại');
    }

    if (proposal.status !== 'pending_disbursement') {
      throw new Error('Đề xuất chưa được lãnh đạo duyệt chi hoặc đã hoàn tất');
    }

    const { transactionCode = '', note = '', receiptAttachment = null } = disbursementData;

    // 1. Cập nhật bước giải ngân của đề xuất thanh toán
    const disburseStep = proposal.approvalFlow.find((s) => s.step === 'giai_ngan');
    if (disburseStep) {
      disburseStep.status = 'approved';
      disburseStep.approver = accountantId;
      disburseStep.comment = note || 'Kế toán đã giải ngân chuyển khoản thành công';
      disburseStep.date = new Date();
    }

    proposal.status = 'completed';
    proposal.currentApprovalRole = null;
    proposal.disbursementInfo = {
      disbursedAt: new Date(),
      disbursedBy: accountantId,
      transactionCode,
      note,
      receiptAttachment,
    };

    await proposal.save();

    // 2. Đồng bộ số tiền giải ngân sang đơn đề xuất mua sắm vật tư liên quan
    const purchaseProposal = await PurchaseProposal.findById(proposal.purchaseProposal);
    if (purchaseProposal) {
      // Ghi nhận thêm 1 đợt giải ngân trong đơn mua sắm
      purchaseProposal.disbursements.push({
        amount: proposal.amount,
        date: new Date(),
        note: `Giải ngân theo đề xuất thanh toán ${proposal.proposalCode} (UNC: ${transactionCode || '—'})`,
        processedBy: accountantId,
      });

      // Cập nhật tổng số tiền đã giải ngân
      purchaseProposal.totalDisbursed = (purchaseProposal.totalDisbursed || 0) + proposal.amount;

      // Xác định trạng thái của đơn mua sắm: Nếu đã giải ngân đủ tổng giá thực tế -> Hoàn thành
      const targetAmount = purchaseProposal.totalActualAmount || purchaseProposal.totalEstimatedAmount;
      if (purchaseProposal.totalDisbursed >= targetAmount) {
        purchaseProposal.status = 'completed';
        purchaseProposal.currentApprovalRole = null;

        const disbursementStep = purchaseProposal.approvalFlow.find(
          (step) => (step.step === 'Giải ngân' || step.role === 'ke_toan') && step.status === 'pending'
        );
        if (disbursementStep) {
          disbursementStep.status = 'approved';
          disbursementStep.approver = accountantId;
          disbursementStep.comment = `Đã giải ngân hoàn tất 100% (Đợt cuối: ${proposal.proposalCode})`;
          disbursementStep.date = new Date();
        }
      } else {
        purchaseProposal.status = 'disbursing';
        purchaseProposal.currentApprovalRole = 'ke_toan';
      }

      await purchaseProposal.save();
    }

    return await this.getById(id);
  }
}

module.exports = new PaymentProposalService();
