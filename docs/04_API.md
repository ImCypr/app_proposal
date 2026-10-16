# 04 — REST API Reference

Base URL: http://localhost:5000/api
Authentication: Bearer JWT Token (Authorization header)

## Auth — /api/auth

### POST /api/auth/register
Dang ky tai khoan moi.
Request: { fullName, email, password, role, department }
Response 201: { success, data: { user, token } }

### POST /api/auth/login
Dang nhap.
Request: { email, password }
Response 200: { success, data: { user, token } }
Error 401: Sai email hoac mat khau

### GET /api/auth/profile
[protect] Lay thong tin ca nhan nguoi dung hien tai.
Response 200: { success, data: User }

### PUT /api/auth/profile
[protect] Cap nhat thong tin ca nhan.
Request: { fullName, avatar, ... }
Response 200: { success, data: User }

### PUT /api/auth/bank-account
[protect] Cap nhat tai khoan ngan hang.
Request: { accountNumber, bankName, accountHolder }
Response 200: { success, data: User }

### GET /api/auth/users
[protect] Lay danh sach tat ca nguoi dung (dung khi chon NCC/nguoi duyet).
Response 200: { success, data: User[] }

---

## Purchase Proposals — /api/purchase-proposals

### POST /api/purchase-proposals
[protect] Tao de xuat mua sam vat tu moi.
Request Body:
{
  lyDoDeXuat: string,
  items: [{
    tenVatTu: string,
    yeuCauKiThuat: string,
    phongBanSuDung: string,
    soLuong: number,
    donGiaDuKien: number
  }]
}
Response 201: { success, data: PurchaseProposal }
Logic: Tu dong buildInitialApprovalFlow theo role + so tien du toan.

### GET /api/purchase-proposals
[protect] Lay danh sach de xuat mua sam.
Query params: khong (loc phia server theo role tu dong)
Response 200: { success, data: PurchaseProposal[] }
Loc theo role:
  - nhan_vien: chi de xuat cua minh
  - truong_phong: ca phong ban
  - thu_mua: dang o procurement_review
  - ke_toan: dang o accounting_review, disbursing, completed
  - giam_doc, chu_tich: tat ca

### GET /api/purchase-proposals/:id
[protect] Lay chi tiet 1 de xuat.
Response 200: { success, data: PurchaseProposal } (da populate creator, department, approver)

### PUT /api/purchase-proposals/:id/approve
[truong_phong, giam_doc, chu_tich] Duyet buoc hien tai.
Request Body: { comment?: string }
Response 200: { success, data: PurchaseProposal }
Logic: Tim step dang pending, kiem tra quyen, danh dau approved, chuyen buoc tiep.

### PUT /api/purchase-proposals/:id/reject
[truong_phong, giam_doc, chu_tich] Tu choi de xuat.
Request Body: { reason: string }
Response 200: { success, data: PurchaseProposal }

### GET /api/purchase-proposals/:id/ai-pricing
[thu_mua, giam_doc, chu_tich] AI khao gia thi truong.
Response 200: {
  success,
  data: [{
    stt, tenVatTu, yeuCauKiThuat,
    suppliers: [{ name, price, url, isBestChoice }]
  }]
}
Logic: DuckDuckGo search + Gemini AI extract gia.

### PUT /api/purchase-proposals/:id/procurement
[thu_mua] Thu mua nop gia thuc te.
Request Body: {
  items: [{ _id, donGiaThucTe, nhaCungCap?, ghiChuNhaCungCap? }],
  pricingMethod: 'ai' | 'manual',
  quotationAttachments?: [{ name, url, size, type }]
}
Response 200: { success, data: PurchaseProposal }
Logic: Cap nhat gia thuc te cho tung item, chuyen sang accounting_review.

### PUT /api/purchase-proposals/:id/accounting-confirm
[ke_toan] Ke toan xac nhan gia thuc te hop le.
Request Body: { comment?: string }
Response 200: { success, data: PurchaseProposal }
Logic: Quyet dinh cap duyet cuoi (giam_doc <= 10tr / chu_tich > 10tr),
       chuyen sang pending_final_approval.

### PUT /api/purchase-proposals/:id/final-approve
[giam_doc, chu_tich] Duyet gia chot lan cuoi.
Request Body: { comment?: string }
Response 200: { success, data: PurchaseProposal }
Logic: Chuyen sang pending_payment, giao ke_toan lap phieu thanh toan.

---

## Advance Proposals — /api/advance-proposals

### POST /api/advance-proposals
[protect] Tao de xuat tam ung moi.
Request Body: {
  lyDoDeXuat: string,
  bankAccount?: { accountNumber, bankName, accountHolder },
  items: [{ stt, mucDich, soTien }]
}
Response 201: { success, data: AdvanceProposal }
Logic: Dung bankAccount tu body, neu khong co thi lay tu creator.bankAccount.
       buildApprovalFlow(creatorRole).

### GET /api/advance-proposals
[protect] Lay danh sach.
Response 200: { success, data: AdvanceProposal[] }

### GET /api/advance-proposals/:id
[protect] Chi tiet.
Response 200: { success, data: AdvanceProposal }

### PUT /api/advance-proposals/:id/approve
[giam_doc, chu_tich] Duyet.
Request Body: { comment?: string }
Response 200: { success, data: AdvanceProposal }

### PUT /api/advance-proposals/:id/reject
[giam_doc, chu_tich, ke_toan] Tu choi.
Request Body: { reason: string }
Response 200: { success, data: AdvanceProposal }

### PUT /api/advance-proposals/:id/accounting-disburse
[ke_toan] Ke toan duyet va giai ngan.
Request Body: { amount?: number, note?: string }
Response 200: { success, data: AdvanceProposal }
Logic: Ghi nhan dot giai ngan, chuyen sang pending_settlement.

### PUT /api/advance-proposals/:id/settlement
[protect] Nguoi tao nop chung tu hoan tam ung.
Request Body: {
  type: 'surplus' | 'deficit' | 'exact',
  amount: number,
  attachments: [{ name, url, size, type }],
  note?: string
}
Response 200: { success, data: AdvanceProposal }
Bao mat: Chi nguoi tao moi duoc goi endpoint nay.

### PUT /api/advance-proposals/:id/confirm-settlement
[ke_toan] Ke toan xac nhan hoan tam ung.
Request Body: { comment?: string }
Response 200: { success, data: AdvanceProposal }
Logic: Chuyen sang completed.

---

## Payment Proposals — /api/payment-proposals

### POST /api/payment-proposals
[ke_toan] Ke toan tao de xuat thanh toan.
Request Body: {
  purchaseProposal: string (ObjectId),
  beneficiary: { name, accountNumber, bankName, branch },
  paymentReason: string,
  paymentMethod: 'bank_transfer' | 'cash',
  amount: number,
  amountInWords: string,
  installmentNote?: string,
  attachments?: [{ name, url, size, type }]
}
Response 201: { success, data: PaymentProposal }
Logic: Xac dinh giam_doc / chu_tich theo amount, dong bo PurchaseProposal.status.

### GET /api/payment-proposals
[protect] Lay danh sach.
Query params:
  purchaseProposalId: string (loc theo don mua sam)
  status: string (loc theo trang thai)
Response 200: { success, data: PaymentProposal[] }

### GET /api/payment-proposals/:id
[protect] Chi tiet.
Response 200: { success, data: PaymentProposal } (populate purchaseProposal, creator)

### PUT /api/payment-proposals/:id/approve
[giam_doc, chu_tich] Lanh dao duyet chi.
Request Body: { comment?: string }
Response 200: { success, data: PaymentProposal }
Logic: Kiem tra dung role/quyen, chuyen sang pending_disbursement,
       dong bo PurchaseProposal -> 'disbursing'.

### PUT /api/payment-proposals/:id/reject
[giam_doc, chu_tich] Tu choi.
Request Body: { reason: string }
Response 200: { success, data: PaymentProposal }
Logic: Dong bo: neu khong con PaymentProposal pending -> tra PurchaseProposal ve 'pending_payment'.

### PUT /api/payment-proposals/:id/disburse
[ke_toan] Xac nhan da chuyen tien (giai ngan).
Request Body: {
  transactionCode?: string,
  note?: string,
  receiptAttachment?: { name, url, size, type }
}
Response 200: { success, data: PaymentProposal }
Logic quan trong: Dong bo PurchaseProposal — cong totalDisbursed,
  neu >= targetAmount -> PurchaseProposal.status = 'completed'.

---

## Upload — /api/upload

### POST /api/upload
[protect] Upload file len server.
Request: multipart/form-data, field: 'files' (toi da 10 file, 15MB/file)
Dinh dang hop le: jpg, jpeg, png, webp, gif, svg, pdf, xlsx, xls, docx, doc
Response 200: {
  success,
  data: [{ name, url, size, type, filename }]
}
File duoc luu vat ly tai: backend/uploads/
Truy cap qua URL: http://localhost:5000/uploads/{filename}

---

## AI Search — /api/ai-search

### POST /api/ai-search
Khao gia AI cho vat tu (khong can token, hoac co token).
Request Body (nhieu vat tu):
{
  items: [{
    tenVatTu: string,
    yeuCauKiThuat?: string
  }]
}
hoac (1 vat tu don):
{
  tenVatTu: string,
  yeuCauKiThuat?: string
}
Response 200: {
  success,
  data: [{ name, price, url }]
}

---

## Health & Seed

### GET /api/health
Kiem tra server.
Response 200: { success, message: 'Server is running', timestamp }

### POST /api/seed
Nap lai du lieu mau (6 tai khoan + phong ban + de xuat mau).
Response 200: { success, message }

---

## Ma loi chung

| HTTP Code | Y nghia |
|-----------|---------|
| 200 | Thanh cong |
| 201 | Tao moi thanh cong |
| 400 | Du lieu dau vao khong hop le |
| 401 | Chua dang nhap / Token het han |
| 403 | Khong co quyen thuc hien hanh dong |
| 404 | Khong tim thay tai nguyen |
| 500 | Loi may chu |

Format response loi: { success: false, message: string }
