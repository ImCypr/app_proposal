const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile', protect, authController.getProfile);
router.put('/profile', protect, authController.updateProfile);
router.put('/bank-account', protect, authController.updateBankAccount);
router.get('/users', protect, authController.getAllUsers);
// Thiết lập Trưởng phòng trực tiếp (directManager) cho nhân viên (dành cho Admin/Giám đốc/Chủ tịch)
router.put('/users/:id/direct-manager', protect, authController.setDirectManager);

module.exports = router;
