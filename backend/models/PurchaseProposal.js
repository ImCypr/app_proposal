const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
  stt: { type: Number, required: true },
  tenVatTu: { type: String, required: [true, 'Tên vật tư là bắt buộc'] },
  yeuCauKiThuat: { type: String, default: '' },
  phongBanSuDung: { type: String, default: '' },
  soLuong: { type: Number, required: [true, 'Số lượng là bắt buộc'], min: 1 },
  donGiaDuKien: { type: Number, required: [true, 'Đơn giá dự kiến là bắt buộc'], min: 0 },
  donGiaThucTe: { type: Number, default: null },
  nhaCungCap: { type: String, default: '' }, // Tên nhà cung cấp được lựa chọn
  ghiChuNhaCungCap: { type: String, default: '' }, // Ghi chú thêm về nhà cung cấp / bảo hành
});

const approvalStepSchema = new mongoose.Schema({
  step: { type: String, required: true },
  role: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  comment: { type: String, default: '' },
  date: { type: Date, default: null },
});

const disbursementSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  note: { type: String, default: '' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const purchaseProposalSchema = new mongoose.Schema({
  proposalCode: {
    type: String,
    unique: true,
  },
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
  items: [purchaseItemSchema],
  totalEstimatedAmount: {
    type: Number,
    default: 0,
  },
  totalActualAmount: {
    type: Number,
    default: null,
  },
  // Phương thức khảo giá: 'ai' (dùng AI tra cứu NCC) hoặc 'manual' (nhập tay)
  pricingMethod: {
    type: String,
    enum: ['ai', 'manual'],
    default: 'manual',
  },
  // Danh sách tài liệu / hóa đơn báo giá đính kèm
  quotationAttachments: [mongoose.Schema.Types.Mixed],
  status: {
    type: String,
    enum: [
      'draft',                  // Bản nháp
      'pending_approval',       // Chờ duyệt sơ bộ (trưởng phòng/giám đốc/chủ tịch)
      'approved_initial',       // Đã duyệt lần 1
      'procurement_review',     // Bên thu mua đang khảo sát giá
      'procurement_completed',  // Thu mua đã điền giá thực tế
      'accounting_review',      // Kế toán xác nhận giá
      'pending_final_approval', // Chờ duyệt cuối (giám đốc/chủ tịch)
      'pending_payment',        // Chờ kế toán lập thanh toán
      'pending_payment_approval', // Chờ duyệt đề xuất thanh toán
      'final_approved',         // Duyệt cuối cùng
      'disbursing',             // Đang giải ngân
      'completed',              // Hoàn thành
      'rejected',               // Từ chối
    ],
    default: 'draft',
  },
  currentApprovalRole: {
    type: String,
    default: null,
  },
  approvalFlow: [approvalStepSchema],
  disbursements: [disbursementSchema],
  totalDisbursed: {
    type: Number,
    default: 0,
  },
  rejectionReason: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

// Tự động sinh mã đề xuất
purchaseProposalSchema.pre('save', async function () {
  if (!this.proposalCode) {
    const count = await mongoose.model('PurchaseProposal').countDocuments();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    this.proposalCode = `MS-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }

  // Tính tổng số tiền dự toán ban đầu
  this.totalEstimatedAmount = this.items.reduce((sum, item) => {
    return sum + (item.soLuong * (item.donGiaDuKien || 0));
  }, 0);

  // Tính tổng số tiền thực tế nếu tất cả vật tư đã có đơn giá thực tế
  const allHaveActualPrice = this.items.every(item => item.donGiaThucTe !== null);
  if (allHaveActualPrice && this.items.length > 0) {
    this.totalActualAmount = this.items.reduce((sum, item) => {
      return sum + (item.soLuong * item.donGiaThucTe);
    }, 0);
  }
});

module.exports = mongoose.model('PurchaseProposal', purchaseProposalSchema);
