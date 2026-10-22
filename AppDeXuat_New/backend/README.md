# 🚀 HỆ THỐNG BACKEND - QUẢN LÝ & PHÊ DUYỆT ĐỀ XUẤT (APP ĐỀ XUẤT)

Backend API phục vụ hệ thống quản lý, phê duyệt đa cấp và giải ngân các loại đề xuất: **Mua sắm vật tư**, **Thanh toán**, và **Tạm ứng & Hoàn tạm ứng**.

---

## 🛠️ Công Nghệ Sử Dụng

- **Môi trường & Framework**: Node.js, Express.js (v5)
- **Cơ sở dữ liệu**: MongoDB (ODM: Mongoose v9)
- **Bảo mật & Xác thực**: JSON Web Token (`jsonwebtoken`), Mã hóa mật khẩu (`bcryptjs`)
- **Xử lý tập tin & Upload**: `multer`
- **Tiện ích & Môi trường**: `cors`, `dotenv`, `nodemon`

---

## 📁 Cấu Trúc Thư Mục Backend

```
backend/
├── config/
│   └── db.js                       # Cấu hình và kết nối MongoDB
├── controllers/                    # Điều phối Request & Response
│   ├── authController.js           # Đăng nhập, thông tin tài khoản cá nhân
│   ├── departmentController.js     # Quản lý danh sách phòng ban
│   ├── purchaseProposalController.js # Nghiệp vụ đề xuất mua sắm
│   ├── advanceProposalController.js  # Nghiệp vụ đề xuất tạm ứng & hoàn ứng
│   ├── paymentProposalController.js  # Nghiệp vụ đề xuất thanh toán & giải ngân
│   └── uploadController.js         # Tiếp nhận upload file chứng từ, hóa đơn
├── middlewares/
│   └── auth.js                     # Xác thực JWT Token & phân quyền theo vai trò
├── models/                         # Mongoose Models
│   ├── User.js                     # Người dùng (nhân viên, trưởng phòng, giám đốc...)
│   ├── Department.js               # Phòng ban
│   ├── PurchaseProposal.js         # Đơn đề xuất mua sắm vật tư
│   ├── AdvanceProposal.js          # Đơn đề xuất tạm ứng & hoàn ứng
│   └── PaymentProposal.js          # Đơn đề xuất thanh toán & giải ngân
├── routes/                         # Định tuyến RESTful API
│   ├── authRoutes.js               # /api/auth
│   ├── departmentRoutes.js         # /api/departments
│   ├── purchaseProposalRoutes.js   # /api/purchase-proposals
│   ├── advanceProposalRoutes.js    # /api/advance-proposals
│   ├── paymentProposalRoutes.js    # /api/payment-proposals
│   └── uploadRoutes.js             # /api/upload
├── services/                       # Tầng xử lý logic nghiệp vụ cốt lõi
│   ├── authService.js
│   ├── departmentService.js
│   ├── purchaseProposalService.js
│   ├── advanceProposalService.js
│   └── paymentProposalService.js
├── uploads/                        # Thư mục lưu trữ file vật lý (ảnh, PDF chứng từ)
├── utils/
│   ├── helpers.js                  # Hàm tiện ích tính toán, mã code tự sinh
│   └── seed.js                     # Khởi tạo dữ liệu mẫu phòng ban & tài khoản
├── .env.example                    # File mẫu biến môi trường
├── .env                            # Biến môi trường thực tế (không commit)
├── package.json                    # Cấu hình scripts & dependencies
└── server.js                       # Điểm khởi chạy chính của máy chủ Express
```

---

## ⚙️ Cấu Hình Biến Môi Trường (.env)

Tạo file `.env` tại thư mục `backend/` dựa trên file `.env.example`:

```bash
cp .env.example .env
```

Nội dung file `.env`:

```env
# Cổng chạy ứng dụng Backend
PORT=5000

# Chuỗi kết nối MongoDB (Local MongoDB hoặc MongoDB Atlas Cloud)
MONGODB_URI=mongodb://localhost:27017/app_de_xuat
# Ví dụ Atlas: mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/app_de_xuat?retryWrites=true&w=majority

# Cấu hình bảo mật JWT Token
JWT_SECRET=app_de_xuat_secret_key_2024
JWT_EXPIRES_IN=7d

# Môi trường chạy (development | production)
NODE_ENV=development
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Server

### 1. Cài đặt thư viện:
```bash
npm install
```

### 2. Khởi tạo dữ liệu mẫu (Seed Data):
Tự động tạo các phòng ban và 6 tài khoản mẫu theo từng vai trò (mật khẩu mặc định: `123456`):
```bash
npm run seed
```

*(Lưu ý: Khi máy chủ khởi động lần đầu, nếu kiểm tra cơ sở dữ liệu đang trống, hệ thống cũng sẽ tự động chạy seed data).*

### 3. Khởi chạy máy chủ:
* **Chế độ phát triển (Tự reload khi sửa code với nodemon)**:
  ```bash
  npm run dev
  ```
* **Chế độ production**:
  ```bash
  npm start
  ```

Máy chủ sẽ lắng nghe tại: `http://localhost:5000`

---

## 📡 Danh Sách API Endpoints Chính

| Phương thức | Đường dẫn API | Mô tả | Quyền truy cập |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/login` | Đăng nhập tài khoản | Public |
| **GET** | `/api/auth/me` | Lấy thông tin user hiện tại | Đăng nhập |
| **PUT** | `/api/auth/bank-info` | Cập nhật thông tin tài khoản ngân hàng | Đăng nhập |
| **GET** | `/api/departments` | Lấy danh sách phòng ban | Đăng nhập |
| **GET** | `/api/purchase-proposals` | Lấy danh sách đơn đề xuất mua sắm | Đăng nhập |
| **POST** | `/api/purchase-proposals` | Tạo mới đơn đề xuất mua sắm | Nhân viên / Các cấp |
| **GET** | `/api/purchase-proposals/:id` | Xem chi tiết đơn mua sắm | Đăng nhập |
| **PUT** | `/api/purchase-proposals/:id/survey-price` | Thu mua cập nhật đơn giá thực tế | Thu mua |
| **POST** | `/api/purchase-proposals/:id/approve` | Phê duyệt hoặc Từ chối đơn mua sắm | Theo cấp thẩm quyền |
| **GET** | `/api/payment-proposals` | Lấy danh sách đề xuất thanh toán | Đăng nhập |
| **POST** | `/api/payment-proposals` | Tạo mới đề xuất thanh toán (độc lập hoặc từ đơn mua sắm) | Kế toán / Nhân viên |
| **GET** | `/api/payment-proposals/:id` | Xem chi tiết đề xuất thanh toán | Đăng nhập |
| **POST** | `/api/payment-proposals/:id/approve` | Phê duyệt đề xuất thanh toán | Giám đốc / Ban giám đốc |
| **POST** | `/api/payment-proposals/:id/disburse` | Xác nhận giải ngân thanh toán | Kế toán |
| **GET** | `/api/advance-proposals` | Lấy danh sách đề xuất tạm ứng | Đăng nhập |
| **POST** | `/api/advance-proposals` | Tạo mới đề xuất tạm ứng | Nhân viên / Các cấp |
| **GET** | `/api/advance-proposals/:id` | Xem chi tiết đề xuất tạm ứng | Đăng nhập |
| **POST** | `/api/advance-proposals/:id/approve` | Phê duyệt hoặc Từ chối tạm ứng | Cấp duyệt |
| **POST** | `/api/advance-proposals/:id/disburse` | Giải ngân tiền tạm ứng | Kế toán |
| **POST** | `/api/advance-proposals/:id/settle` | Gửi quyết toán hoàn tạm ứng (thừa/thiếu/đủ) | Người tạo đơn |
| **POST** | `/api/advance-proposals/:id/confirm-settlement` | Kế toán xác nhận hoàn tất hoàn tạm ứng | Kế toán |
| **POST** | `/api/upload` | Upload hóa đơn, chứng từ đính kèm (ảnh/pdf) | Đăng nhập |
| **GET** | `/api/health` | Kiểm tra trạng thái máy chủ | Public |
