# HỆ THỐNG PHÊ DUYỆT ĐỀ XUẤT ĐA CẤP (APPDEXUAT_NEW)
### PHÂN TÁCH ĐỘC LẬP CHỨC DANH NGHIỆP VỤ & PHÂN HỆ QUẢN TRỊ ADMIN

---

## 🌟 GIỚI THIỆU TỔNG QUAN

Dự án **AppDeXuat_New** được phát triển và chuẩn hóa từ hệ thống đề xuất của **AppDeXuat**, kế thừa **100% quy trình và logic nghiệp vụ tài chính/phê duyệt hiện có** (Mua sắm vật tư, Đề xuất thanh toán, Tạm ứng & Hoàn ứng, In văn bản A4 chuẩn Nghị định 30/2020/NĐ-CP).

Hệ thống được nâng cấp toàn diện về mặt kiến trúc phân quyền:
1. **Phân tách chức danh nghiệp vụ tuyệt đối**: Mỗi tài khoản người dùng chỉ nắm giữ **duy nhất 1 vai trò (role)**, đảm nhiệm đúng phạm vi trách nhiệm nghiệp vụ của chức danh đó, không bị chồng chéo hay kiêm nhiệm.
2. **Bổ sung phân hệ Quản trị viên (Admin)**:
   - **Tạo người dùng mới**: Đăng ký thông tin, chọn phòng ban, mật khẩu ban đầu và gán chức danh.
   - **Gán / Sửa chức danh**: Linh hoạt nâng cấp hoặc điều chuyển chức danh cho nhân sự.
   - **Xóa chức danh**: Đưa tài khoản về trạng thái `unassigned` (Chưa gán chức danh), tạm ngưng quyền truy cập nghiệp vụ cho đến khi được phân công mới.
   - **Gán Trưởng phòng trực tiếp (`directManager`)**: Chỉ định người quản lý trực tiếp duyệt đơn mua sắm bước 1 cho từng nhân viên cụ thể.
   - **Xóa / Khóa tài khoản**: Quản trị vòng đời tài khoản an toàn.

---

## 👥 BẢNG PHÂN QUYỀN CHỨC DANH CHI TIẾT

Tất cả tài khoản thử nghiệm sử dụng mật khẩu mặc định: `123456`

| STT | Chức Danh (Role) | Email Mẫu | Phòng Ban | Phạm Vi Trách Nhiệm Nghiệp Vụ |
| :---: | :--- | :--- | :--- | :--- |
| **0** | **Quản trị viên (Admin)** | `admin@demo.com` | Ban Quản Trị | **Quản trị hệ thống**: Tạo user, gán/sửa/xóa chức danh, thiết lập Trưởng phòng trực tiếp, quản lý danh mục phòng ban. Không can thiệp chi tiêu tiền bạc. |
| **1** | **Nhân viên** | `nhanvien@demo.com` | Phòng Kinh Doanh | Lập yêu cầu mua sắm vật tư, đề xuất tạm ứng công tác, nộp hồ sơ quyết toán hoàn tạm ứng sau giải ngân. *(Trưởng phòng trực tiếp: Trần Thị Bình)*. |
| **2** | **Trưởng phòng** | `truongphong@demo.com` | Phòng Kinh Doanh | Phê duyệt sơ bộ yêu cầu vật tư của nhân viên trực tiếp quản lý hoặc nhân viên trong phòng ban đối với các đơn **≤ 1.000.000 VNĐ**. |
| **3** | **Thu mua** | `thuamua@demo.com` | Phòng Thu Mua | Khảo sát thị trường 3-4 báo giá, lập văn bản giải trình lựa chọn nhà cung cấp tối ưu, thực hiện mua sắm thực tế, đề xuất tạm ứng mua sắm. |
| **4** | **Kế toán** | `ketoan@demo.com` | Phòng Tài Chính | Tiếp nhận hồ sơ từ Thu mua, tham chiếu giá, **độc quyền lập đề xuất thanh toán**, thực hiện giải ngân chuyển tiền ngân hàng, kiểm tra duyệt hoàn tạm ứng. |
| **5** | **Giám đốc** | `giamdoc@demo.com` | Ban Giám Đốc | Phê duyệt mua sắm đối với đơn **≤ 10.000.000 VNĐ**, phê duyệt chi đề xuất thanh toán, phê duyệt đề xuất tạm ứng. |
| **6** | **Chủ tịch** | `chutich@demo.com` | Ban Giám Đốc | **Thẩm quyền tối cao**: Phê duyệt mua sắm đối với đơn **> 10.000.000 VNĐ**, duyệt chi các khoản thanh toán quy mô lớn và hợp đồng kinh tế. |
| **7** | **Chưa gán chức danh** | `unassigned@demo.com` | Phòng Kinh Doanh | Trạng thái sau khi bị xóa chức danh hoặc mới tạo: chỉ xem thông báo yêu cầu liên hệ Admin, không thể thao tác các phân hệ nghiệp vụ. |

---

## 🛠️ CƠ CHẾ GÁN TRƯỞNG PHÒNG TRỰC TIẾP (`directManager`)

Trong quy trình mua sắm vật tư:
1. Khi nhân viên lập đề xuất mua sắm, hệ thống kiểm tra trường `directManager` của nhân viên đó.
2. Nếu Admin đã gán một Trưởng phòng cụ thể: Đơn sẽ **tự động gửi thẳng đích danh** đến Trưởng phòng đó duyệt ở Bước 1.
3. Nếu chưa gán: Hệ thống sẽ tự động gán theo Trưởng phòng chung của phòng ban nhân viên trực thuộc.
4. Các cấp Quản lý cấp cao (`giam_doc`, `chu_tich`) khi tự lập đơn mua sắm sẽ tự động được miễn bước 1 và chuyển thẳng đến bộ phận Thu mua khảo giá.

---

## 📂 CẤU TRÚC THƯ MỤC MÃ NGUỒN MỚI

```
AppDeXuat_New/
├── backend/
│   ├── config/                     # Kết nối MongoDB (db.js)
│   ├── controllers/
│   │   ├── adminController.js      # [MỚI] Điều phối API quản trị người dùng, gán chức danh, direct manager
│   │   ├── authController.js       # Xác thực JWT, đăng nhập, thông tin cá nhân
│   │   ├── departmentController.js # Quản lý danh mục phòng ban
│   │   ├── purchaseProposalController.js # Nghiệp vụ mua sắm vật tư
│   │   ├── paymentProposalController.js  # Nghiệp vụ đề xuất thanh toán
│   │   ├── advanceProposalController.js  # Nghiệp vụ đề xuất tạm ứng & hoàn ứng
│   │   ├── aiSearchController.js   # Tìm kiếm báo giá nhà cung cấp qua AI
│   │   └── uploadController.js     # Xử lý upload tài liệu, hóa đơn
│   ├── middlewares/
│   │   └── auth.js                 # [CẬP NHẬT] Middleware chặn unassigned, bảo vệ admin routes
│   ├── models/
│   │   ├── User.js                 # [CẬP NHẬT] Schema bổ sung role 'admin' & 'unassigned', directManager
│   │   ├── Department.js
│   │   ├── PurchaseProposal.js     # Đơn mua sắm vật tư & luồng duyệt đa cấp
│   │   ├── PaymentProposal.js      # Đề xuất thanh toán chi phí / hóa đơn
│   │   └── AdvanceProposal.js      # Đề xuất tạm ứng & quyết toán
│   ├── routes/
│   │   ├── adminRoutes.js          # [MỚI] Các API /api/admin/* được bảo vệ nghiêm ngặt
│   │   ├── authRoutes.js
│   │   ├── departmentRoutes.js
│   │   ├── purchaseProposalRoutes.js
│   │   ├── paymentProposalRoutes.js# [CẬP NHẬT] Chỉ cho phép Kế toán lập đề xuất
│   │   ├── advanceProposalRoutes.js
│   │   ├── aiSearchRoutes.js
│   │   └── uploadRoutes.js
│   ├── services/
│   │   ├── adminService.js         # [MỚI] Nghiệp vụ tạo user, đổi role, xóa role, gán manager, thống kê
│   │   ├── authService.js
│   │   ├── departmentService.js
│   │   ├── purchaseProposalService.js
│   │   ├── paymentProposalService.js
│   │   ├── advanceProposalService.js
│   │   └── aiSearchService.js
│   ├── utils/
│   │   ├── helpers.js
│   │   └── seed.js                 # [CẬP NHẬT] Dữ liệu mẫu khởi tạo tài khoản Admin và 6 vai trò chuẩn
│   ├── .env.example
│   ├── .env                        # Đã cấu hình MONGODB_URI=mongodb://localhost:27017/app_de_xuat_new
│   ├── package.json
│   └── server.js                   # [CẬP NHẬT] Tích hợp mount /api/admin
│
├── frontend/
│   ├── src/
│   │   ├── component/
│   │   │   ├── Sidebar.tsx         # [CẬP NHẬT] Menu phân tách nghiêm ngặt từng role, menu Admin
│   │   │   ├── Navbar.tsx          # Hiển thị huy hiệu chức danh và phòng ban
│   │   │   ├── StatCard.tsx        # Thẻ thống kê
│   │   │   └── ...                 # Các Modal xem trước in ấn PDF A4 (Mua sắm, Thanh toán, Tạm ứng)
│   │   ├── context/
│   │   │   └── AuthContext.tsx     # Quản lý phiên đăng nhập và token an toàn
│   │   ├── layout/
│   │   │   ├── MainLayout.tsx
│   │   │   └── ProtectedRoute.tsx  # [CẬP NHẬT] Bảo vệ tuyến đường theo allowedRoles, chặn unassigned
│   │   ├── models/
│   │   │   ├── auth.model.ts       # [CẬP NHẬT] Bổ sung Role admin & unassigned, DTOs quản trị
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── adminpage/
│   │   │   │   ├── UserManagementPage.tsx       # [MỚI] Giao diện Quản trị người dùng & phân quyền
│   │   │   │   └── DepartmentManagementPage.tsx # [MỚI] Giao diện Quản lý danh mục phòng ban
│   │   │   ├── unassignedpage/
│   │   │   │   └── UnassignedNoticePage.tsx     # [MỚI] Màn hình thông báo tài khoản chưa gán role
│   │   │   ├── loginpage/LoginPage.tsx          # [CẬP NHẬT] Hỗ trợ đăng nhập nhanh tài khoản Admin
│   │   │   ├── dashboardpage/DashboardPage.tsx  # [CẬP NHẬT] Nút hành động nhanh theo đúng chức danh
│   │   │   ├── purchasepage/                    # Phân hệ mua sắm vật tư
│   │   │   ├── paymentpage/                     # Phân hệ đề xuất thanh toán (dành riêng Kế toán)
│   │   │   ├── advancepage/                     # Phân hệ đề xuất tạm ứng
│   │   │   ├── approvalpage/                    # Hộp thư duyệt hồ sơ
│   │   │   └── profilepage/                     # Thông tin cá nhân & tài khoản ngân hàng thụ hưởng
│   │   ├── routes/
│   │   │   └── routes.tsx          # [CẬP NHẬT] Cấu hình tuyến đường Admin và phân quyền route
│   │   ├── services/
│   │   │   ├── adminService.ts     # [MỚI] Gọi API quản trị người dùng, đổi role, gán manager
│   │   │   └── ...
│   │   └── utils/
│   │       └── formatters.ts       # [CẬP NHẬT] Bổ sung nhãn, màu sắc và demo accounts cho Admin
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   └── vite.config.ts
│
├── scripts/
│   ├── run_dev.bat                 # Script chạy ngầm cả backend và frontend
│   └── run_silent.vbs              # Chạy không hiện cửa sổ console
├── start.bat                       # 1-Click khởi chạy toàn bộ hệ thống
├── stop.bat                        # 1-Click dừng các tiến trình Node.js
└── README.md                       # Tài liệu hướng dẫn chi tiết
```

---

## 🚀 HƯỚNG DẪN KHỞI CHẠY (KHI CẦN SỬ DỤNG)

*(Lưu ý: Theo yêu cầu của bạn, hệ thống chưa được chạy tự động. Khi bạn muốn đưa vào sử dụng thực tế, hãy làm theo các bước dưới đây):*

### Cách 1: Chạy nhanh 1-Click (Khuyên dùng)
1. Cài đặt các gói thư viện lần đầu:
   ```bash
   cd AppDeXuat_New/backend && npm install && npm run seed
   cd ../frontend && npm install
   ```
2. Nhấp đúp vào file `start.bat` tại thư mục `AppDeXuat_New/`.
3. Mở trình duyệt web truy cập: `http://localhost:5173`.
4. Để tắt server: Nhấp đúp vào file `stop.bat`.

### Cách 2: Khởi động thủ công qua Terminal
1. **Khởi động Backend**:
   ```bash
   cd AppDeXuat_New/backend
   npm install
   npm run seed       # Nạp tài khoản Admin và 6 vai trò mẫu cùng liên kết Trưởng phòng
   npm run dev        # Chạy máy chủ tại http://localhost:5000
   ```
2. **Khởi động Frontend**:
   ```bash
   cd AppDeXuat_New/frontend
   npm install
   npm run dev        # Chạy máy chủ giao diện tại http://localhost:5173
   ```

---

## 💡 ĐIỂM NỔI BẬT ĐÃ HOÀN TẤT
1. ✅ **Giữ nguyên 100% logic và quy trình nghiệp vụ** mua sắm, thanh toán, tạm ứng của AppDeXuat ban đầu.
2. ✅ **Phân tách chức danh triệt để**: Mỗi tài khoản chỉ làm đúng công việc của 1 role duy nhất.
3. ✅ **Tài khoản Admin hoàn chỉnh**:
   - Giao diện quản trị hiện đại, trực quan tại `/admin/users`.
   - Chức năng tạo người dùng mới và gán chức danh.
   - Chức năng đổi/sửa chức danh của bất kỳ ai.
   - Chức năng xóa chức danh (chuyển về trạng thái `unassigned`).
   - Chức năng gán Trưởng phòng trực tiếp (`directManager`) chọn từ danh sách quản lý.
   - Thống kê nhân sự trực quan theo từng vai trò.
4. ✅ **Bảo mật chức danh cố định & triệt để**: Đã gỡ bỏ hoàn toàn thanh Quick Role Switcher. Mỗi tài khoản gắn chặt với đúng 1 chức danh nghiệp vụ duy nhất trong suốt quá trình hoạt động, không thể tự thay đổi. Chỉ Quản trị viên (Admin) mới có thẩm quyền gán, thay đổi hoặc xóa chức danh.
