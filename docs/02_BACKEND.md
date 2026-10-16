# 02 — Backend (Node.js / Express / MongoDB)

## server.js — Diem khoi dong

Cac buoc khoi dong:
1. Nap bien moi truong tu .env (dotenv)
2. connectDB() -> ket noi MongoDB
3. Neu users collection rong -> tu dong chay seedData()
4. Khoi tao Express app
5. Dang ky middleware: cors(), express.json (limit 50MB), express.urlencoded
6. Tao thu muc uploads/ neu chua co, phuc vu file tinh tai /uploads
7. Dang ky tat ca routes API
8. Dang ky middleware xu ly loi tap trung
9. Lang nghe port (mac dinh 5000)

API dac biet:
  GET  /api/health  -> Kiem tra suc khoe server
  POST /api/seed    -> Nap lai du lieu mau thu cong

---

## config/db.js — Ket noi Database

Ham: connectDB()
  - Su dung mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  - Neu ket noi that bai: chi in log canh bao, KHONG crash server

---

## middlewares/auth.js

### Ham protect(req, res, next)
1. Doc JWT token tu header: Authorization: Bearer <token>
2. Giai ma token bang JWT_SECRET
3. Tim User trong DB, populate department
4. Kiem tra user.isActive
5. Gan req.user = user, goi next()
6. Neu bat ky buoc nao that bai -> tra 401 Unauthorized

### Ham restrictTo(...roles)
Factory function tra ve middleware:
  - Kiem tra req.user.role co nam trong danh sach roles khong
  - Neu khong -> tra 403 Forbidden
  - Neu co -> goi next()

---

## middlewares/upload.js

Cau hinh Multer luu file vat ly vao backend/uploads/:

| Cau hinh | Gia tri |
|---------|---------|
| Thu muc luu | backend/uploads/ (tu tao neu chua co) |
| Dat ten file | {timestamp}-{random}-{tenfile}.{ext} |
| Dinh dang cho phep | jpg, jpeg, png, webp, gif, svg, pdf, xlsx, xls, docx, doc |
| Gioi han kich thuoc | 15MB moi file |

---

## routes/ — Dinh tuyen API

### authRoutes.js -> /api/auth
POST   /register              -> dang ky tai khoan
POST   /login                 -> dang nhap, nhan token
GET    /profile    [protect]  -> lay thong tin ca nhan
PUT    /profile    [protect]  -> cap nhat thong tin
PUT    /bank-account [protect]-> cap nhat tai khoan ngan hang
GET    /users      [protect]  -> lay danh sach tat ca user

### purchaseProposalRoutes.js -> /api/purchase-proposals
POST   /                      [protect]                  -> Tao de xuat mua sam
GET    /                      [protect]                  -> Lay danh sach (loc theo role)
GET    /:id                   [protect]                  -> Lay chi tiet
PUT    /:id/approve           [truong_phong,giam_doc,chu_tich] -> Duyet so bo
PUT    /:id/reject            [truong_phong,giam_doc,chu_tich] -> Tu choi
GET    /:id/ai-pricing        [thu_mua,giam_doc,chu_tich]      -> AI khao gia
PUT    /:id/procurement       [thu_mua]                        -> Thu mua nop gia thuc te
PUT    /:id/accounting-confirm [ke_toan]                       -> Ke toan xac nhan gia
PUT    /:id/final-approve     [giam_doc,chu_tich]              -> Duyet gia chot

### advanceProposalRoutes.js -> /api/advance-proposals
POST   /                      [protect]              -> Tao de xuat tam ung
GET    /                      [protect]              -> Danh sach
GET    /:id                   [protect]              -> Chi tiet
PUT    /:id/approve           [giam_doc,chu_tich]    -> Duyet
PUT    /:id/reject            [giam_doc,chu_tich,ke_toan] -> Tu choi
PUT    /:id/accounting-disburse [ke_toan]            -> Ke toan duyet & giai ngan
PUT    /:id/settlement        [protect]              -> Nguoi tao nop hoan tam ung
PUT    /:id/confirm-settlement [ke_toan]             -> Ke toan xac nhan hoan

### paymentProposalRoutes.js -> /api/payment-proposals
POST   /              [ke_toan]          -> Ke toan tao de xuat thanh toan
GET    /              [protect]          -> Danh sach (co filter query)
GET    /:id           [protect]          -> Chi tiet
PUT    /:id/approve   [giam_doc,chu_tich]-> Lanh dao duyet chi
PUT    /:id/reject    [giam_doc,chu_tich]-> Tu choi
PUT    /:id/disburse  [ke_toan]          -> Ke toan xac nhan giai ngan

### uploadRoutes.js -> /api/upload
POST   /  [protect]  -> Upload nhieu file (toi da 10 file)
         -> Response: [{name, url, size, type, filename}]

### aiSearchRoutes.js -> /api/ai-search
POST   /  -> Khao gia AI cho 1 hoac nhieu vat tu
         -> Body: { items: [...] } hoac { tenVatTu, ... }
         -> Response: [{name, price, url}]

---

## controllers/ — Xu ly HTTP Request

Pattern chung: nhan request -> goi service -> tra response JSON
Tat ca dung try/catch: thanh cong tra 200/201, loi tra 400/401/403/404/500.

### authController.js — class AuthController (singleton)
register(req, res)        -> authService.register(req.body)
login(req, res)           -> authService.login(email, password)
getProfile(req, res)      -> authService.getProfile(req.user._id)
updateProfile(req, res)   -> authService.updateProfile(req.user._id, req.body)
updateBankAccount(req, res)-> authService.updateBankAccount(req.user._id, req.body)
getAllUsers(req, res)      -> authService.getAllUsers()

### purchaseProposalController.js — class PurchaseProposalController
create(req, res)          -> service.create(req.user._id, req.body)
getAll(req, res)          -> service.getAll(userId, role, departmentId)
getById(req, res)         -> service.getById(req.params.id)
approve(req, res)         -> service.approve(id, req.user._id, comment)
reject(req, res)          -> service.reject(id, req.user._id, reason)
aiSuggestPricing(req, res)-> service.aiSuggestPricing(id)
submitProcurement(req, res)-> service.submitProcurement(id, userId, items, method, attachments)
accountingConfirm(req, res)-> service.accountingConfirm(id, userId, comment)
finalApprove(req, res)    -> service.finalApprove(id, userId, comment)

### advanceProposalController.js — class AdvanceProposalController
create, getAll, getById, approve, reject
accountingApproveAndDisburse(req, res) -> service.accountingApproveAndDisburse(id, userId, amount, note)
submitSettlement(req, res) -> service.submitSettlement(id, userId, req.body)
confirmSettlement(req, res)-> service.confirmSettlement(id, userId, comment)

### paymentProposalController.js — class PaymentProposalController
create(req, res)    -> service.create(req.body, req.user._id)
getAll(req, res)    -> service.getAll(req.user, req.query)
getById(req, res)   -> service.getById(id)
approve(req, res)   -> service.approve(id, userId, role, comment)
reject(req, res)    -> service.reject(id, userId, role, reason)
disburse(req, res)  -> service.disburse(id, userId, req.body)

### aiSearchController.js
ham normalizeItem(raw): Chuan hoa object vat tu tu request body
  - xu ly ca truong tieng Anh (name, quantity...) va tieng Viet (tenVatTu, soLuong...)
  
ham createPriceResearch(req, res):
  - Neu body.items la array -> lap tung vat tu, goi researchPrice() moi cai
  - Neu body la 1 vat tu don -> goi researchPrice() truc tiep
  - Tra [{stt, tenVatTu, suppliers:[{name,price,url}]}]

---

## services/ — Logic nghiep vu

### authService.js — class AuthService

register(userData):
  1. Kiem tra email ton tai chua
  2. User.create(userData) — pre-save hook tu hash password
  3. Sinh JWT token (generateToken)
  4. Tra { user, token }

login(email, password):
  1. User.findOne({email}).select('+password').populate('department')
  2. user.comparePassword(password) — bcrypt compare
  3. Sinh JWT token
  4. Tra { user, token }

getProfile(userId): User.findById().populate('department')
updateProfile(userId, data): findByIdAndUpdate(..., {new:true, runValidators:true})
updateBankAccount(userId, bankData): cap nhat truong bankAccount
getAllUsers(): User.find().populate('department').sort({createdAt:-1})

---

### purchaseProposalService.js — class PurchaseProposalService (PHUC TAP NHAT)

PHUONG THUC: buildInitialApprovalFlow(creatorRole, estimatedAmount)
  Xay dung mang approvalFlow dua tren role nguoi tao va so tien du toan:

  Nhan vien:
    <= 1 trieu  -> truong_phong -> thu_mua -> ke_toan -> pending_determination -> ke_toan
    <= 10 trieu -> giam_doc -> thu_mua -> ke_toan -> pending_determination -> ke_toan
    > 10 trieu  -> chu_tich -> thu_mua -> ke_toan -> pending_determination -> ke_toan

  Truong phong:
    <= 1 trieu  -> thu_mua -> ke_toan -> pending_determination -> ke_toan
    <= 10 trieu -> giam_doc -> thu_mua -> ke_toan -> pending_determination -> ke_toan
    > 10 trieu  -> chu_tich -> thu_mua -> ke_toan -> pending_determination -> ke_toan

  Giam doc:
    <= 10 trieu -> thu_mua -> ke_toan -> pending_determination -> ke_toan
    > 10 trieu  -> chu_tich -> thu_mua -> ke_toan -> pending_determination -> ke_toan

  Chu tich: thu_mua -> ke_toan -> pending_determination -> ke_toan

  * pending_determination: Placeholder role — se duoc quyet dinh sau khi ke toan xac nhan gia thuc te
    (neu totalActualAmount <= 10tr -> doi thanh giam_doc, > 10tr -> chu_tich)

PHUONG THUC: getCurrentApprovalRole(approvalFlow)
  Tim step dau tien co status === 'pending', tra ve role cua step do.

PHUONG THUC: create(creatorId, data)
  1. Tim creator, populate department
  2. Tinh tong du toan
  3. buildInitialApprovalFlow()
  4. Neu buoc dau la thu_mua -> status='procurement_review', nguoc lai 'pending_approval'
  5. PurchaseProposal.create(...)

PHUONG THUC: getAll(userId, userRole, userDepartment)
  Loc theo vai tro:
  - nhan_vien: chi xem de xuat minh tao (query.creator = userId)
  - truong_phong: xem ca phong ban (query.department = userDepartment)
  - thu_mua: xem dang can khao gia (currentApprovalRole: 'thu_mua')
  - ke_toan: xem can xac nhan + dang giai ngan + hoan thanh
  - giam_doc, chu_tich: xem tat ca (khong filter)

PHUONG THUC: approve(proposalId, approverId, comment)
  1. Tim step dang pending dau tien
  2. Kiem tra role nguoi duyet khop voi role step
     (ngoai le: pending_determination cho phep bat ky giam_doc/chu_tich deu duyet duoc)
  3. Cap nhat step: status='approved', approver, comment, date
  4. Tim step tiep theo -> cap nhat currentApprovalRole va status tuong ung

PHUONG THUC: reject(proposalId, approverId, reason)
  1. Tim step dang pending, danh dau 'rejected'
  2. Dat status='rejected', currentApprovalRole=null

PHUONG THUC: aiSuggestPricing(proposalId)
  1. Lay proposal, lap qua tung item
  2. Goi researchPrice() cho tung item
  3. Xac dinh NCC co gia thap nhat -> gan co isBestChoice: true
  4. Tra mang ket qua co cau truc day du cho UI

PHUONG THUC: submitProcurement(proposalId, procurerId, items, pricingMethod, quotationAttachments)
  1. Kiem tra status phai la 'procurement_review'
  2. Cap nhat donGiaThucTe, nhaCungCap, ghiChuNhaCungCap cho tung vat tu
  3. Cap nhat pricingMethod, quotationAttachments
  4. Tinh totalActualAmount
  5. Danh dau step thu_mua la approved
  6. Chuyen sang 'accounting_review', currentApprovalRole='ke_toan'

PHUONG THUC: accountingConfirm(proposalId, accountantId, comment)
  1. Kiem tra status la 'accounting_review'
  2. Danh dau step ke_toan la approved
  3. Quyet dinh cap duyet cuoi:
     totalActualAmount <= 10tr -> step pending_determination doi thanh giam_doc
     totalActualAmount > 10tr  -> doi thanh chu_tich
  4. Chuyen sang 'pending_final_approval'

PHUONG THUC: finalApprove(proposalId, approverId, comment)
  1. Kiem tra status la 'pending_final_approval'
  2. Tim step cuoi (giam_doc hoac chu_tich), kiem tra role khop
  3. Danh dau approved
  4. Chuyen sang 'pending_payment', currentApprovalRole='ke_toan'

---

### advanceProposalService.js — class AdvanceProposalService

PHUONG THUC: buildApprovalFlow(creatorRole)
  nhan_vien / truong_phong / thu_mua / ke_toan:
    giam_doc -> chu_tich -> ke_toan (duyet & giai ngan) -> creator (hoan) -> ke_toan (xac nhan)
  giam_doc:
    chu_tich -> ke_toan -> creator -> ke_toan
  chu_tich:
    ke_toan -> creator -> ke_toan

PHUONG THUC: getStatusFromRole(role)
  Map role -> status: giam_doc->pending_director, chu_tich->pending_chairman,
  ke_toan->pending_accounting, creator->pending_settlement

PHUONG THUC: accountingApproveAndDisburse(proposalId, accountantId, amount, note)
  1. Kiem tra status la pending_accounting hoac accounting_approved
  2. Danh dau step ke_toan (Ke toan duyet & giai ngan) la approved
  3. Them ban ghi vao disbursements, cong totalDisbursed
  4. Chuyen sang 'pending_settlement', currentApprovalRole='creator'

PHUONG THUC: submitSettlement(proposalId, creatorId, settlementData)
  1. Kiem tra dung nguoi tao moi duoc nop hoan
  2. Cap nhat proposal.settlement {type, amount, attachments, note, submittedAt}
  3. Danh dau step 'creator' la approved
  4. Chuyen sang 'settlement_submitted', currentApprovalRole='ke_toan'

PHUONG THUC: confirmSettlement(proposalId, accountantId, comment)
  1. Danh dau step 'Ke toan xac nhan hoan tam ung' la approved
  2. Cap nhat settlement.confirmedAt, confirmedBy
  3. Chuyen sang 'completed'

---

### paymentProposalService.js — class PaymentProposalService

PHUONG THUC: create(data, creatorId)
  1. Kiem tra purchaseProposal ton tai
  2. Xac dinh cap duyet: amount <= 10tr -> giam_doc / > 10tr -> chu_tich
  3. Tao approvalFlow: [{step:'duyet_chi', role}, {step:'giai_ngan', role:'ke_toan'}]
  4. Tao PaymentProposal
  5. DONG BO: PurchaseProposal.status = 'pending_payment_approval'

PHUONG THUC: getAll(user, query)
  - query.purchaseProposalId -> filter theo don mua sam cu the
  - query.status -> filter theo trang thai
  - nhan_vien: chi xem don lien quan de xuat minh tao
  - truong_phong: loc theo department
  - ke_toan, giam_doc, chu_tich: xem tat ca

PHUONG THUC: approve(id, approverId, approverRole, comment)
  1. Kiem tra quyen: pending_director can giam_doc/chu_tich; pending_chairman chi chu_tich
  2. Cap nhat step 'duyet_chi' -> approved
  3. Chuyen sang 'pending_disbursement', currentApprovalRole='ke_toan'
  4. DONG BO: PurchaseProposal.status = 'disbursing'

PHUONG THUC: reject(id, rejecterId, rejecterRole, reason)
  1. Danh dau step hien tai la rejected
  2. Chuyen sang 'rejected'
  3. DONG BO: Neu khong con PaymentProposal nao khac dang pending
     -> tra PurchaseProposal ve 'pending_payment'

PHUONG THUC: disburse(id, accountantId, disbursementData)
  Ham quan trong nhat — DONG BO hai collection
  1. Kiem tra status la 'pending_disbursement'
  2. Cap nhat step 'giai_ngan' -> approved
  3. Luu disbursementInfo (transactionCode, note, receiptAttachment)
  4. PaymentProposal.status = 'completed'
  5. DONG BO PurchaseProposal:
     - Them dot giai ngan vao disbursements
     - Cong totalDisbursed += proposal.amount
     - Neu totalDisbursed >= targetAmount -> PurchaseProposal.status = 'completed'
     - Nguoc lai -> 'disbursing' (cho dot tiep theo)

---

### aiSearchService.js

PHUONG THUC: searchDuckDuckGo(query)
  - Fetch HTML tu https://html.duckduckgo.com/html/?q=...
  - Dung Cheerio parse HTML, trich xuat .result: title, url (giai ma uddg param), snippet
  - Tra ve toi da 6 ket qua

PHUONG THUC: fetchPageExcerpt(url, maxChars=1200)
  - Fetch noi dung trang web voi timeout 3.5s (AbortController)
  - Cheerio loc bo script/style/nav/footer
  - Tra ve toi da 1200 ky tu text

PHUONG THUC: generateWithFallback(prompt, config)
  - Thu lan luot cac model: env.GEMINI_MODEL -> gemini-3.5-flash -> gemini-3.5-flash-lite -> gemini-3.6-flash
  - Neu model tra loi 503/429 -> thu model ke tiep

PHUONG THUC: researchPrice(item) — Ham chinh
  1. Tao query: 'bao gia {tenVatTu} {yeuCauKiThuat}'
  2. searchDuckDuckGo() -> 6 ket qua
  3. fetchPageExcerpt() cho top 2 trang dau
  4. Xay dung prompt cho Gemini voi day du context
  5. Goi Gemini voi responseMimeType: 'application/json'
  6. Parse JSON response -> [{name, price, url}]
  7. Fallback: neu Gemini fail -> dung DuckDuckGo results truc tiep

---

## utils/helpers.js

generateToken(id): Tao JWT (id, JWT_SECRET, het han JWT_EXPIRES_IN mac dinh 7d)
formatCurrency(amount): So -> chuoi tien VND (Intl.NumberFormat vi-VN)
getRoleName(role): Map role code -> ten tieng Viet

## utils/seed.js
Script tao du lieu mau: 6 tai khoan demo, cac phong ban, cac de xuat mau o nhieu trang thai.
