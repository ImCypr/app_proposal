const AdvanceProposal = require('../models/AdvanceProposal');
const User = require('../models/User');
const PurchaseProposal = require('../models/PurchaseProposal');

class AdvanceProposalService {

  /**
   * [LUỒNG MỚI] Thiết lập luồng phê duyệt đơn tạm ứng dựa trên hạn mức số tiền:
   * - Đơn <= 10.000.000 VNĐ: Sếp (Giám đốc) duyệt -> Kế toán duyệt & giải ngân -> Thu mua nộp HĐ & xác nhận hoàn tạm ứng -> Kế toán xác nhận hoàn tất hồ sơ
   * - Đơn > 10.000.000 VNĐ: Chủ tịch duyệt (bỏ qua Giám đốc) -> Kế toán duyệt & giải ngân -> Thu mua nộp HĐ & xác nhận hoàn tạm ứng -> Kế toán xác nhận hoàn tất hồ sơ
   * - Giám đốc tự tạo: chuyển thẳng lên Chủ tịch duyệt
   * - Chủ tịch tự tạo: chuyển thẳng sang Kế toán giải ngân
   */
  buildApprovalFlow(creatorRole, totalAmount = 0) {
    const flow = [];
    const isOverTenMillion = Number(totalAmount) > 10000000;

    if (creatorRole === 'nhan_vien' || creatorRole === 'truong_phong' || creatorRole === 'thu_mua' || creatorRole === 'ke_toan') {
      if (isOverTenMillion) {
        // [LUỒNG MỚI] Đơn > 10 triệu: Chủ tịch trực tiếp duyệt tạm ứng, Giám đốc không duyệt
        flow.push({ step: 'Chủ tịch duyệt tạm ứng', role: 'chu_tich', status: 'pending' });
      } else {
        // [LUỒNG MỚI] Đơn <= 10 triệu: Sếp (Giám đốc) duyệt tạm ứng
        flow.push({ step: 'Giám đốc duyệt tạm ứng', role: 'giam_doc', status: 'pending' });
      }
    } else if (creatorRole === 'giam_doc') {
      // Giám đốc: bỏ qua duyệt cấp giám đốc, chuyển thẳng lên chủ tịch
      flow.push({ step: 'Chủ tịch duyệt tạm ứng', role: 'chu_tich', status: 'pending' });
    }
    // Chủ tịch: bỏ qua cả giám đốc và chủ tịch, chuyển thẳng sang kế toán

    flow.push({ step: 'Kế toán duyệt & giải ngân', role: 'ke_toan', status: 'pending' });
    flow.push({ step: 'Thu mua gửi hóa đơn & xác nhận hoàn tạm ứng', role: 'creator', status: 'pending' });
    flow.push({ step: 'Kế toán xác nhận hoàn tất hồ sơ', role: 'ke_toan', status: 'pending' });

    return flow;
  }

  getCurrentApprovalRole(approvalFlow) {
    const pendingStep = approvalFlow.find(step => step.status === 'pending');
    return pendingStep ? pendingStep.role : null;
  }

  getStatusFromRole(role) {
    const roleStatusMap = {
      giam_doc: 'pending_director',
      chu_tich: 'pending_chairman',
      ke_toan: 'pending_accounting',
      creator: 'pending_settlement',
    };
    return roleStatusMap[role] || 'pending_accounting';
  }

  async create(creatorId, data) {
    const creator = await User.findById(creatorId).populate('department');
    if (!creator) throw new Error('Người dùng không tồn tại');

    // [LUỒNG MỚI] Tính tổng số tiền tạm ứng từ danh sách items để phân luồng thẩm quyền duyệt chi
    const totalAmount = Array.isArray(data.items)
      ? data.items.reduce((sum, item) => sum + (Number(item.soTien) || 0), 0)
      : (Number(data.totalAmount) || 0);

    const approvalFlow = this.buildApprovalFlow(creator.role, totalAmount);
    const currentApprovalRole = this.getCurrentApprovalRole(approvalFlow);
    const status = this.getStatusFromRole(currentApprovalRole);

    // Sử dụng thông tin tài khoản ngân hàng của người tạo hoặc tài khoản được chỉ định
    const bankAccount = data.bankAccount || creator.bankAccount;

    // [LUỒNG MỚI] Cho phép liên kết với đề xuất mua sắm (nếu có)
    const proposal = await AdvanceProposal.create({
      creator: creatorId,
      department: creator.department._id,
      bankAccount,
      items: data.items,
      totalAmount,
      approvalFlow,
      currentApprovalRole,
      status,
      purchaseProposal: data.purchaseProposal || null,
      contractInfo: data.contractInfo || null,
      beneficiaryInvoice: data.beneficiaryInvoice || null,
    });

    return await AdvanceProposal.findById(proposal._id)
      .populate('creator', 'fullName email role')
      .populate('department', 'name')
      .populate('purchaseProposal', 'proposalCode totalEstimatedAmount totalActualAmount procurementExecution')
      .populate('beneficiaryInvoice.purchaseProposal', 'proposalCode totalEstimatedAmount totalActualAmount items procurementExecution');
  }

  async getAll(userId, userRole, userDepartment) {
    let query = {};

    if (userRole === 'nhan_vien') {
      query.creator = userId;
    } else if (userRole === 'truong_phong') {
      query.department = userDepartment;
    } else if (userRole === 'thu_mua') {
      query.creator = userId;
    } else if (userRole === 'ke_toan') {
      query.$or = [
        { currentApprovalRole: 'ke_toan' },
        { status: { $in: ['disbursing', 'disbursed', 'settlement_submitted', 'completed', 'rejected_by_accounting', 'rejected_settlement'] } },
        { 'approvalFlow.role': 'ke_toan' },
        { creator: userId },
      ];
    }
    // Giám đốc và Chủ tịch có thể xem toàn bộ đề xuất

    return await AdvanceProposal.find(query)
      .populate('creator', 'fullName email role')
      .populate('department', 'name')
      .populate('approvalFlow.approver', 'fullName role')
      .populate('disbursements.processedBy', 'fullName')
      .populate('purchaseProposal', 'proposalCode totalEstimatedAmount totalActualAmount')
      .sort({ createdAt: -1 });
  }

  async getById(id) {
    const proposal = await AdvanceProposal.findById(id)
      .populate('creator', 'fullName email role department bankAccount')
      .populate('department', 'name')
      .populate('approvalFlow.approver', 'fullName role')
      .populate('disbursements.processedBy', 'fullName')
      .populate('settlement.confirmedBy', 'fullName')
      .populate('settlement.requestedBy', 'fullName')
      .populate('purchaseProposal', 'proposalCode totalEstimatedAmount totalActualAmount items procurementExecution')
      .populate('beneficiaryInvoice.purchaseProposal', 'proposalCode totalEstimatedAmount totalActualAmount items procurementExecution');

    if (!proposal) throw new Error('Đề xuất không tồn tại');
    return proposal;
  }

  async approve(proposalId, approverId, comment) {
    const proposal = await AdvanceProposal.findById(proposalId);
    if (!proposal) throw new Error('Đề xuất không tồn tại');

    const approver = await User.findById(approverId);
    if (!approver) throw new Error('Người duyệt không tồn tại');

    const currentStepIndex = proposal.approvalFlow.findIndex(step => step.status === 'pending');
    if (currentStepIndex === -1) throw new Error('Không có bước duyệt nào đang chờ');

    const currentStep = proposal.approvalFlow[currentStepIndex];

    const isStepChairman = currentStep.role === 'chu_tich';
    const isStepDirector = currentStep.role === 'giam_doc';

    if (isStepChairman && approver.role !== 'chu_tich') {
      throw new Error('Đơn tạm ứng trên 10.000.000 VNĐ thuộc thẩm quyền Chủ tịch phê duyệt');
    }

    if (isStepDirector && approver.role !== 'giam_doc' && approver.role !== 'chu_tich') {
      throw new Error('Bạn không có quyền duyệt bước này');
    }

    if (!isStepChairman && !isStepDirector && currentStep.role !== approver.role) {
      throw new Error('Bạn không có quyền duyệt bước này');
    }

    currentStep.status = 'approved';
    currentStep.approver = approverId;
    currentStep.comment = comment || '';
    currentStep.date = new Date();

    // Tìm bước duyệt tiếp theo đang chờ xử lý
    const nextPendingStep = proposal.approvalFlow.find(
      (step, idx) => idx > currentStepIndex && step.status === 'pending'
    );

    if (nextPendingStep) {
      proposal.currentApprovalRole = nextPendingStep.role;
      proposal.status = this.getStatusFromRole(nextPendingStep.role);
    } else {
      proposal.currentApprovalRole = null;
    }

    await proposal.save();
    return await this.getById(proposalId);
  }

  async reject(proposalId, approverId, reason) {
    const proposal = await AdvanceProposal.findById(proposalId);
    if (!proposal) throw new Error('Đề xuất không tồn tại');

    const approver = await User.findById(approverId);
    if (!approver) throw new Error('Người duyệt không tồn tại');

    const currentStepIndex = proposal.approvalFlow.findIndex(step => step.status === 'pending');
    if (currentStepIndex === -1) throw new Error('Không có bước duyệt nào đang chờ');

    const currentStep = proposal.approvalFlow[currentStepIndex];

    const isStepChairman = currentStep.role === 'chu_tich';
    const isStepDirector = currentStep.role === 'giam_doc';

    if (isStepChairman && approver.role !== 'chu_tich') {
      throw new Error('Đơn tạm ứng trên 10.000.000 VNĐ thuộc thẩm quyền Chủ tịch xem xét');
    }

    if (isStepDirector && approver.role !== 'giam_doc' && approver.role !== 'chu_tich') {
      throw new Error('Bạn không có quyền từ chối bước này');
    }

    if (!isStepChairman && !isStepDirector && currentStep.role !== approver.role) {
      throw new Error('Bạn không có quyền từ chối bước này');
    }

    currentStep.status = 'rejected';
    currentStep.approver = approverId;
    currentStep.comment = reason || '';
    currentStep.date = new Date();

    // [QUY TRÌNH MỚI] Nếu đơn tạm ứng bị từ chối, trả về bước trước đó (Người tạo) để làm lại
    if (isStepChairman || approver.role === 'chu_tich') {
      proposal.status = 'rejected_by_chairman';
    } else if (isStepDirector || approver.role === 'giam_doc') {
      proposal.status = 'rejected_by_director';
    } else if (currentStep.role === 'ke_toan' || approver.role === 'ke_toan') {
      proposal.status = 'rejected_by_accounting';
    } else {
      proposal.status = 'rejected';
    }

    proposal.rejectionReason = reason || '';
    proposal.currentApprovalRole = 'creator'; // Trả về bước trước đó: người tạo để làm lại

    await proposal.save();
    return await this.getById(proposalId);
  }

  /**
   * [QUY TRÌNH MỚI] Người tạo chỉnh sửa và gửi lại đề xuất tạm ứng sau khi bị từ chối
   */
  async resubmit(proposalId, creatorId, updateData) {
    const proposal = await AdvanceProposal.findById(proposalId);
    if (!proposal) throw new Error('Đề xuất không tồn tại');

    if (proposal.creator.toString() !== creatorId.toString()) {
      throw new Error('Chỉ người tạo mới có quyền chỉnh sửa và gửi lại đề xuất');
    }

    const allowedStatuses = ['rejected', 'rejected_by_director', 'rejected_by_chairman', 'rejected_by_accounting'];
    if (!allowedStatuses.includes(proposal.status)) {
      throw new Error('Chỉ có thể chỉnh sửa và gửi lại khi đề xuất bị từ chối');
    }

    const creator = await User.findById(creatorId);
    if (!creator) throw new Error('Người dùng không tồn tại');

    if (Array.isArray(updateData.items) && updateData.items.length > 0) {
      proposal.items = updateData.items.map((item, idx) => ({
        stt: idx + 1,
        mucDich: item.mucDich,
        soTien: Number(item.soTien) || 0,
      }));
    }

    if (updateData.bankAccount) {
      proposal.bankAccount = updateData.bankAccount;
    }

    if (updateData.purchaseProposal !== undefined) {
      proposal.purchaseProposal = updateData.purchaseProposal || null;
    }

    // Tính lại tổng số tiền tạm ứng
    const totalAmount = proposal.items.reduce((sum, item) => sum + (Number(item.soTien) || 0), 0);
    proposal.totalAmount = totalAmount;

    // Xây dựng lại luồng phê duyệt từ đầu theo số tiền mới
    const approvalFlow = this.buildApprovalFlow(creator.role, totalAmount);
    const currentApprovalRole = this.getCurrentApprovalRole(approvalFlow);
    const status = this.getStatusFromRole(currentApprovalRole);

    proposal.approvalFlow = approvalFlow;
    proposal.currentApprovalRole = currentApprovalRole;
    proposal.status = status;
    proposal.rejectionReason = ''; // Xóa lý do từ chối sau khi làm lại

    await proposal.save();
    return await this.getById(proposalId);
  }

  async accountingApproveAndDisburse(proposalId, accountantId, amount, note) {
    const proposal = await AdvanceProposal.findById(proposalId);
    if (!proposal) throw new Error('Đề xuất không tồn tại');

    if (proposal.status !== 'pending_accounting' && proposal.status !== 'accounting_approved') {
      throw new Error('Đề xuất không ở trạng thái kế toán duyệt');
    }

    const accountingStep = proposal.approvalFlow.find(
      step => step.role === 'ke_toan' && (step.step.includes('giải ngân') || step.step.includes('thanh toán')) && step.status === 'pending'
    );

    if (accountingStep) {
      accountingStep.status = 'approved';
      accountingStep.approver = accountantId;
      accountingStep.date = new Date();
      accountingStep.comment = note || 'Kế toán đã duyệt và chuyển tiền tạm ứng cho Thu mua';
    }

    // Ghi nhận lần giải ngân chi tiền
    const disbursementAmount = amount || proposal.totalAmount;
    proposal.disbursements.push({
      amount: disbursementAmount,
      note: note || 'Chuyển tiền tạm ứng cho Thu mua đi làm hóa đơn mua sắm',
      processedBy: accountantId,
      date: new Date(),
    });
    proposal.totalDisbursed += disbursementAmount;

    // Chuyển sang trạng thái đã giải ngân / chờ thu mua gửi hóa đơn và hoàn tạm ứng
    proposal.status = 'pending_settlement';
    proposal.currentApprovalRole = 'creator';

    // [LUỒNG MỚI] Nếu tạm ứng này gắn với hóa đơn mua sắm, đồng bộ thông tin sang PurchaseProposal
    const targetPurchaseId = proposal.beneficiaryInvoice?.purchaseProposal || proposal.purchaseProposal;
    if (targetPurchaseId) {
      try {
        const purchase = await PurchaseProposal.findById(targetPurchaseId);
        if (purchase) {
          purchase.procurementExecution = purchase.procurementExecution || {};
          purchase.procurementExecution.isAdvanced = true;
          purchase.procurementExecution.advanceAmount = proposal.totalDisbursed;
          purchase.procurementExecution.advanceProposalId = proposal._id;
          purchase.procurementExecution.advanceNote = `Đã nhận tiền tạm ứng từ ${proposal.proposalCode}`;
          await purchase.save();
        }
      } catch (err) {
        console.error('Lỗi khi đồng bộ đơn mua sắm sau giải ngân tạm ứng:', err);
      }
    }

    await proposal.save();
    return await this.getById(proposalId);
  }

  async submitSettlement(proposalId, creatorId, settlementData) {
    const proposal = await AdvanceProposal.findById(proposalId);
    if (!proposal) throw new Error('Đề xuất không tồn tại');

    if (proposal.status !== 'pending_settlement' && proposal.status !== 'rejected_settlement' && proposal.status !== 'disbursed') {
      throw new Error('Đề xuất không ở trạng thái nộp hóa đơn / hoàn tạm ứng');
    }

    if (proposal.creator.toString() !== creatorId.toString()) {
      throw new Error('Chỉ người tạo đề xuất mới có thể hoàn tạm ứng');
    }

    // [CẬP NHẬT SỐ LIỆU] Công thức: hoàn tạm ứng = số tiền tạm ứng hợp đồng - giá của hóa đơn
    // Nếu tạm ứng thiếu (diff < 0) thì chuyển thêm cho thu mua, nếu dư (diff > 0) thì yêu cầu thu mua hoàn tạm ứng
    const advanceAmount = Number(proposal.totalDisbursed > 0 ? proposal.totalDisbursed : proposal.totalAmount) || 0;
    const actualInvoiceAmount = Number(settlementData.actualInvoiceAmount || settlementData.invoiceAmount || 0);

    let calcType = settlementData.type;
    let diffAmount = 0;
    let diffAbs = 0;

    if (actualInvoiceAmount > 0) {
      diffAmount = advanceAmount - actualInvoiceAmount; // Hoàn tạm ứng = tạm ứng - hóa đơn
      diffAbs = Math.abs(diffAmount);
      if (diffAmount > 0) {
        calcType = 'surplus'; // Tạm ứng dư -> Yêu cầu thu mua hoàn tạm ứng
      } else if (diffAmount < 0) {
        calcType = 'deficit'; // Tạm ứng thiếu -> Công ty chuyển thêm cho thu mua
      } else {
        calcType = 'exact';   // Khớp đúng
      }
    } else {
      diffAbs = Number(settlementData.amount) || 0;
    }

    // Cập nhật thông tin quyết toán hoàn ứng
    proposal.settlement = {
      type: calcType || 'exact',
      amount: diffAbs,
      invoiceAmount: actualInvoiceAmount,
      advanceAmount: advanceAmount,
      diffAmount: diffAmount,
      purchaserConfirmed: true,
      purchaserConfirmType: settlementData.purchaserConfirmType || (diffAmount < 0 ? 'received_additional' : diffAmount > 0 ? 'refunded_surplus' : 'exact_matched'),
      purchaserConfirmProof: settlementData.purchaserConfirmProof || [],
      purchaserNote: settlementData.purchaserNote || settlementData.note || '',
      purchaserConfirmedAt: new Date(),
      attachments: settlementData.attachments || [],
      note: settlementData.note || '',
      submittedAt: new Date(),
      confirmedAt: null,
      confirmedBy: null,
    };

    // Nếu có cập nhật hóa đơn thực tế, lưu vào beneficiaryInvoice
    if (proposal.beneficiaryInvoice) {
      if (settlementData.actualInvoiceDate) {
        proposal.beneficiaryInvoice.actualInvoiceDate = new Date(settlementData.actualInvoiceDate);
      }
      if (actualInvoiceAmount > 0) {
        proposal.beneficiaryInvoice.actualInvoiceAmount = actualInvoiceAmount;
      }
      if (settlementData.actualInvoiceFiles && settlementData.actualInvoiceFiles.length > 0) {
        proposal.beneficiaryInvoice.actualInvoiceFiles = settlementData.actualInvoiceFiles;
      }
      proposal.beneficiaryInvoice.actualSubmittedAt = new Date();
    }

    // Đánh dấu bước nộp hoàn ứng của người tạo là đã hoàn tất
    const creatorStep = proposal.approvalFlow.find(
      step => step.role === 'creator'
    );
    if (creatorStep) {
      creatorStep.status = 'approved';
      creatorStep.approver = creatorId;
      creatorStep.date = new Date();
      let stepNote = 'Thu mua đã xác nhận hoàn tạm ứng';
      if (diffAmount < 0) {
        stepNote += ` (Tạm ứng thiếu: yêu cầu công ty chuyển thêm ${diffAbs.toLocaleString('vi-VN')} VNĐ)`;
      } else if (diffAmount > 0) {
        stepNote += ` (Tạm ứng dư: đã chuyển trả hoàn tạm ứng ${diffAbs.toLocaleString('vi-VN')} VNĐ)`;
      } else {
        stepNote += ' (Khớp đúng số tiền tạm ứng)';
      }
      creatorStep.comment = stepNote;
    }

    // Đặt lại bước kế toán xác nhận là pending
    const accountingFinalStep = proposal.approvalFlow.find(
      step => step.role === 'ke_toan' && (step.step.includes('xác nhận') || step.step.includes('hoàn tất'))
    );
    if (accountingFinalStep) {
      accountingFinalStep.status = 'pending';
      accountingFinalStep.approver = null;
      accountingFinalStep.comment = '';
    }

    proposal.status = 'settlement_submitted';
    proposal.currentApprovalRole = 'ke_toan';
    proposal.rejectionReason = ''; // Xóa lý do từ chối hoàn ứng nếu có

    // Đồng bộ thông tin hóa đơn và đơn giá thực tế sang PurchaseProposal nếu có
    const targetPurchaseId = proposal.beneficiaryInvoice?.purchaseProposal || proposal.purchaseProposal;
    if (targetPurchaseId) {
      try {
        const purchase = await PurchaseProposal.findById(targetPurchaseId);
        if (purchase) {
          purchase.procurementExecution = purchase.procurementExecution || {};
          if (actualInvoiceAmount > 0) {
            purchase.totalActualAmount = actualInvoiceAmount;
            if (Array.isArray(purchase.items) && purchase.items.length === 1) {
              purchase.items[0].donGiaThucTe = actualInvoiceAmount;
            }
            purchase.procurementExecution.invoiceInfo = {
              ...(purchase.procurementExecution.invoiceInfo || {}),
              invoiceDate: settlementData.actualInvoiceDate ? new Date(settlementData.actualInvoiceDate) : new Date(),
              invoiceAmount: actualInvoiceAmount,
              files: settlementData.actualInvoiceFiles || settlementData.attachments || [],
            };
          }
          await purchase.save();
        }
      } catch (err) {
        console.error('Lỗi khi đồng bộ hóa đơn sang PurchaseProposal:', err);
      }
    }

    await proposal.save();
    return await this.getById(proposalId);
  }

  /**
   * [QUY TRÌNH MỚI] Kế toán từ chối chứng từ hoàn tạm ứng và yêu cầu người tạo làm lại
   */
  async rejectSettlement(proposalId, accountantId, reason) {
    const proposal = await AdvanceProposal.findById(proposalId);
    if (!proposal) throw new Error('Đề xuất không tồn tại');

    if (proposal.status !== 'settlement_submitted') {
      throw new Error('Đề xuất không ở trạng thái chờ xác nhận hoàn tạm ứng');
    }

    const accountant = await User.findById(accountantId);
    if (!accountant) throw new Error('Người duyệt không tồn tại');

    // Reset bước hoàn ứng của người tạo về pending để nộp lại
    const creatorStep = proposal.approvalFlow.find(
      step => step.role === 'creator'
    );
    if (creatorStep) {
      creatorStep.status = 'pending';
      creatorStep.approver = null;
      creatorStep.comment = '';
    }

    proposal.status = 'rejected_settlement';
    proposal.currentApprovalRole = 'creator'; // Trả về cho người tạo nộp lại chứng từ hoàn ứng
    proposal.rejectionReason = reason || 'Kế toán từ chối chứng từ hoàn tạm ứng, yêu cầu làm lại';

    await proposal.save();
    return await this.getById(proposalId);
  }

  /**
   * [QUY TRÌNH MỚI] Kế toán lập đề xuất hoàn tạm ứng đối với số tiền chênh lệch (khi tạm ứng > hóa đơn thực tế)
   */
  async requestSettlement(proposalId, accountantId, settlementData = {}) {
    const proposal = await AdvanceProposal.findById(proposalId);
    if (!proposal) throw new Error('Đề xuất không tồn tại');

    const accountant = await User.findById(accountantId);
    if (!accountant) throw new Error('Người duyệt không tồn tại');

    const advanceAmount = Number(proposal.totalDisbursed > 0 ? proposal.totalDisbursed : proposal.totalAmount) || 0;
    const invAmount = Number(
      settlementData.actualInvoiceAmount ||
      proposal.beneficiaryInvoice?.actualInvoiceAmount ||
      proposal.settlement?.invoiceAmount ||
      0
    );
    const calculatedDiff = advanceAmount - invAmount;
    const diffAmount = Number(settlementData.diffAmount) || calculatedDiff;

    if (diffAmount <= 0) {
      throw new Error('Số tiền tạm ứng không lớn hơn giá hóa đơn, không thể lập đề xuất hoàn tạm ứng chênh lệch');
    }

    // Cập nhật thông tin hóa đơn thực tế nếu có
    if (!proposal.beneficiaryInvoice) proposal.beneficiaryInvoice = {};
    if (settlementData.actualInvoiceDate) {
      proposal.beneficiaryInvoice.actualInvoiceDate = new Date(settlementData.actualInvoiceDate);
    }
    if (invAmount > 0) {
      proposal.beneficiaryInvoice.actualInvoiceAmount = invAmount;
    }
    if (settlementData.actualInvoiceFiles && settlementData.actualInvoiceFiles.length > 0) {
      proposal.beneficiaryInvoice.actualInvoiceFiles = settlementData.actualInvoiceFiles;
    }

    proposal.settlement = {
      ...(proposal.settlement || {}),
      type: 'surplus',
      amount: diffAmount,
      invoiceAmount: invAmount,
      advanceAmount: advanceAmount,
      diffAmount: diffAmount,
      requestedBy: accountantId,
      requestedAt: new Date(),
      accountantNote: settlementData.note || '',
      purchaserConfirmed: false,
      purchaserConfirmType: null,
      purchaserConfirmProof: [],
      purchaserNote: '',
      purchaserConfirmedAt: null,
      attachments: settlementData.actualInvoiceFiles || proposal.beneficiaryInvoice?.actualInvoiceFiles || [],
      note: settlementData.note || `Kế toán ${accountant.fullName} đã lập đề xuất hoàn tạm ứng số tiền chênh lệch ${diffAmount.toLocaleString('vi-VN')} VNĐ.`,
      submittedAt: new Date(),
    };

    // Cập nhật approvalFlow: ghi nhận bước kế toán lập đề xuất hoàn tạm ứng
    let acctStep = proposal.approvalFlow.find(
      step => step.role === 'ke_toan' && (step.step.includes('hoàn') || step.status === 'pending')
    );
    if (acctStep) {
      acctStep.step = 'Kế toán lập đề xuất hoàn tạm ứng';
      acctStep.status = 'approved';
      acctStep.approver = accountantId;
      acctStep.comment = settlementData.note || `Yêu cầu Thu mua nộp lại số tiền tạm ứng dư ${diffAmount.toLocaleString('vi-VN')} VNĐ`;
      acctStep.date = new Date();
    }

    // Đảm bảo bước Thu mua nộp hoàn tạm ứng là pending
    let creatorStep = proposal.approvalFlow.find(
      step => step.role === 'creator' && (step.step.includes('hoàn tạm ứng') || step.step.includes('hoàn ứng'))
    );
    if (!creatorStep) {
      proposal.approvalFlow.push({
        step: 'Thu mua xác nhận hoàn tạm ứng',
        role: 'creator',
        status: 'pending',
        approver: null,
        comment: '',
      });
    } else {
      creatorStep.status = 'pending';
      creatorStep.approver = null;
      creatorStep.comment = '';
    }

    // Đảm bảo có bước kế toán xác nhận hoàn tất sau khi Thu mua nộp
    let finalAcctStep = proposal.approvalFlow.find(
      step => step.role === 'ke_toan' && (step.step.includes('xác nhận') || step.step.includes('hoàn tất'))
    );
    if (!finalAcctStep) {
      proposal.approvalFlow.push({
        step: 'Kế toán xác nhận hoàn tất hồ sơ',
        role: 'ke_toan',
        status: 'pending',
        approver: null,
        comment: '',
      });
    }

    proposal.status = 'pending_settlement';
    proposal.currentApprovalRole = 'creator'; // Chuyển cho Thu mua nộp lại tiền thừa
    proposal.rejectionReason = '';
    proposal.markModified('approvalFlow');

    await proposal.save();
    return await this.getById(proposalId);
  }

  /**
   * [QUY TRÌNH MỚI] Kế toán xác nhận hoàn tất:
   * - Nếu hóa đơn thực tế vừa đủ số tiền tạm ứng (diff === 0): Kế toán xác nhận hoàn thành trực tiếp.
   * - Nếu Thu mua đã nộp hoàn ứng (settlement_submitted): Kế toán kiểm tra chứng từ và xác nhận quyết toán hoàn tất.
   */
  async confirmSettlement(proposalId, accountantId, comment) {
    const proposal = await AdvanceProposal.findById(proposalId);
    if (!proposal) throw new Error('Đề xuất không tồn tại');

    const advanceAmount = Number(proposal.totalDisbursed > 0 ? proposal.totalDisbursed : proposal.totalAmount) || 0;
    const invAmount = Number(proposal.beneficiaryInvoice?.actualInvoiceAmount || proposal.settlement?.invoiceAmount || 0);
    const isExact = (advanceAmount > 0 && invAmount > 0 && advanceAmount === invAmount) || proposal.settlement?.type === 'exact';

    if (proposal.status !== 'settlement_submitted' && proposal.status !== 'pending_settlement' && proposal.status !== 'disbursed' && !isExact) {
      throw new Error('Đề xuất không ở trạng thái chờ xác nhận hoàn tạm ứng');
    }

    // Đánh dấu bước kế toán xác nhận hoàn ứng là đã duyệt
    const finalAccountingStep = proposal.approvalFlow.find(
      step => step.role === 'ke_toan' && (step.step.includes('xác nhận') || step.step.includes('hoàn tất') || step.status === 'pending')
    );
    if (finalAccountingStep) {
      finalAccountingStep.status = 'approved';
      finalAccountingStep.approver = accountantId;
      finalAccountingStep.comment = comment || (isExact ? 'Kế toán xác nhận hoàn tất hồ sơ (hóa đơn vừa đủ tiền tạm ứng)' : 'Kế toán xác nhận hoàn tất hồ sơ tạm ứng hợp đồng');
      finalAccountingStep.date = new Date();
    }

    proposal.settlement = proposal.settlement || {};
    if (isExact) {
      proposal.settlement.type = 'exact';
      proposal.settlement.amount = 0;
      proposal.settlement.diffAmount = 0;
      proposal.settlement.advanceAmount = advanceAmount;
      proposal.settlement.invoiceAmount = invAmount;
    }
    proposal.settlement.confirmedAt = new Date();
    proposal.settlement.confirmedBy = accountantId;

    proposal.status = 'completed';
    proposal.currentApprovalRole = null;

    // [LUỒNG MỚI] Đồng bộ hoàn thành hồ sơ tạm ứng sang PurchaseProposal nếu có
    const targetPurchaseId = proposal.beneficiaryInvoice?.purchaseProposal || proposal.purchaseProposal;
    if (targetPurchaseId) {
      try {
        const purchase = await PurchaseProposal.findById(targetPurchaseId);
        if (purchase) {
          purchase.isInvoiceCompleted = true;
          purchase.invoiceCompletedAt = new Date();
          if (['pending_accounting', 'procurement_execution', 'accounting_review'].includes(purchase.status)) {
            purchase.status = 'completed';
            purchase.currentApprovalRole = null;
          }
          await purchase.save();
        }
      } catch (err) {
        console.error('Lỗi khi cập nhật hoàn tất hồ sơ mua sắm:', err);
      }
    }

    await proposal.save();
    return await this.getById(proposalId);
  }
}

module.exports = new AdvanceProposalService();
