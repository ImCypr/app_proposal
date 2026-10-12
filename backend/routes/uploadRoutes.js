const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const { protect } = require('../middlewares/auth');

// Yêu cầu đăng nhập trước khi tải file
router.use(protect);

/**
 * Endpoint tải lên nhiều file cùng lúc (tối đa 10 file)
 * POST /api/upload
 */
router.post('/', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ít nhất một tệp để tải lên',
      });
    }

    // Xây dựng đường dẫn URL có thể truy cập được từ phía máy khách
    const host = req.get('host');
    const protocol = req.protocol;
    const baseUrl = `${protocol}://${host}`;

    const uploadedFiles = req.files.map((file) => ({
      name: file.originalname,
      url: `${baseUrl}/uploads/${file.filename}`,
      size: file.size,
      type: file.mimetype,
      filename: file.filename,
    }));

    res.status(200).json({
      success: true,
      message: 'Tải lên tệp thành công!',
      data: uploadedFiles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi trong quá trình xử lý tệp',
    });
  }
});

module.exports = router;
