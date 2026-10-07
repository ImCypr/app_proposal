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
import { ApprovalPage } from '../pages/approvalpage/ApprovalPage';
import { ProfilePage } from '../pages/profilepage/ProfilePage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Routes inside MainLayout */}
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

        {/* Purchase Proposal Routes */}
        <Route path="purchase" element={<PurchaseListPage />} />
        <Route path="purchase/create" element={<CreatePurchasePage />} />
        <Route path="purchase/:id" element={<PurchaseDetailPage />} />

        {/* Advance Proposal Routes */}
        <Route path="advance" element={<AdvanceListPage />} />
        <Route path="advance/create" element={<CreateAdvancePage />} />
        <Route path="advance/:id" element={<AdvanceDetailPage />} />

        {/* Approvals Inbox */}
        <Route path="approval" element={<ApprovalPage />} />

        {/* Profile & Settings */}
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
