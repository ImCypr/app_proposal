const mongoose = require('mongoose');

// Các bước trong tiến trình phê duyệt đề xuất thanh toán
const paymentApprovalStepSchema = new mongoose.Schema({
  step: { type: String, required: true }, // 'duyet_chi' hoặc 'giai_ngan'
  role: { type: String, required: true }, // 'giam_doc', 'chu_tich', 'ke_toan'
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  comment: { type: String, default: '' },
  date: { type: Date, default: null },
});

// Lược đồ cơ sở dữ liệu cho Đề xuất thanh toán
const paymentProposalSchema = new mongoose.Schema(
  {
    // Mã đề xuất thanh toán: TT-YYYYMM-XXXX
    proposalCode: {
      type: String,
      unique: true,
      trim: true,
    },

    // 1. LIÊN KẾT BẮT BUỘC ĐẾN ĐƠN ĐỀ XUẤT MUA SẮM VẬT TƯ
    // Một đơn mua sắm vật tư có thể gắn với nhiều đơn thanh toán (1-to-many)
    purchaseProposal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseProposal',
      required: [true, 'Đơn đề xuất thanh toán phải gắn với một đơn đề xuất mua sắm vật tư'],
    },

    // 2. NGƯỜI LẬP (Kế toán viên lập đơn) & PHÒNG BAN
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },

    // 3. THÔNG TIN BÊN THỤ HƯỞNG (Nhà cung cấp / Đối tác nhận tiền)
    beneficiary: {
      name: { type: String, required: [true, 'Tên đơn vị/người thụ hưởng là bắt buộc'] },
      accountNumber: { type: String, required: [true, 'Số tài khoản thụ hưởng là bắt buộc'] },
      bankName: { type: String, required: [true, 'Tên ngân hàng là bắt buộc'] },
      branch: { type: String, default: '' },
    },

    // 4. NỘI DUNG VÀ SỐ TIỀN ĐỀ NGHỊ THANH TOÁN
    paymentReason: {
      type: String,
      required: [true, 'Nội dung/lý do thanh toán là bắt buộc'],
    },
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'cash'],
      default: 'bank_transfer',
    },
    amount: {
      type: Number,
      required: [true, 'Số tiền thanh toán là bắt buộc'],
      min: [1000, 'Số tiền thanh toán tối thiểu là 1.000 VNĐ'],
    },
    amountInWords: {
      type: String,
      default: '',
    },
    installmentNote: {
      type: String,
      default: '', // Ví dụ: Thanh toán đợt 1 (50%), Thanh toán đợt 2 (30%), Quyết toán 100%
    },

    // 5. TÀI LIỆU, CHỨNG TỪ, HÓA ĐƠN BÁO GIÁ ĐÍNH KÈM
    attachments: [mongoose.Schema.Types.Mixed],

    // [LUỒNG MỚI] Hồ sơ đề xuất thanh toán bao gồm thêm:
    // 5.1. Danh mục yêu cầu vật tư được thanh toán (kế thừa từ đơn mua sắm gốc)
    items: [{
      stt: { type: Number },
      tenVatTu: { type: String, required: true },
      soLuong: { type: Number, default: 1 },
      donGiaThucTe: { type: Number, default: 0 },
      nhaCungCap: { type: String, default: '' },
      yeuCauKiThuat: { type: String, default: '' },
      phongBanSuDung: { type: String, default: '' },
      thanhTien: { type: Number, default: 0 },
    }],

    // 5.2. Bảng báo giá đối tác từ khâu khảo giá của Thu mua
    quotationAttachments: [mongoose.Schema.Types.Mixed],

    // 5.3. Hợp đồng kinh tế và tệp văn bản hợp đồng đính kèm
    contractInfo: {
      contractNumber: { type: String, default: '' },
      partnerName: { type: String, default: '' },
      files: [mongoose.Schema.Types.Mixed],
    },
    contractAttachments: [mongoose.Schema.Types.Mixed],

    // 5.4. Hóa đơn VAT do Thu mua cung cấp
    invoiceInfo: {
      invoiceNumber: { type: String, default: '' },
      invoiceDate: { type: Date, default: null },
      invoiceAmount: { type: Number, default: 0 },
      files: [mongoose.Schema.Types.Mixed],
    },

    // 6. TRẠNG THÁI & LUỒNG PHÊ DUYỆT
    status: {
      type: String,
      enum: [
        'pending_director',    // Chờ Giám đốc duyệt (nếu số tiền <= 10 triệu VNĐ)
        'pending_chairman',    // Chờ Chủ tịch duyệt (nếu số tiền > 10 triệu VNĐ)
        'pending_disbursement',// Đã được lãnh đạo duyệt, chờ kế toán giải ngân/chuyển khoản
        'completed',           // Kế toán đã giải ngân chuyển tiền hoàn tất
        'rejected',            // Bị từ chối
      ],
      default: 'pending_director',
    },
    currentApprovalRole: {
      type: String,
      default: 'giam_doc', // Vai trò đang chờ duyệt hiện tại: 'giam_doc', 'chu_tich', hoặc 'ke_toan'
    },
    approvalFlow: [paymentApprovalStepSchema],

    // 7. THÔNG TIN XÁC NHẬN GIẢI NGÂN CỦA KẾ TOÁN
    disbursementInfo: {
      disbursedAt: { type: Date, default: null },
      disbursedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      transactionCode: { type: String, default: '' }, // Số ủy nhiệm chi (UNC) / Mã giao dịch
      note: { type: String, default: '' },
      receiptAttachment: { type: mongoose.Schema.Types.Mixed, default: null }, // Ảnh chụp/file UNC ngân hàng
    },

    rejectionReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Tự động sinh mã đề xuất thanh toán TT-YYYYMM-XXXX
paymentProposalSchema.pre('save', async function () {
  if (!this.proposalCode) {
    const count = await mongoose.model('PaymentProposal').countDocuments();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    this.proposalCode = `TT-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }
});

module.exports = mongoose.model('PaymentProposal', paymentProposalSchema);
