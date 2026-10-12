import React from 'react';
import { ApprovalStep } from '../models';
import { formatDate, getRoleLabel } from '../utils/formatters';
import { Check, Clock, X, MessageSquare } from 'lucide-react';

interface ApprovalFlowTrackerProps {
  steps: ApprovalStep[];
  currentRole?: string | null;
}

export const ApprovalFlowTracker: React.FC<ApprovalFlowTrackerProps> = ({
  steps,
}) => {
  if (!steps || steps.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Chưa có thông tin tiến trình phê duyệt.
      </div>
    );
  }

  // Tìm bước đang chờ xử lý đầu tiên để làm nổi bật là bước hiện tại
  const currentPendingIndex = steps.findIndex((s) => s.status === 'pending');

  return (
    <div className="stepper-timeline">
      {steps.map((step, idx) => {
        const isApproved = step.status === 'approved';
        const isRejected = step.status === 'rejected';
        const isCurrent = idx === currentPendingIndex;
        const isFuture = !isApproved && !isRejected && !isCurrent;

        let nodeClass = 'step-node';
        if (isApproved) nodeClass += ' approved';

        let circleClass = 'step-circle';
        if (isApproved) circleClass += ' approved';
        else if (isRejected) circleClass += ' rejected';
        else if (isCurrent) circleClass += ' current';
        else circleClass += ' pending';

        const approverName =
          typeof step.approver === 'object' && step.approver !== null
            ? (step.approver as any).fullName
            : null;

        return (
          <div key={idx} className={nodeClass}>
            <div className={circleClass}>
              {isApproved && <Check size={18} strokeWidth={2.5} />}
              {isRejected && <X size={18} strokeWidth={2.5} />}
              {isCurrent && <Clock size={18} />}
              {isFuture && <span>{idx + 1}</span>}
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span
                    style={{
                      fontWeight: isCurrent || isApproved ? 700 : 500,
                      color: isApproved
                        ? 'var(--success)'
                        : isCurrent
                        ? 'var(--text-primary)'
                        : isRejected
                        ? 'var(--danger)'
                        : 'var(--text-muted)',
                      fontSize: '0.925rem',
                    }}
                  >
                    {step.step}
                  </span>

                  <span
                    className="badge badge-secondary"
                    style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}
                  >
                    {getRoleLabel(step.role)}
                  </span>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {step.date ? formatDate(step.date) : isCurrent ? 'Đang chờ xử lý' : 'Chưa tới lượt'}
                </div>
              </div>

              {approverName && (
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    marginTop: '0.2rem',
                  }}
                >
                  Người xử lý:{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{approverName}</strong>
                </div>
              )}

              {step.comment && (
                <div
                  style={{
                    marginTop: '0.45rem',
                    padding: '0.55rem 0.85rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: `3px solid ${isRejected ? 'var(--danger)' : 'var(--primary)'}`,
                    fontSize: '0.825rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.45rem',
                  }}
                >
                  <MessageSquare size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>{step.comment}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
