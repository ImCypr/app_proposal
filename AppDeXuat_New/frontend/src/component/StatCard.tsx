import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  gradient?: string;
  badgeText?: string;
  badgeType?: 'primary' | 'success' | 'warning' | 'danger' | 'purple';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  gradient = 'var(--primary-gradient)',
  badgeText,
  badgeType = 'primary',
}) => {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            {title}
          </span>
          {badgeText && (
            <span className={`badge badge-${badgeType}`} style={{ fontSize: '0.675rem', padding: '0.15rem 0.45rem' }}>
              {badgeText}
            </span>
          )}
        </div>
        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
          {value}
        </div>
        {subtitle && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {subtitle}
          </div>
        )}
      </div>

      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '14px',
          background: gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
    </div>
  );
};
