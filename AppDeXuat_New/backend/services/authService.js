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
    // Bảo mật: Người dùng thông thường KHÔNG ĐƯỢC tự ý thay đổi role, directManager, department, isActive
    // Chỉ có Quản trị viên (Admin) mới có thẩm quyền điều chỉnh chức danh và quyền hạn
    const allowedUpdates = {};
    if (updateData.fullName) allowedUpdates.fullName = updateData.fullName.trim();
    if (updateData.avatar !== undefined) allowedUpdates.avatar = updateData.avatar;
    if (updateData.bankAccount) allowedUpdates.bankAccount = updateData.bankAccount;

    const user = await User.findByIdAndUpdate(userId, allowedUpdates, {
      new: true,
      runValidators: true,
    })
      .populate('department')
      .populate('directManager', 'fullName email role department');

    if (!user) throw new Error('Người dùng không tồn tại');
    return user;
  }

  async updateBankAccount(userId, bankData) {
    const user = await User.findByIdAndUpdate(
      userId,
      { bankAccount: bankData },
      { new: true, runValidators: true }
    )
      .populate('department')
      .populate('directManager', 'fullName email role department');

    if (!user) throw new Error('Người dùng không tồn tại');
    return user;
  }

  async getAllUsers() {
    return await User.find()
      .populate('department')
      .populate('directManager', 'fullName email role department')
      .select('-password')
      .sort({ createdAt: -1 });
  }
}

module.exports = new AuthService();
