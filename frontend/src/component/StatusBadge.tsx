import React from 'react';
import { getAdvanceStatusInfo, getPurchaseStatusInfo } from '../utils/formatters';

interface StatusBadgeProps {
  status: string;
  type?: 'purchase' | 'advance';
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'purchase',
  showDot = true,
}) => {
  const meta =
    type === 'purchase'
      ? getPurchaseStatusInfo(status)
      : getAdvanceStatusInfo(status);

  return (
    <span className={`badge ${meta.badgeClass}`}>
      {showDot && (
        <span
          className="badge-dot"
          style={{ backgroundColor: meta.dotColor }}
        />
      )}
      {meta.label}
    </span>
  );
};
