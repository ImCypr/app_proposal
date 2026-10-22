import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';
import { Role } from '../models';

export const ProtectedRoute: React.FC<{
  children: React.ReactElement;
  allowedRoles?: Role[];
}> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-dark)',
          color: 'var(--text-secondary)',
          gap: '1rem',
        }}
      >
        <Loader2 size={36} className="animate-spin" color="var(--primary)" />
        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Đang xác thực thông tin...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Nếu người dùng chưa được gán chức danh (unassigned), tự động điều hướng sang trang thông báo
  if (user.role === 'unassigned' && location.pathname !== '/unassigned' && location.pathname !== '/profile') {
    return <Navigate to="/unassigned" replace />;
  }

  // Kiểm tra quyền hạn vai trò nếu route có yêu cầu cụ thể
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
