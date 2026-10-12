const { researchPrice } = require('../services/aiSearchService');

/**
 * Chuẩn hóa vật tư từ request body theo cấu trúc vật tư đề xuất mua sắm
 */
function normalizeItem(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const tenVatTu = (raw.tenVatTu || raw.name || '').trim();
  const yeuCauKiThuat = (raw.yeuCauKiThuat || raw.description || '').trim();
  const soLuong = raw.soLuong !== undefined ? Number(raw.soLuong) : (raw.quantity !== undefined ? Number(raw.quantity) : undefined);
  const donGiaDuKien = raw.donGiaDuKien !== undefined ? Number(raw.donGiaDuKien) : undefined;
  const phongBanSuDung = (raw.phongBanSuDung || raw.location || '').trim();
  const stt = raw.stt !== undefined ? Number(raw.stt) : undefined;

  return {
    stt,
    tenVatTu,
    yeuCauKiThuat,
    soLuong,
    donGiaDuKien,
    phongBanSuDung,
  };
}

/**
 * Controller khảo giá AI cho vật tư đề xuất mua sắm
 * Trả về JSON gọn gàng gồm: name (Tên nhà cung cấp), price (Giá), url (Link website)
 */
async function createPriceResearch(req, res) {
  try {
    // 1. Trường hợp gửi danh sách nhiều vật tư: { items: [...] }
    if (Array.isArray(req.body.items)) {
      if (req.body.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Danh sách vật tư không được để trống.',
        });
      }

      const results = [];
      for (const rawItem of req.body.items) {
        const item = normalizeItem(rawItem);
        if (item && item.tenVatTu) {
          const suppliers = await researchPrice(item);
          results.push({
            stt: item.stt,
            tenVatTu: item.tenVatTu,
            suppliers,
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Khảo giá danh sách vật tư thành công.',
        data: results,
      });
    }

    // 2. Trường hợp gửi 1 vật tư đơn lẻ
    const item = normalizeItem(req.body);

    if (!item || !item.tenVatTu) {
      return res.status(400).json({
        success: false,
        message: 'Tên vật tư (tenVatTu) là bắt buộc.',
      });
    }

    const suppliers = await researchPrice(item);

    return res.status(200).json({
      success: true,
      message: 'Khảo giá vật tư thành công.',
      data: suppliers,
    });
  } catch (error) {
    console.error('Price research error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Không thể khảo giá vật tư lúc này.',
    });
  }
}

module.exports = {
  createPriceResearch,
};
