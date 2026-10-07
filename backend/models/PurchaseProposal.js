const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
  stt: { type: Number, required: true },
  tenVatTu: { type: String, required: [true, 'Tên vật tư là bắt buộc'] },
  soLuong: { type: Number, required: [true, 'Số lượng là bắt buộc'], min: 1 },
  donVi: { type: String, required: [true, 'Đơn vị là bắt buộc'] },
  donGiaDuDoan: { type: Number, required: [true, 'Đơn giá dự đoán là bắt buộc'], min: 0 },
  donGiaThucTe: { type: Number, default: null },
  yeuCau: { type: String, default: '' },
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
  status: {
    type: String,
    enum: [
      'draft',
      'pending_approval',       // Chờ duyệt (trưởng phòng/giám đốc/chủ tịch)
      'approved_initial',       // Đã duyệt lần 1
      'procurement_review',     // Bên thu mua đang xử lý
      'procurement_completed',  // Thu mua đã điền giá thực tế
      'accounting_review',      // Kế toán xác nhận
      'pending_final_approval', // Chờ duyệt cuối (giám đốc/chủ tịch)
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

// Auto-generate proposal code
purchaseProposalSchema.pre('save', async function () {
  if (!this.proposalCode) {
    const count = await mongoose.model('PurchaseProposal').countDocuments();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    this.proposalCode = `MS-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }

  // Calculate total estimated amount
  this.totalEstimatedAmount = this.items.reduce((sum, item) => {
    return sum + (item.soLuong * item.donGiaDuDoan);
  }, 0);

  // Calculate total actual amount if all items have actual prices
  const allHaveActualPrice = this.items.every(item => item.donGiaThucTe !== null);
  if (allHaveActualPrice && this.items.length > 0) {
    this.totalActualAmount = this.items.reduce((sum, item) => {
      return sum + (item.soLuong * item.donGiaThucTe);
    }, 0);
  }
});

module.exports = mongoose.model('PurchaseProposal', purchaseProposalSchema);
