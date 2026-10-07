const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Department = require('../models/Department');
const PurchaseProposal = require('../models/PurchaseProposal');
const AdvanceProposal = require('../models/AdvanceProposal');

dotenv.config();

const seedData = async (shouldExit = true) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Connected to MongoDB for seeding');
    }

    // Clear existing data
    await User.deleteMany({});
    await Department.deleteMany({});
    await PurchaseProposal.deleteMany({});
    await AdvanceProposal.deleteMany({});

    console.log('🧹 Đã xóa dữ liệu cũ...');

    // 1. Create departments
    const departments = await Department.insertMany([
      { name: 'Phòng Kinh Doanh', description: 'Phòng kinh doanh và marketing' },
      { name: 'Phòng Kỹ Thuật', description: 'Phòng kỹ thuật và phát triển công nghệ' },
      { name: 'Phòng Nhân Sự', description: 'Phòng nhân sự và hành chính' },
      { name: 'Phòng Tài Chính', description: 'Phòng tài chính và kế toán' },
      { name: 'Phòng Thu Mua', description: 'Phòng thu mua vật tư trang thiết bị' },
      { name: 'Ban Giám Đốc', description: 'Ban giám đốc và điều hành công ty' },
    ]);

    console.log('🏢 Đã tạo các phòng ban:', departments.map((d) => d.name).join(', '));

    // 2. Create users with different roles and bank accounts
    const users = await User.create([
      {
        fullName: 'Nguyễn Văn An',
        email: 'nhanvien@demo.com',
        password: '123456',
        role: 'nhan_vien',
        department: departments[0]._id, // Phòng Kinh Doanh
        bankAccount: {
          accountNumber: '1029384756',
          bankName: 'Vietcombank',
          accountHolder: 'NGUYEN VAN AN',
        },
      },
      {
        fullName: 'Trần Thị Bình',
        email: 'truongphong@demo.com',
        password: '123456',
        role: 'truong_phong',
        department: departments[0]._id, // Trưởng phòng KD
        bankAccount: {
          accountNumber: '9876543210',
          bankName: 'Techcombank',
          accountHolder: 'TRAN THI BINH',
        },
      },
      {
        fullName: 'Lê Văn Cường',
        email: 'thuamua@demo.com',
        password: '123456',
        role: 'thu_mua',
        department: departments[4]._id, // Phòng Thu Mua
        bankAccount: {
          accountNumber: '1122334455',
          bankName: 'BIDV',
          accountHolder: 'LE VAN CUONG',
        },
      },
      {
        fullName: 'Phạm Thị Dung',
        email: 'ketoan@demo.com',
        password: '123456',
        role: 'ke_toan',
        department: departments[3]._id, // Phòng Tài Chính
        bankAccount: {
          accountNumber: '5566778899',
          bankName: 'MB Bank',
          accountHolder: 'PHAM THI DUNG',
        },
      },
      {
        fullName: 'Hoàng Minh Đức',
        email: 'giamdoc@demo.com',
        password: '123456',
        role: 'giam_doc',
        department: departments[5]._id, // Ban Giám Đốc
        bankAccount: {
          accountNumber: '9988776655',
          bankName: 'VPBank',
          accountHolder: 'HOANG MINH DUC',
        },
      },
      {
        fullName: 'Vũ Thanh Em',
        email: 'chutich@demo.com',
        password: '123456',
        role: 'chu_tich',
        department: departments[5]._id, // Ban Giám Đốc
        bankAccount: {
          accountNumber: '1357924680',
          bankName: 'VietinBank',
          accountHolder: 'VU THANH EM',
        },
      },
    ]);

    console.log('👤 Đã tạo 6 tài khoản mẫu tương ứng 6 vai trò');

    // 3. Create sample Purchase Proposals
    // Proposal 1: <= 1M (Chờ Trưởng phòng duyệt)
    await PurchaseProposal.create({
      proposalCode: 'MS-202610-0001',
      creator: users[0]._id,
      department: departments[0]._id,
      items: [
        {
          stt: 1,
          tenVatTu: 'Giấy in A4 Double A',
          soLuong: 5,
          donVi: 'Ram',
          donGiaDuDoan: 90000,
          donGiaThucTe: null,
          yeuCau: 'Định lượng 70gsm',
        },
        {
          stt: 2,
          tenVatTu: 'Bút bi Thiên Long',
          soLuong: 2,
          donVi: 'Hộp',
          donGiaDuDoan: 120000,
          donGiaThucTe: null,
          yeuCau: 'Mực xanh 0.5mm',
        },
      ],
      totalEstimatedAmount: 690000,
      totalActualAmount: null,
      status: 'pending_approval',
      currentApprovalRole: 'truong_phong',
      approvalFlow: [
        { step: 'Trưởng phòng duyệt', role: 'truong_phong', status: 'pending' },
        { step: 'Thu mua xử lý', role: 'thu_mua', status: 'pending' },
        { step: 'Kế toán xác nhận', role: 'ke_toan', status: 'pending' },
        { step: 'Duyệt cuối cùng', role: 'pending_determination', status: 'pending' },
        { step: 'Giải ngân', role: 'ke_toan', status: 'pending' },
      ],
    });

    // Proposal 2: > 1M, đang ở bước Thu mua khảo sát giá
    await PurchaseProposal.create({
      proposalCode: 'MS-202610-0002',
      creator: users[0]._id,
      department: departments[0]._id,
      items: [
        {
          stt: 1,
          tenVatTu: 'Màn hình Dell 24 inch IPS',
          soLuong: 2,
          donVi: 'Chiếc',
          donGiaDuDoan: 3200000,
          donGiaThucTe: 3150000,
          yeuCau: 'Chân đế xoay ngang dọc',
        },
      ],
      totalEstimatedAmount: 6400000,
      totalActualAmount: null,
      status: 'procurement_review',
      currentApprovalRole: 'thu_mua',
      approvalFlow: [
        {
          step: 'Giám đốc duyệt',
          role: 'giam_doc',
          status: 'approved',
          approver: users[4]._id,
          comment: 'Đồng ý cấp màn hình làm việc',
          date: new Date(),
        },
        { step: 'Thu mua xử lý', role: 'thu_mua', status: 'pending' },
        { step: 'Kế toán xác nhận', role: 'ke_toan', status: 'pending' },
        { step: 'Duyệt cuối cùng', role: 'pending_determination', status: 'pending' },
        { step: 'Giải ngân', role: 'ke_toan', status: 'pending' },
      ],
    });

    console.log('📦 Đã tạo các đề xuất mua sắm mẫu');

    // 4. Create sample Advance Proposals
    // Advance 1: Chờ Giám đốc duyệt
    await AdvanceProposal.create({
      proposalCode: 'TU-202610-0001',
      creator: users[0]._id,
      department: departments[0]._id,
      bankAccount: users[0].bankAccount,
      items: [
        {
          stt: 1,
          mucDich: 'Chi phí vé máy bay khứ hồi công tác Hà Nội - TP.HCM',
          soTien: 3500000,
        },
        {
          stt: 2,
          mucDich: 'Chi phí khách sạn và lưu trú 3 ngày',
          soTien: 2500000,
        },
      ],
      totalAmount: 6000000,
      status: 'pending_director',
      currentApprovalRole: 'giam_doc',
      approvalFlow: [
        { step: 'Giám đốc duyệt', role: 'giam_doc', status: 'pending' },
        { step: 'Chủ tịch duyệt', role: 'chu_tich', status: 'pending' },
        { step: 'Kế toán duyệt & giải ngân', role: 'ke_toan', status: 'pending' },
        { step: 'Hoàn tạm ứng', role: 'creator', status: 'pending' },
        { step: 'Kế toán xác nhận hoàn tạm ứng', role: 'ke_toan', status: 'pending' },
      ],
    });

    // Advance 2: Đã giải ngân, đang chờ nhân viên nộp hoàn ứng
    await AdvanceProposal.create({
      proposalCode: 'TU-202610-0002',
      creator: users[0]._id,
      department: departments[0]._id,
      bankAccount: users[0].bankAccount,
      items: [
        {
          stt: 1,
          mucDich: 'Tạm ứng mua quà tặng khách hàng hội nghị tháng 10',
          soTien: 4000000,
        },
      ],
      totalAmount: 4000000,
      status: 'pending_settlement',
      currentApprovalRole: 'creator',
      totalDisbursed: 4000000,
      disbursements: [
        {
          amount: 4000000,
          date: new Date(),
          note: 'Đã chuyển khoản giải ngân tạm ứng qua Vietcombank',
          processedBy: users[3]._id,
        },
      ],
      approvalFlow: [
        {
          step: 'Giám đốc duyệt',
          role: 'giam_doc',
          status: 'approved',
          approver: users[4]._id,
          comment: 'Duyệt chi quà tặng',
          date: new Date(),
        },
        {
          step: 'Chủ tịch duyệt',
          role: 'chu_tich',
          status: 'approved',
          approver: users[5]._id,
          comment: 'Nhất trí',
          date: new Date(),
        },
        {
          step: 'Kế toán duyệt & giải ngân',
          role: 'ke_toan',
          status: 'approved',
          approver: users[3]._id,
          comment: 'Đã giải ngân đầy đủ 4.000.000đ',
          date: new Date(),
        },
        { step: 'Hoàn tạm ứng', role: 'creator', status: 'pending' },
        { step: 'Kế toán xác nhận hoàn tạm ứng', role: 'ke_toan', status: 'pending' },
      ],
    });

    console.log('💵 Đã tạo các đề xuất tạm ứng mẫu');

    console.log('\n========================================');
    console.log('🎉 KHỞI TẠO DỮ LIỆU MẪU (SEED) THÀNH CÔNG!');
    console.log('========================================');
    console.log('📋 Danh sách 6 tài khoản kiểm thử (Password: 123456):');
    console.log('  1. Nhân viên:     nhanvien@demo.com     (Phòng Kinh Doanh)');
    console.log('  2. Trưởng phòng:  truongphong@demo.com  (Phòng Kinh Doanh)');
    console.log('  3. Thu mua:       thuamua@demo.com      (Phòng Thu Mua)');
    console.log('  4. Kế toán:       ketoan@demo.com       (Phòng Tài Chính)');
    console.log('  5. Giám đốc:     giamdoc@demo.com      (Ban Giám Đốc)');
    console.log('  6. Chủ tịch:     chutich@demo.com      (Ban Giám Đốc)');
    console.log('========================================\n');

    if (shouldExit) {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Lỗi khi khởi tạo seed data:', error.message);
    if (shouldExit) {
      process.exit(1);
    }
  }
};

// If run directly from terminal: node utils/seed.js
if (require.main === module) {
  seedData(true);
}

module.exports = seedData;
