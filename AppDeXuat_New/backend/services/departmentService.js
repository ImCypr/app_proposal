const Department = require('../models/Department');

class DepartmentService {
  async create(data) {
    const existing = await Department.findOne({ name: data.name });
    if (existing) throw new Error('Phòng ban đã tồn tại');
    return await Department.create(data);
  }

  async getAll() {
    return await Department.find({ isActive: true }).sort({ name: 1 });
  }

  async getById(id) {
    const dept = await Department.findById(id);
    if (!dept) throw new Error('Phòng ban không tồn tại');
    return dept;
  }

  async update(id, data) {
    const dept = await Department.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!dept) throw new Error('Phòng ban không tồn tại');
    return dept;
  }

  async delete(id) {
    const dept = await Department.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!dept) throw new Error('Phòng ban không tồn tại');
    return dept;
  }
}

module.exports = new DepartmentService();
