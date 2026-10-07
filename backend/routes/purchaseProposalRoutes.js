const express = require('express');
const router = express.Router();
const purchaseProposalController = require('../controllers/purchaseProposalController');
const { protect, restrictTo } = require('../middlewares/auth');

router.use(protect);

// CRUD
router.post('/', purchaseProposalController.create);
router.get('/', purchaseProposalController.getAll);
router.get('/:id', purchaseProposalController.getById);

// Approval workflow
router.put('/:id/approve', restrictTo('truong_phong', 'giam_doc', 'chu_tich'), purchaseProposalController.approve);
router.put('/:id/reject', restrictTo('truong_phong', 'giam_doc', 'chu_tich'), purchaseProposalController.reject);

// Procurement
router.put('/:id/procurement', restrictTo('thu_mua'), purchaseProposalController.submitProcurement);

// Accounting
router.put('/:id/accounting-confirm', restrictTo('ke_toan'), purchaseProposalController.accountingConfirm);
router.put('/:id/final-approve', restrictTo('giam_doc', 'chu_tich'), purchaseProposalController.finalApprove);
router.put('/:id/disburse', restrictTo('ke_toan'), purchaseProposalController.disburse);

module.exports = router;
