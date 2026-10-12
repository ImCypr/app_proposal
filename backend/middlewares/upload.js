const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Đường dẫn thư mục lưu trữ file tải lên trên ổ cứng máy chủ
const uploadDir = path.join(__dirname, '..', 'uploads');

// Tự động khởi tạo thư mục uploads nếu chưa tồn tại
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình lưu trữ file vào ổ cứng bằng Multer DiskStorage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Chuẩn hóa tên file: loại bỏ ký tự đặc biệt, ghép mốc thời gian để tránh trùng lặp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const baseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_\u00C0-\u1EF9-]/g, '_');
    cb(null, `${uniqueSuffix}-${baseName}${ext}`);
  },
});

// Bộ lọc định dạng file được phép tải lên
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /\.(jpg|jpeg|png|webp|gif|svg|pdf|xlsx|xls|docx|doc)$/i;
  const isExtensionValid = allowedExtensions.test(path.extname(file.originalname).toLowerCase());

  if (isExtensionValid) {
    cb(null, true);
  } else {
    cb(new Error('Định dạng tệp không được hỗ trợ. Vui lòng chọn ảnh, PDF, Excel hoặc Word!'), false);
  }
};

// Cấu hình Middleware Multer: giới hạn 15MB mỗi file
const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 Megabytes
  },
  fileFilter,
});

module.exports = upload;
