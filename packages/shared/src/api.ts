import type {
  ClientStatus,
  LeadActivityEventType,
  LeadNoteType,
  LeadPriority,
  LeadStage,
  ProjectActivityEventType,
  ProjectStatus
} from "@belovedops/domain";

export type ActivityEventType = LeadActivityEventType | ProjectActivityEventType;

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
  entityType: "lead" | "project";
  entityId: string;
  eventType: ActivityEventType;
  metadataJson: Record<string, unknown>;
  createdAt: string;
};

export type ProjectDto = {
  id: string;
  tenantId: string;
  clientId: string;
  sourceLeadId: string | null;
  name: string;
  status: ProjectStatus;
  description: string | null;
  scopeSummary: string | null;
  budgetAmount: number | null;
  currency: string;
  startDate: string | null;
  targetLaunchDate: string | null;
  launchedAt: string | null;
  completedAt: string | null;
  repoUrl: string | null;
  stagingUrl: string | null;
  productionUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectListItemDto = ProjectDto & {
  client: ClientDto;
};

export type ProjectListResponse = {
  projects: ProjectListItemDto[];
};

export type ProjectDetailDto = {
  project: ProjectDto;
  client: ClientDto;
  sourceLead: LeadDto | null;
  activity: ActivityEventDto[];
};

export type CreateProjectRequest = {
  clientId: string;
  sourceLeadId?: string | null;
  name: string;
  status?: ProjectStatus;
  description?: string | null;
  scopeSummary?: string | null;
  budgetAmount?: number | null;
  currency?: string;
  startDate?: string | null;
  targetLaunchDate?: string | null;
  repoUrl?: string | null;
  stagingUrl?: string | null;
  productionUrl?: string | null;
};

export type UpdateProjectRequest = Partial<Omit<CreateProjectRequest, "clientId">>;

export type UpdateProjectStatusRequest = {
  status: ProjectStatus;
};

export type ClientDto = {
  id: string;
  tenantId: string;
  name: string;
  companyName: string | null;
  websiteUrl: string | null;
  sourceLeadId: string | null;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
};

export type ClientContactDto = {
  id: string;
  tenantId: string;
  clientId: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ClientListItemDto = ClientDto & {
  primaryContact: ClientContactDto | null;
};

export type ClientListResponse = {
  clients: ClientListItemDto[];
};

export type ClientDetailDto = {
  client: ClientDto;
  contacts: ClientContactDto[];
  sourceLead: LeadDto | null;
  projects: ProjectDto[];
};

export type ConvertLeadToClientResponse = {
  lead: LeadDto;
  client: ClientDto;
  primaryContact: ClientContactDto | null;
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
  activeProjects: number;
  projectsInReview: number;
  launchesUpcoming: number;
  recentActivity: ActivityEventDto[];
};
