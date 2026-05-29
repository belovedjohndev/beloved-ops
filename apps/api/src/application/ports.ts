import type {
  ActivityEventDto,
  CreateLeadFollowUpRequest,
  CreateLeadNoteRequest,
  CreateLeadRequest,
  DashboardSummaryDto,
  LeadDetailDto,
  LeadDto,
  LeadFollowUpDto,
  LeadNoteDto,
  UpdateLeadRequest
} from "@belovedops/shared";
import type { LeadActivityEventType, LeadPriority, LeadStage } from "@belovedops/domain";

export type TenantRole = "owner" | "admin" | "member" | "viewer";

export type TenantContext = {
  tenantId: string;
  userId: string;
  role: TenantRole;
};

export type LeadFilters = {
  stage?: LeadStage;
  priority?: LeadPriority;
  search?: string;
};

export type NormalizedCreateLeadInput = Required<
  Omit<CreateLeadRequest, "priority">
> & {
  priority: LeadPriority;
};

export type NormalizedUpdateLeadInput = UpdateLeadRequest;

export type ActivityEventInput = {
  entityType: "lead";
  entityId: string;
  eventType: LeadActivityEventType;
  metadataJson: Record<string, unknown>;
};

export type LeadRepository = {
  listLeads(context: TenantContext, filters: LeadFilters): Promise<LeadDto[]>;
  getLeadById(context: TenantContext, leadId: string): Promise<LeadDto | null>;
  getLeadDetail(context: TenantContext, leadId: string): Promise<LeadDetailDto | null>;
  createLead(context: TenantContext, input: NormalizedCreateLeadInput): Promise<LeadDto>;
  updateLead(
    context: TenantContext,
    leadId: string,
    input: NormalizedUpdateLeadInput
  ): Promise<LeadDto | null>;
  updateLeadStage(
    context: TenantContext,
    leadId: string,
    stage: LeadStage,
    lostReason: string | null
  ): Promise<LeadDto | null>;
  addNote(
    context: TenantContext,
    leadId: string,
    input: CreateLeadNoteRequest
  ): Promise<LeadNoteDto>;
  scheduleFollowUp(
    context: TenantContext,
    leadId: string,
    input: CreateLeadFollowUpRequest
  ): Promise<LeadFollowUpDto>;
  completeFollowUp(
    context: TenantContext,
    leadId: string,
    followUpId: string
  ): Promise<LeadFollowUpDto | null>;
  refreshNextFollowUpAt(context: TenantContext, leadId: string): Promise<void>;
  createActivity(context: TenantContext, input: ActivityEventInput): Promise<ActivityEventDto>;
  getDashboardSummary(context: TenantContext): Promise<DashboardSummaryDto>;
};

export type TransactionRepositories = {
  leads: LeadRepository;
};

export type UnitOfWork = {
  transaction<T>(work: (repositories: TransactionRepositories) => Promise<T>): Promise<T>;
};

export type ApplicationDependencies = {
  leads: LeadRepository;
  unitOfWork: UnitOfWork;
};
