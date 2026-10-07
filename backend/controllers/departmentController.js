const departmentService = require('../services/departmentService');

class DepartmentController {
  async create(req, res) {
    try {
      const dept = await departmentService.create(req.body);
      res.status(201).json({ success: true, data: dept });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getAll(req, res) {
    try {
      const depts = await departmentService.getAll();
      res.status(200).json({ success: true, data: depts });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getById(req, res) {
    try {
      const dept = await departmentService.getById(req.params.id);
      res.status(200).json({ success: true, data: dept });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async update(req, res) {
    try {
      const dept = await departmentService.update(req.params.id, req.body);
      res.status(200).json({ success: true, data: dept });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async delete(req, res) {
    try {
      await departmentService.delete(req.params.id);
      res.status(200).json({ success: true, message: 'Đã xóa phòng ban' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new DepartmentController();
