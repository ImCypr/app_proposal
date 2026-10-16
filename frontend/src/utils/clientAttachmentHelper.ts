import { uploadService } from '../services/uploadService';

export interface LocalAttachment {
  file?: File;
  name: string;
  url: string;
  size: number;
  type: string;
  isLocal?: boolean;
  capturedAt?: string;    // Ngày giờ chụp ảnh chứng từ (ISO string)
  selectedPrice?: number; // Mức giá khảo sát đã chọn
  supplierName?: string;  // Tên nhà cung cấp
  sourceUrl?: string;     // Link tham khảo
}

/**
 * Tạo danh sách LocalAttachment từ FileList / File[]
 * Tệp được lưu tạm trong bộ nhớ máy khách và tạo blob URL để xem trước ngay tức thì
 */
export function createLocalAttachments(
  files: File[],
  extra?: Partial<LocalAttachment>
): { attachments: LocalAttachment[]; oversizedCount: number } {
  const maxBytes = 15 * 1024 * 1024; // 15MB
  const validFiles: File[] = [];
  let oversizedCount = 0;

  files.forEach((f) => {
    if (f.size > maxBytes) {
      oversizedCount++;
    } else {
      validFiles.push(f);
    }
  });

  const attachments: LocalAttachment[] = validFiles.map((f) => ({
    file: f,
    name: f.name,
    url: URL.createObjectURL(f),
    size: f.size,
    type: f.type || 'application/octet-stream',
    isLocal: true,
    ...extra,
  }));

  return { attachments, oversizedCount };
}

/**
 * Thu hồi Object URL của tệp cục bộ khi người dùng bấm xóa
 */
export function revokeLocalAttachment(att: LocalAttachment) {
  if (att.isLocal && att.url && att.url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(att.url);
    } catch (e) {
      // bỏ qua lỗi revoke
    }
  }
}

/**
 * Tải tất cả các tệp đang lưu cục bộ lên server khi người dùng bấm GỬI đơn
 * Trả về danh sách attachments với URL chính thức trên máy chủ
 */
export async function uploadPendingLocalAttachments(
  attachments: LocalAttachment[]
): Promise<LocalAttachment[]> {
  if (!attachments || attachments.length === 0) return [];

  // Tách các tệp cần upload lên server
  const filesToUpload: File[] = [];
  const localIndices: number[] = [];

  attachments.forEach((att, idx) => {
    if (att.isLocal && att.file) {
      filesToUpload.push(att.file);
      localIndices.push(idx);
    }
  });

  // Nếu không có tệp cục bộ nào cần upload thì trả về nguyên vẹn
  if (filesToUpload.length === 0) {
    return attachments.map((att) => ({ ...att, isLocal: false }));
  }

  // Gọi API upload nhiều tệp lên máy chủ
  const uploadedResults = await uploadService.uploadFiles(filesToUpload);

  const finalAttachments: LocalAttachment[] = [...attachments];

  localIndices.forEach((targetIndex, i) => {
    const uploaded = uploadedResults[i];
    const prev = attachments[targetIndex];

    if (uploaded) {
      // Thu hồi Blob URL cũ
      revokeLocalAttachment(prev);

      finalAttachments[targetIndex] = {
        ...prev,
        url: uploaded.url,
        name: uploaded.name || prev.name,
        size: uploaded.size || prev.size,
        type: uploaded.type || prev.type,
        isLocal: false,
        file: undefined, // Giải phóng đối tượng File khỏi bộ nhớ
      };
    }
  });

  return finalAttachments;
}

/**
 * Tạo chứng từ ảnh khảo giá chuyên nghiệp (Price Verification Proof) bằng HTML5 Canvas
 * Đóng dấu đầy đủ: Tên vật tư, Tên nhà cung cấp, Mức giá đã chọn, Ngày giờ và thời gian chụp chính xác
 */
export async function generatePriceProofCanvas(options: {
  itemName: string;
  itemQuantity?: number;
  supplierName: string;
  price: number;
  sourceUrl?: string;
  capturedAtDate?: Date;
  customSnapshotBlob?: Blob;
}): Promise<File> {
  const {
    itemName,
    itemQuantity = 1,
    supplierName,
    price,
    sourceUrl = '',
    capturedAtDate = new Date(),
    customSnapshotBlob,
  } = options;

  const width = 1200;
  const height = 750;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Trình duyệt không hỗ trợ Canvas 2D');
  }

  // 1. Vẽ nền gradient sang trọng (dark theme)
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0f172a');
  bgGrad.addColorStop(1, '#1e293b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Viền ngoài bo góc
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#38bdf8';
  ctx.strokeRect(16, 16, width - 32, height - 32);

  // 3. Header dải màu
  const headerGrad = ctx.createLinearGradient(16, 16, width - 16, 100);
  headerGrad.addColorStop(0, '#1e1b4b');
  headerGrad.addColorStop(1, '#312e81');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(20, 20, width - 40, 110);

  // Đường line chân header
  ctx.fillStyle = '#6366f1';
  ctx.fillRect(20, 126, width - 40, 4);

  // Text Header
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM - ĐỘC LẬP TỰ DO HẠNH PHÚC', 40, 56);

  ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('PHIẾU CHỨNG TỪ XÁC THỰC KHẢO GIÁ TRỰC TUYẾN', 40, 100);

  // Định dạng ngày giờ chụp chính xác
  const pad = (n: number) => String(n).padStart(2, '0');
  const d = capturedAtDate;
  const dateFormatted = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const timeFormatted = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const fullTimestamp = `${timeFormatted} Ngày ${dateFormatted}`;

  // Huy hiệu Thời gian chụp ở góc phải
  ctx.fillStyle = '#065f46';
  ctx.fillRect(width - 420, 40, 390, 70);
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2;
  ctx.strokeRect(width - 420, 40, 390, 70);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#a7f3d0';
  ctx.fillText('THỜI GIAN CHỤP BẰNG CHỨNG XÁC THỰC:', width - 405, 64);
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`🕒 ${fullTimestamp}`, width - 405, 94);

  // 4. Khối nội dung chính
  // Cột trái: Thông tin khảo giá
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.fillRect(40, 150, 680, 540);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.strokeRect(40, 150, 680, 540);

  // Tiêu đề khối thông tin
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('CHI TIẾT MỤC VẬT TƯ & NHÀ CUNG CẤP KHẢO SÁT', 60, 185);
  ctx.fillRect(60, 195, 640, 1);

  // Dòng: Vật tư
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Hạng mục vật tư:', 60, 230);
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(itemName.length > 40 ? itemName.slice(0, 38) + '...' : itemName, 60, 260);

  // Dòng: Số lượng
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Số lượng thẩm định:', 60, 305);
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(`${itemQuantity} đơn vị`, 60, 335);

  // Dòng: Nhà cung cấp
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Nhà cung cấp / Đối tác khảo sát:', 60, 380);
  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(`🏢 ${supplierName}`, 60, 415);

  // Khối nổi bật: Đơn giá đã chọn
  ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
  ctx.fillRect(60, 445, 640, 110);
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 445, 640, 110);

  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = '#10b981';
  ctx.fillText('MỨC GIÁ ĐÃ ĐƯỢC CHỌN KHẢO SÁT (ĐƠN GIÁ THỰC TẾ):', 80, 478);

  const formattedPrice = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  ctx.font = 'bold 36px "Courier New", monospace, sans-serif';
  ctx.fillStyle = '#34d399';
  ctx.fillText(formattedPrice, 80, 526);

  // Dòng: Link tham khảo
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Link tham khảo đối tác khảo giá:', 60, 590);
  ctx.font = '14px "Courier New", monospace';
  ctx.fillStyle = '#60a5fa';
  const displayUrl = sourceUrl.length > 70 ? sourceUrl.slice(0, 68) + '...' : (sourceUrl || 'Không có URL trực tiếp');
  ctx.fillText(displayUrl, 60, 615);

  // Chú thích thẩm tra
  ctx.font = 'italic 13px sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('• Bằng chứng được lưu tự động từ khâu khảo sát của bộ phận Thu Mua.', 60, 660);

  // Cột phải: Dấu mộc thẩm định điện tử & Khung snapshot
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.fillRect(740, 150, 420, 540);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.strokeRect(740, 150, 420, 540);

  if (customSnapshotBlob) {
    try {
      const img = new Image();
      const objUrl = URL.createObjectURL(customSnapshotBlob);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = objUrl;
      });
      ctx.drawImage(img, 755, 165, 390, 270);
      URL.revokeObjectURL(objUrl);
    } catch (e) {
      // Fallback nếu không load được snapshot
    }
  } else {
    // Khung mô phỏng trình duyệt web
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(755, 165, 390, 270);
    ctx.strokeStyle = '#475569';
    ctx.strokeRect(755, 165, 390, 270);

    // Thanh browser bar
    ctx.fillStyle = '#334155';
    ctx.fillRect(755, 165, 390, 32);

    // 3 nút window
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(770, 181, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(785, 181, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(800, 181, 5, 0, Math.PI * 2);
    ctx.fill();

    // Text URL thanh trình duyệt
    ctx.font = '11px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('https://' + (supplierName.toLowerCase().replace(/\s+/g, '') + '.com.vn/san-pham'), 815, 185);

    // Biểu tượng web preview
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('🌐 BẰNG CHỨNG BÁO GIÁ', 830, 250);

    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(supplierName, 830, 290);

    ctx.font = 'bold 26px monospace';
    ctx.fillStyle = '#10b981';
    ctx.fillText(formattedPrice, 830, 335);

    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`Thời điểm ghi nhận: ${timeFormatted}`, 830, 375);
    ctx.fillText(`Ngày: ${dateFormatted}`, 830, 400);
  }

  // Dấu mộc thẩm định tròn (Verification Stamp)
  const stampX = 950;
  const stampY = 560;
  const stampR = 90;

  ctx.save();
  ctx.translate(stampX, stampY);
  ctx.rotate(-0.15); // nghiêng nhẹ như con dấu đóng thật

  // Vòng tròn ngoài con dấu
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, stampR, 0, Math.PI * 2);
  ctx.stroke();

  // Vòng tròn trong
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, stampR - 8, 0, Math.PI * 2);
  ctx.stroke();

  // Text con dấu
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#ef4444';
  ctx.textAlign = 'center';
  ctx.fillText('BỘ PHẬN THU MUA - TGA', 0, -50);
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('★ ĐÃ THẨM TRA GIÁ ★', 0, -25);
  ctx.font = 'bold 20px monospace';
  ctx.fillText('XÁC THỰC', 0, 5);
  ctx.font = '11px sans-serif';
  ctx.fillText(`NGÀY ${dateFormatted}`, 0, 30);
  ctx.fillText(`${timeFormatted}`, 0, 48);
  ctx.restore();

  // Chuyển canvas thành Blob/File
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Không thể xuất ảnh chứng từ'));
        return;
      }
      const safeName = supplierName.replace(/[^a-zA-Z0-9]/g, '_');
      const safeItem = itemName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
      const fileName = `ChungTu_KhaoGia_${safeName}_${safeItem}_${d.getTime()}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });
      resolve(file);
    }, 'image/png', 0.95);
  });
}

/**
 * Đóng dấu ghi chú xác thực thẩm định giá lên ẢNH CHỤP MÀN HÌNH THỰC TẾ
 * Ghi chú rõ: Mức giá tại thời điểm chụp, Ngày giờ & thời gian chụp, Tên nhà cung cấp, Tên vật tư và URL nguồn.
 */
export async function stampProofWatermarkOnImage(
  imageSource: Blob | File,
  options: {
    itemName: string;
    itemQuantity?: number;
    supplierName: string;
    price: number;
    sourceUrl?: string;
    capturedAtDate?: Date;
  }
): Promise<File> {
  const {
    itemName,
    itemQuantity = 1,
    supplierName,
    price,
    sourceUrl = '',
    capturedAtDate = new Date(),
  } = options;

  // Tải ảnh chụp màn hình thực tế
  const img = new Image();
  const objUrl = URL.createObjectURL(imageSource);
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Không thể đọc dữ liệu ảnh chụp màn hình'));
    img.src = objUrl;
  });
  URL.revokeObjectURL(objUrl);

  const imgW = img.naturalWidth || img.width || 1280;
  const imgH = img.naturalHeight || img.height || 720;

  // Thanh ghi chú dưới chân ảnh có chiều cao tỷ lệ với kích thước ảnh (khoảng 80px - 110px)
  const bannerH = Math.max(80, Math.min(125, Math.round(imgH * 0.11)));
  const totalW = imgW;
  const totalH = imgH + bannerH;

  const canvas = document.createElement('canvas');
  canvas.width = totalW;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Trình duyệt không hỗ trợ Canvas 2D');
  }

  // 1. Vẽ nguyên vẹn bức ảnh chụp màn hình thực tế của trang web
  ctx.drawImage(img, 0, 0, imgW, imgH);

  // 2. Vẽ thanh banner ghi chú ở chân ảnh (Footer Banner)
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, imgH, totalW, bannerH);

  // Đường viền ngăn cách giữa ảnh và thanh ghi chú
  const lineGrad = ctx.createLinearGradient(0, imgH, totalW, imgH);
  lineGrad.addColorStop(0, '#10b981');
  lineGrad.addColorStop(0.5, '#38bdf8');
  lineGrad.addColorStop(1, '#6366f1');
  ctx.fillStyle = lineGrad;
  ctx.fillRect(0, imgH, totalW, 4);

  // Định dạng ngày giờ chụp chính xác
  const pad = (n: number) => String(n).padStart(2, '0');
  const d = capturedAtDate;
  const dateFormatted = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const timeFormatted = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const formattedPrice = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  // Tỷ lệ font chữ theo chiều rộng ảnh
  const scale = Math.max(0.75, Math.min(1.4, totalW / 1200));

  // Cột trái: Nhãn chứng cứ & Thông tin vật tư
  const padLeft = Math.round(24 * scale);
  const titleY = imgH + Math.round(26 * scale);
  const infoY = imgH + Math.round(50 * scale);
  const urlY = imgH + Math.round(72 * scale);

  // Dấu chấm đỏ ghi hình thực tế
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(padLeft + 6, titleY - 5, 5 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = `bold ${Math.round(14 * scale)}px sans-serif`;
  ctx.fillStyle = '#f87171';
  ctx.fillText('ẢNH CHỤP MÀN HÌNH CHỨNG CỨ KHẢO GIÁ THỰC TẾ', padLeft + 18, titleY);

  ctx.font = `bold ${Math.round(15 * scale)}px sans-serif`;
  ctx.fillStyle = '#ffffff';
  const cleanItem = itemName.length > 45 ? itemName.slice(0, 42) + '...' : itemName;
  ctx.fillText(`Vật tư: ${cleanItem} (${itemQuantity} đơn vị)  •  Đối tác: ${supplierName}`, padLeft + 18, infoY);

  ctx.font = `${Math.round(11 * scale)}px monospace`;
  ctx.fillStyle = '#94a3b8';
  const cleanUrl = sourceUrl.length > 80 ? sourceUrl.slice(0, 78) + '...' : (sourceUrl || 'URL trực tiếp từ website');
  ctx.fillText(`Nguồn tham khảo: ${cleanUrl}`, padLeft + 18, urlY);

  // Cột phải: Giá tại thời điểm chụp & Thời gian chụp
  const padRight = totalW - Math.round(24 * scale);
  ctx.textAlign = 'right';

  // Hộp giá nổi bật
  const priceY = imgH + Math.round(28 * scale);
  ctx.font = `bold ${Math.round(13 * scale)}px sans-serif`;
  ctx.fillStyle = '#10b981';
  ctx.fillText('GIÁ TẠI THỜI ĐIỂM CHỤP:', padRight, priceY);

  ctx.font = `bold ${Math.round(24 * scale)}px "Courier New", monospace`;
  ctx.fillStyle = '#34d399';
  ctx.fillText(formattedPrice, padRight, priceY + Math.round(24 * scale));

  // Thời gian chụp
  ctx.font = `bold ${Math.round(13 * scale)}px sans-serif`;
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(`🕒 THỜI GIAN CHỤP: ${timeFormatted}  NGÀY ${dateFormatted}`, padRight, priceY + Math.round(45 * scale));

  // Khôi phục textAlign mặc định
  ctx.textAlign = 'left';

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Không thể xuất ảnh chụp màn hình có ghi chú'));
        return;
      }
      const safeName = supplierName.replace(/[^a-zA-Z0-9]/g, '_');
      const safeItem = itemName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 15);
      const fileName = `AnhCap_KhaoGia_${safeName}_${safeItem}_${d.getTime()}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });
      resolve(file);
    }, 'image/png', 0.95);
  });
}

