const PurchaseProposal = require('../models/PurchaseProposal');
const User = require('../models/User');

class PurchaseProposalService {

  /**
   * Determine initial approval flow based on creator's role and estimated amount
   * 
   * Flow nhân viên:
   *   <= 1M  → truong_phong → thu_mua → ke_toan → giam_doc/chu_tich (dựa vào giá thực tế) → ke_toan (giải ngân)
   *   <= 10M → giam_doc → thu_mua → ke_toan → giam_doc/chu_tich (dựa vào giá thực tế) → ke_toan (giải ngân)
   *   > 10M  → chu_tich → thu_mua → ke_toan → chu_tich → ke_toan (giải ngân)
   * 
   * Flow trưởng phòng:
   *   <= 1M  → thu_mua → ke_toan → giam_doc/chu_tich → ke_toan (giải ngân)
   *   <= 10M → giam_doc → thu_mua → ke_toan → giam_doc/chu_tich → ke_toan (giải ngân)
   *   > 10M  → chu_tich → thu_mua → ke_toan → chu_tich → ke_toan (giải ngân)
   * 
   * Flow giám đốc:
   *   <= 10M → thu_mua → ke_toan → giam_doc/chu_tich → ke_toan (giải ngân)
   *   > 10M  → chu_tich → thu_mua → ke_toan → chu_tich → ke_toan (giải ngân)
   */
  buildInitialApprovalFlow(creatorRole, estimatedAmount) {
    const flow = [];

    if (creatorRole === 'nhan_vien') {
      if (estimatedAmount <= 1000000) {
        flow.push({ step: 'Trưởng phòng duyệt', role: 'truong_phong', status: 'pending' });
      } else if (estimatedAmount <= 10000000) {
        flow.push({ step: 'Giám đốc duyệt', role: 'giam_doc', status: 'pending' });
      } else {
        flow.push({ step: 'Chủ tịch duyệt', role: 'chu_tich', status: 'pending' });
      }
    } else if (creatorRole === 'truong_phong') {
      if (estimatedAmount > 1000000 && estimatedAmount <= 10000000) {
        flow.push({ step: 'Giám đốc duyệt', role: 'giam_doc', status: 'pending' });
      } else if (estimatedAmount > 10000000) {
        flow.push({ step: 'Chủ tịch duyệt', role: 'chu_tich', status: 'pending' });
      }
      // <= 1M: no initial approval needed, goes directly to procurement
    } else if (creatorRole === 'giam_doc') {
      if (estimatedAmount > 10000000) {
        flow.push({ step: 'Chủ tịch duyệt', role: 'chu_tich', status: 'pending' });
      }
      // <= 10M: no initial approval needed, goes directly to procurement
    } else if (creatorRole === 'chu_tich') {
      // No approval needed, goes directly to procurement
    }

    // Common flow after initial approval
    flow.push({ step: 'Thu mua xử lý', role: 'thu_mua', status: 'pending' });
    flow.push({ step: 'Kế toán xác nhận', role: 'ke_toan', status: 'pending' });
    // Final approval will be determined after procurement fills actual prices
    flow.push({ step: 'Duyệt cuối cùng', role: 'pending_determination', status: 'pending' });
    flow.push({ step: 'Giải ngân', role: 'ke_toan', status: 'pending' });

    return flow;
  }

  getCurrentApprovalRole(approvalFlow) {
    const pendingStep = approvalFlow.find(step => step.status === 'pending');
    return pendingStep ? pendingStep.role : null;
  }

  async create(creatorId, data) {
    const creator = await User.findById(creatorId).populate('department');
    if (!creator) throw new Error('Người dùng không tồn tại');

    // Calculate estimated total
    const estimatedTotal = data.items.reduce((sum, item) => {
      return sum + (item.soLuong * item.donGiaDuDoan);
    }, 0);

    const approvalFlow = this.buildInitialApprovalFlow(creator.role, estimatedTotal);
    const currentApprovalRole = this.getCurrentApprovalRole(approvalFlow);

    // Determine initial status
    let status = 'pending_approval';
    if (currentApprovalRole === 'thu_mua') {
      status = 'procurement_review';
    }

    const proposal = await PurchaseProposal.create({
      creator: creatorId,
      department: creator.department._id,
      items: data.items,
      approvalFlow,
      currentApprovalRole,
      status,
    });

    return await PurchaseProposal.findById(proposal._id)
      .populate('creator', 'fullName email role')
      .populate('department', 'name');
  }

  async getAll(userId, userRole, userDepartment) {
    let query = {};

    // Filter based on role
    if (userRole === 'nhan_vien') {
      // Nhân viên only sees their own proposals
      query.creator = userId;
    } else if (userRole === 'truong_phong') {
      // Trưởng phòng sees their department's proposals
      query.department = userDepartment;
    } else if (userRole === 'thu_mua') {
      // Thu mua sees proposals that need their review or they've processed
      query.$or = [
        { currentApprovalRole: 'thu_mua' },
        { 'approvalFlow.role': 'thu_mua', 'approvalFlow.status': { $in: ['approved', 'pending'] } },
      ];
    } else if (userRole === 'ke_toan') {
      // Kế toán sees proposals that need their review or disbursement
      query.$or = [
        { currentApprovalRole: 'ke_toan' },
        { status: { $in: ['disbursing', 'completed'] } },
        { 'approvalFlow.role': 'ke_toan', 'approvalFlow.status': { $in: ['approved', 'pending'] } },
      ];
    }
    // giam_doc and chu_tich can see all proposals

    return await PurchaseProposal.find(query)
      .populate('creator', 'fullName email role')
      .populate('department', 'name')
      .populate('approvalFlow.approver', 'fullName role')
      .populate('disbursements.processedBy', 'fullName')
      .sort({ createdAt: -1 });
  }

  async getById(id) {
    const proposal = await PurchaseProposal.findById(id)
      .populate('creator', 'fullName email role department bankAccount')
      .populate('department', 'name')
      .populate('approvalFlow.approver', 'fullName role')
      .populate('disbursements.processedBy', 'fullName');

    if (!proposal) throw new Error('Đề xuất không tồn tại');
    return proposal;
  }

  async approve(proposalId, approverId, comment) {
    const proposal = await PurchaseProposal.findById(proposalId);
    if (!proposal) throw new Error('Đề xuất không tồn tại');

    const approver = await User.findById(approverId);
    if (!approver) throw new Error('Người duyệt không tồn tại');

    // Find the current pending step
    const currentStepIndex = proposal.approvalFlow.findIndex(
      step => step.status === 'pending'
    );

    if (currentStepIndex === -1) {
      throw new Error('Không có bước duyệt nào đang chờ');
    }

    const currentStep = proposal.approvalFlow[currentStepIndex];

    // Verify the approver has the correct role
    if (currentStep.role !== 'pending_determination' && currentStep.role !== approver.role) {
      throw new Error('Bạn không có quyền duyệt bước này');
    }

    // Update the current step
    currentStep.status = 'approved';
    currentStep.approver = approverId;
    currentStep.comment = comment || '';
    currentStep.date = new Date();

    // Determine next status
    const nextPendingStep = proposal.approvalFlow.find(
      (step, idx) => idx > currentStepIndex && step.status === 'pending'
    );

    if (nextPendingStep) {
      proposal.currentApprovalRole = nextPendingStep.role;

      if (nextPendingStep.role === 'thu_mua') {
        proposal.status = 'procurement_review';
      } else if (nextPendingStep.role === 'ke_toan' && currentStep.role !== 'pending_determination') {
        proposal.status = 'accounting_review';
      } else if (nextPendingStep.role === 'pending_determination') {
        proposal.status = 'pending_final_approval';
      } else if (nextPendingStep.role === 'ke_toan' && proposal.status === 'final_approved') {
        proposal.status = 'disbursing';
      } else {
        proposal.status = 'pending_approval';
      }
    } else {
      // All steps approved
      proposal.status = 'disbursing';
      proposal.currentApprovalRole = 'ke_toan';
    }

    await proposal.save();
    return await this.getById(proposalId);
  }

  async reject(proposalId, approverId, reason) {
    const proposal = await PurchaseProposal.findById(proposalId);
    if (!proposal) throw new Error('Đề xuất không tồn tại');

    const currentStepIndex = proposal.approvalFlow.findIndex(step => step.status === 'pending');
    if (currentStepIndex === -1) throw new Error('Không có bước duyệt nào đang chờ');

    const currentStep = proposal.approvalFlow[currentStepIndex];
    currentStep.status = 'rejected';
    currentStep.approver = approverId;
    currentStep.comment = reason || '';
    currentStep.date = new Date();

    proposal.status = 'rejected';
    proposal.rejectionReason = reason || '';
    proposal.currentApprovalRole = null;

    await proposal.save();
    return await this.getById(proposalId);
  }

  async submitProcurement(proposalId, procurerId, items) {
    const proposal = await PurchaseProposal.findById(proposalId);
    if (!proposal) throw new Error('Đề xuất không tồn tại');

    if (proposal.status !== 'procurement_review') {
      throw new Error('Đề xuất không ở trạng thái thu mua xử lý');
    }

    // Update actual prices
    for (const itemUpdate of items) {
      const item = proposal.items.id(itemUpdate._id);
      if (item) {
        item.donGiaThucTe = itemUpdate.donGiaThucTe;
      }
    }

    // Calculate actual total
    const actualTotal = proposal.items.reduce((sum, item) => {
      return sum + (item.soLuong * (item.donGiaThucTe || item.donGiaDuDoan));
    }, 0);
    proposal.totalActualAmount = actualTotal;

    // Mark procurement step as approved
    const procurementStep = proposal.approvalFlow.find(
      step => step.role === 'thu_mua' && step.status === 'pending'
    );
    if (procurementStep) {
      procurementStep.status = 'approved';
      procurementStep.approver = procurerId;
      procurementStep.date = new Date();
    }

    // Move to accounting review
    proposal.status = 'accounting_review';
    proposal.currentApprovalRole = 'ke_toan';

    await proposal.save();
    return await this.getById(proposalId);
  }

  async accountingConfirm(proposalId, accountantId, comment) {
    const proposal = await PurchaseProposal.findById(proposalId);
    if (!proposal) throw new Error('Đề xuất không tồn tại');

    if (proposal.status !== 'accounting_review') {
      throw new Error('Đề xuất không ở trạng thái kế toán xác nhận');
    }

    // Mark accounting step as approved
    const accountingStep = proposal.approvalFlow.find(
      step => step.role === 'ke_toan' && step.status === 'pending'
    );
    if (accountingStep) {
      accountingStep.status = 'approved';
      accountingStep.approver = accountantId;
      accountingStep.comment = comment || '';
      accountingStep.date = new Date();
    }

    // Determine final approver based on actual amount
    const actualAmount = proposal.totalActualAmount || proposal.totalEstimatedAmount;
    const finalApprovalStep = proposal.approvalFlow.find(
      step => step.role === 'pending_determination'
    );

    if (finalApprovalStep) {
      if (actualAmount <= 10000000) {
        finalApprovalStep.role = 'giam_doc';
        finalApprovalStep.step = 'Giám đốc duyệt cuối';
      } else {
        finalApprovalStep.role = 'chu_tich';
        finalApprovalStep.step = 'Chủ tịch duyệt cuối';
      }
    }

    proposal.status = 'pending_final_approval';
    proposal.currentApprovalRole = finalApprovalStep ? finalApprovalStep.role : 'giam_doc';

    await proposal.save();
    return await this.getById(proposalId);
  }

  async finalApprove(proposalId, approverId, comment) {
    const proposal = await PurchaseProposal.findById(proposalId);
    if (!proposal) throw new Error('Đề xuất không tồn tại');

    if (proposal.status !== 'pending_final_approval') {
      throw new Error('Đề xuất không ở trạng thái chờ duyệt cuối');
    }

    const approver = await User.findById(approverId);
    const finalStep = proposal.approvalFlow.find(
      step => step.status === 'pending' && (step.role === 'giam_doc' || step.role === 'chu_tich')
    );

    if (!finalStep) throw new Error('Không tìm thấy bước duyệt cuối');

    if (finalStep.role !== approver.role) {
      throw new Error('Bạn không có quyền duyệt bước này');
    }

    finalStep.status = 'approved';
    finalStep.approver = approverId;
    finalStep.comment = comment || '';
    finalStep.date = new Date();

    proposal.status = 'disbursing';
    proposal.currentApprovalRole = 'ke_toan';

    // Mark the disbursement step as pending (it should be already)
    const disbursementStep = proposal.approvalFlow.find(
      step => step.step === 'Giải ngân' && step.status === 'pending'
    );
    // Keep it pending for accountant to handle

    await proposal.save();
    return await this.getById(proposalId);
  }

  async disburse(proposalId, accountantId, amount, note) {
    const proposal = await PurchaseProposal.findById(proposalId);
    if (!proposal) throw new Error('Đề xuất không tồn tại');

    if (proposal.status !== 'disbursing' && proposal.status !== 'final_approved') {
      throw new Error('Đề xuất không ở trạng thái giải ngân');
    }

    const totalAmount = proposal.totalActualAmount || proposal.totalEstimatedAmount;
    const remainingAmount = totalAmount - proposal.totalDisbursed;

    if (amount > remainingAmount) {
      throw new Error(`Số tiền giải ngân vượt quá số tiền còn lại (${remainingAmount})`);
    }

    proposal.disbursements.push({
      amount,
      note: note || '',
      processedBy: accountantId,
      date: new Date(),
    });

    proposal.totalDisbursed += amount;

    if (proposal.totalDisbursed >= totalAmount) {
      proposal.status = 'completed';
      proposal.currentApprovalRole = null;

      // Mark disbursement step as approved
      const disbursementStep = proposal.approvalFlow.find(
        step => step.step === 'Giải ngân' && step.status === 'pending'
      );
      if (disbursementStep) {
        disbursementStep.status = 'approved';
        disbursementStep.approver = accountantId;
        disbursementStep.date = new Date();
      }
    }

    await proposal.save();
    return await this.getById(proposalId);
  }
}

module.exports = new PurchaseProposalService();
