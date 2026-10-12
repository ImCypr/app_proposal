const purchaseProposalService = require('../services/purchaseProposalService');

class PurchaseProposalController {
  async create(req, res) {
    try {
      const proposal = await purchaseProposalService.create(req.user._id, req.body);
      res.status(201).json({ success: true, data: proposal });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getAll(req, res) {
    try {
      const proposals = await purchaseProposalService.getAll(
        req.user._id,
        req.user.role,
        req.user.department._id || req.user.department
      );
      res.status(200).json({ success: true, data: proposals });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getById(req, res) {
    try {
      const proposal = await purchaseProposalService.getById(req.params.id);
      res.status(200).json({ success: true, data: proposal });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async approve(req, res) {
    try {
      const proposal = await purchaseProposalService.approve(
        req.params.id,
        req.user._id,
        req.body.comment
      );
      res.status(200).json({ success: true, data: proposal });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async reject(req, res) {
    try {
      const proposal = await purchaseProposalService.reject(
        req.params.id,
        req.user._id,
        req.body.reason
      );
      res.status(200).json({ success: true, data: proposal });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async aiSuggestPricing(req, res) {
    try {
      const suggestions = await purchaseProposalService.aiSuggestPricing(req.params.id);
      res.status(200).json({ success: true, data: suggestions });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async submitProcurement(req, res) {
    try {
      const proposal = await purchaseProposalService.submitProcurement(
        req.params.id,
        req.user._id,
        req.body.items,
        req.body.pricingMethod,
        req.body.quotationAttachments
      );
      res.status(200).json({ success: true, data: proposal });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async accountingConfirm(req, res) {
    try {
      const proposal = await purchaseProposalService.accountingConfirm(
        req.params.id,
        req.user._id,
        req.body.comment
      );
      res.status(200).json({ success: true, data: proposal });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async finalApprove(req, res) {
    try {
      const proposal = await purchaseProposalService.finalApprove(
        req.params.id,
        req.user._id,
        req.body.comment
      );
      res.status(200).json({ success: true, data: proposal });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new PurchaseProposalController();
