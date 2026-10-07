# HỆ THỐNG GỬI VÀ PHÊ DUYỆT ĐỀ XUẤT ĐA CẤP (APP ĐỀ XUẤT)

Hệ thống quản lý, phê duyệt và giải ngân đề xuất mua sắm & tạm ứng theo quy trình phân cấp đa phòng ban, thẩm quyền chức vụ và hạn mức ngân sách.

---

## 🛠️ CÔNG NGHỆ SỬ DỤNG

- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT, Bcryptjs, Cors, Dotenv, Nodemon
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, React Router DOM, Axios, React Icons

---

## 📁 CẤU TRÚC THƯ MỤC CHUẨN

```
AppDeXuat/
├── backend/
│   ├── config/             # Cấu hình kết nối DB (db.js)
│   ├── models/             # Mongoose Models (User, Department, PurchaseProposal, AdvanceProposal)
│   ├── services/           # Nghiệp vụ theo đối tượng (authService, departmentService, purchaseProposalService, advanceProposalService)
│   ├── controllers/        # Điều hướng request/response (authController, departmentController, purchaseProposalController, advanceProposalController)
│   ├── routes/             # Định tuyến API theo đối tượng (authRoutes, departmentRoutes, purchaseProposalRoutes, advanceProposalRoutes)
│   ├── middlewares/        # Middleware xác thực JWT & phân quyền (auth.js)
│   ├── utils/              # Helpers định dạng tiền tệ, seed dữ liệu mẫu (helpers.js, seed.js)
│   ├── .env                # Biến môi trường
│   ├── package.json        # Dependencies & scripts
│   └── server.js           # File khởi chạy server Express
│
└── frontend/
    ├── src/
    │   ├── models/         # Model định nghĩa dữ liệu (re-export từ types)
    │   ├── services/       # Call API theo đối tượng (api.js, authService, departmentService, purchaseProposalService, advanceProposalService)
    │   ├── components/     # UI components dùng chung (Navbar, Sidebar, StatusBadge, ApprovalFlowTracker, QuickRoleSwitcher)
    │   ├── layouts/        # Layout chính có Guard xác thực (MainLayout.tsx)
    │   ├── pages/          # Chia theo từng chức năng:
    │   │   ├── Login/                  # Đăng nhập & chọn nhanh tài khoản mẫu
    │   │   ├── Dashboard/              # Tổng quan, thống kê, danh sách gần đây
    │   │   ├── PurchaseProposal/       # Danh sách, Tạo đơn, Chi tiết & Phê duyệt mua sắm
    │   │   ├── AdvanceProposal/        # Danh sách, Tạo đơn, Chi tiết, Giải ngân & Hoàn tạm ứng
    │   │   ├── Approval/               # Danh sách đề xuất cần duyệt theo vai trò hiện tại
    │   │   └── Profile/                # Hồ sơ cá nhân & Cập nhật số tài khoản ngân hàng
    │   ├── context/        # Context quản lý Auth & Token
    │   ├── utils/          # Hàm tiện ích format VNĐ, ngày tháng
    │   ├── App.tsx         # Định tuyến Router
    │   ├── main.tsx        # Mount React DOM
    │   └── index.css       # Theme tối màu & Tailwind CSS v4
    ├── package.json
    └── vite.config.ts
```

---

## 👥 TÀI KHOẢN MẪU & PHÂN QUYỀN

Mật khẩu mặc định cho tất cả tài khoản: `123456`

| Vai trò | Email đăng nhập | Phòng ban | Quyền hạn chính |
| :--- | :--- | :--- | :--- |
| **Nhân viên** | `nhanvien@demo.com` | Phòng Kinh Doanh | Tạo đơn mua sắm & tạm ứng, thực hiện hoàn ứng |
| **Trưởng phòng** | `truongphong@demo.com` | Phòng Kinh Doanh | Duyệt đơn mua sắm của phòng ban **<= 1.000.000 VNĐ** |
| **Thu mua** | `thuamua@demo.com` | Phòng Thu Mua | Khảo sát thị trường & điền **Đơn giá thực tế** vào đơn mua sắm |
| **Kế toán** | `ketoan@demo.com` | Phòng Tài Chính | Xác nhận giá, giải ngân (1 lần hoặc nhiều đợt), xác nhận hoàn ứng |
| **Giám đốc** | `giamdoc@demo.com` | Ban Giám Đốc | Duyệt đơn mua sắm **<= 10.000.000 VNĐ**, duyệt tạm ứng |
| **Chủ tịch** | `chutich@demo.com` | Ban Giám Đốc | Duyệt mọi đơn mua sắm, duyệt đơn tạm ứng |

> 💡 **Tính năng Tiện ích**: Hệ thống tích hợp sẵn thanh **Quick Role Switcher** ở đầu mọi trang, giúp bạn chuyển đổi tức thì giữa 6 vai trò chỉ bằng 1 cú click chuột để test toàn bộ luồng phê duyệt mà không cần đăng nhập lại!

---

## 🔄 QUY TRÌNH PHÊ DUYỆT CHI TIẾT

### 1. Đề xuất Mua sắm (Purchase Proposal)
- **Dữ liệu đầu vào**: STT, Tên vật tư, Số lượng, Đơn vị, Đơn giá dự đoán, Đơn giá thực tế (bên Thu mua bổ sung), Yêu cầu (ghi chú).
- **Luồng phê duyệt**:
  - **Nhân viên**:
    - Dự kiến `<= 1.000.000đ`: Trưởng phòng duyệt ➔ Thu mua bổ sung giá thực tế ➔ Kế toán xác nhận ➔ Giám đốc hoặc Chủ tịch duyệt theo giá thực tế (dưới hoặc bằng 10tr: Giám đốc; trên 10tr: Chủ tịch) ➔ Kế toán giải ngân (1 lần hoặc nhiều đợt).
    - Dự kiến `<= 10.000.000đ`: Giám đốc duyệt ➔ Thu mua ➔ Kế toán ➔ Giám đốc / Chủ tịch duyệt cuối ➔ Kế toán giải ngân.
    - Dự kiến `> 10.000.000đ`: Chủ tịch duyệt ➔ Thu mua ➔ Kế toán ➔ Chủ tịch duyệt cuối ➔ Kế toán giải ngân.
  - **Trưởng phòng**:
    - `<= 1.000.000đ`: Đi thẳng tới bên Thu mua.
    - `> 1.000.000đ` & `<= 10.000.000đ`: Gửi Giám đốc duyệt trước ➔ Thu mua...
    - `> 10.000.000đ`: Gửi Chủ tịch duyệt trước ➔ Thu mua...
  - **Giám đốc**:
    - `<= 10.000.000đ`: Đi thẳng tới bên Thu mua.
    - `> 10.000.000đ`: Gửi Chủ tịch duyệt trước ➔ Thu mua...
  - **Chủ tịch**: Đi thẳng tới bên Thu mua.

### 2. Đề xuất Tạm ứng (Advance Proposal)
- **Dữ liệu đầu vào**: STT, Mục đích tạm ứng, Số tiền ứng, Tên ngân hàng & Số tài khoản nhận tiền.
- **Luồng phê duyệt**:
  - **Nhân viên**: Tạo đơn ➔ Giám đốc duyệt ➔ Chủ tịch duyệt ➔ Kế toán duyệt & giải ngân tiền tạm ứng vào STK của người tạo.
  - **Hoàn tạm ứng**: Sau khi giải ngân, đơn chuyển sang trạng thái chờ hoàn tạm ứng:
    - Người tạo đơn tải hóa đơn/chứng từ đính kèm và chọn 1 trong 3 trạng thái:
      1. **Thừa**: Nhập số tiền thừa nộp lại ➔ Kế toán xác nhận đã thu tiền thừa và kết thúc đơn.
      2. **Thiếu**: Nhập số tiền thiếu công ty cần chi trả bổ sung ➔ Kế toán xác nhận đã chuyển số tiền còn thiếu và kết thúc đơn.
      3. **Đủ**: Chứng từ hợp lệ ➔ Kế toán xác nhận kết thúc đơn.
  - **Giám đốc**: Bỏ qua bước Giám đốc, gửi thẳng Chủ tịch ➔ Kế toán...
  - **Chủ tịch**: Bỏ qua bước Giám đốc và Chủ tịch, tới thẳng Kế toán...

---

## 🚀 HƯỚNG DẪN KHỞI CHẠY HỆ THỐNG

### 1. Khởi động Backend
```bash
cd backend
# Cài dependencies (nếu chưa cài)
npm install

# Khởi tạo dữ liệu mẫu (phòng ban & 6 tài khoản mẫu)
npm run seed

# Khởi chạy server development (nodemon)
npm run dev
# Server chạy tại: http://localhost:5000
```

### 2. Khởi động Frontend
```bash
cd frontend
# Cài dependencies (nếu chưa cài)
npm install

# Khởi chạy Vite dev server
npm run dev
# Mở trình duyệt tại: http://localhost:3000
```
