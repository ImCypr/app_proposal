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
    const user = await User.findOne({ email }).select('+password').populate('department');
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
    const user = await User.findById(userId).populate('department');
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
    return await User.find().populate('department').sort({ createdAt: -1 });
  }
}

module.exports = new AuthService();
