const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middlewares/auth');

// Toàn bộ các route quản trị đều yêu cầu đăng nhập và có vai trò 'admin'
router.use(protect);
router.use(restrictTo('admin'));

// Thống kê người dùng theo vai trò
router.get('/stats', adminController.getRoleStatistics);

// Lấy danh sách nhân sự quản lý đủ điều kiện làm Trưởng phòng trực tiếp
router.get('/managers', adminController.getAvailableManagers);

// Quản lý người dùng: Danh sách & Tạo mới
router.get('/users', adminController.getAllUsers);
router.post('/users', adminController.createUser);

// Chi tiết, Cập nhật thông tin, Xóa vĩnh viễn
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Nghiệp vụ chuyên biệt: Gán / Sửa chức danh
router.put('/users/:id/role', adminController.updateUserRole);

// Nghiệp vụ chuyên biệt: Xóa chức danh (đưa về 'unassigned')
router.delete('/users/:id/role', adminController.removeUserRole);

// Nghiệp vụ chuyên biệt: Gán / Thay đổi Trưởng phòng trực tiếp
router.put('/users/:id/direct-manager', adminController.setDirectManager);

// Nghiệp vụ: Bật/Tắt kích hoạt tài khoản
router.put('/users/:id/status', adminController.toggleUserStatus);

module.exports = router;
