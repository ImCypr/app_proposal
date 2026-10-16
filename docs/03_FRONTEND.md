# 03 — Frontend (React / TypeScript / Vite)

## Diem vao ung dung

### main.tsx
ReactDOM.createRoot -> render <App />

### App.tsx
<BrowserRouter>
  <AuthProvider>       <- Global auth state
    <AppRoutes />      <- Tat ca dinh tuyen
  </AuthProvider>
</BrowserRouter>

---

## context/AuthContext.tsx — Quan ly trang thai xac thuc

Global state cung cap cho toan ung dung qua React Context.

### State
user: User | null       <- Nguoi dung hien tai (khoi tao tu localStorage)
token: string | null    <- JWT token (tu localStorage)
isLoading: boolean      <- Dang xac thuc hay khong

### Cac ham cung cap qua Context
login(email, password)
  - Goi authService.login()
  - Luu user + token vao state va localStorage

logout()
  - Xoa state va localStorage (token, user)

switchDemoRole(role)
  - Tim tai khoan demo tuong ung trong DEMO_ACCOUNTS
  - Goi login() voi email/password cua tai khoan do
  - Dung de chuyen nhanh giua cac vai tro khi demo

updateUser(updatedUser)
  - Cap nhat user trong state va localStorage
  - Dung sau khi chinh sua profile

refreshProfile()
  - Goi authService.getProfile() lay lai tu server
  - Cap nhat state

### Khoi tao (useEffect)
Khi component mount, neu co token trong localStorage:
  -> goi authService.getProfile() xac minh token van hop le
  -> Cap nhat state user
  -> Neu that bai -> logout()

### Hook useAuth()
Export de cac component con dung context de dang.
Nem loi neu dung ngoai AuthProvider.

---

## layout/

### ProtectedRoute.tsx
Bao ve cac tuyen duong yeu cau dang nhap:
  - isLoading = true -> Hien thi spinner loading
  - user = null      -> Redirect den /login (luu current path vao state)
  - Nguoc lai        -> Render children

### MainLayout.tsx
Khung layout chinh cho tat ca trang sau dang nhap:

+----------------------------------------------+
|  Sidebar  |          Navbar                   |
|           |     QuickRoleSwitcher             |
|           |     <Outlet />  (noi dung trang)  |
+----------------------------------------------+

Cac component: Sidebar, Navbar, QuickRoleSwitcher tu /component

---

## routes/routes.tsx — Dinh tuyen trang

AppRoutes component:

/login              -> LoginPage          (cong khai)
/ (ProtectedRoute -> MainLayout)
  /dashboard        -> DashboardPage
  /purchase         -> PurchaseListPage
  /purchase/create  -> CreatePurchasePage
  /purchase/:id     -> PurchaseDetailPage
  /advance          -> AdvanceListPage
  /advance/create   -> CreateAdvancePage
  /advance/:id      -> AdvanceDetailPage
  /payment          -> PaymentListPage
  /payment/create   -> CreatePaymentPage
  /payment/:id      -> PaymentDetailPage
  /approval         -> ApprovalPage
  /profile          -> ProfilePage
* -> Redirect /dashboard (tuyen duong mac dinh)

---

## models/ — Kieu du lieu TypeScript

Cac interface phan anh dung schema MongoDB.

auth.model.ts:
  User { _id, fullName, email, role, department, bankAccount, avatar }
  Role: 'nhan_vien' | 'truong_phong' | 'thu_mua' | 'ke_toan' | 'giam_doc' | 'chu_tich'
  LoginDto, RegisterDto, AuthResponse

department.model.ts:
  Department { _id, name, description, isActive }

purchaseProposal.model.ts:
  PurchaseItem, ApprovalStep, Disbursement
  PurchaseProposal { proposalCode, creator, department, items, totalEstimatedAmount,
    totalActualAmount, pricingMethod, quotationAttachments, status,
    currentApprovalRole, approvalFlow, disbursements, totalDisbursed }
  CreatePurchaseProposalDto

advanceProposal.model.ts:
  AdvanceItem, Settlement
  AdvanceProposal { proposalCode, creator, department, bankAccount, items,
    totalAmount, status, approvalFlow, disbursements, settlement }
  CreateAdvanceProposalDto, SubmitSettlementDto

paymentProposal.model.ts:
  Beneficiary, PaymentApprovalStep, DisbursementInfo
  PaymentProposal { proposalCode, purchaseProposal, creator, department,
    beneficiary, paymentReason, paymentMethod, amount, amountInWords,
    installmentNote, attachments, status, approvalFlow, disbursementInfo }
  CreatePaymentProposalDto

---

## services/ — Giao tiep API

### api.ts — Axios instance trung tam
const api = axios.create({ baseURL: VITE_API_URL || 'http://localhost:5000/api' })

Request interceptor:
  - Tu dong gan Authorization: Bearer <token> tu localStorage

Response interceptor:
  - Status 401 -> xoa token + user, redirect /login
  - Chuan hoa thong bao loi tu response

### authService.ts
login({ email, password })      -> POST /auth/login
register(data)                  -> POST /auth/register
getProfile()                    -> GET  /auth/profile
updateProfile(data)             -> PUT  /auth/profile
updateBankAccount(bankData)     -> PUT  /auth/bank-account
getAllUsers()                   -> GET  /auth/users

### purchaseProposalService.ts
getAll()                        -> GET  /purchase-proposals
getById(id)                     -> GET  /purchase-proposals/:id
create(data)                    -> POST /purchase-proposals
approve(id, comment)            -> PUT  /purchase-proposals/:id/approve
reject(id, reason)              -> PUT  /purchase-proposals/:id/reject
getAIPricingSuggestions(id)     -> GET  /purchase-proposals/:id/ai-pricing
submitProcurement(id, items, method, attachments) -> PUT /:id/procurement
accountingConfirm(id, comment)  -> PUT  /purchase-proposals/:id/accounting-confirm
finalApprove(id, comment)       -> PUT  /purchase-proposals/:id/final-approve

### advanceProposalService.ts
getAll()                        -> GET  /advance-proposals
getById(id)                     -> GET  /advance-proposals/:id
create(data)                    -> POST /advance-proposals
approve(id, comment)            -> PUT  /advance-proposals/:id/approve
reject(id, reason)              -> PUT  /advance-proposals/:id/reject
accountingDisburse(id, amount, note) -> PUT /:id/accounting-disburse
submitSettlement(id, data)      -> PUT  /advance-proposals/:id/settlement
confirmSettlement(id, comment)  -> PUT  /advance-proposals/:id/confirm-settlement

### paymentProposalService.ts
getAll(params)                  -> GET  /payment-proposals?purchaseProposalId=&status=
getById(id)                     -> GET  /payment-proposals/:id
create(data)                    -> POST /payment-proposals
approve(id, comment)            -> PUT  /payment-proposals/:id/approve
reject(id, reason)              -> PUT  /payment-proposals/:id/reject
disburse(id, data)              -> PUT  /payment-proposals/:id/disburse

### uploadService.ts
uploadFiles(files: File[]) -> POST /upload (multipart/form-data, field: 'files')
  -> Response: [{name, url, size, type, filename}]

### departmentService.ts
getAll() -> GET /departments

---

## utils/formatters.ts — Tien ich hien thi

formatCurrency(amount)
  So -> Chuoi tien VND (Intl.NumberFormat vi-VN)
  VD: 15000000 -> '15.000.000 d'

formatDate(dateString)
  ISO string -> DD/MM/YYYY HH:mm (locale Viet)

formatDateToVietnameseLong(dateString)
  ISO string -> 'Ngay DD thang MM nam YYYY' (dung khi in phieu)

numberToVietnameseWords(num)
  So -> Chu tieng Viet (doc so tien bang chu)
  VD: 15000000 -> 'Muoi lam trieu dong chan.'

formatFileSize(bytes)
  Bytes -> 'KB', 'MB', 'GB'

getRoleLabel(role)    Map role code -> ten tieng Viet
getRoleBadgeClass(role) Map role -> CSS class

getPurchaseStatusInfo(status) -> { label, badgeClass, dotColor }
getAdvanceStatusInfo(status)  -> { label, badgeClass, dotColor }
getPaymentStatusInfo(status)  -> { label, badgeClass, dotColor }

DEMO_ACCOUNTS: Mang 6 tai khoan demo { role, name, email, password, department, description }

---

## component/ — Thanh phan dung lai

| Component | Mo ta |
|-----------|-------|
| Navbar.tsx | Thanh navigation tren cung: ten nguoi dung, avatar, nut logout |
| Sidebar.tsx | Menu dieu huong ben trai: link den cac trang, icon, active state |
| Modal.tsx | Component modal co ban (overlay + dialog) |
| StatusBadge.tsx | Badge hien thi trang thai (mau, cham tron, label) |
| StatCard.tsx | Card thong ke Dashboard (icon, so, tieu de) |
| ApprovalFlowTracker.tsx | Timeline hien thi tien trinh phe duyet (buoc, ai da duyet, ngay) |
| QuickRoleSwitcher.tsx | Thanh chuyen doi nhanh vai tro demo |
| TagLogo.tsx | Logo/branding he thong |
| PurchasePrintModal.tsx | Modal in phieu de xuat mua sam |
| AdvancePrintModal.tsx | Modal in phieu de xuat tam ung |
| PaymentPrintModal.tsx | Modal in phieu de xuat thanh toan |

---

## pages/ — Cac trang giao dien

### loginpage/LoginPage.tsx
- Form dang nhap (email + password)
- Danh sach tai khoan demo de click dang nhap nhanh (DEMO_ACCOUNTS)
- Goi useAuth().login()

### dashboardpage/DashboardPage.tsx
- Lay danh sach ca 3 loai de xuat qua API
- Hien thi StatCard thong ke tong quan (tong so, cho duyet, hoan thanh...)
- Danh sach de xuat gan nhat

### purchasepage/

PurchaseListPage.tsx:
  - Danh sach de xuat mua sam
  - Bo loc theo trang thai, tim kiem theo ma / ten
  - Click vao de den trang chi tiet

CreatePurchasePage.tsx:
  - Form tao de xuat: them nhieu vat tu dong dong
  - Moi dong: ten vat tu, yeu cau ky thuat, phong ban su dung, so luong, don gia du kien
  - Submit -> goi purchaseProposalService.create()

PurchaseDetailPage.tsx (file lon nhat: 74KB):
  - Hien thi toan bo thong tin de xuat
  - ApprovalFlowTracker: hien thi tien trinh duyet
  - Nut hanh dong theo vai tro:
    + truong_phong/giam_doc/chu_tich: Duyet / Tu choi
    + thu_mua: Khao gia AI, Dien gia thuc te, Nop gia
    + ke_toan: Xac nhan gia, Lap thanh toan
    + giam_doc/chu_tich: Duyet gia chot cuoi
  - In phieu (PurchasePrintModal)

### advancepage/

AdvanceListPage.tsx: Danh sach tam ung, bo loc, tim kiem

CreateAdvancePage.tsx:
  - Form tao: them nhieu dong (muc dich + so tien)
  - Thong tin tai khoan ngan hang nhan tien
  - Submit -> advanceProposalService.create()

AdvanceDetailPage.tsx (61KB):
  - Chi tiet de xuat
  - Hanh dong theo role:
    + giam_doc/chu_tich: Duyet / Tu choi
    + ke_toan: Duyet & Giai ngan
    + creator: Nop hoan tam ung (form settlement)
    + ke_toan: Xac nhan hoan
  - In phieu (AdvancePrintModal)

### paymentpage/

PaymentListPage.tsx: Danh sach thanh toan, bo loc

CreatePaymentPage.tsx (38KB):
  - Chi danh cho ke toan
  - Chon PurchaseProposal lien quan (phai dang o trang thai pending_payment)
  - Nhap: thong tin ben thu huong, so tien, noi dung, phuong thuc, chung tu
  - paymentProposalService.create()

PaymentDetailPage.tsx (43KB):
  - Chi tiet de xuat thanh toan
  - Hanh dong: giam_doc/chu_tich duyet chi / tu choi, ke_toan giai ngan
  - In phieu (PaymentPrintModal)

### approvalpage/ApprovalPage.tsx
  - Hop thu duyet ho so — tong hop tat ca de xuat dang cho nguoi dung hien tai duyet
  - Hien thi ca 3 loai de xuat, sap xep theo ngay tao moi nhat

### profilepage/ProfilePage.tsx
  - Xem va chinh sua thong tin ca nhan (ho ten, avatar)
  - Cap nhat tai khoan ngan hang (so TK, ten NH)
  - Hien thi vai tro, phong ban
