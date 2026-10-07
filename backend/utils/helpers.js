const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

const getRoleName = (role) => {
  const roleNames = {
    nhan_vien: 'Nhân viên',
    truong_phong: 'Trưởng phòng',
    thu_mua: 'Thu mua',
    ke_toan: 'Kế toán',
    giam_doc: 'Giám đốc',
    chu_tich: 'Chủ tịch',
  };
  return roleNames[role] || role;
};

module.exports = { generateToken, formatCurrency, getRoleName };
