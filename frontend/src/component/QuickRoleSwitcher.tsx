import React from 'react';
import { useAuth } from '../context/AuthContext';
import { DEMO_ACCOUNTS } from '../utils/formatters';
import {
  User as UserIcon,
  Shield,
  ShoppingBag,
  CreditCard,
  Briefcase,
  Crown,
  Zap,
} from 'lucide-react';
import { Role } from '../models';

const roleIcons: Record<Role, React.ReactNode> = {
  nhan_vien: <UserIcon size={14} />,
  truong_phong: <Shield size={14} />,
  thu_mua: <ShoppingBag size={14} />,
  ke_toan: <CreditCard size={14} />,
  giam_doc: <Briefcase size={14} />,
  chu_tich: <Crown size={14} />,
};

export const QuickRoleSwitcher: React.FC = () => {
  const { user, switchDemoRole, isLoading } = useAuth();

  return (
    <div className="role-switcher-bar">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        <Zap size={14} style={{ color: 'var(--warning)' }} />
        <span>Test Vai Trò:</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'nowrap' }}>
        {DEMO_ACCOUNTS.map((acc) => {
          const isActive = user?.role === acc.role;
          return (
            <button
              key={acc.role}
              type="button"
              className={`role-switcher-chip ${isActive ? 'active' : ''}`}
              onClick={() => !isActive && !isLoading && switchDemoRole(acc.role)}
              disabled={isLoading}
              title={`${acc.name} (${acc.department}) - ${acc.description}`}
            >
              {roleIcons[acc.role]}
              <span>{acc.name.split(' ').slice(-1)[0]} ({acc.role === 'nhan_vien' ? 'NV' : acc.role === 'truong_phong' ? 'TP' : acc.role === 'thu_mua' ? 'Thu Mua' : acc.role === 'ke_toan' ? 'Kế Toán' : acc.role === 'giam_doc' ? 'GĐ' : 'Chủ Tịch'})</span>
              {isActive && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    display: 'inline-block',
                    marginLeft: 2,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
