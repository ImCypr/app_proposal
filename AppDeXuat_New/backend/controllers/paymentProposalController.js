const paymentProposalService = require('../services/paymentProposalService');

class PaymentProposalController {
  // Tạo đề xuất thanh toán mới (Kế toán tạo)
  async create(req, res) {
    try {
      const proposal = await paymentProposalService.create(req.body, req.user._id);
      res.status(201).json({ success: true, data: proposal });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Lấy danh sách đề xuất thanh toán
  async getAll(req, res) {
    try {
      const proposals = await paymentProposalService.getAll(req.user, req.query);
      res.status(200).json({ success: true, data: proposals });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Lấy chi tiết đề xuất thanh toán theo ID
  async getById(req, res) {
    try {
      const proposal = await paymentProposalService.getById(req.params.id);
      res.status(200).json({ success: true, data: proposal });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  // Lãnh đạo phê duyệt chi (Giám đốc hoặc Chủ tịch)
  async approve(req, res) {
    try {
      const proposal = await paymentProposalService.approve(
        req.params.id,
        req.user._id,
        req.user.role,
        req.body.comment
      );
      res.status(200).json({ success: true, data: proposal });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Lãnh đạo từ chối đề xuất thanh toán
  async reject(req, res) {
    try {
      const proposal = await paymentProposalService.reject(
        req.params.id,
        req.user._id,
        req.user.role,
        req.body.reason
      );
      res.status(200).json({ success: true, data: proposal });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Kế toán xác nhận giải ngân chuyển tiền
  async disburse(req, res) {
    try {
      const proposal = await paymentProposalService.disburse(
        req.params.id,
        req.user._id,
        req.body
      );
      res.status(200).json({ success: true, data: proposal });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new PaymentProposalController();
