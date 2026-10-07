import api from './api';
import { CreatePurchaseProposalDto, PurchaseProposal } from '../models';

export const purchaseProposalService = {
  getAll: async (): Promise<PurchaseProposal[]> => {
    const res = await api.get<{ success: boolean; data: PurchaseProposal[] }>('/purchase-proposals');
    return res.data.data;
  },

  getById: async (id: string): Promise<PurchaseProposal> => {
    const res = await api.get<{ success: boolean; data: PurchaseProposal }>(`/purchase-proposals/${id}`);
    return res.data.data;
  },

  create: async (data: CreatePurchaseProposalDto): Promise<PurchaseProposal> => {
    const res = await api.post<{ success: boolean; data: PurchaseProposal }>('/purchase-proposals', data);
    return res.data.data;
  },

  approve: async (id: string, comment?: string): Promise<PurchaseProposal> => {
    const res = await api.put<{ success: boolean; data: PurchaseProposal }>(`/purchase-proposals/${id}/approve`, {
      comment,
    });
    return res.data.data;
  },

  reject: async (id: string, reason: string): Promise<PurchaseProposal> => {
    const res = await api.put<{ success: boolean; data: PurchaseProposal }>(`/purchase-proposals/${id}/reject`, {
      reason,
    });
    return res.data.data;
  },

  submitProcurement: async (
    id: string,
    items: Array<{ _id?: string; donGiaThucTe: number }>
  ): Promise<PurchaseProposal> => {
    const res = await api.put<{ success: boolean; data: PurchaseProposal }>(
      `/purchase-proposals/${id}/procurement`,
      { items }
    );
    return res.data.data;
  },

  accountingConfirm: async (id: string, comment?: string): Promise<PurchaseProposal> => {
    const res = await api.put<{ success: boolean; data: PurchaseProposal }>(
      `/purchase-proposals/${id}/accounting-confirm`,
      { comment }
    );
    return res.data.data;
  },

  finalApprove: async (id: string, comment?: string): Promise<PurchaseProposal> => {
    const res = await api.put<{ success: boolean; data: PurchaseProposal }>(
      `/purchase-proposals/${id}/final-approve`,
      { comment }
    );
    return res.data.data;
  },

  disburse: async (id: string, amount: number, note?: string): Promise<PurchaseProposal> => {
    const res = await api.put<{ success: boolean; data: PurchaseProposal }>(
      `/purchase-proposals/${id}/disburse`,
      { amount, note }
    );
    return res.data.data;
  },
};
