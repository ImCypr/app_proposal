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
import { UserManagementPage } from '../pages/adminpage/UserManagementPage';
import { DepartmentManagementPage } from '../pages/adminpage/DepartmentManagementPage';
import { UnassignedNoticePage } from '../pages/unassignedpage/UnassignedNoticePage';

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

        {/* Phân hệ Quản Trị Hệ Thống (Dành riêng cho Admin) */}
        <Route
          path="admin/users"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <UserManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/departments"
          element={
            <ProtectedRoute allowedRoles={['admin', 'giam_doc', 'chu_tich']}>
              <DepartmentManagementPage />
            </ProtectedRoute>
          }
        />

        {/* Màn hình thông báo tài khoản chưa gán chức danh */}
        <Route path="unassigned" element={<UnassignedNoticePage />} />

        {/* Tuyến đường đề xuất mua sắm vật tư */}
        <Route path="purchase" element={<PurchaseListPage />} />
        <Route path="purchase/create" element={<CreatePurchasePage />} />
        <Route path="purchase/:id" element={<PurchaseDetailPage />} />

        {/* Tuyến đường đề xuất tạm ứng */}
        <Route path="advance" element={<AdvanceListPage />} />
        <Route path="advance/create" element={<CreateAdvancePage />} />
        <Route path="advance/:id" element={<AdvanceDetailPage />} />

        {/* Tuyến đường đề xuất thanh toán (chỉ dành cho Kế toán và Ban giám đốc) */}
        <Route
          path="payment"
          element={
            <ProtectedRoute allowedRoles={['ke_toan', 'giam_doc', 'chu_tich']}>
              <PaymentListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="payment/create"
          element={
            <ProtectedRoute allowedRoles={['ke_toan']}>
              <CreatePaymentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="payment/:id"
          element={
            <ProtectedRoute allowedRoles={['ke_toan', 'giam_doc', 'chu_tich']}>
              <PaymentDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Hộp thư duyệt hồ sơ (Dành cho cấp duyệt: Trưởng phòng, Thu mua, Kế toán, Giám đốc, Chủ tịch) */}
        <Route
          path="approval"
          element={
            <ProtectedRoute allowedRoles={['truong_phong', 'thu_mua', 'ke_toan', 'giam_doc', 'chu_tich']}>
              <ApprovalPage />
            </ProtectedRoute>
          }
        />

        {/* Hồ sơ cá nhân & Cài đặt */}
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Tuyến đường mặc định khi không tìm thấy */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
