const express = require('express');
const router = express.Router();
const purchaseProposalController = require('../controllers/purchaseProposalController');
const { protect, restrictTo } = require('../middlewares/auth');

router.use(protect);

// Các API cơ bản (Tạo, Lấy danh sách, Lấy chi tiết)
router.post('/', purchaseProposalController.create);
router.get('/', purchaseProposalController.getAll);
router.get('/:id', purchaseProposalController.getById);

// Quy trình duyệt sơ bộ
router.put('/:id/approve', restrictTo('truong_phong', 'giam_doc', 'chu_tich'), purchaseProposalController.approve);
router.put('/:id/reject', restrictTo('truong_phong', 'giam_doc', 'chu_tich'), purchaseProposalController.reject);

// Khảo sát giá thu mua & AI tra cứu nhà cung cấp
router.get('/:id/ai-pricing', restrictTo('thu_mua', 'giam_doc', 'chu_tich'), purchaseProposalController.aiSuggestPricing);
router.put('/:id/procurement', restrictTo('thu_mua'), purchaseProposalController.submitProcurement);

// Kế toán xác nhận và Lãnh đạo phê duyệt giá chốt
router.put('/:id/accounting-confirm', restrictTo('ke_toan'), purchaseProposalController.accountingConfirm);
router.put('/:id/final-approve', restrictTo('giam_doc', 'chu_tich'), purchaseProposalController.finalApprove);

module.exports = router;
