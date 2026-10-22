const adminService = require('../services/adminService');

class AdminController {
  async getAllUsers(req, res) {
    try {
      const users = await adminService.getAllUsers(req.query);
      res.status(200).json({ success: true, data: users });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getUserById(req, res) {
    try {
      const user = await adminService.getUserById(req.params.id);
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  async getRoleStatistics(req, res) {
    try {
      const stats = await adminService.getRoleStatistics();
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getAvailableManagers(req, res) {
    try {
      const managers = await adminService.getAvailableManagers();
      res.status(200).json({ success: true, data: managers });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async createUser(req, res) {
    try {
      const newUser = await adminService.createUser(req.body);
      res.status(201).json({
        success: true,
        message: 'Tạo tài khoản và gán chức danh thành công',
        data: newUser,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async updateUser(req, res) {
    try {
      const updatedUser = await adminService.updateUser(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin người dùng thành công',
        data: updatedUser,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async updateUserRole(req, res) {
    try {
      const { role } = req.body;
      if (!role) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp chức danh cần gán' });
      }
      const updatedUser = await adminService.updateUserRole(req.params.id, role);
      res.status(200).json({
        success: true,
        message: 'Cập nhật chức danh thành công',
        data: updatedUser,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async removeUserRole(req, res) {
    try {
      const updatedUser = await adminService.removeUserRole(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Đã xóa chức danh nghiệp vụ. Người dùng đã chuyển về trạng thái Chưa gán',
        data: updatedUser,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async setDirectManager(req, res) {
    try {
      const { managerId } = req.body;
      const updatedUser = await adminService.setDirectManager(req.params.id, managerId || null);
      res.status(200).json({
        success: true,
        message: managerId ? 'Đã gán Trưởng phòng trực tiếp thành công' : 'Đã gỡ liên kết Trưởng phòng trực tiếp',
        data: updatedUser,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async toggleUserStatus(req, res) {
    try {
      const updatedUser = await adminService.toggleUserStatus(req.params.id, req.user._id);
      res.status(200).json({
        success: true,
        message: updatedUser.isActive ? 'Đã kích hoạt tài khoản' : 'Đã vô hiệu hóa tài khoản',
        data: updatedUser,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async deleteUser(req, res) {
    try {
      const result = await adminService.deleteUser(req.params.id, req.user._id);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new AdminController();
