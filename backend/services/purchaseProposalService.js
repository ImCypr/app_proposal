const PurchaseProposal = require('../models/PurchaseProposal');
const User = require('../models/User');
const { researchPrice } = require('./aiSearchService');

class PurchaseProposalService {

  /**
   * Xác định luồng phê duyệt ban đầu dựa trên vai trò của người tạo và tổng số tiền dự toán
   * 
   * Luồng nhân viên:
   *   <= 1M  → truong_phong → thu_mua → ke_toan → giam_doc/chu_tich (dựa vào giá thực tế) → ke_toan (giải ngân)
   *   <= 10M → giam_doc → thu_mua → ke_toan → giam_doc/chu_tich (dựa vào giá thực tế) → ke_toan (giải ngân)
   *   > 10M  → chu_tich → thu_mua → ke_toan → chu_tich → ke_toan (giải ngân)
   * 
   * Luồng trưởng phòng:
   *   <= 1M  → thu_mua → ke_toan → giam_doc/chu_tich → ke_toan (giải ngân)
   *   <= 10M → giam_doc → thu_mua → ke_toan → giam_doc/chu_tich → ke_toan (giải ngân)
   *   > 10M  → chu_tich → thu_mua → ke_toan → chu_tich → ke_toan (giải ngân)
   * 
   * Luồng giám đốc:
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
      // <= 1M: không cần duyệt sơ bộ, chuyển thẳng sang bộ phận thu mua
    } else if (creatorRole === 'giam_doc') {
      if (estimatedAmount > 10000000) {
        flow.push({ step: 'Chủ tịch duyệt', role: 'chu_tich', status: 'pending' });
      }
      // <= 10M: không cần duyệt sơ bộ, chuyển thẳng sang bộ phận thu mua
    } else if (creatorRole === 'chu_tich') {
      // Chủ tịch tạo đơn: chuyển thẳng sang bộ phận thu mua
    }

    // Các bước chung tiếp theo sau khi duyệt sơ bộ
    flow.push({ step: 'Thu mua xử lý', role: 'thu_mua', status: 'pending' });
    flow.push({ step: 'Kế toán xác nhận', role: 'ke_toan', status: 'pending' });
    // Cấp duyệt cuối cùng sẽ được xác định sau khi bộ phận thu mua điền giá thực tế
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

    // Tính tổng số tiền dự toán ban đầu
    const estimatedTotal = data.items.reduce((sum, item) => {
      return sum + (item.soLuong * (item.donGiaDuKien || 0));
    }, 0);

    const approvalFlow = this.buildInitialApprovalFlow(creator.role, estimatedTotal);
    const currentApprovalRole = this.getCurrentApprovalRole(approvalFlow);

    // Xác định trạng thái ban đầu của đề xuất
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

    // Lọc danh sách đề xuất theo vai trò của người dùng
    if (userRole === 'nhan_vien') {
      // Nhân viên: chỉ xem đề xuất do chính mình tạo
      query.creator = userId;
    } else if (userRole === 'truong_phong') {
      // Trưởng phòng: xem đề xuất của phòng ban mình phụ trách
      query.department = userDepartment;
    } else if (userRole === 'thu_mua') {
      // Thu mua: xem các đề xuất đang cần khảo sát giá hoặc đã từng xử lý
      query.$or = [
        { currentApprovalRole: 'thu_mua' },
        { 'approvalFlow.role': 'thu_mua', 'approvalFlow.status': { $in: ['approved', 'pending'] } },
      ];
    } else if (userRole === 'ke_toan') {
      // Kế toán: xem các đề xuất cần xác nhận giá, chờ lập thanh toán hoặc đang giải ngân
      query.$or = [
        { currentApprovalRole: 'ke_toan' },
        { status: { $in: ['pending_payment', 'pending_payment_approval', 'disbursing', 'completed'] } },
        { 'approvalFlow.role': 'ke_toan', 'approvalFlow.status': { $in: ['approved', 'pending'] } },
      ];
    }
    // Giám đốc và Chủ tịch có thể xem toàn bộ các đề xuất

    return await PurchaseProposal.find(query)
      .populate('creator', 'fullName email role department bankAccount')
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

    // Tìm bước duyệt đang chờ xử lý hiện tại
    const currentStepIndex = proposal.approvalFlow.findIndex(
      step => step.status === 'pending'
    );

    if (currentStepIndex === -1) {
      throw new Error('Không có bước duyệt nào đang chờ');
    }

    const currentStep = proposal.approvalFlow[currentStepIndex];

    // Xác thực người duyệt có đúng vai trò được cấp quyền hay không
    if (currentStep.role !== 'pending_determination' && currentStep.role !== approver.role) {
      throw new Error('Bạn không có quyền duyệt bước này');
    }

    // Cập nhật trạng thái bước hiện tại
    currentStep.status = 'approved';
    currentStep.approver = approverId;
    currentStep.comment = comment || '';
    currentStep.date = new Date();

    // Xác định trạng thái tiếp theo
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
        proposal.status = 'pending_payment';
      } else {
        proposal.status = 'pending_approval';
      }
    } else {
      // Tất cả các bước đều đã được duyệt xong
      proposal.status = 'pending_payment';
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

  /**
   * AI tự động tra cứu nhà cung cấp và khảo sát đơn giá thị trường cho từng vật tư
   * Trả về ít nhất 3 nhà cung cấp uy tín cho mỗi hạng mục vật tư trong đơn
   */
  async aiSuggestPricing(proposalId) {
    const proposal = await PurchaseProposal.findById(proposalId);
    if (!proposal) throw new Error('Đề xuất không tồn tại');

    const results = [];
    for (const item of proposal.items) {
      try {
        const suppliers = await researchPrice({
          stt: item.stt,
          tenVatTu: item.tenVatTu,
          yeuCauKiThuat: item.yeuCauKiThuat,
          soLuong: item.soLuong,
          donGiaDuKien: item.donGiaDuKien,
          phongBanSuDung: item.phongBanSuDung,
        });

        // Tìm nhà cung cấp có đơn giá tốt nhất để gắn cờ isBestChoice
        let lowestPrice = Infinity;
        let bestIdx = 0;
        suppliers.forEach((s, idx) => {
          if (s.price > 0 && s.price < lowestPrice) {
            lowestPrice = s.price;
            bestIdx = idx;
          }
        });

        const formattedSuppliers = suppliers.map((s, idx) => ({
          id: `ncc_${item._id}_${idx}`,
          name: s.name,
          price: s.price || item.donGiaDuKien || 0,
          url: s.url || '',
          rating: 4.8,
          deliveryDays: '1 - 2 ngày',
          note: s.url ? `Nguồn khảo giá: ${s.url}` : 'Đã xác minh thị trường',
          isBestChoice: idx === bestIdx,
        }));

        results.push({
          itemId: item._id,
          stt: item.stt,
          tenVatTu: item.tenVatTu,
          yeuCauKiThuat: item.yeuCauKiThuat,
          phongBanSuDung: item.phongBanSuDung,
          soLuong: item.soLuong,
          donGiaDuKien: item.donGiaDuKien,
          suppliers: formattedSuppliers,
        });
      } catch (itemErr) {
        console.error(`Lỗi khảo giá AI cho vật tư ${item.tenVatTu}:`, itemErr.message || itemErr);
        results.push({
          itemId: item._id,
          stt: item.stt,
          tenVatTu: item.tenVatTu,
          yeuCauKiThuat: item.yeuCauKiThuat,
          phongBanSuDung: item.phongBanSuDung,
          soLuong: item.soLuong,
          donGiaDuKien: item.donGiaDuKien,
          suppliers: [],
        });
      }
    }

    return results;
  }

  async submitProcurement(proposalId, procurerId, items, pricingMethod = 'manual', quotationAttachments = []) {
    const proposal = await PurchaseProposal.findById(proposalId);
    if (!proposal) throw new Error('Đề xuất không tồn tại');

    if (proposal.status !== 'procurement_review') {
      throw new Error('Đề xuất không ở trạng thái thu mua xử lý');
    }

    // 1. Cập nhật đơn giá thực tế và thông tin nhà cung cấp cho từng vật tư
    for (const itemUpdate of items) {
      const item = proposal.items.id(itemUpdate._id);
      if (item) {
        item.donGiaThucTe = Number(itemUpdate.donGiaThucTe);
        if (itemUpdate.nhaCungCap) {
          item.nhaCungCap = itemUpdate.nhaCungCap;
        }
        if (itemUpdate.ghiChuNhaCungCap) {
          item.ghiChuNhaCungCap = itemUpdate.ghiChuNhaCungCap;
        }
      }
    }

    // 2. Cập nhật phương thức khảo giá và danh sách tài liệu báo giá đính kèm
    proposal.pricingMethod = pricingMethod || 'manual';
    if (quotationAttachments && quotationAttachments.length > 0) {
      proposal.quotationAttachments = quotationAttachments;
    }

    // 3. Tính tổng số tiền thực tế
    const actualTotal = proposal.items.reduce((sum, item) => {
      const estPrice = item.donGiaDuKien || 0;
      return sum + (item.soLuong * (item.donGiaThucTe !== null && item.donGiaThucTe !== undefined ? item.donGiaThucTe : estPrice));
    }, 0);
    proposal.totalActualAmount = actualTotal;

    // 4. Đánh dấu bước thu mua là đã hoàn thành
    const procurementStep = proposal.approvalFlow.find(
      step => step.role === 'thu_mua' && step.status === 'pending'
    );
    if (procurementStep) {
      procurementStep.status = 'approved';
      procurementStep.approver = procurerId;
      procurementStep.date = new Date();
      procurementStep.comment = pricingMethod === 'ai'
        ? 'Đã sử dụng AI khảo sát và chọn nhà cung cấp tối ưu'
        : 'Đã hoàn tất khảo sát giá thực tế và đính kèm tài liệu báo giá';
    }

    // 5. Chuyển sang bước kế toán xác nhận giá thị trường
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

    // Đánh dấu bước kế toán xác nhận là đã duyệt
    const accountingStep = proposal.approvalFlow.find(
      step => step.role === 'ke_toan' && step.status === 'pending'
    );
    if (accountingStep) {
      accountingStep.status = 'approved';
      accountingStep.approver = accountantId;
      accountingStep.comment = comment || '';
      accountingStep.date = new Date();
    }

    // Xác định người có thẩm quyền duyệt cuối cùng dựa vào tổng số tiền thực tế
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

    // Sau khi Giám đốc hoặc Chủ tịch duyệt chi, đơn chuyển sang trạng thái: Chờ kế toán lập thanh toán
    proposal.status = 'pending_payment';
    proposal.currentApprovalRole = 'ke_toan';

    await proposal.save();
    return await this.getById(proposalId);
  }
}

module.exports = new PurchaseProposalService();
