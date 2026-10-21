import { BankAccount, User } from './auth.model';
import { Department } from './department.model';
import { ApprovalStep, Disbursement } from './purchaseProposal.model';

export interface AdvanceItem {
  _id?: string;
  stt: number;
  mucDich: string;
  soTien: number;
}

export type SettlementType = 'surplus' | 'deficit' | 'exact';

export interface SettlementAttachment {
  name: string;
  url: string;
  size?: number;
  type?: string;
}

export interface SettlementData {
  type: SettlementType;
  amount?: number | null;
  invoiceAmount?: number | null;
  advanceAmount?: number | null;
  diffAmount?: number | null;
  requestedBy?: User | { _id: string; fullName: string } | null;
  requestedAt?: string | null;
  accountantNote?: string;
  purchaserConfirmed?: boolean;
  purchaserConfirmType?: 'received_additional' | 'refunded_surplus' | 'exact_matched' | null;
  purchaserConfirmProof?: Array<{ name: string; url: string; size?: number; type?: string }>;
  purchaserNote?: string;
  purchaserConfirmedAt?: string | null;
  attachments?: SettlementAttachment[];
  note?: string;
  submittedAt?: string | null;
  confirmedAt?: string | null;
  confirmedBy?: User | { _id: string; fullName: string } | null;
}

export type AdvanceProposalStatus =
  | 'draft'
  | 'pending_director'
  | 'pending_chairman'
  | 'pending_accounting'
  | 'accounting_approved'
  | 'disbursing'
  | 'disbursed'
  | 'pending_settlement'
  | 'settlement_submitted'
  | 'completed'
  | 'rejected'
  | 'rejected_by_director'
  | 'rejected_by_chairman'
  | 'rejected_by_accounting'
  | 'rejected_settlement';

export interface AdvanceProposal {
  _id: string;
  proposalCode: string;
  creator: User;
  department: Department;
  bankAccount: BankAccount;
  items: AdvanceItem[];
  totalAmount: number;
  status: AdvanceProposalStatus;
  currentApprovalRole?: string | null;
  approvalFlow: ApprovalStep[];
  disbursements: Disbursement[];
  totalDisbursed: number;
  settlement?: SettlementData;
  rejectionReason?: string;
  // [LUỒNG MỚI] Liên kết với đề xuất mua sắm
  purchaseProposal?: any;
  // [LUỒNG MỚI] Thông tin Hợp đồng kinh tế gắn với đợt tạm ứng (tạm ứng hợp đồng)
  contractInfo?: {
    contractNumber?: string;
    partnerName?: string;
    contractAmount?: number;
    files?: Array<{ name: string; url: string; size?: number; type?: string }>;
  };
  // [LUỒNG MỚI] Thông tin Hóa đơn thụ hưởng gắn với đợt tạm ứng (tra cứu 2 chiều)
  beneficiaryInvoice?: {
    purchaseProposal?: any;
    proposalCode?: string;
    invoiceDate?: string | null;
    invoiceAmount?: number;
    files?: Array<{ name: string; url: string; size?: number; type?: string }>;
    note?: string;
    actualInvoiceDate?: string | null;
    actualInvoiceAmount?: number | null;
    actualInvoiceFiles?: Array<{ name: string; url: string; size?: number; type?: string }>;
    actualSubmittedAt?: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdvanceProposalDto {
  bankAccount?: BankAccount;
  items: Array<{
    stt: number;
    mucDich: string;
    soTien: number;
  }>;
  // [LUỒNG MỚI] Liên kết với đề xuất mua sắm
  purchaseProposal?: string;
  // [LUỒNG MỚI] Gắn thông tin hợp đồng tạm ứng
  contractInfo?: {
    contractNumber?: string;
    partnerName?: string;
    contractAmount?: number;
    files?: Array<{ name: string; url: string; size?: number; type?: string }>;
  };
  // [LUỒNG MỚI] Gắn thông tin Hóa đơn thụ hưởng
  beneficiaryInvoice?: {
    purchaseProposal?: string;
    proposalCode?: string;
    invoiceDate?: string | null;
    invoiceAmount?: number;
    files?: Array<{ name: string; url: string; size?: number; type?: string }>;
    note?: string;
  };
}

export interface SubmitSettlementDto {
  type?: SettlementType;
  amount?: number;
  actualInvoiceDate?: string;
  actualInvoiceAmount?: number;
  actualInvoiceFiles?: SettlementAttachment[];
  purchaserConfirmType?: 'received_additional' | 'refunded_surplus' | 'exact_matched';
  purchaserConfirmProof?: SettlementAttachment[];
  purchaserNote?: string;
  attachments?: SettlementAttachment[];
  note?: string;
}

