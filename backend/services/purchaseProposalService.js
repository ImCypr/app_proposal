const PurchaseProposal = require('../models/PurchaseProposal');
const User = require('../models/User');

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

    const results = proposal.items.map((item) => {
      const ten = (item.tenVatTu || '').toLowerCase();
      const basePrice = item.donGiaDuKien || 100000;
      let suppliers = [];

      if (ten.includes('thép') || ten.includes('sắt') || ten.includes('inox') || ten.includes('kim loại')) {
        suppliers = [
          {
            id: 'ncc_hp',
            name: 'Tập Đoàn Thép Hòa Phát (Đại lý cấp 1)',
            price: Math.round(basePrice * 0.94),
            rating: 4.9,
            deliveryDays: '1 - 2 ngày',
            note: 'Giá sỉ tốt nhất công trình, chiết khấu cao cho số lượng lớn, đầy đủ CO/CQ.',
            isBestChoice: true,
          },
          {
            id: 'ncc_vnsteel',
            name: 'Tổng Công Ty Thép Việt Nam (VNSTEEL)',
            price: Math.round(basePrice * 0.97),
            rating: 4.8,
            deliveryDays: '2 - 3 ngày',
            note: 'Thương hiệu uy tín lâu năm, tiêu chuẩn kiểm định quốc tế, miễn phí vận chuyển.',
            isBestChoice: false,
          },
          {
            id: 'ncc_pomina',
            name: 'Công Ty CP Thép Pomina Miền Trung - Nam',
            price: Math.round(basePrice * 0.95),
            rating: 4.7,
            deliveryDays: '1 - 2 ngày',
            note: 'Chất lượng đồng đều, thanh toán linh hoạt 30 ngày.',
            isBestChoice: false,
          },
        ];
      } else if (ten.includes('xi măng') || ten.includes('cát') || ten.includes('bê tông') || ten.includes('vữa')) {
        suppliers = [
          {
            id: 'ncc_hatiên',
            name: 'Công Ty Xi Măng Vicem Hà Tiên',
            price: Math.round(basePrice * 0.93),
            rating: 4.9,
            deliveryDays: 'Trong ngày',
            note: 'Kho sẵn bến bãi, giao hàng tận chân công trình, giá tối ưu nhất dự án.',
            isBestChoice: true,
          },
          {
            id: 'ncc_nghison',
            name: 'Xi Măng & Bê Tông Nghi Sơn Pro',
            price: Math.round(basePrice * 0.96),
            rating: 4.8,
            deliveryDays: '1 - 2 ngày',
            note: 'Cường độ cao, chuyên dụng cho công trình cao ốc & khách sạn ven biển.',
            isBestChoice: false,
          },
          {
            id: 'ncc_saigon_vlxd',
            name: 'Tổng Kho Vật Liệu Xây Dựng Nam Thành',
            price: Math.round(basePrice * 0.98),
            rating: 4.7,
            deliveryDays: '1 ngày',
            note: 'Cung ứng đa dạng cát vàng, đá dăm, xi măng trọn gói một đầu mối.',
            isBestChoice: false,
          },
        ];
      } else if (ten.includes('gạch') || ten.includes('đá') || ten.includes('granite') || ten.includes('marble') || ten.includes('ốp lát')) {
        suppliers = [
          {
            id: 'ncc_hoanggia_stone',
            name: 'Tổng Kho Đá Granite & Marble Hoàng Gia Luxury',
            price: Math.round(basePrice * 0.92),
            rating: 4.9,
            deliveryDays: '2 - 3 ngày',
            note: 'Chuyên cung cấp đá tự nhiên nhập khẩu cho chuỗi khách sạn 5 sao, cắt quy cách chuẩn xác.',
            isBestChoice: true,
          },
          {
            id: 'ncc_dongtam',
            name: 'Tập Đoàn Gạch Men & Đá Granite Đồng Tâm',
            price: Math.round(basePrice * 0.96),
            rating: 4.8,
            deliveryDays: '2 - 4 ngày',
            note: 'Chống mài mòn, chống trơn trượt chuẩn châu Âu, màu sắc bền đẹp.',
            isBestChoice: false,
          },
          {
            id: 'ncc_viglacera',
            name: 'Tổng Kho Gạch Ốp Lát Viglacera Miền Nam',
            price: Math.round(basePrice * 0.95),
            rating: 4.8,
            deliveryDays: '1 - 2 ngày',
            note: 'Sẵn hàng kho lớn, hỗ trợ đổi trả nếu bể vỡ trong quá trình bốc dỡ.',
            isBestChoice: false,
          },
        ];
      } else if (ten.includes('sơn') || ten.includes('chống thấm') || ten.includes('bột trét')) {
        suppliers = [
          {
            id: 'ncc_dulux',
            name: 'Trung Tâm Phân Phối Sơn Dulux Professional',
            price: Math.round(basePrice * 0.94),
            rating: 4.9,
            deliveryDays: 'Trong ngày',
            note: 'Dòng sơn kháng kiềm cao cấp, chống nấm mốc khí hậu biển, cam kết chính hãng 100%.',
            isBestChoice: true,
          },
          {
            id: 'ncc_kova',
            name: 'Tổng Đại Lý Sơn & Chống Thấm KOVA Nano',
            price: Math.round(basePrice * 0.95),
            rating: 4.8,
            deliveryDays: '1 ngày',
            note: 'Chống thấm tường đứng và sàn mái vượt trội, chứng nhận an toàn xanh.',
            isBestChoice: false,
          },
          {
            id: 'ncc_jotun',
            name: 'Nhà Phân Phối Sơn Công Nghiệp Jotun Việt Nam',
            price: Math.round(basePrice * 0.98),
            rating: 4.8,
            deliveryDays: '1 - 2 ngày',
            note: 'Bảo hành màng sơn 10 năm, hỗ trợ máy pha màu vi tính tự động.',
            isBestChoice: false,
          },
        ];
      } else if (ten.includes('vệ sinh') || ten.includes('vòi') || ten.includes('lavabo') || ten.includes('bồn cầu')) {
        suppliers = [
          {
            id: 'ncc_toto',
            name: 'Showroom Giải Pháp Khách Sạn TOTO Việt Nam',
            price: Math.round(basePrice * 0.95),
            rating: 4.9,
            deliveryDays: '2 - 3 ngày',
            note: 'Tiêu chuẩn vệ sinh khách sạn 5 sao, men sứ CeFiONtect chống bám bẩn, bảo hành 3 năm.',
            isBestChoice: true,
          },
          {
            id: 'ncc_inax',
            name: 'Trung Tâm Phân Phối Thiết Bị Vệ Sinh Inax Project',
            price: Math.round(basePrice * 0.92),
            rating: 4.8,
            deliveryDays: '1 - 2 ngày',
            note: 'Giá thành hợp lý, phụ kiện dễ thay thế, tiết kiệm nước tối đa.',
            isBestChoice: false,
          },
          {
            id: 'ncc_kohler',
            name: 'Tổng Đại Lý Thiết Bị Phòng Tắm Kohler & Bravat',
            price: Math.round(basePrice * 0.98),
            rating: 4.9,
            deliveryDays: '3 - 5 ngày',
            note: 'Đẳng cấp kiến trúc sang trọng, phù hợp hạng mục phòng VIP resort.',
            isBestChoice: false,
          },
        ];
      } else if (ten.includes('đèn') || ten.includes('điện') || ten.includes('dây điện') || ten.includes('cáp') || ten.includes('chiếu sáng')) {
        suppliers = [
          {
            id: 'ncc_philips',
            name: 'Chiếu Sáng Kiến Trúc Philips Lighting Pro',
            price: Math.round(basePrice * 0.93),
            rating: 4.9,
            deliveryDays: '1 - 2 ngày',
            note: 'Chỉ số hoàn màu CRI > 90, ánh sáng ấm chuẩn resort nghỉ dưỡng, tiết kiệm 70% điện.',
            isBestChoice: true,
          },
          {
            id: 'ncc_cadivi',
            name: 'Tổng Kho Cáp Điện Cadivi & Thiết Bị Schneider',
            price: Math.round(basePrice * 0.96),
            rating: 4.9,
            deliveryDays: 'Trong ngày',
            note: 'Ruột đồng nguyên chất 99.9%, vỏ bọc chống cháy chậm lan, an toàn tuyệt đối.',
            isBestChoice: false,
          },
          {
            id: 'ncc_rangdong',
            name: 'Công Ty CP Đèn LED & Smart Lighting Rạng Đông',
            price: Math.round(basePrice * 0.91),
            rating: 4.7,
            deliveryDays: '1 ngày',
            note: 'Mức giá cạnh tranh, sẵn số lượng lớn thay thế bảo dưỡng định kỳ.',
            isBestChoice: false,
          },
        ];
      } else {
        // Mặt hàng khác: Gợi ý 3 nhà cung cấp địa phương uy tín theo lĩnh vực
        suppliers = [
          {
            id: `ncc_opt1_${item._id}`,
            name: `Công Ty TNHH Cung Ứng & Thương Mại Đại Dương Xanh`,
            price: Math.round(basePrice * 0.93),
            rating: 4.9,
            deliveryDays: '1 - 2 ngày',
            note: 'Giá sỉ cạnh tranh, sẵn kho số lượng theo yêu cầu, giao hàng miễn phí nội thành.',
            isBestChoice: true,
          },
          {
            id: `ncc_opt2_${item._id}`,
            name: `Tổng Kho Vật Tư Công Trình Tân Phong Thịnh`,
            price: Math.round(basePrice * 0.97),
            rating: 4.8,
            deliveryDays: '2 - 3 ngày',
            note: 'Hàng chính hãng có nguồn gốc xuất xứ rõ ràng, đầy đủ hóa đơn chứng từ VAT.',
            isBestChoice: false,
          },
          {
            id: `ncc_opt3_${item._id}`,
            name: `Trung Tâm Thiết Bị & Vật Tư Phúc Hưng Group`,
            price: Math.round(basePrice * 0.95),
            rating: 4.7,
            deliveryDays: '1 - 2 ngày',
            note: 'Chính sách bảo hành đổi trả trong 30 ngày, công nợ linh hoạt.',
            isBestChoice: false,
          },
        ];
      }

      return {
        itemId: item._id,
        stt: item.stt,
        tenVatTu: item.tenVatTu,
        yeuCauKiThuat: item.yeuCauKiThuat,
        phongBanSuDung: item.phongBanSuDung,
        soLuong: item.soLuong,
        donGiaDuKien: item.donGiaDuKien,
        suppliers,
      };
    });

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
