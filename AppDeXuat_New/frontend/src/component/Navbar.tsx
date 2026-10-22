import React from 'react';
import { useAuth } from '../context/AuthContext';
import { getRoleBadgeClass, getRoleLabel } from '../utils/formatters';
import { LogOut, Building2 } from 'lucide-react';
import { TagLogo } from './TagLogo';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  const deptName =
    typeof user?.department === 'object' && user.department !== null
      ? user.department.name
      : 'Công ty';

  return (
    <header
      style={{
        height: '70px',
        backgroundColor: 'rgba(11, 15, 25, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <TagLogo
        size={38}
        subText="Thiết Kế & Xây Dựng Khách Sạn Cao Cấp"
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {user && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              padding: '0.4rem 0.85rem',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {/* Avatar circle */}
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.875rem',
                color: '#ffffff',
                border: '2px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              {user.fullName.split(' ').slice(-1)[0][0]}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  {user.fullName}
                </span>
                <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                  {getRoleLabel(user.role)}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.725rem',
                  color: 'var(--text-muted)',
                }}
              >
                <Building2 size={12} />
                <span>{deptName}</span>
                <span>•</span>
                <span className="font-mono">{user.email}</span>
              </div>
            </div>

            <button
              onClick={logout}
              className="btn btn-ghost btn-sm"
              style={{
                marginLeft: '0.5rem',
                color: 'var(--text-muted)',
                borderRadius: 'var(--radius-md)',
              }}
              title="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
