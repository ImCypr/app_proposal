import api from './api';
import { PaymentProposal, CreatePaymentProposalDto } from '../models';

export const paymentProposalService = {
  // Lấy danh sách đề xuất thanh toán (hỗ trợ lọc theo purchaseProposalId hoặc status)
  getAll: async (params?: { purchaseProposalId?: string; status?: string }): Promise<PaymentProposal[]> => {
    const res = await api.get<{ success: boolean; data: PaymentProposal[] }>('/payment-proposals', {
      params,
    });
    return res.data.data;
  },

  // Lấy chi tiết đề xuất thanh toán theo ID
  getById: async (id: string): Promise<PaymentProposal> => {
    const res = await api.get<{ success: boolean; data: PaymentProposal }>(`/payment-proposals/${id}`);
    return res.data.data;
  },

  // Kế toán tạo đề xuất thanh toán mới gắn với đơn mua sắm vật tư
  create: async (data: CreatePaymentProposalDto): Promise<PaymentProposal> => {
    const res = await api.post<{ success: boolean; data: PaymentProposal }>('/payment-proposals', data);
    return res.data.data;
  },

  // Lãnh đạo phê duyệt chi (Giám đốc hoặc Chủ tịch)
  approve: async (id: string, comment?: string): Promise<PaymentProposal> => {
    const res = await api.put<{ success: boolean; data: PaymentProposal }>(`/payment-proposals/${id}/approve`, {
      comment,
    });
    return res.data.data;
  },

  // Lãnh đạo từ chối đề xuất thanh toán
  reject: async (id: string, reason: string): Promise<PaymentProposal> => {
    const res = await api.put<{ success: boolean; data: PaymentProposal }>(`/payment-proposals/${id}/reject`, {
      reason,
    });
    return res.data.data;
  },

  // Kế toán xác nhận giải ngân chuyển tiền
  disburse: async (
    id: string,
    data: { transactionCode?: string; note?: string; receiptAttachment?: any }
  ): Promise<PaymentProposal> => {
    const res = await api.put<{ success: boolean; data: PaymentProposal }>(
      `/payment-proposals/${id}/disburse`,
      data
    );
    return res.data.data;
  },
};
