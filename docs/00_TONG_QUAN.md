# AppDeXuat — Tổng quan dự án

> Ứng dụng quản lý đề xuất nội bộ: Mua sắm vật tư, Tạm ứng, Thanh toán — với quy trình duyệt nhiều cấp theo vai trò.

## Danh sách tài liệu

| File | Nội dung |
|------|----------|
| 00_TONG_QUAN.md | Kiến trúc tổng thể, công nghệ, vai trò, cấu trúc thư mục |
| 01_DATABASE.md | Mongoose Schemas, quan hệ dữ liệu, các trạng thái |
| 02_BACKEND.md | Server, Middleware, Routes, Controllers, Services |
| 03_FRONTEND.md | Context, Layout, Routes, Services, Components, Pages |
| 04_API.md | Toàn bộ REST API endpoints |
| 05_LUONG_NGHIEP_VU.md | Luồng dữ liệu và quy trình phê duyệt từng chức năng |

## Kiến trúc tổng thể

```
FRONTEND (React 19 + TypeScript + Vite)   http://localhost:5173
   |
   |  AuthContext <-> localStorage (token, user)
   |  services/api.ts (Axios + Request/Response Interceptors)
   |
   |  HTTP REST + Bearer JWT Token
   v
BACKEND (Node.js + Express 5)             http://localhost:5000
   |
   |  routes/ -> middlewares/auth -> controllers/ -> services/
   |                                                    |
   |                                             models/ (Mongoose)
   |                                                    |
   |                                                MongoDB
   |
   +- services/aiSearchService:
        DuckDuckGo HTML scraping -> Gemini AI -> JSON
```

## Công nghệ sử dụng

### Backend

| Thu vien | Phien ban | Muc dich |
|---------|-----------|---------|
| express | ^5.2.1 | HTTP server framework |
| mongoose | ^9.11.0 | MongoDB ODM |
| jsonwebtoken | ^9.0.3 | JWT auth |
| bcryptjs | ^3.0.3 | Hash mat khau |
| multer | ^2.4.0 | Upload file |
| @google/genai | ^2.28.0 | Google Gemini AI |
| cheerio | ^1.2.0 | HTML scraping |
| cors | ^2.8.6 | Xu ly CORS |
| dotenv | ^18.0.5 | Bien moi truong |

### Frontend

| Thu vien | Phien ban | Muc dich |
|---------|-----------|---------|
| react | ^19.2.8 | UI framework |
| react-router-dom | ^7.18.4 | Dinh tuyen trang |
| axios | ^1.20.0 | HTTP client |
| lucide-react | ^1.52.0 | Icon library |
| vite | ^8.3.0 | Build tool |
| typescript | ~6.0.2 | Type safety |

## He thong vai tro

| Role | Ten | Quyen han |
|------|-----|-----------|
| nhan_vien | Nhan vien | Tao de xuat mua sam & tam ung |
| truong_phong | Truong phong | Duyet de xuat phong <= 1tr |
| thu_mua | Thu mua | Khao gia, dien gia thuc te |
| ke_toan | Ke toan | Xac nhan gia, tao thanh toan, giai ngan |
| giam_doc | Giam doc | Duyet <= 10 trieu |
| chu_tich | Chu tich | Tham quyen toi cao |

### Tai khoan demo

| Email | Password | Role |
|-------|----------|------|
| nhanvien@demo.com | 123456 | nhan_vien |
| truongphong@demo.com | 123456 | truong_phong |
| thuamua@demo.com | 123456 | thu_mua |
| ketoan@demo.com | 123456 | ke_toan |
| giamdoc@demo.com | 123456 | giam_doc |
| chutich@demo.com | 123456 | chu_tich |

## Cau truc thu muc

```
AppDeXuat/
+-- docs/
+-- backend/
|   +-- config/db.js
|   +-- controllers/
|   +-- middlewares/
|   +-- models/
|   +-- routes/
|   +-- services/
|   +-- utils/
|   +-- uploads/
|   +-- server.js
+-- frontend/src/
|   +-- App.tsx
|   +-- context/AuthContext.tsx
|   +-- layout/
|   +-- routes/routes.tsx
|   +-- models/
|   +-- services/
|   +-- utils/formatters.ts
|   +-- component/
|   +-- pages/
+-- start.bat / stop.bat
```

## Bien moi truong

backend/.env:
  MONGODB_URI=mongodb://localhost:27017/appdeXuat
  JWT_SECRET=your_secret_key
  JWT_EXPIRES_IN=7d
  PORT=5000
  GEMINI_API_KEY=AIza...
  GEMINI_MODEL=gemini-2.5-flash

frontend/.env:
  VITE_API_URL=http://localhost:5000/api

## Scripts

  cd backend && npm install && npm run dev    # port 5000
  cd frontend && npm install && npm run dev   # port 5173
  cd backend && node utils/seed.js            # seed du lieu mau
