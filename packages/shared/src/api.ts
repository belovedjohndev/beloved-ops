import type {
  LeadActivityEventType,
  LeadNoteType,
  LeadPriority,
  LeadStage
} from "@belovedops/domain";

export type LeadDto = {
  id: string;
  tenantId: string;
  title: string;
  source: string | null;
  clientName: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  companyName: string | null;
  websiteUrl: string | null;
  platformUrl: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  currency: string;
  fitScore: number;
  stage: LeadStage;
  priority: LeadPriority;
  nextFollowUpAt: string | null;
  lostReason: string | null;
  wonClientId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeadNoteDto = {
  id: string;
  tenantId: string;
  leadId: string;
  authorUserId: string;
  noteType: LeadNoteType;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type LeadFollowUpDto = {
  id: string;
  tenantId: string;
  leadId: string;
  title: string;
  dueAt: string;
  completedAt: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type ActivityEventDto = {
  id: string;
  tenantId: string;
  actorUserId: string;
  entityType: "lead";
  entityId: string;
  eventType: LeadActivityEventType;
  metadataJson: Record<string, unknown>;
  createdAt: string;
};

export type LeadDetailDto = {
  lead: LeadDto;
  notes: LeadNoteDto[];
  followUps: LeadFollowUpDto[];
  activity: ActivityEventDto[];
};

export type LeadListResponse = {
  leads: LeadDto[];
};

export type CreateLeadRequest = {
  title: string;
  source?: string | null;
  clientName?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  companyName?: string | null;
  websiteUrl?: string | null;
  platformUrl?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string;
  fitScore?: number;
  priority?: LeadPriority;
};

export type UpdateLeadRequest = Partial<CreateLeadRequest> & {
  lostReason?: string | null;
};

export type UpdateLeadStageRequest = {
  stage: LeadStage;
  lostReason?: string | null;
};

export type CreateLeadNoteRequest = {
  noteType: LeadNoteType;
  body: string;
};

export type CreateLeadFollowUpRequest = {
  title: string;
  dueAt: string;
};

export type DashboardSummaryDto = {
  openLeads: number;
  hotLeads: number;
  followUpsDueToday: number;
  overdueFollowUps: number;
  wonLeadsThisMonth: number;
  lostLeadsThisMonth: number;
  recentActivity: ActivityEventDto[];
};
