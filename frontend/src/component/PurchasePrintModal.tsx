import React, { useRef, useState } from 'react';
import { PurchaseProposal } from '../models';
import {
  formatCurrency,
  formatDate,
  formatDateToVietnameseLong,
  getRoleLabel,
  numberToVietnameseWords,
} from '../utils/formatters';
import { Printer, X, Download, ZoomIn, ZoomOut } from 'lucide-react';

interface PurchasePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: PurchaseProposal | null;
}

export const PurchasePrintModal: React.FC<PurchasePrintModalProps> = ({
  isOpen,
  onClose,
  proposal,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(100);

  if (!isOpen || !proposal) return null;

  // Tính toán số liệu tổng
  const totalActual = (proposal.totalActualAmount && proposal.totalActualAmount > 0)
    ? proposal.totalActualAmount
    : (proposal.items?.reduce((s, it) => s + ((Number(it.soLuong) || 1) * (Number(it.donGiaThucTe) || 0)), 0) || 0);
  const totalEstimated = (proposal.totalEstimatedAmount && proposal.totalEstimatedAmount > 0)
    ? proposal.totalEstimatedAmount
    : (totalActual > 0 ? totalActual : 0);

  // Tìm người phê duyệt cuối cùng hoặc người duyệt đã chấp thuận
  const approvedStep = [...(proposal.approvalFlow || [])]
    .reverse()
    .find((step) => step.status === 'approved' && step.approver);

  const approverName = (approvedStep?.approver as any)?.fullName || '';
  const approverRole = approvedStep?.role
    ? getRoleLabel(approvedStep.role)
    : 'Ban Giám Đốc / Chủ Tịch';
  const approverDate = approvedStep?.date
    ? formatDateToVietnameseLong(approvedStep.date)
    : 'Ngày ..... tháng ..... năm 20....';

  const creatorDate = formatDateToVietnameseLong(proposal.createdAt);

  // Hàm xử lý in ấn trực tiếp hoặc lưu PDF sạch đẹp
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
          <title>Giấy Đề Nghị Mua Sắm - ${proposal.proposalCode}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 20mm 15mm 20mm 25mm; /* Căn lề chuẩn văn bản: Top 20mm, Right 15mm, Bottom 20mm, Left 25mm */
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
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
            .header-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .header-table td {
              vertical-align: top;
              border: none;
              padding: 0 4px;
            }
            .company-name {
              font-size: 11pt;
              font-weight: bold;
              text-transform: uppercase;
            }
            .dept-name {
              font-size: 11pt;
              font-weight: bold;
              text-transform: uppercase;
            }
            .code-text {
              font-size: 10.5pt;
              margin-top: 4px;
            }
            .national-motto {
              font-size: 11pt;
              font-weight: bold;
              text-align: center;
              text-transform: uppercase;
            }
            .sub-motto {
              font-size: 11pt;
              font-weight: bold;
              text-align: center;
            }
            .motto-line {
              width: 120px;
              height: 1px;
              background-color: #000;
              margin: 4px auto 8px auto;
            }
            .date-header {
              font-size: 11pt;
              font-style: italic;
              text-align: center;
            }
            .doc-title {
              text-align: center;
              font-size: 16pt;
              font-weight: bold;
              margin: 25px 0 6px 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .doc-subtitle {
              text-align: center;
              font-size: 11pt;
              font-style: italic;
              margin-bottom: 25px;
            }
            .info-section {
              margin-bottom: 20px;
              line-height: 1.8;
            }
            .info-row {
              display: flex;
              margin-bottom: 4px;
            }
            .info-label {
              font-weight: bold;
              min-width: 160px;
            }
            .info-value {
              flex: 1;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .items-table th, .items-table td {
              border: 1px solid #000000;
              padding: 6px 8px;
              font-size: 11pt;
            }
            .items-table th {
              background-color: #f2f2f2 !important;
              font-weight: bold;
              text-align: center;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-bold { font-weight: bold; }
            .signatures-container {
              width: 100%;
              margin-top: 35px;
              page-break-inside: avoid;
            }
            .sig-table {
              width: 100%;
              border-collapse: collapse;
            }
            .sig-table td {
              width: 50%;
              vertical-align: top;
              text-align: center;
              border: none;
              padding: 0 10px;
            }
            .sig-date {
              font-style: italic;
              font-size: 11.5pt;
              margin-bottom: 6px;
            }
            .sig-title {
              font-weight: bold;
              font-size: 12.5pt;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .sig-hint {
              font-size: 10pt;
              font-style: italic;
              color: #444;
              margin-bottom: 75px;
            }
            .sig-name {
              font-weight: bold;
              font-size: 12pt;
            }
            .sig-role {
              font-size: 10.5pt;
              font-style: italic;
              color: #333;
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
              setTimeout(function() {
                window.close();
              }, 600);
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
        {/* Thanh công cụ xem trước & in ấn */}
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
              Đơn đề xuất mua sắm vật tư — Mã: {proposal.proposalCode}
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
              title="Đóng xem trước"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Khung cuộn hiển thị trang A4 */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '2rem 1.5rem 3rem 1.5rem',
            backgroundColor: '#0b1120',
            display: 'block',
          }}
        >
          {/* TỜ GIẤY A4 TRẮNG CHUẨN IN ẤN */}
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
            {/* Header: Tên công ty & Quốc hiệu tiêu ngữ */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '18px' }}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: 'top', width: '52%', border: 'none', padding: 0 }}>
                    <div style={{ fontSize: '10.5pt', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      CÔNG TY CỔ PHẦN CÔNG NGHỆ & ĐẦU TƯ PROFLOW
                    </div>
                    <div style={{ fontSize: '10.5pt', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      PHÒNG BAN: {proposal.department?.name || 'VẬN HÀNH'}
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

            {/* Tiêu đề văn bản */}
            <div
              style={{
                textAlign: 'center',
                fontSize: '15.5pt',
                fontWeight: 'bold',
                margin: '20px 0 4px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              GIẤY ĐỀ NGHỊ MUA SẮM VẬT TƯ / THIẾT BỊ
            </div>
            <div style={{ textAlign: 'center', fontSize: '10.5pt', fontStyle: 'italic', marginBottom: '22px' }}>
              (V/v: Phục vụ hoạt động chuyên môn và vận hành của đơn vị)
            </div>

            {/* Thông tin người đề xuất & phòng ban */}
            <div style={{ marginBottom: '16px', lineHeight: 1.8, fontSize: '11pt' }}>
              <div>
                <strong>Kính gửi:</strong> Ban Giám Đốc, Bộ phận Quản lý & Thu mua vật tư
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ minWidth: '150px' }}><strong>Người làm đề xuất:</strong></span>
                <span>{proposal.creator?.fullName || '—'} (Chức vụ: {getRoleLabel(proposal.creator?.role)})</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ minWidth: '150px' }}><strong>Bộ phận / Phòng ban:</strong></span>
                <span>{proposal.department?.name || '—'}</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ minWidth: '150px' }}><strong>Ngày lập đề xuất:</strong></span>
                <span>{formatDate(proposal.createdAt)}</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ minWidth: '150px' }}><strong>Phương thức khảo giá:</strong></span>
                <span>{proposal.pricingMethod === 'ai' ? 'Khảo sát báo giá tự động (AI)' : 'Khảo sát thị trường trực tiếp'}</span>
              </div>
            </div>

            {/* Bảng danh sách vật tư */}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                margin: '16px 0',
                fontSize: '10.5pt',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f2f2f2' }}>
                  <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', width: '38px' }}>STT</th>
                  <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'left' }}>Tên Vật Tư, Yêu Cầu Kỹ Thuật</th>
                  <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', width: '60px' }}>SL</th>
                  <th style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'right', width: '110px' }}>Đơn Giá Dự Kiến</th>
                  <th style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'right', width: '120px' }}>Thành Tiền Dự Kiến</th>
                  <th style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'right', width: '120px' }}>Thành Tiền Thực Tế</th>
                  <th style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'left', width: '110px' }}>NCC / Ghi Chú</th>
                </tr>
              </thead>
              <tbody>
                {proposal.items && proposal.items.length > 0 ? (
                  proposal.items.map((item, index) => {
                    const qty = Number(item.soLuong) || 1;
                    const unitPrice = (item.donGiaDuKien && item.donGiaDuKien > 0) ? item.donGiaDuKien : (item.donGiaThucTe || 0);
                    const estLine = qty * unitPrice;
                    const actLine = item.donGiaThucTe !== null && item.donGiaThucTe !== undefined
                      ? qty * item.donGiaThucTe
                      : null;
                    return (
                      <tr key={index}>
                        <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}>
                          {item.stt || index + 1}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '6px 8px' }}>
                          <div style={{ fontWeight: 'bold' }}>{item.tenVatTu}</div>
                          {item.yeuCauKiThuat && (
                            <div style={{ fontSize: '9.5pt', color: '#333' }}>YCKT: {item.yeuCauKiThuat}</div>
                          )}
                          {item.phongBanSuDung && (
                            <div style={{ fontSize: '9.5pt', color: '#555', fontStyle: 'italic' }}>Bộ phận SD: {item.phongBanSuDung}</div>
                          )}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontWeight: 'bold' }}>
                          {qty}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'right' }}>
                          {formatCurrency(unitPrice)}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'right', fontWeight: 'bold' }}>
                          {formatCurrency(estLine)}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'right' }}>
                          {actLine !== null ? (
                            <strong>{formatCurrency(actLine)}</strong>
                          ) : (
                            <span style={{ color: '#777', fontStyle: 'italic' }}>—</span>
                          )}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '6px 6px', fontSize: '9.5pt' }}>
                          {item.nhaCungCap || item.ghiChuNhaCungCap || '—'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} style={{ border: '1px solid #000', padding: '12px', textAlign: 'center' }}>
                      Chưa có vật tư nào trong danh sách.
                    </td>
                  </tr>
                )}

                {/* Hàng tổng cộng */}
                <tr style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>
                  <td colSpan={3} style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right' }}>
                    TỔNG CỘNG TIỀN:
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'center' }}>—</td>
                  <td style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'right', fontSize: '11pt' }}>
                    {formatCurrency(totalEstimated)}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'right', fontSize: '11pt' }}>
                    {proposal.totalActualAmount !== null && proposal.totalActualAmount !== undefined
                      ? formatCurrency(proposal.totalActualAmount)
                      : 'Chưa chốt'}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Dòng số tiền bằng chữ */}
            <div style={{ margin: '10px 0 25px 0', fontSize: '11pt', fontStyle: 'italic' }}>
              <strong>Số tiền bằng chữ (dự kiến):</strong> {numberToVietnameseWords(totalEstimated)}
            </div>

            {/* PHẦN KÝ: 2 chỗ ký cơ bản (Người đề xuất & Người phê duyệt) */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '30px' }}>
              <tbody>
                <tr>
                  {/* Cột 1: Người đề xuất */}
                  <td style={{ width: '50%', verticalAlign: 'top', textAlign: 'center', border: 'none', padding: '0 10px' }}>
                    <div style={{ fontSize: '11pt', fontStyle: 'italic', marginBottom: '6px' }}>
                      Hà Nội, {creatorDate}
                    </div>
                    <div style={{ fontSize: '12pt', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                      NGƯỜI LÀM ĐỀ XUẤT
                    </div>
                    <div style={{ fontSize: '10pt', fontStyle: 'italic', color: '#555', marginBottom: '70px' }}>
                      (Ký và ghi rõ họ tên)
                    </div>
                    <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>
                      {proposal.creator?.fullName || 'Người đề xuất'}
                    </div>
                    <div style={{ fontSize: '10.5pt', fontStyle: 'italic', color: '#444' }}>
                      {getRoleLabel(proposal.creator?.role)}
                    </div>
                  </td>

                  {/* Cột 2: Người phê duyệt */}
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
