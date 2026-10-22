const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { protect, restrictTo } = require('../middlewares/auth');

router.use(protect);

router.post('/', restrictTo('giam_doc', 'chu_tich'), departmentController.create);
router.get('/', departmentController.getAll);
router.get('/:id', departmentController.getById);
router.put('/:id', restrictTo('giam_doc', 'chu_tich'), departmentController.update);
router.delete('/:id', restrictTo('chu_tich'), departmentController.delete);

module.exports = router;
