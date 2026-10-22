import React from 'react';

interface TagLogoProps {
  size?: number;
  showText?: boolean;
  subText?: string;
  variant?: 'full' | 'compact' | 'horizontal';
}

export const TagLogo: React.FC<TagLogoProps> = ({
  size = 40,
  showText = true,
  subText = 'Công Ty TNHH Tư Vấn Thiết Kế & Xây Dựng Khách Sạn Cao Cấp',
  variant = 'horizontal',
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
        userSelect: 'none',
      }}
    >
      {/* Biểu trưng kiến trúc cao cấp */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.28),
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          border: '1.5px solid rgba(212, 175, 55, 0.45)', // Viền vàng kim sang trọng tinh tế
          boxShadow: '0 4px 20px -2px rgba(212, 175, 55, 0.25), 0 0 12px rgba(99, 102, 241, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* Lưới hình học kiến trúc phong cách khách sạn sang trọng */}
        <svg
          width={Math.round(size * 0.65)}
          height={Math.round(size * 0.65)}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Cấu trúc cột trụ tòa nhà chính */}
          <path
            d="M3 21H21"
            stroke="url(#tag-gold-grad)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M6 21V7L12 3L18 7V21"
            stroke="url(#tag-gold-grad)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Khối kim cương đỉnh cao ốc */}
          <path
            d="M12 7.5L15 11H9L12 7.5Z"
            fill="url(#tag-gold-grad)"
          />
          {/* Cửa sổ lưới khách sạn */}
          <rect x="8.5" y="13.5" width="2.5" height="3" rx="0.5" fill="#e2e8f0" />
          <rect x="13" y="13.5" width="2.5" height="3" rx="0.5" fill="#e2e8f0" />
          <defs>
            <linearGradient id="tag-gold-grad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fde047" />
              <stop offset="0.5" stopColor="#eab308" />
              <stop offset="1" stopColor="#ca8a04" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <span
              style={{
                fontSize: size >= 40 ? '1.35rem' : '1.15rem',
                fontWeight: 900,
                letterSpacing: '0.04em',
                background: 'linear-gradient(135deg, #ffffff 40%, #e2e8f0 70%, #fbbf24 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontFamily: 'inherit',
              }}
            >
              TAG
            </span>
            <span
              style={{
                fontSize: '0.675rem',
                fontWeight: 700,
                color: '#eab308',
                backgroundColor: 'rgba(234, 179, 8, 0.12)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                padding: '0.1rem 0.4rem',
                borderRadius: '4px',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              TNHH
            </span>
          </div>
          {variant !== 'compact' && subText && (
            <div
              style={{
                fontSize: '0.675rem',
                color: 'var(--text-muted)',
                fontWeight: 500,
                lineHeight: 1.25,
                marginTop: '0.15rem',
                maxWidth: '280px',
              }}
            >
              {subText}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
