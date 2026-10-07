import { Role, User } from './auth.model';
import { Department } from './department.model';

export interface PurchaseItem {
  _id?: string;
  stt: number;
  tenVatTu: string;
  soLuong: number;
  donVi: string;
  donGiaDuDoan: number;
  donGiaThucTe?: number | null;
  yeuCau?: string;
}

export interface ApprovalStep {
  _id?: string;
  step: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  approver?: User | { _id: string; fullName: string; role: Role } | null;
  comment?: string;
  date?: string | null;
}

export interface Disbursement {
  _id?: string;
  amount: number;
  date: string;
  note?: string;
  processedBy?: User | { _id: string; fullName: string } | null;
}

export type PurchaseProposalStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved_initial'
  | 'procurement_review'
  | 'procurement_completed'
  | 'accounting_review'
  | 'pending_final_approval'
  | 'final_approved'
  | 'disbursing'
  | 'completed'
  | 'rejected';

export interface PurchaseProposal {
  _id: string;
  proposalCode: string;
  creator: User;
  department: Department;
  items: PurchaseItem[];
  totalEstimatedAmount: number;
  totalActualAmount?: number | null;
  status: PurchaseProposalStatus;
  currentApprovalRole?: string | null;
  approvalFlow: ApprovalStep[];
  disbursements: Disbursement[];
  totalDisbursed: number;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseProposalDto {
  items: Array<{
    stt: number;
    tenVatTu: string;
    soLuong: number;
    donVi: string;
    donGiaDuDoan: number;
    yeuCau?: string;
  }>;
}
