const User = require('../models/User');
const { generateToken } = require('../utils/helpers');

class AuthService {
  async register(userData) {
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new Error('Email đã được sử dụng');
    }

    const user = await User.create(userData);
    const token = generateToken(user._id);

    return {
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        department: user.department,
        bankAccount: user.bankAccount,
      },
      token,
    };
  }

  async login(email, password) {
    const user = await User.findOne({ email }).select('+password').populate('department').populate('directManager', 'fullName email role department');
    if (!user || !(await user.comparePassword(password))) {
      throw new Error('Email hoặc mật khẩu không đúng');
    }

    const token = generateToken(user._id);

    return {
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        department: user.department,
        bankAccount: user.bankAccount,
        avatar: user.avatar,
      },
      token,
    };
  }

  async getProfile(userId) {
    const user = await User.findById(userId).populate('department').populate('directManager', 'fullName email role department');
    if (!user) throw new Error('Người dùng không tồn tại');
    return user;
  }

  async updateProfile(userId, updateData) {
    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).populate('department');
    if (!user) throw new Error('Người dùng không tồn tại');
    return user;
  }

  async updateBankAccount(userId, bankData) {
    const user = await User.findByIdAndUpdate(
      userId,
      { bankAccount: bankData },
      { new: true, runValidators: true }
    ).populate('department');
    if (!user) throw new Error('Người dùng không tồn tại');
    return user;
  }

  async getAllUsers() {
    return await User.find().populate('department').populate('directManager', 'fullName email role department').sort({ createdAt: -1 });
  }

  /**
   * Thiết lập hoặc xóa trưởng phòng trực tiếp (directManager) của một nhân viên.
   * managerId = null để xóa liên kết (nhân viên sẽ sử dụng logic truong_phong phòng ban chung).
   */
  async setDirectManager(employeeId, managerId) {
    const employee = await User.findById(employeeId);
    if (!employee) throw new Error('Nhân viên không tồn tại');

    if (managerId) {
      const manager = await User.findById(managerId);
      if (!manager) throw new Error('Trưởng phòng không tồn tại');
      if (!['truong_phong', 'giam_doc', 'chu_tich'].includes(manager.role)) {
        throw new Error('Người được chọn làm trưởng phòng trực tiếp phải có vai trò quản lý (truong_phong / giam_doc / chu_tich)');
      }
    }

    employee.directManager = managerId || null;
    await employee.save();

    return await User.findById(employeeId)
      .populate('department')
      .populate('directManager', 'fullName email role department');
  }
}

module.exports = new AuthService();
