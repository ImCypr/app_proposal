# 05 — Luong nghiep vu & State Machine

---

## 1. Luong dang nhap / Xac thuc

```
[LoginPage]
  |-- Nguoi dung nhap email + password
  |-- useAuth().login(email, password)
  |-- authService.login() --> POST /api/auth/login
  |-- Backend: User.findOne({email}).select('+password').populate('department')
  |-- user.comparePassword() [bcrypt.compare]
  |-- generateToken(user._id) [JWT, 7 ngay]
  |-- Tra { user, token }
  |-- Frontend: Luu vao state + localStorage
  |-- Navigate -> /dashboard

[Moi lan load app - AuthContext.useEffect]
  |-- Doc token tu localStorage
  |-- GET /api/auth/profile
  |-- protect middleware: xac minh JWT, tim User trong DB
  |-- Neu OK -> cap nhat state user
  |-- Neu 401 -> logout() (xoa localStorage, redirect /login)

[Axios Response Interceptor]
  |-- Bat ki request nao tra ve 401
  |-- Xoa token + user khoi localStorage
  |-- Redirect /login
```

---

## 2. Luong de xuat mua sam vat tu

### Buoc 1: Tao de xuat

```
[CreatePurchasePage]
  |-- Nhap ly do, them nhieu vat tu (ten, yeu cau KT, so luong, don gia du kien)
  |-- purchaseProposalService.create(data) --> POST /api/purchase-proposals
  |-- Backend purchaseProposalService.create():
      1. Tinh totalEstimatedAmount
      2. buildInitialApprovalFlow(creatorRole, totalEstimated):
         Nhan vien  <= 1tr  : truong_phong -> thu_mua -> ke_toan -> [pending_det] -> ke_toan
         Nhan vien  <= 10tr : giam_doc     -> thu_mua -> ke_toan -> [pending_det] -> ke_toan
         Nhan vien  > 10tr  : chu_tich     -> thu_mua -> ke_toan -> [pending_det] -> ke_toan
         Truong phong <= 1tr: thu_mua      -> ke_toan -> [pending_det] -> ke_toan
         Giam doc   <= 10tr : thu_mua      -> ke_toan -> [pending_det] -> ke_toan
         Chu tich          : thu_mua      -> ke_toan -> [pending_det] -> ke_toan
      3. Neu buoc dau la thu_mua: status='procurement_review'
         Nguoc lai: status='pending_approval'
      4. PurchaseProposal.create()
      5. Pre-save: sinh ma MS-YYYYMM-XXXX
  |-- Navigate /purchase/:id
```

### Buoc 2: Duyet so bo (truong_phong / giam_doc / chu_tich)

```
  |-- PurchaseDetailPage: Hien thi nut "Duyet" neu la role hien tai
  |-- purchaseProposalService.approve(id, comment)
  |-- Backend service.approve():
      - Tim step dang pending dau tien
      - Kiem tra role khop
      - step.status = 'approved', ghi approver, date, comment
      - Tim step tiep theo (thu_mua)
      - Cap nhat currentApprovalRole='thu_mua', status='procurement_review'
```

### Buoc 3: Thu mua khao gia & nop gia

```
  Option A - Khao gia AI:
  |-- Click "Khao gia AI"
  |-- GET /api/purchase-proposals/:id/ai-pricing
  |-- Backend aiSuggestPricing():
      - Lap tung item -> researchPrice(item):
          1. Query: 'bao gia {tenVatTu} {yeuCauKiThuat}'
          2. DuckDuckGo HTML scraping -> 6 ket qua
          3. fetchPageExcerpt() top 2 trang -> 1200 ky tu
          4. Gemini prompt -> parse JSON [{name, price, url}]
          5. Fallback: dung DuckDuckGo snippet neu Gemini fail
      - Xac dinh isBestChoice (gia thap nhat moi item)
  |-- UI hien thi bang NCC voi gia, link, badge Best Choice
  |-- Thu mua chon NCC, dien gia thuc te

  Option B - Manual:
  |-- Thu mua tu dien don gia thuc te tay

  Nop gia:
  |-- purchaseProposalService.submitProcurement(id, items, method, attachments)
  |-- PUT /api/purchase-proposals/:id/procurement
  |-- Backend submitProcurement():
      - Kiem tra status='procurement_review'
      - Cap nhat donGiaThucTe, nhaCungCap tung item
      - Tinh totalActualAmount
      - Step thu_mua -> approved
      - status='accounting_review', currentApprovalRole='ke_toan'
```

### Buoc 4: Ke toan xac nhan gia

```
  |-- purchaseProposalService.accountingConfirm(id, comment)
  |-- PUT /api/purchase-proposals/:id/accounting-confirm
  |-- Backend accountingConfirm():
      - Kiem tra status='accounting_review'
      - Step ke_toan -> approved
      - QUYET DINH CAP DUYET CUOI:
          totalActualAmount <= 10tr -> step pending_determination doi thanh giam_doc
          totalActualAmount > 10tr  -> doi thanh chu_tich
      - status='pending_final_approval', currentApprovalRole= role da quyet dinh
```

### Buoc 5: Duyet gia chot (giam_doc / chu_tich)

```
  |-- purchaseProposalService.finalApprove(id, comment)
  |-- PUT /api/purchase-proposals/:id/final-approve
  |-- Backend finalApprove():
      - Kiem tra status='pending_final_approval'
      - Kiem tra role khop step cuoi
      - Step approved
      - status='pending_payment', currentApprovalRole='ke_toan'
```

### Buoc 6 + 7: Ke toan lap thanh toan va giai ngan (xem Luong Thanh toan)

---

## 3. Luong de xuat tam ung

### Buoc 1: Tao

```
[CreateAdvancePage]
  |-- Nhap items (muc dich + so tien), tai khoan NH nhan tien
  |-- advanceProposalService.create(data) --> POST /api/advance-proposals
  |-- Backend service.create():
      1. Dung data.bankAccount hoac creator.bankAccount
      2. buildApprovalFlow(creatorRole):
         nhan_vien/truong_phong/thu_mua/ke_toan:
           giam_doc -> chu_tich -> ke_toan -> creator -> ke_toan
         giam_doc: chu_tich -> ke_toan -> creator -> ke_toan
         chu_tich: ke_toan -> creator -> ke_toan
      3. AdvanceProposal.create()
      4. Pre-save: sinh ma TU-YYYYMM-XXXX, tinh totalAmount
```

### Buoc 2: Giam doc duyet

```
  |-- advanceProposalService.approve(id, comment)
  |-- PUT /api/advance-proposals/:id/approve
  |-- Step giam_doc -> approved
  |-- status='pending_chairman', currentApprovalRole='chu_tich'
```

### Buoc 3: Chu tich duyet

```
  |-- Tuong tu buoc 2
  |-- Step chu_tich -> approved
  |-- status='pending_accounting', currentApprovalRole='ke_toan'
```

### Buoc 4: Ke toan duyet & giai ngan

```
  |-- advanceProposalService.accountingDisburse(id, amount, note)
  |-- PUT /api/advance-proposals/:id/accounting-disburse
  |-- Backend accountingApproveAndDisburse():
      - Step ke_toan (duyet & giai ngan) -> approved
      - Them vao disbursements: {amount, date, note, processedBy}
      - cong totalDisbursed
      - status='pending_settlement', currentApprovalRole='creator'
```

### Buoc 5: Nguoi tao nop hoan tam ung

```
  |-- advanceProposalService.submitSettlement(id, { type, amount, attachments, note })
  |-- PUT /api/advance-proposals/:id/settlement
  |-- Backend submitSettlement():
      - Kiem tra proposalId.creator === req.user._id (bao mat)
      - Luu settlement: type (surplus/deficit/exact), amount, attachments, note, submittedAt
      - Step creator -> approved
      - status='settlement_submitted', currentApprovalRole='ke_toan'
```

### Buoc 6: Ke toan xac nhan hoan

```
  |-- advanceProposalService.confirmSettlement(id, comment)
  |-- PUT /api/advance-proposals/:id/confirm-settlement
  |-- Backend confirmSettlement():
      - Step ke_toan (xac nhan hoan) -> approved
      - settlement.confirmedAt = now, confirmedBy = accountantId
      - status='completed'
```

---

## 4. Luong de xuat thanh toan

### Buoc 1: Ke toan tao de xuat thanh toan

```
[CreatePaymentPage]
  |-- Chi ke_toan moi vao duoc trang nay
  |-- Chon PurchaseProposal can thanh toan (status=pending_payment)
  |-- Nhap thong tin: ben thu huong, so tien, noi dung, phuong thuc, chung tu
  |-- paymentProposalService.create(data)
  |-- POST /api/payment-proposals (restrictTo ke_toan)
  |-- Backend service.create():
      1. Kiem tra purchaseProposal ton tai
      2. Xac dinh cap duyet:
         amount <= 10.000.000 -> giam_doc (status='pending_director')
         amount > 10.000.000  -> chu_tich (status='pending_chairman')
      3. approvalFlow = [
           { step:'duyet_chi', role: giam_doc/chu_tich },
           { step:'giai_ngan', role: 'ke_toan' }
         ]
      4. PaymentProposal.create()
      5. DONG BO: PurchaseProposal.status = 'pending_payment_approval'
```

### Buoc 2: Lanh dao duyet chi

```
  |-- paymentProposalService.approve(id, comment)
  |-- PUT /api/payment-proposals/:id/approve
  |-- Backend service.approve():
      - Kiem tra quyen:
          pending_director: giam_doc hoac chu_tich deu duoc
          pending_chairman: CHI chu_tich duoc
      - Step duyet_chi -> approved
      - status='pending_disbursement', currentApprovalRole='ke_toan'
      - DONG BO: PurchaseProposal.status = 'disbursing'
```

### Buoc 3: Ke toan giai ngan (chuyen tien)

```
  |-- paymentProposalService.disburse(id, { transactionCode, note, receiptAttachment })
  |-- PUT /api/payment-proposals/:id/disburse
  |-- Backend service.disburse():
      - Kiem tra status='pending_disbursement'
      - Step giai_ngan -> approved
      - Luu disbursementInfo: disbursedAt, disbursedBy, transactionCode, receiptAttachment
      - PaymentProposal.status = 'completed'
      - DONG BO PurchaseProposal:
          + Them disbursement entry {amount, date, note, processedBy}
          + totalDisbursed += proposal.amount
          + Neu totalDisbursed >= targetAmount:
              PurchaseProposal.status = 'completed'
            Nguoc lai:
              PurchaseProposal.status = 'disbursing'
              (cho dot thanh toan tiep theo)
```

---

## 5. Luong upload file

```
[Frontend - bat ky trang nao co dinh kem]
  |-- uploadService.uploadFiles(files)
  |-- POST /api/upload (multipart/form-data, field:'files')
  |-- protect middleware xac thuc
  |-- Multer middleware:
      - Validate dinh dang file (jpg/png/pdf/xlsx/docx/...)
      - Validate kich thuoc (<= 15MB)
      - Luu vao backend/uploads/{timestamp}-{random}-{ten}.{ext}
  |-- Tra [{name, url, size, type, filename}]
  |-- url = http://localhost:5000/uploads/{filename}
  |-- Frontend luu url vao attachments cua de xuat
```

---

## 6. State Machine - Tong hop trang thai

### PurchaseProposal

```
                [Tao de xuat]
                      |
            +---------+---------+
            |                   |
   (buoc dau la truong_phong    (buoc dau la thu_mua
    /giam_doc/chu_tich)          - Truong phong, GD, CT tu dong duyet)
            |                   |
   pending_approval        procurement_review
            |                   |
   [Lanh dao duyet]    [Thu mua nop gia]
            |                   |
   procurement_review     accounting_review
            |                   |
   (Thu mua nop gia)   [Ke toan xac nhan + quyet dinh cap duyet]
                                |
                        pending_final_approval
                                |
                    [Giam doc / Chu tich duyet chot]
                                |
                          pending_payment
                                |
                    [Ke toan lap de xuat thanh toan]
                                |
                      pending_payment_approval
                                |
                    [Lanh dao duyet chi]
                                |
                           disbursing
                                |
                    [Ke toan giai ngan het dot]
                                |
                           completed

   * Tu bat cu buoc nao -> rejected (neu bi tu choi)
```

### AdvanceProposal

```
[Tao de xuat]
      |
pending_director   <- giam_doc dang cho
      | [giam_doc duyet]
      |
pending_chairman   <- chu_tich dang cho
      | [chu_tich duyet]
      |
pending_accounting <- ke_toan dang cho
      | [ke_toan duyet & giai ngan]
      |
pending_settlement <- creator phai nop hoan
      | [creator nop chung tu]
      |
settlement_submitted <- ke_toan dang cho xac nhan
      | [ke_toan xac nhan]
      |
completed

* Tu bat cu buoc lanh dao nao -> rejected
```

### PaymentProposal

```
[Ke toan tao] -- amount <= 10tr --> pending_director
              -- amount > 10tr  --> pending_chairman
                         |
             [Lanh dao duyet chi]
                         |
                pending_disbursement
                         |
             [Ke toan xac nhan da chuyen tien]
                         |
                      completed

* pending_director / pending_chairman -> rejected (lanh dao tu choi)
```

---

## 7. Quy tac phan quyen tong hop

### Quyen tao de xuat

| Role | Tao mua sam | Tao tam ung | Tao thanh toan |
|------|------------|------------|----------------|
| nhan_vien | Co | Co | Khong |
| truong_phong | Co | Co | Khong |
| thu_mua | Co | Co | Khong |
| ke_toan | Co | Co | Co (duy nhat) |
| giam_doc | Co | Co | Khong |
| chu_tich | Co | Co | Khong |

### Quyen duyet theo loai de xuat

Mua sam - Duyet so bo:
  truong_phong (neu step dau la TP), giam_doc, chu_tich

Mua sam - Nop gia thu mua:
  thu_mua

Mua sam - Xac nhan gia:
  ke_toan

Mua sam - Duyet gia chot:
  giam_doc (de xuat <= 10tr), chu_tich (de xuat > 10tr)

Tam ung - Duyet:
  giam_doc (buoc 1), chu_tich (buoc 2)

Tam ung - Giai ngan:
  ke_toan

Tam ung - Nop hoan:
  Dung creator (nguoi tao de xuat)

Thanh toan - Duyet chi:
  giam_doc (amount <= 10tr), chu_tich (bat ki amount)

Thanh toan - Giai ngan:
  ke_toan

---

## 8. Dong bo du lieu (Cross-collection Sync)

PaymentProposalService dam bao dong bo du lieu giua 2 collection:

Khi tao PaymentProposal:
  PurchaseProposal.status -> 'pending_payment_approval'

Khi lanh dao duyet PaymentProposal:
  PurchaseProposal.status -> 'disbursing'

Khi lanh dao tu choi PaymentProposal:
  Neu khong con PP nao pending -> PurchaseProposal.status -> 'pending_payment'

Khi ke toan giai ngan PaymentProposal:
  PurchaseProposal.disbursements.push({ amount, date, note, processedBy })
  PurchaseProposal.totalDisbursed += amount
  Neu totalDisbursed >= totalActualAmount:
    PurchaseProposal.status -> 'completed'
  Nguoc lai:
    PurchaseProposal.status -> 'disbursing' (cho dot tiep theo)
