# 🎨 GIAO DIỆN NGƯỜI DÙNG - HỆ THỐNG PHÊ DUYỆT ĐỀ XUẤT ĐA CẤP (FRONTEND)

Ứng dụng web Single Page Application (SPA) xây dựng trên nền tảng **React 19 + TypeScript + Vite**, cung cấp giao diện trực quan, tối ưu trải nghiệm người dùng trong quản lý và phê duyệt quy trình đề xuất mua sắm, thanh toán và tạm ứng.

---

## 🛠️ Công Nghệ Sử Dụng

- **Framework & Thư viện UI**: React 19, TypeScript
- **Công cụ đóng gói (Bundler)**: Vite 8 (HMR siêu nhanh)
- **Styling**: Tailwind CSS v4, CSS Variables hiện đại (Hỗ trợ Dark Mode)
- **Bộ icon**: Lucide React
- **Định tuyến (Routing)**: React Router DOM (v7)
- **Giao tiếp API**: Axios (xử lý token và interceptor)
- **Kiểm tra mã nguồn (Linter)**: Oxlint

---

## 📁 Cấu Trúc Thư Mục Frontend

```
frontend/
├── public/                         # Tài nguyên tĩnh (favicon, logo, icons)
├── src/
│   ├── assets/                     # Hình ảnh, tài nguyên nội bộ
│   ├── component/                  # Các Component tái sử dụng
│   │   ├── ApprovalFlowTracker.tsx # Sơ đồ tiến trình phê duyệt trực quan theo từng bước
│   │   ├── QuickRoleSwitcher.tsx   # Thanh chuyển đổi nhanh 6 vai trò tài khoản thử nghiệm
│   │   ├── PurchasePrintModal.tsx  # Cửa sổ xem trước & in PDF A4 Đơn Đề xuất Mua sắm
│   │   ├── PaymentPrintModal.tsx   # Cửa sổ xem trước & in PDF A4 Giấy Đề nghị Thanh toán
│   │   ├── AdvancePrintModal.tsx   # Cửa sổ xem trước & in PDF A4 Giấy Đề nghị Tạm ứng
│   │   ├── Navbar.tsx              # Thanh điều hướng trên cùng
│   │   ├── Sidebar.tsx             # Menu điều hướng bên trái
│   │   ├── StatCard.tsx            # Thẻ thống kê số liệu trên Dashboard
│   │   ├── StatusBadge.tsx         # Huy hiệu trạng thái đề xuất với màu sắc chuẩn
│   │   ├── Modal.tsx               # Component hộp thoại Popup chung
│   │   └── TagLogo.tsx             # Biểu tượng thương hiệu
│   ├── context/
│   │   └── AuthContext.tsx         # Quản lý phiên đăng nhập, User State và quyền hạn
│   ├── layout/
│   │   └── Layout.tsx              # Khung giao diện chính (Navbar + Sidebar + Content)
│   ├── models/
│   │   └── index.ts                # Định nghĩa Types/Interfaces dữ liệu (User, Proposal...)
│   ├── pages/                      # Các trang chức năng của ứng dụng
│   │   ├── auth/                   # Trang Đăng nhập (LoginPage.tsx)
│   │   ├── dashboardpage/          # Trang Tổng quan & Thống kê (DashboardPage.tsx)
│   │   ├── purchasepage/           # Danh sách, Tạo mới, Chi tiết & Duyệt đơn mua sắm
│   │   ├── paymentpage/            # Danh sách, Tạo mới, Chi tiết, Duyệt chi & Giải ngân thanh toán
│   │   ├── advancepage/            # Danh sách, Tạo mới, Chi tiết, Duyệt tạm ứng & Hoàn ứng
│   │   ├── approvalpage/           # Danh sách các đơn đang chờ người dùng hiện tại phê duyệt
│   │   └── profilepage/            # Xem thông tin cá nhân & Đổi thông tin tài khoản ngân hàng
│   ├── routes/
│   │   └── index.tsx               # Cấu hình danh sách tuyến đường (Routes) & Route Guard
│   ├── services/                   # Tầng gọi API Backend (Axios)
│   │   ├── api.ts                  # Cấu hình Axios instance & tự động đính kèm JWT Token
│   │   ├── authService.ts          # API Xác thực người dùng
│   │   ├── departmentService.ts    # API Lấy danh mục phòng ban
│   │   ├── purchaseProposalService.ts # API Đề xuất mua sắm
│   │   ├── paymentProposalService.ts  # API Đề xuất thanh toán
│   │   ├── advanceProposalService.ts  # API Đề xuất tạm ứng & hoàn ứng
│   │   └── uploadService.ts        # API Tải lên tệp chứng từ/hóa đơn
│   ├── utils/
│   │   └── formatters.ts           # Hàm định dạng tiền tệ VNĐ, ngày tháng, dịch số thành chữ
│   ├── App.tsx                     # Component gốc
│   ├── main.tsx                    # Điểm khởi tạo và render ReactDOM
│   └── index.css                   # Thiết kế Theme, Typography và biến màu sắc
├── .env.example                    # File mẫu biến môi trường Frontend
├── .env                            # Biến môi trường thực tế (không commit)
├── package.json                    # Dependencies & Scripts
├── tsconfig.json                   # Cấu hình TypeScript
└── vite.config.ts                  # Cấu hình Vite
```

---

## ⚙️ Cấu Hình Biến Môi Trường (.env)

Tạo file `.env` tại thư mục `frontend/` dựa trên file `.env.example`:

```bash
cp .env.example .env
```

Nội dung file `.env`:

```env
# Địa chỉ URL của Backend API (kết nối đến máy chủ Node.js Express)
VITE_API_URL=http://localhost:5000/api
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Ứng Dụng

### 1. Cài đặt các gói phụ thuộc:
```bash
npm install
```

### 2. Chạy máy chủ phát triển (Development):
```bash
npm run dev
```
Trình duyệt sẽ mở tại: `http://localhost:5173`

### 3. Kiểm tra mã nguồn (Linter):
```bash
npm run lint
```

### 4. Đóng gói cho Production (Build):
```bash
npm run build
```
Mã nguồn sau khi biên dịch và tối ưu sẽ nằm trong thư mục `dist/`.

### 5. Xem trước bản build Production:
```bash
npm run preview
```

---

## ✨ Các Tính Năng Nổi Bật Trên Giao Diện

1. **Quick Role Switcher (Chuyển đổi vai trò tức thì)**:
   * Cho phép chuyển đổi linh hoạt giữa 6 vai trò tài khoản (`Nhân viên`, `Trưởng phòng`, `Thu mua`, `Kế toán`, `Giám đốc`, `Chủ tịch`) ngay trên đầu trang chỉ bằng 1 cú click chuột, giúp người dùng hoặc kiểm thử viên test trọn vẹn luồng phê duyệt mà không mất công đăng xuất và đăng nhập lại.
2. **Approval Flow Tracker (Biểu đồ luồng phê duyệt trực quan)**:
   * Hiển thị tiến trình từng bước xét duyệt của đơn đề xuất: ai đã duyệt, thời gian duyệt, chức vụ và bước kế tiếp cần xử lý.
3. **Xem trước bản in & Xuất file PDF chuẩn A4**:
   * Tích hợp hộp thoại xem trước mô phỏng chính xác tờ giấy A4 màu trắng trên nền tối chuyên nghiệp.
   * Căn lề chuẩn văn bản hành chính Việt Nam (**Nghị định 30/2020/NĐ-CP**): Lề trên `20mm`, Lề dưới `20mm`, Lề trái `25mm` (dành cho đóng ghim), Lề phải `15mm`.
   * Trang bị bộ công cụ thu phóng (**Zoom In / Zoom Out từ 60% đến 140%**) giúp xem rõ chi tiết văn bản trên mọi loại kích thước màn hình.
   * Điền đầy đủ quốc hiệu tiêu ngữ, tên công ty, thông tin người làm đơn, bảng kê chi tiết vật tư, số tiền bằng chữ và khu vực chữ ký 2 bên kèm ngày tháng chuẩn xác.
4. **Quản lý phân hệ chuyên biệt**:
   * **Mua sắm vật tư**: Tạo đơn kèm danh sách vật tư chi tiết, quy trình khảo sát giá thị trường của bộ phận Thu mua, và tự động đề xuất chuyển sang tạo Thanh toán khi đơn hoàn thành.
   * **Thanh toán**: Quản lý các khoản thanh toán cho đơn mua sắm hoặc chi phí hoạt động trực tiếp, luồng duyệt chi và xác nhận giải ngân.
   * **Tạm ứng & Hoàn ứng**: Nhận tiền tạm ứng qua tài khoản ngân hàng, hỗ trợ quyết toán hoàn ứng với 3 tình huống (thừa hoàn trả, thiếu nhận bổ sung, đủ hợp lệ) đính kèm hóa đơn chứng từ.
