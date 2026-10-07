const express = require('express');
const router = express.Router();
const advanceProposalController = require('../controllers/advanceProposalController');
const { protect, restrictTo } = require('../middlewares/auth');

router.use(protect);

// CRUD
router.post('/', advanceProposalController.create);
router.get('/', advanceProposalController.getAll);
router.get('/:id', advanceProposalController.getById);

// Approval workflow
router.put('/:id/approve', restrictTo('giam_doc', 'chu_tich'), advanceProposalController.approve);
router.put('/:id/reject', restrictTo('giam_doc', 'chu_tich', 'ke_toan'), advanceProposalController.reject);

// Accounting approve and disburse
router.put('/:id/accounting-disburse', restrictTo('ke_toan'), advanceProposalController.accountingApproveAndDisburse);

// Settlement (hoàn tạm ứng)
router.put('/:id/settlement', advanceProposalController.submitSettlement);
router.put('/:id/confirm-settlement', restrictTo('ke_toan'), advanceProposalController.confirmSettlement);

module.exports = router;
