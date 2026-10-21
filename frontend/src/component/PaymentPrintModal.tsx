import React, { useRef, useState } from 'react';
import { PaymentProposal } from '../models';
import {
  formatCurrency,
  formatDate,
  formatDateToVietnameseLong,
  getRoleLabel,
  numberToVietnameseWords,
} from '../utils/formatters';
import { Printer, X, ZoomIn, ZoomOut } from 'lucide-react';

interface PaymentPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: PaymentProposal | null;
}

export const PaymentPrintModal: React.FC<PaymentPrintModalProps> = ({
  isOpen,
  onClose,
  proposal,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(100);

  if (!isOpen || !proposal) return null;

  // Lấy bước duyệt chi
  const approveStep = proposal.approvalFlow?.find((s) => s.step === 'duyet_chi' && s.status === 'approved');
  const approverName = (approveStep?.approver as any)?.fullName || '';
  const approverRole = approveStep?.role ? getRoleLabel(approveStep.role) : 'Ban Giám Đốc / Chủ Tịch';
  const approverDate = approveStep?.date
    ? formatDateToVietnameseLong(approveStep.date)
    : 'Ngày ..... tháng ..... năm 20....';

  const creatorDate = formatDateToVietnameseLong(proposal.createdAt);

  const purchaseCode = typeof proposal.purchaseProposal === 'object'
    ? proposal.purchaseProposal?.proposalCode
    : '';

  const words = proposal.amountInWords || numberToVietnameseWords(proposal.amount);

  const handlePrint = () => {
    if (!printAreaRef.current) return;
    const content = printAreaRef.current.innerHTML;

    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) {
      alert('Vui lòng cho phép mở popup để xem bản in!');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Giấy Đề Nghị Thanh Toán - ${proposal.proposalCode}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 20mm 15mm 20mm 25mm; /* Căn lề chuẩn văn bản: Top 20mm, Right 15mm, Bottom 20mm, Left 25mm */
            }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Times New Roman', Times, serif;
              color: #000000 !important;
              background-color: #ffffff !important;
              font-size: 13pt;
              line-height: 1.45;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print-page {
              width: 100%;
              margin: 0 auto;
              background-color: #ffffff !important;
            }
          </style>
        </head>
        <body>
          <div class="print-page">
            ${content}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 600);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1200, padding: '1.5rem' }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '920px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0f172a',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(30, 41, 59, 0.5)',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.1rem', color: '#ffffff', fontWeight: 700, margin: 0 }}>
              Xem Trước Bản In / Xuất PDF
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Đề xuất thanh toán — Mã: {proposal.proposalCode}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Bộ điều khiển thu phóng (Zoom) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                padding: '0.2rem 0.5rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}
            >
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(60, prev - 10))}
                className="btn btn-ghost btn-sm"
                style={{ padding: '0.25rem 0.4rem', color: '#ffffff' }}
                title="Thu nhỏ"
              >
                <ZoomOut size={15} />
              </button>
              <span style={{ fontSize: '0.8rem', minWidth: '40px', textAlign: 'center', fontWeight: 600, color: '#ffffff' }}>
                {zoom}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(140, prev + 10))}
                className="btn btn-ghost btn-sm"
                style={{ padding: '0.25rem 0.4rem', color: '#ffffff' }}
                title="Phóng to"
              >
                <ZoomIn size={15} />
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="btn btn-primary"
              style={{ gap: '0.45rem', padding: '0.5rem 1.25rem', fontWeight: 600 }}
            >
              <Printer size={16} />
              <span>In / Lưu PDF</span>
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              style={{ padding: '0.45rem', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '2rem 1.5rem 3rem 1.5rem',
            backgroundColor: '#0b1120',
            display: 'block',
          }}
        >
          <div
            ref={printAreaRef}
            style={{
              width: '100%',
              maxWidth: '794px',
              minHeight: '1123px',
              backgroundColor: '#ffffff',
              color: '#000000',
              padding: '65px 60px 85px 60px',
              margin: '0 auto',
              boxShadow: '0 15px 45px rgba(0, 0, 0, 0.75)',
              fontFamily: "'Times New Roman', Times, serif",
              fontSize: '12pt',
              lineHeight: 1.5,
              boxSizing: 'border-box',
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease',
            }}
          >
            {/* Header */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '18px' }}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: 'top', width: '52%', border: 'none', padding: 0 }}>
                    <div style={{ fontSize: '10.5pt', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      CÔNG TY CỔ PHẦN CÔNG NGHỆ & ĐẦU TƯ PROFLOW
                    </div>
                    <div style={{ fontSize: '10.5pt', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      PHÒNG KẾ TOÁN TÀI CHÍNH
                    </div>
                    <div style={{ fontSize: '10pt', marginTop: '4px' }}>
                      Số: <strong style={{ fontFamily: 'monospace' }}>{proposal.proposalCode}</strong>
                    </div>
                  </td>
                  <td style={{ verticalAlign: 'top', width: '48%', textAlign: 'center', border: 'none', padding: 0 }}>
                    <div style={{ fontSize: '10.5pt', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                    </div>
                    <div style={{ fontSize: '10.5pt', fontWeight: 'bold' }}>
                      Độc lập - Tự do - Hạnh phúc
                    </div>
                    <div
                      style={{
                        width: '120px',
                        height: '1px',
                        backgroundColor: '#000',
                        margin: '4px auto 8px auto',
                      }}
                    />
                    <div style={{ fontSize: '10.5pt', fontStyle: 'italic' }}>
                      Hà Nội, {creatorDate}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Tiêu đề */}
            <div
              style={{
                textAlign: 'center',
                fontSize: '15.5pt',
                fontWeight: 'bold',
                margin: '22px 0 4px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              GIẤY ĐỀ NGHỊ THANH TOÁN
            </div>
            <div style={{ textAlign: 'center', fontSize: '10.5pt', fontStyle: 'italic', marginBottom: '16px' }}>
              {purchaseCode ? `(Căn cứ đơn mua sắm vật tư số: ${purchaseCode}` : '(Thanh toán chi phí phục vụ hoạt động công ty'}
              {proposal.invoiceInfo?.invoiceDate ? ` • Hóa đơn ngày: ${formatDate(proposal.invoiceInfo.invoiceDate)}` : ''}
              {proposal.quotationAttachments && proposal.quotationAttachments.length > 0 ? ` • Kèm theo ${proposal.quotationAttachments.length} bản báo giá đối tác` : ''}
              {purchaseCode ? ')' : ''}
            </div>

            {/* Nội dung */}
            <div style={{ marginBottom: '16px', lineHeight: 1.7, fontSize: '11pt' }}>
              <div>
                <strong>Kính gửi:</strong> Ban Giám Đốc, Phòng Kế toán - Tài chính
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ minWidth: '170px' }}><strong>Người đề nghị:</strong></span>
                <span>{proposal.creator?.fullName || '—'} (Bộ phận: {proposal.department?.name || '—'})</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ minWidth: '170px' }}><strong>Nội dung thanh toán:</strong></span>
                <span>{proposal.paymentReason}</span>
              </div>
              {proposal.installmentNote && (
                <div style={{ display: 'flex' }}>
                  <span style={{ minWidth: '170px' }}><strong>Đợt thanh toán:</strong></span>
                  <span>{proposal.installmentNote}</span>
                </div>
              )}
              {proposal.invoiceInfo?.invoiceDate && (
                <div style={{ display: 'flex' }}>
                  <span style={{ minWidth: '170px' }}><strong>Ngày lập hóa đơn:</strong></span>
                  <span>{formatDate(proposal.invoiceInfo.invoiceDate)}</span>
                </div>
              )}
              <div style={{ display: 'flex' }}>
                <span style={{ minWidth: '170px' }}><strong>Số tiền đề nghị:</strong></span>
                <span style={{ fontSize: '12pt', fontWeight: 'bold' }}>{formatCurrency(proposal.amount)}</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ minWidth: '170px' }}><strong>Bằng chữ:</strong></span>
                <span style={{ fontStyle: 'italic', fontWeight: 'bold' }}>{words}</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ minWidth: '170px' }}><strong>Phương thức:</strong></span>
                <span>{proposal.paymentMethod === 'bank_transfer' ? 'Chuyển khoản qua ngân hàng' : 'Tiền mặt'}</span>
              </div>

              {/* [LUỒNG MỚI] BẢNG DANH MỤC YÊU CẦU VẬT TƯ CHI TIẾT TRONG BẢN IN */}
              {(() => {
                const pItems = (proposal.items && proposal.items.length > 0)
                  ? proposal.items
                  : ((proposal.purchaseProposal as any)?.items || []);
                if (pItems.length === 0) return null;

                return (
                  <div style={{ marginTop: '12px', marginBottom: '12px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '10.5pt', marginBottom: '4px' }}>
                      DANH MỤC VẬT TƯ ĐỀ NGHỊ THANH TOÁN:
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', border: '1px solid #333' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                          <th style={{ border: '1px solid #333', padding: '4px 6px', width: '35px', textAlign: 'center' }}>STT</th>
                          <th style={{ border: '1px solid #333', padding: '4px 6px', textAlign: 'left' }}>Tên vật tư</th>
                          <th style={{ border: '1px solid #333', padding: '4px 6px', width: '45px', textAlign: 'center' }}>SL</th>
                          <th style={{ border: '1px solid #333', padding: '4px 6px', textAlign: 'right', width: '90px' }}>Đơn giá</th>
                          <th style={{ border: '1px solid #333', padding: '4px 6px', textAlign: 'right', width: '105px' }}>Thành tiền</th>
                          <th style={{ border: '1px solid #333', padding: '4px 6px', textAlign: 'left', width: '130px' }}>Nhà cung cấp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pItems.map((it: any, idx: number) => {
                          const qty = Number(it.soLuong) || 1;
                          const price = Number(it.donGiaThucTe) || 0;
                          const lineTotal = it.thanhTien || (qty * price);
                          return (
                            <tr key={idx}>
                              <td style={{ border: '1px solid #333', padding: '3px 6px', textAlign: 'center' }}>{it.stt || idx + 1}</td>
                              <td style={{ border: '1px solid #333', padding: '3px 6px' }}>{it.tenVatTu}</td>
                              <td style={{ border: '1px solid #333', padding: '3px 6px', textAlign: 'center' }}>{qty}</td>
                              <td style={{ border: '1px solid #333', padding: '3px 6px', textAlign: 'right' }}>{formatCurrency(price)}</td>
                              <td style={{ border: '1px solid #333', padding: '3px 6px', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(lineTotal)}</td>
                              <td style={{ border: '1px solid #333', padding: '3px 6px' }}>{it.nhaCungCap || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {/* Thông tin người thụ hưởng */}
              <div
                style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  border: '1px solid #333',
                  backgroundColor: '#f9fafb',
                  borderRadius: '4px',
                  fontSize: '10.5pt',
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>THÔNG TIN NGƯỜI THỤ HƯỞNG:</div>
                <div>• Tên người nhận: <strong>{proposal.beneficiary?.name}</strong></div>
                {proposal.beneficiary?.accountNumber && (
                  <div>• Số tài khoản: <strong>{proposal.beneficiary.accountNumber}</strong> tại Ngân hàng: <strong>{proposal.beneficiary.bankName}</strong> {proposal.beneficiary.branch ? `(${proposal.beneficiary.branch})` : ''}</div>
                )}
              </div>
            </div>

            {/* PHẦN KÝ */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '35px' }}>
              <tbody>
                <tr>
                  <td style={{ width: '50%', verticalAlign: 'top', textAlign: 'center', border: 'none', padding: '0 10px' }}>
                    <div style={{ fontSize: '11pt', fontStyle: 'italic', marginBottom: '6px' }}>
                      Hà Nội, {creatorDate}
                    </div>
                    <div style={{ fontSize: '12pt', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                      NGƯỜI ĐỀ NGHỊ
                    </div>
                    <div style={{ fontSize: '10pt', fontStyle: 'italic', color: '#555', marginBottom: '70px' }}>
                      (Ký và ghi rõ họ tên)
                    </div>
                    <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>
                      {proposal.creator?.fullName || 'Người đề nghị'}
                    </div>
                    <div style={{ fontSize: '10.5pt', fontStyle: 'italic', color: '#444' }}>
                      {getRoleLabel(proposal.creator?.role)}
                    </div>
                  </td>

                  <td style={{ width: '50%', verticalAlign: 'top', textAlign: 'center', border: 'none', padding: '0 10px' }}>
                    <div style={{ fontSize: '11pt', fontStyle: 'italic', marginBottom: '6px' }}>
                      Hà Nội, {approverDate}
                    </div>
                    <div style={{ fontSize: '12pt', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                      NGƯỜI PHÊ DUYỆT
                    </div>
                    <div style={{ fontSize: '10pt', fontStyle: 'italic', color: '#555', marginBottom: '70px' }}>
                      (Ký và ghi rõ họ tên)
                    </div>
                    <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>
                      {approverName || '(Chưa ký duyệt)'}
                    </div>
                    <div style={{ fontSize: '10.5pt', fontStyle: 'italic', color: '#444' }}>
                      {approverRole}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
