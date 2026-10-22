const User = require('../models/User');
const Department = require('../models/Department');
const bcrypt = require('bcryptjs');

const VALID_ROLES = [
  'admin',
  'nhan_vien',
  'truong_phong',
  'thu_mua',
  'ke_toan',
  'giam_doc',
  'chu_tich',
  'unassigned',
];

const MANAGERIAL_ROLES = ['truong_phong', 'giam_doc', 'chu_tich'];

class AdminService {
  /**
   * Lấy danh sách toàn bộ người dùng với bộ lọc tìm kiếm
   */
  async getAllUsers(filters = {}) {
    const query = {};

    if (filters.search) {
      const searchRegex = new RegExp(filters.search.trim(), 'i');
      query.$or = [{ fullName: searchRegex }, { email: searchRegex }];
    }

    if (filters.role && filters.role !== 'all') {
      query.role = filters.role;
    }

    if (filters.department && filters.department !== 'all') {
      query.department = filters.department;
    }

    if (filters.isActive !== undefined && filters.isActive !== 'all') {
      query.isActive = filters.isActive === 'true' || filters.isActive === true;
    }

    const users = await User.find(query)
      .populate('department', 'name description')
      .populate('directManager', 'fullName email role department')
      .select('-password')
      .sort({ createdAt: -1 });

    return users;
  }

  /**
   * Lấy chi tiết thông tin một người dùng theo ID
   */
  async getUserById(id) {
    const user = await User.findById(id)
      .populate('department', 'name description')
      .populate('directManager', 'fullName email role department')
      .select('-password');

    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }

    return user;
  }

  /**
   * Thống kê tổng quan số lượng người dùng theo chức danh/role
   */
  async getRoleStatistics() {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });

    const roleCounts = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    const statsByRole = {};
    VALID_ROLES.forEach((r) => {
      statsByRole[r] = 0;
    });

    roleCounts.forEach((item) => {
      if (item._id) {
        statsByRole[item._id] = item.count;
      }
    });

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      statsByRole,
    };
  }

  /**
   * Lấy danh sách các nhân sự đủ điều kiện làm Trưởng phòng trực tiếp
   * (Các chức danh quản lý: truong_phong, giam_doc, chu_tich)
   */
  async getAvailableManagers() {
    return await User.find({
      role: { $in: MANAGERIAL_ROLES },
      isActive: true,
    })
      .populate('department', 'name')
      .select('fullName email role department')
      .sort({ fullName: 1 });
  }

  /**
   * Tạo người dùng mới và gán chức danh + trưởng phòng trực tiếp
   */
  async createUser(data) {
    const {
      fullName,
      email,
      password,
      role = 'unassigned',
      department,
      directManager,
      bankAccount,
    } = data;

    if (!fullName || !fullName.trim()) {
      throw new Error('Họ và tên là bắt buộc');
    }

    if (!email || !email.trim()) {
      throw new Error('Email là bắt buộc');
    }

    if (!password || password.length < 6) {
      throw new Error('Mật khẩu tối thiểu phải từ 6 ký tự');
    }

    // Kiểm tra định dạng role
    if (!VALID_ROLES.includes(role)) {
      throw new Error(`Chức danh không hợp lệ. Phải là một trong: ${VALID_ROLES.join(', ')}`);
    }

    // Kiểm tra trùng email
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      throw new Error('Email này đã được sử dụng trong hệ thống');
    }

    // Kiểm tra trưởng phòng trực tiếp nếu có gán
    let managerId = null;
    if (directManager) {
      const mgr = await User.findById(directManager);
      if (!mgr) {
        throw new Error('Trưởng phòng trực tiếp được chọn không tồn tại');
      }
      if (!MANAGERIAL_ROLES.includes(mgr.role)) {
        throw new Error('Người được gán làm trưởng phòng phải có vai trò quản lý (Trưởng phòng, Giám đốc hoặc Chủ tịch)');
      }
      managerId = mgr._id;
    }

    const newUser = new User({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password, // User schema pre-save hook sẽ tự động hash password
      role,
      department: department || null,
      directManager: managerId,
      bankAccount: bankAccount || {
        accountNumber: '',
        bankName: '',
        accountHolder: '',
      },
      isActive: true,
    });

    await newUser.save();

    return await this.getUserById(newUser._id);
  }

  /**
   * Cập nhật thông tin chi tiết người dùng
   */
  async updateUser(id, updateData) {
    const user = await User.findById(id);
    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }

    // Kiểm tra trùng email nếu có thay đổi
    if (updateData.email && updateData.email.toLowerCase().trim() !== user.email) {
      const existing = await User.findOne({
        email: updateData.email.toLowerCase().trim(),
        _id: { $ne: id },
      });
      if (existing) {
        throw new Error('Email này đã được sử dụng bởi người dùng khác');
      }
      user.email = updateData.email.toLowerCase().trim();
    }

    if (updateData.fullName) {
      user.fullName = updateData.fullName.trim();
    }

    if (updateData.department !== undefined) {
      user.department = updateData.department || null;
    }

    if (updateData.role !== undefined) {
      if (!VALID_ROLES.includes(updateData.role)) {
        throw new Error('Chức danh nghiệp vụ không hợp lệ');
      }
      user.role = updateData.role;
    }

    if (updateData.directManager !== undefined) {
      if (updateData.directManager) {
        if (String(updateData.directManager) === String(id)) {
          throw new Error('Một người không thể làm trưởng phòng trực tiếp của chính mình');
        }
        const mgr = await User.findById(updateData.directManager);
        if (!mgr || !MANAGERIAL_ROLES.includes(mgr.role)) {
          throw new Error('Người quản lý trực tiếp không hợp lệ');
        }
        user.directManager = mgr._id;
      } else {
        user.directManager = null;
      }
    }

    if (updateData.bankAccount) {
      user.bankAccount = {
        ...user.bankAccount,
        ...updateData.bankAccount,
      };
    }

    if (updateData.isActive !== undefined) {
      user.isActive = Boolean(updateData.isActive);
    }

    // Nếu có đổi mật khẩu
    if (updateData.password && updateData.password.trim().length >= 6) {
      user.password = updateData.password.trim();
    }

    await user.save();
    return await this.getUserById(id);
  }

  /**
   * Gán hoặc đổi chức danh nghiệp vụ duy nhất cho người dùng
   */
  async updateUserRole(id, role) {
    if (!VALID_ROLES.includes(role)) {
      throw new Error(`Chức danh không hợp lệ. Cho phép: ${VALID_ROLES.join(', ')}`);
    }

    const user = await User.findById(id);
    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }

    user.role = role;

    // Nếu người này chuyển thành cấp cao (Chủ tịch/Giám đốc), có thể xóa trưởng phòng trực tiếp
    if (['giam_doc', 'chu_tich'].includes(role)) {
      user.directManager = null;
    }

    await user.save();
    return await this.getUserById(id);
  }

  /**
   * Xóa chức danh: Chuyển vai trò của người dùng về 'unassigned' (Chưa gán chức danh)
   */
  async removeUserRole(id) {
    const user = await User.findById(id);
    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }

    user.role = 'unassigned';
    await user.save();

    return await this.getUserById(id);
  }

  /**
   * Gán hoặc hủy Trưởng phòng trực tiếp cho nhân viên
   */
  async setDirectManager(employeeId, managerId) {
    const employee = await User.findById(employeeId);
    if (!employee) {
      throw new Error('Nhân viên không tồn tại');
    }

    if (managerId) {
      if (String(employeeId) === String(managerId)) {
        throw new Error('Không thể tự gán chính mình làm trưởng phòng trực tiếp');
      }

      const manager = await User.findById(managerId);
      if (!manager) {
        throw new Error('Trưởng phòng được chọn không tồn tại');
      }

      if (!MANAGERIAL_ROLES.includes(manager.role)) {
        throw new Error('Người quản lý trực tiếp phải có chức vụ: Trưởng phòng, Giám đốc hoặc Chủ tịch');
      }

      employee.directManager = manager._id;
    } else {
      employee.directManager = null;
    }

    await employee.save();
    return await this.getUserById(employeeId);
  }

  /**
   * Kích hoạt hoặc Vô hiệu hóa tài khoản
   */
  async toggleUserStatus(id, currentAdminId) {
    if (String(id) === String(currentAdminId)) {
      throw new Error('Không thể tự vô hiệu hóa tài khoản Admin của chính mình');
    }

    const user = await User.findById(id);
    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }

    user.isActive = !user.isActive;
    await user.save();

    return await this.getUserById(id);
  }

  /**
   * Xóa vĩnh viễn tài khoản người dùng
   */
  async deleteUser(id, currentAdminId) {
    if (String(id) === String(currentAdminId)) {
      throw new Error('Không thể tự xóa tài khoản Admin đang đăng nhập');
    }

    const user = await User.findById(id);
    if (!user) {
      throw new Error('Không tìm thấy người dùng cần xóa');
    }

    // Nếu người này đang là directManager của nhân viên khác, gỡ liên kết
    await User.updateMany({ directManager: id }, { $set: { directManager: null } });

    await User.findByIdAndDelete(id);

    return { success: true, message: `Đã xóa tài khoản ${user.fullName} (${user.email}) thành công` };
  }
}

module.exports = new AdminService();
