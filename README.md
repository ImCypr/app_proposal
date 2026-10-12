# HỆ THỐNG GỬI VÀ PHÊ DUYỆT ĐỀ XUẤT ĐA CẤP (APP ĐỀ XUẤT)

Hệ thống quản lý, phê duyệt đa cấp và giải ngân kinh phí theo quy trình phân cấp thẩm quyền chức vụ, hạn mức ngân sách và chuẩn mực văn bản hành chính cho doanh nghiệp.

Bao gồm 3 phân hệ đề xuất cốt lõi:
1. **Đề xuất Mua sắm vật tư / thiết bị (Purchase Proposal)**
2. **Đề xuất Thanh toán (Payment Proposal)**
3. **Đề xuất Tạm ứng & Hoàn ứng (Advance Proposal)**

---

## 🛠️ CÔNG NGHỆ SỬ DỤNG

- **Backend**: Node.js, Express.js (v5), MongoDB (Mongoose v9), JSON Web Token (JWT), Bcryptjs, Multer (xử lý upload chứng từ), Cors, Dotenv, Nodemon.
- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React, React Router DOM (v7), Axios.
- **Tiện ích vận hành**: Bộ script chạy nền Windows (`start.bat`, `stop.bat`, VBScript).

---

## 📁 CẤU TRÚC THƯ MỤC CHUẨN HIỆN TẠI

```
AppDeXuat/
├── backend/
│   ├── config/                     # Cấu hình kết nối MongoDB (db.js)
│   ├── controllers/                # Điều phối request/response cho từng phân hệ
│   │   ├── authController.js
│   │   ├── departmentController.js
│   │   ├── purchaseProposalController.js
│   │   ├── paymentProposalController.js
│   │   ├── advanceProposalController.js
│   │   └── uploadController.js
│   ├── middlewares/                # Middleware xác thực JWT & phân quyền (auth.js)
│   ├── models/                     # Mongoose Models (User, Department, PurchaseProposal, PaymentProposal, AdvanceProposal)
│   ├── routes/                     # RESTful API Routes
│   ├── services/                   # Logic nghiệp vụ xử lý quy trình phê duyệt & tài chính
│   ├── uploads/                    # Thư mục lưu trữ hóa đơn, chứng từ tải lên vật lý
│   ├── utils/                      # Helper tính toán, hàm seed dữ liệu mẫu 6 tài khoản
│   ├── .env.example                # File mẫu biến môi trường backend
│   ├── .env                        # Biến môi trường thực tế (không commit git)
│   ├── package.json
│   ├── README.md                   # Tài liệu hướng dẫn chi tiết cho Backend
│   └── server.js                   # Điểm khởi chạy server Express (Port 5000)
│
├── frontend/
│   ├── public/                     # Tài nguyên tĩnh
│   ├── src/
│   │   ├── component/              # UI components dùng chung:
│   │   │   ├── QuickRoleSwitcher.tsx   # Chuyển đổi nhanh 6 vai trò tài khoản thử nghiệm
│   │   │   ├── ApprovalFlowTracker.tsx # Sơ đồ tiến trình phê duyệt trực quan theo từng bước
│   │   │   ├── PurchasePrintModal.tsx  # Cửa sổ xem trước & in PDF A4 Đơn Mua sắm
│   │   │   ├── PaymentPrintModal.tsx   # Cửa sổ xem trước & in PDF A4 Đề nghị Thanh toán
│   │   │   ├── AdvancePrintModal.tsx   # Cửa sổ xem trước & in PDF A4 Đề nghị Tạm ứng
│   │   │   ├── Navbar.tsx & Sidebar.tsx# Điều hướng & menu
│   │   │   ├── StatCard.tsx & StatusBadge.tsx # Thống kê & nhãn trạng thái
│   │   │   └── Modal.tsx & TagLogo.tsx # Hộp thoại thông báo & logo
│   │   ├── context/                # Context quản lý Auth & Token
│   │   ├── layout/                 # Khung Layout chính có Guard xác thực (Layout.tsx)
│   │   ├── models/                 # TypeScript interfaces định nghĩa cấu trúc dữ liệu
│   │   ├── pages/                  # Các trang chức năng:
│   │   │   ├── auth/               # Đăng nhập (LoginPage.tsx)
│   │   │   ├── dashboardpage/      # Tổng quan thống kê & biểu đồ (DashboardPage.tsx)
│   │   │   ├── purchasepage/       # Danh sách, Tạo đơn, Khảo sát giá, Chi tiết mua sắm
│   │   │   ├── paymentpage/        # Danh sách, Lập đề nghị thanh toán, Duyệt chi & Giải ngân
│   │   │   ├── advancepage/        # Danh sách, Đề xuất tạm ứng, Giải ngân & Hoàn ứng (thừa/thiếu/đủ)
│   │   │   ├── approvalpage/       # Danh sách đơn chờ duyệt theo thẩm quyền vai trò hiện tại
│   │   │   └── profilepage/        # Thông tin cá nhân & Số tài khoản ngân hàng thụ hưởng
│   │   ├── routes/                 # Cấu hình danh sách tuyến đường điều hướng
│   │   ├── services/               # Gọi API Backend qua Axios
│   │   ├── utils/                  # Format tiền tệ VNĐ, ngày tháng, đọc số thành chữ tiếng Việt
│   │   ├── App.tsx & main.tsx
│   │   └── index.css               # Hệ thống Theme hiện đại (Dark mode)
│   ├── .env.example                # File mẫu biến môi trường frontend
│   ├── .env                        # Biến môi trường thực tế (không commit git)
│   ├── package.json
│   ├── README.md                   # Tài liệu hướng dẫn chi tiết cho Frontend
│   └── vite.config.ts
│
├── scripts/                        # Scripts hỗ trợ chạy nền ngầm không popup terminal
│   ├── run_dev.bat
│   └── run_silent.vbs
├── start.bat                       # 1-click khởi chạy đồng thời Backend & Frontend
├── stop.bat                        # 1-click dừng toàn bộ tiến trình Node.js & Vite
├── .gitignore
└── README.md                       # Tài liệu tổng quan toàn bộ hệ thống
```

---

## 👥 TÀI KHOẢN MẪU & BẢNG PHÂN QUYỀN

Mật khẩu mặc định cho tất cả tài khoản mẫu: `123456`

| Vai trò | Email đăng nhập | Phòng ban | Quyền hạn chính |
| :--- | :--- | :--- | :--- |
| **Nhân viên** | `nhanvien@demo.com` | Phòng Kinh Doanh | Tạo đơn mua sắm, đề xuất tạm ứng, thực hiện hoàn ứng |
| **Trưởng phòng** | `truongphong@demo.com` | Phòng Kinh Doanh | Duyệt đơn mua sắm của phòng ban **<= 1.000.000 VNĐ** |
| **Thu mua** | `thuamua@demo.com` | Phòng Thu Mua | Khảo sát thị trường, điền **Đơn giá thực tế** và nhà cung cấp |
| **Kế toán** | `ketoan@demo.com` | Phòng Tài Chính | Tạo đề xuất thanh toán, xác nhận giá, giải ngân, duyệt hoàn ứng |
| **Giám đốc** | `giamdoc@demo.com` | Ban Giám Đốc | Duyệt đơn mua sắm **<= 10.000.000 VNĐ**, duyệt chi thanh toán & tạm ứng |
| **Chủ tịch** | `chutich@demo.com` | Ban Giám Đốc | Duyệt mọi đơn mua sắm, duyệt chi thanh toán lớn & tạm ứng |

> 💡 **Tính năng Tiện ích - Quick Role Switcher**: Tích hợp thanh chuyển đổi nhanh vai trò ở góc trên màn hình, giúp bạn chuyển đổi qua lại giữa 6 tài khoản chỉ với 1 cú click để trải nghiệm toàn bộ quy trình phê duyệt mà không cần đăng xuất!

---

## 🔄 QUY TRÌNH NGHIỆP VỤ CHI TIẾT

### 1. Đề xuất Mua sắm vật tư (Purchase Proposal)
- **Tạo đơn**: Người làm đề xuất nhập danh sách vật tư, thiết bị cần mua (tên vật tư, số lượng, đơn vị, đơn giá dự kiến, mục đích sử dụng).
- **Luồng phê duyệt theo hạn mức**:
  - Hạn mức `<= 1.000.000đ`: Trưởng phòng duyệt ➔ Thu mua khảo sát thị trường ➔ Kế toán xác nhận ➔ Giám đốc duyệt chốt giá thực tế.
  - Hạn mức `1.000.000đ - 10.000.000đ`: Giám đốc duyệt sơ bộ ➔ Thu mua khảo sát giá ➔ Kế toán xác nhận ➔ Giám đốc duyệt chốt.
  - Hạn mức `> 10.000.000đ`: Chủ tịch duyệt sơ bộ ➔ Thu mua khảo sát giá ➔ Kế toán xác nhận ➔ Chủ tịch duyệt chốt.
- **Chuyển tiếp thanh toán**: Sau khi đơn mua sắm được phê duyệt hoàn tất, hệ thống cung cấp nút bấm **"Tạo đề xuất thanh toán"** cho kế toán, tự động điền sẵn thông tin vật tư, mã đơn mua sắm, số tiền và thông tin người thụ hưởng.

### 2. Đề xuất Thanh toán (Payment Proposal)
- **Hình thức**: Hỗ trợ 2 hình thức:
  - Thanh toán cho đơn mua sắm đã duyệt (liên kết mã đơn mua sắm).
  - Thanh toán chi phí hoạt động trực tiếp độc lập.
- **Luồng phê duyệt**: Kế toán lập đề xuất ➔ Giám đốc / Ban giám đốc phê duyệt chi ➔ Kế toán thực hiện giải ngân và xuất ủy nhiệm chi / phiếu chi.
- **In ấn & Xuất PDF**: Hỗ trợ xem trước và in bản PDF A4 chuẩn mẫu Giấy đề nghị thanh toán.

### 3. Đề xuất Tạm ứng & Hoàn tạm ứng (Advance Proposal)
- **Tạo đơn**: Người làm đề xuất nhập số tiền tạm ứng, mục đích ứng tiền, thông tin số tài khoản và ngân hàng nhận tiền.
- **Luồng duyệt & Giải ngân**: Cấp lãnh đạo duyệt tạm ứng ➔ Kế toán giải ngân chuyển khoản vào số tài khoản của người nhận.
- **Quy trình Hoàn tạm ứng (Quyết toán)**: Sau khi giải ngân, người tạo đơn tải lên hóa đơn, chứng từ thực tế và chọn 1 trong 3 trạng thái:
  1. **Thừa tiền**: Nhập số tiền thừa nộp lại quỹ ➔ Kế toán xác nhận thu tiền thừa và kết thúc đơn.
  2. **Thiếu tiền**: Nhập số tiền chi vượt cần công ty hoàn trả ➔ Kế toán chuyển số tiền còn thiếu và kết thúc đơn.
  3. **Đủ hợp lệ**: Chi phí thực tế khớp với tạm ứng ➔ Kế toán xác nhận hóa đơn hợp lệ và hoàn tất đơn.

---

## 🖨️ TÍNH NĂNG XEM TRƯỚC BẢN IN & XUẤT PDF CHUẨN KHỔ A4

Hệ thống trang bị tính năng xem trước bản in và xuất PDF chất lượng cao cho cả 3 phân hệ:
- **Căn lề chuẩn văn bản hành chính Việt Nam (Nghị định 30/2020/NĐ-CP)**:
  - Lề trên (Top): `20mm`
  - Lề dưới (Bottom): `20mm`
  - Lề trái (Left): `25mm` (dành cho việc đóng gáy/bấm ghim tài liệu)
  - Lề phải (Right): `15mm`
- **Giao diện xem trước mô phỏng chân thực**: Hiển thị tờ giấy A4 màu trắng sắc nét trên nền tối, bao trọn toàn bộ nội dung từ tiêu đề, bảng kê số liệu đến phần chữ ký các bên.
- **Bộ điều khiển thu phóng (Zoom)**: Phóng to / thu nhỏ từ **60% đến 140%** để đọc rõ văn bản trên mọi kích thước màn hình máy tính.
- **Nội dung chuẩn quy thức**: Đầy đủ Quốc hiệu - Tiêu ngữ, tên công ty, số văn bản, bảng chi tiết các hạng mục, số tiền bằng chữ tiếng Việt và các ô ký tên kèm ngày tháng năm chính xác.

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY HỆ THỐNG

### Cách 1: Khởi chạy nhanh 1-Click trên Windows (Khuyên dùng)
- **Khởi động**: Nhấp đúp vào file `start.bat` tại thư mục gốc. Hệ thống sẽ tự khởi chạy ngầm cả Backend (Port 5000) và Frontend (Port 5173).
- **Dừng hệ thống**: Nhấp đúp vào file `stop.bat` để tắt toàn bộ các tiến trình đang chạy.

---

### Cách 2: Khởi chạy thủ công từng phần

#### Bước 1: Cấu hình biến môi trường
1. Tại thư mục `backend/`:
   ```bash
   cp .env.example .env
   ```
   *(Kiểm tra cổng kết nối và chuỗi kết nối MongoDB trong file `backend/.env`)*
2. Tại thư mục `frontend/`:
   ```bash
   cp .env.example .env
   ```
   *(Đảm bảo `VITE_API_URL=http://localhost:5000/api`)*

#### Bước 2: Khởi động Backend
```bash
cd backend
npm install
npm run seed       # Nạp 6 tài khoản mẫu & phòng ban ban đầu
npm run dev        # Chạy máy chủ qua nodemon tại http://localhost:5000
```

#### Bước 3: Khởi động Frontend
Mở một cửa sổ Terminal mới:
```bash
cd frontend
npm install
npm run dev        # Chạy Vite dev server tại http://localhost:5173
```

Mở trình duyệt web và truy cập địa chỉ: `http://localhost:5173` để sử dụng hệ thống!
