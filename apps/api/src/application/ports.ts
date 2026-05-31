import type {
  ActivityEventDto,
  ClientDetailDto,
  ClientDto,
  ClientListItemDto,
  ConvertLeadToClientResponse,
  CreateProjectRequest,
  CreateLeadFollowUpRequest,
  CreateLeadNoteRequest,
  CreateLeadRequest,
  DashboardSummaryDto,
  LeadDetailDto,
  LeadDto,
  LeadFollowUpDto,
  LeadNoteDto,
  ProjectDetailDto,
  ProjectDto,
  ProjectListItemDto,
  UpdateProjectRequest,
  UpdateLeadRequest
} from "@belovedops/shared";
import type {
  LeadActivityEventType,
  LeadPriority,
  LeadStage,
  ProjectActivityEventType,
  ProjectStatus
} from "@belovedops/domain";

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
  entityType: "lead" | "project";
  entityId: string;
  eventType: LeadActivityEventType | ProjectActivityEventType;
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
  markLeadConverted(
    context: TenantContext,
    leadId: string,
    clientId: string
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

export type CreateClientFromLeadInput = {
  name: string;
  companyName: string | null;
  websiteUrl: string | null;
  sourceLeadId: string;
};

export type CreatePrimaryContactInput = {
  clientId: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
};

export type ClientRepository = {
  listClients(context: TenantContext): Promise<ClientListItemDto[]>;
  getClientDetail(context: TenantContext, clientId: string): Promise<ClientDetailDto | null>;
  createClientFromLead(context: TenantContext, input: CreateClientFromLeadInput): Promise<ClientDto>;
  createPrimaryContactFromLead(
    context: TenantContext,
    input: CreatePrimaryContactInput
  ): Promise<ConvertLeadToClientResponse["primaryContact"]>;
};

export type NormalizedCreateProjectInput = Required<
  Omit<CreateProjectRequest, "status">
> & {
  status: ProjectStatus;
};

export type ProjectRepository = {
  listProjects(context: TenantContext): Promise<ProjectListItemDto[]>;
  listProjectsForClient(context: TenantContext, clientId: string): Promise<ProjectDto[]>;
  getProjectDetail(context: TenantContext, projectId: string): Promise<ProjectDetailDto | null>;
  getProjectById(context: TenantContext, projectId: string): Promise<ProjectDto | null>;
  createProject(context: TenantContext, input: NormalizedCreateProjectInput): Promise<ProjectDto>;
  updateProject(
    context: TenantContext,
    projectId: string,
    input: UpdateProjectRequest
  ): Promise<ProjectDto | null>;
  updateProjectStatus(
    context: TenantContext,
    projectId: string,
    status: ProjectStatus
  ): Promise<ProjectDto | null>;
  createActivity(context: TenantContext, input: ActivityEventInput): Promise<ActivityEventDto>;
};

export type TransactionRepositories = {
  leads: LeadRepository;
  clients: ClientRepository;
  projects: ProjectRepository;
};

export type UnitOfWork = {
  transaction<T>(work: (repositories: TransactionRepositories) => Promise<T>): Promise<T>;
};

export type ApplicationDependencies = {
  leads: LeadRepository;
  clients: ClientRepository;
  projects: ProjectRepository;
  unitOfWork: UnitOfWork;
};
