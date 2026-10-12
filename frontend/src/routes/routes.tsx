import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout, ProtectedRoute } from '../layout';
import { LoginPage } from '../pages/loginpage/LoginPage';
import { DashboardPage } from '../pages/dashboardpage/DashboardPage';
import { PurchaseListPage } from '../pages/purchasepage/PurchaseListPage';
import { CreatePurchasePage } from '../pages/purchasepage/CreatePurchasePage';
import { PurchaseDetailPage } from '../pages/purchasepage/PurchaseDetailPage';
import { AdvanceListPage } from '../pages/advancepage/AdvanceListPage';
import { CreateAdvancePage } from '../pages/advancepage/CreateAdvancePage';
import { AdvanceDetailPage } from '../pages/advancepage/AdvanceDetailPage';
import { PaymentListPage } from '../pages/paymentpage/PaymentListPage';
import { CreatePaymentPage } from '../pages/paymentpage/CreatePaymentPage';
import { PaymentDetailPage } from '../pages/paymentpage/PaymentDetailPage';
import { ApprovalPage } from '../pages/approvalpage/ApprovalPage';
import { ProfilePage } from '../pages/profilepage/ProfilePage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Tuyến đường công khai (Đăng nhập) */}
      <Route path="/login" element={<LoginPage />} />

      {/* Tuyến đường được bảo vệ bên trong MainLayout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Tuyến đường đề xuất mua sắm vật tư */}
        <Route path="purchase" element={<PurchaseListPage />} />
        <Route path="purchase/create" element={<CreatePurchasePage />} />
        <Route path="purchase/:id" element={<PurchaseDetailPage />} />

        {/* Tuyến đường đề xuất tạm ứng */}
        <Route path="advance" element={<AdvanceListPage />} />
        <Route path="advance/create" element={<CreateAdvancePage />} />
        <Route path="advance/:id" element={<AdvanceDetailPage />} />

        {/* Tuyến đường đề xuất thanh toán (chỉ dành cho Kế toán) */}
        <Route path="payment" element={<PaymentListPage />} />
        <Route path="payment/create" element={<CreatePaymentPage />} />
        <Route path="payment/:id" element={<PaymentDetailPage />} />

        {/* Hộp thư duyệt hồ sơ */}
        <Route path="approval" element={<ApprovalPage />} />

        {/* Hồ sơ cá nhân & Cài đặt */}
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Tuyến đường mặc định khi không tìm thấy */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
