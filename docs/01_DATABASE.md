# 01 — Co so du lieu (Database / Models)

MongoDB + Mongoose. Ket noi qua bien moi truong MONGODB_URI.

## So do quan he

```
Department
    +-- User (ref: department)
          +-- PurchaseProposal (ref: creator, department)
          |         +-- PaymentProposal (ref: purchaseProposal, creator, department)
          +-- AdvanceProposal (ref: creator, department)
```

---

## 1. users — Model User

File: backend/models/User.js

| Truong | Kieu | Bat buoc | Mo ta |
|--------|------|----------|-------|
| fullName | String | Co | Ho ten |
| email | String | Co | Email (unique, lowercase) |
| password | String | Co | Hash bcrypt, select:false |
| role | Enum | Co | Vai tro |
| department | ObjectId->Department | Co | Phong ban |
| bankAccount.accountNumber | String | Khong | So tai khoan |
| bankAccount.bankName | String | Khong | Ten ngan hang |
| bankAccount.accountHolder | String | Khong | Chu tai khoan |
| avatar | String | Khong | URL anh dai dien |
| isActive | Boolean | Khong | Mac dinh: true |

Role hop le: nhan_vien, truong_phong, thu_mua, ke_toan, giam_doc, chu_tich

Pre-save hook: Hash password bang bcrypt (12 rounds) neu password bi thay doi.
Instance method: comparePassword(candidatePassword) — so sanh bcrypt khi dang nhap.

---

## 2. departments — Model Department

File: backend/models/Department.js

| Truong | Mo ta |
|--------|-------|
| name | Ten phong ban (unique) |
| description | Mo ta |
| isActive | Mac dinh: true |

---

## 3. purchaseproposals — Model PurchaseProposal

File: backend/models/PurchaseProposal.js — Model phuc tap nhat.

### Sub-schema purchaseItemSchema (moi dong vat tu)

| Truong | Mo ta |
|--------|-------|
| stt | So thu tu |
| tenVatTu | Ten vat tu (bat buoc) |
| yeuCauKiThuat | Yeu cau ky thuat |
| phongBanSuDung | Phong ban su dung |
| soLuong | So luong (min:1) |
| donGiaDuKien | Don gia du kien (nguoi tao nhap) |
| donGiaThucTe | Don gia thuc te (thu mua dien sau) |
| nhaCungCap | Nha cung cap duoc chon |
| ghiChuNhaCungCap | Ghi chu NCC / bao hanh |

### Sub-schema approvalStepSchema (1 buoc duyet)

| Truong | Mo ta |
|--------|-------|
| step | Ten buoc |
| role | Role chiu trach nhiem |
| status | pending / approved / rejected |
| approver | ObjectId->User — Nguoi thuc hien |
| comment | Ghi chu |
| date | Thoi diem duyet |

### Sub-schema disbursementSchema (1 dot giai ngan)

| Truong | Mo ta |
|--------|-------|
| amount | So tien |
| date | Ngay giai ngan |
| note | Ghi chu |
| processedBy | ObjectId->User — Ke toan thuc hien |

### Schema chinh PurchaseProposal

| Truong | Mo ta |
|--------|-------|
| proposalCode | Ma MS-YYYYMM-XXXX (unique, tu sinh) |
| creator | ObjectId->User |
| department | ObjectId->Department |
| items | Danh sach vat tu |
| totalEstimatedAmount | Tong tien du toan (tu tinh) |
| totalActualAmount | Tong tien thuc te (tu tinh khi du) |
| pricingMethod | ai / manual |
| quotationAttachments | File bao gia dinh kem |
| status | Trang thai hien tai |
| currentApprovalRole | Role dang cho xu ly |
| approvalFlow | Toan bo buoc duyet |
| disbursements | Cac dot giai ngan |
| totalDisbursed | Tong da giai ngan |
| rejectionReason | Ly do tu choi |

### Trang thai PurchaseProposal

| Status | Y nghia |
|--------|---------|
| pending_approval | Cho duyet so bo (truong phong / giam doc / chu tich) |
| procurement_review | Thu mua dang khao gia thi truong |
| accounting_review | Ke toan xem xet, xac nhan gia thuc te |
| pending_final_approval | Cho lanh dao duyet gia chot lan cuoi |
| pending_payment | Cho ke toan lap de xuat thanh toan |
| pending_payment_approval | Cho lanh dao duyet de xuat thanh toan |
| disbursing | Dang giai ngan (co the nhieu dot) |
| completed | Da giai ngan du 100%, hoan thanh |
| rejected | Bi tu choi |

### Pre-save Hook PurchaseProposal
1. Sinh ma: MS-YYYYMM-XXXX
2. Tinh totalEstimatedAmount = sum(soLuong x donGiaDuKien)
3. Neu tat ca items co donGiaThucTe -> tinh totalActualAmount

---

## 4. advanceproposals — Model AdvanceProposal

File: backend/models/AdvanceProposal.js

### Sub-schema advanceItemSchema

| Truong | Mo ta |
|--------|-------|
| stt | So thu tu |
| mucDich | Muc dich tam ung (bat buoc) |
| soTien | So tien (min:0) |

### Schema chinh

| Truong | Mo ta |
|--------|-------|
| proposalCode | Ma TU-YYYYMM-XXXX |
| creator | ObjectId->User |
| department | ObjectId->Department |
| bankAccount | So TK, ten NH, chu TK nhan tien |
| items | Danh sach muc tam ung |
| totalAmount | Tong tien (tu tinh) |
| status | Trang thai |
| approvalFlow | Cac buoc duyet |
| disbursements | Dot giai ngan |
| totalDisbursed | Tong da giai ngan |
| settlement.type | surplus / deficit / exact (thua/thieu/du) |
| settlement.amount | So tien chenh lech |
| settlement.attachments | Chung tu hoan ung |
| settlement.submittedAt | Thoi diem nop hoan |
| settlement.confirmedAt | Thoi diem ke toan xac nhan |
| settlement.confirmedBy | ObjectId->User |
| rejectionReason | Ly do tu choi |

### Trang thai AdvanceProposal

| Status | Y nghia |
|--------|---------|
| pending_director | Cho Giam doc duyet |
| pending_chairman | Cho Chu tich duyet |
| pending_accounting | Cho Ke toan duyet & giai ngan |
| pending_settlement | Cho nguoi tao nop chung tu hoan |
| settlement_submitted | Da nop, cho ke toan xac nhan |
| completed | Hoan thanh |
| rejected | Bi tu choi |

### Pre-save Hook: Sinh ma TU-YYYYMM-XXXX, tinh totalAmount

---

## 5. paymentproposals — Model PaymentProposal

File: backend/models/PaymentProposal.js

Luon gan voi 1 PurchaseProposal. 1 PurchaseProposal co the co nhieu dot PaymentProposal.

### Schema chinh

| Truong | Mo ta |
|--------|-------|
| proposalCode | Ma TT-YYYYMM-XXXX |
| purchaseProposal | ObjectId->PurchaseProposal (bat buoc) |
| creator | Ke toan tao don |
| department | Phong ban |
| beneficiary.name | Ten don vi thu huong |
| beneficiary.accountNumber | So tai khoan thu huong |
| beneficiary.bankName | Ten ngan hang |
| beneficiary.branch | Chi nhanh |
| paymentReason | Noi dung thanh toan |
| paymentMethod | bank_transfer / cash |
| amount | So tien (min: 1.000 VND) |
| amountInWords | So tien bang chu |
| installmentNote | Ghi chu dot thanh toan |
| attachments | Hoa don, chung tu dinh kem |
| status | Trang thai |
| approvalFlow | 2 buoc: duyet_chi va giai_ngan |
| disbursementInfo.transactionCode | Ma UNC / giao dich ngan hang |
| disbursementInfo.receiptAttachment | File bien lai ngan hang |
| rejectionReason | Ly do tu choi |

### Trang thai PaymentProposal

| Status | Y nghia |
|--------|---------|
| pending_director | Cho Giam doc duyet chi (amount <= 10tr) |
| pending_chairman | Cho Chu tich duyet chi (amount > 10tr) |
| pending_disbursement | Da duyet, cho ke toan chuyen tien |
| completed | Da thanh toan xong |
| rejected | Bi tu choi |

### ApprovalFlow PaymentProposal (luon 2 buoc co dinh)
1. step: 'duyet_chi' — role: giam_doc hoac chu_tich (tuy amount)
2. step: 'giai_ngan' — role: ke_toan

### Pre-save Hook: Sinh ma TT-YYYYMM-XXXX
