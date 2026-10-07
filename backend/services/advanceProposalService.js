const AdvanceProposal = require('../models/AdvanceProposal');
const User = require('../models/User');

class AdvanceProposalService {

  /**
   * Build approval flow based on creator role:
   * 
   * Flow nhân viên: giam_doc → chu_tich → ke_toan (duyệt & giải ngân) → hoàn tạm ứng → ke_toan xác nhận
   * Flow trưởng phòng: giam_doc → chu_tich → ke_toan (duyệt & giải ngân) → hoàn tạm ứng → ke_toan xác nhận
   * Flow giám đốc: (bỏ qua giam_doc) → chu_tich → ke_toan (duyệt & giải ngân) → hoàn tạm ứng → ke_toan xác nhận
   * Flow chủ tịch: (bỏ qua giam_doc & chu_tich) → ke_toan (duyệt & giải ngân) → hoàn tạm ứng → ke_toan xác nhận
   */
  buildApprovalFlow(creatorRole) {
    const flow = [];

    if (creatorRole === 'nhan_vien' || creatorRole === 'truong_phong' || creatorRole === 'thu_mua' || creatorRole === 'ke_toan') {
      flow.push({ step: 'Giám đốc duyệt', role: 'giam_doc', status: 'pending' });
      flow.push({ step: 'Chủ tịch duyệt', role: 'chu_tich', status: 'pending' });
    } else if (creatorRole === 'giam_doc') {
      // Skip director, go directly to chairman
      flow.push({ step: 'Chủ tịch duyệt', role: 'chu_tich', status: 'pending' });
    }
    // chu_tich: skip both director and chairman

    flow.push({ step: 'Kế toán duyệt & giải ngân', role: 'ke_toan', status: 'pending' });
    flow.push({ step: 'Hoàn tạm ứng', role: 'creator', status: 'pending' });
    flow.push({ step: 'Kế toán xác nhận hoàn tạm ứng', role: 'ke_toan', status: 'pending' });

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

    const approvalFlow = this.buildApprovalFlow(creator.role);
    const currentApprovalRole = this.getCurrentApprovalRole(approvalFlow);
    const status = this.getStatusFromRole(currentApprovalRole);

    // Use creator's bank account or provided bank account
    const bankAccount = data.bankAccount || creator.bankAccount;

    const proposal = await AdvanceProposal.create({
      creator: creatorId,
      department: creator.department._id,
      bankAccount,
      items: data.items,
      approvalFlow,
      currentApprovalRole,
      status,
    });

    return await AdvanceProposal.findById(proposal._id)
      .populate('creator', 'fullName email role')
      .populate('department', 'name');
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
        { status: { $in: ['disbursing', 'disbursed', 'settlement_submitted', 'completed'] } },
        { 'approvalFlow.role': 'ke_toan', 'approvalFlow.status': { $in: ['approved', 'pending'] } },
      ];
    }
    // giam_doc and chu_tich can see all

    return await AdvanceProposal.find(query)
      .populate('creator', 'fullName email role')
      .populate('department', 'name')
      .populate('approvalFlow.approver', 'fullName role')
      .populate('disbursements.processedBy', 'fullName')
      .sort({ createdAt: -1 });
  }

  async getById(id) {
    const proposal = await AdvanceProposal.findById(id)
      .populate('creator', 'fullName email role department bankAccount')
      .populate('department', 'name')
      .populate('approvalFlow.approver', 'fullName role')
      .populate('disbursements.processedBy', 'fullName')
      .populate('settlement.confirmedBy', 'fullName');

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

    if (currentStep.role !== approver.role) {
      throw new Error('Bạn không có quyền duyệt bước này');
    }

    currentStep.status = 'approved';
    currentStep.approver = approverId;
    currentStep.comment = comment || '';
    currentStep.date = new Date();

    // Find next pending step
    const nextPendingStep = proposal.approvalFlow.find(
      (step, idx) => idx > currentStepIndex && step.status === 'pending'
    );

    if (nextPendingStep) {
      proposal.currentApprovalRole = nextPendingStep.role;
      proposal.status = this.getStatusFromRole(nextPendingStep.role);
    }

    await proposal.save();
    return await this.getById(proposalId);
  }

  async reject(proposalId, approverId, reason) {
    const proposal = await AdvanceProposal.findById(proposalId);
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

  async accountingApproveAndDisburse(proposalId, accountantId, amount, note) {
    const proposal = await AdvanceProposal.findById(proposalId);
    if (!proposal) throw new Error('Đề xuất không tồn tại');

    if (proposal.status !== 'pending_accounting' && proposal.status !== 'accounting_approved') {
      throw new Error('Đề xuất không ở trạng thái kế toán duyệt');
    }

    const accountingStep = proposal.approvalFlow.find(
      step => step.role === 'ke_toan' && step.step === 'Kế toán duyệt & giải ngân' && step.status === 'pending'
    );

    if (accountingStep) {
      accountingStep.status = 'approved';
      accountingStep.approver = accountantId;
      accountingStep.date = new Date();
    }

    // Add disbursement
    const disbursementAmount = amount || proposal.totalAmount;
    proposal.disbursements.push({
      amount: disbursementAmount,
      note: note || 'Giải ngân tạm ứng',
      processedBy: accountantId,
      date: new Date(),
    });
    proposal.totalDisbursed += disbursementAmount;

    proposal.status = 'pending_settlement';
    proposal.currentApprovalRole = 'creator';

    await proposal.save();
    return await this.getById(proposalId);
  }

  async submitSettlement(proposalId, creatorId, settlementData) {
    const proposal = await AdvanceProposal.findById(proposalId);
    if (!proposal) throw new Error('Đề xuất không tồn tại');

    if (proposal.status !== 'pending_settlement') {
      throw new Error('Đề xuất không ở trạng thái hoàn tạm ứng');
    }

    if (proposal.creator.toString() !== creatorId.toString()) {
      throw new Error('Chỉ người tạo đề xuất mới có thể hoàn tạm ứng');
    }

    // Update settlement info
    proposal.settlement = {
      type: settlementData.type, // 'surplus', 'deficit', 'exact'
      amount: settlementData.amount || 0,
      attachments: settlementData.attachments || [],
      note: settlementData.note || '',
      submittedAt: new Date(),
    };

    // Mark creator step as approved
    const creatorStep = proposal.approvalFlow.find(
      step => step.role === 'creator' && step.status === 'pending'
    );
    if (creatorStep) {
      creatorStep.status = 'approved';
      creatorStep.approver = creatorId;
      creatorStep.date = new Date();
    }

    proposal.status = 'settlement_submitted';
    proposal.currentApprovalRole = 'ke_toan';

    await proposal.save();
    return await this.getById(proposalId);
  }

  async confirmSettlement(proposalId, accountantId, comment) {
    const proposal = await AdvanceProposal.findById(proposalId);
    if (!proposal) throw new Error('Đề xuất không tồn tại');

    if (proposal.status !== 'settlement_submitted') {
      throw new Error('Đề xuất không ở trạng thái chờ xác nhận hoàn tạm ứng');
    }

    // Mark final accounting step as approved
    const finalAccountingStep = proposal.approvalFlow.find(
      step => step.step === 'Kế toán xác nhận hoàn tạm ứng' && step.status === 'pending'
    );
    if (finalAccountingStep) {
      finalAccountingStep.status = 'approved';
      finalAccountingStep.approver = accountantId;
      finalAccountingStep.comment = comment || '';
      finalAccountingStep.date = new Date();
    }

    proposal.settlement.confirmedAt = new Date();
    proposal.settlement.confirmedBy = accountantId;

    proposal.status = 'completed';
    proposal.currentApprovalRole = null;

    await proposal.save();
    return await this.getById(proposalId);
  }
}

module.exports = new AdvanceProposalService();
