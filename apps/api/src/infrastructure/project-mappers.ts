import type {
  ActivityEventDto,
  ClientDto,
  LeadDto,
  ProjectDto
} from "@belovedops/shared";
import type {
  ClientStatus,
  LeadActivityEventType,
  LeadPriority,
  LeadStage,
  ProjectActivityEventType,
  ProjectStatus
} from "@belovedops/domain";

export type ClientRow = {
  id: string;
  tenant_id: string;
  name: string;
  company_name: string | null;
  website_url: string | null;
  source_lead_id: string | null;
  status: ClientStatus;
  created_at: Date;
  updated_at: Date;
};

export type ProjectRow = {
  id: string;
  tenant_id: string;
  client_id: string;
  source_lead_id: string | null;
  name: string;
  status: ProjectStatus;
  description: string | null;
  scope_summary: string | null;
  budget_amount: number | null;
  currency: string;
  start_date: Date | string | null;
  target_launch_date: Date | string | null;
  launched_at: Date | null;
  completed_at: Date | null;
  repo_url: string | null;
  staging_url: string | null;
  production_url: string | null;
  created_at: Date;
  updated_at: Date;
};

export type LeadRow = {
  id: string;
  tenant_id: string;
  title: string;
  source: string | null;
  client_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  company_name: string | null;
  website_url: string | null;
  platform_url: string | null;
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  fit_score: number;
  stage: LeadStage;
  priority: LeadPriority;
  next_follow_up_at: Date | null;
  lost_reason: string | null;
  won_client_id: string | null;
  created_at: Date;
  updated_at: Date;
};

export type ActivityRow = {
  id: string;
  tenant_id: string;
  actor_user_id: string;
  entity_type: "lead" | "project";
  entity_id: string;
  event_type: LeadActivityEventType | ProjectActivityEventType;
  metadata_json: Record<string, unknown>;
  created_at: Date;
};

export function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDateOnly(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  return value.slice(0, 10);
}

export function mapClient(row: ClientRow): ClientDto {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    companyName: row.company_name,
    websiteUrl: row.website_url,
    sourceLeadId: row.source_lead_id,
    status: row.status,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

export function mapProject(row: ProjectRow): ProjectDto {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    sourceLeadId: row.source_lead_id,
    name: row.name,
    status: row.status,
    description: row.description,
    scopeSummary: row.scope_summary,
    budgetAmount: row.budget_amount,
    currency: row.currency,
    startDate: toDateOnly(row.start_date),
    targetLaunchDate: toDateOnly(row.target_launch_date),
    launchedAt: row.launched_at ? toIso(row.launched_at) : null,
    completedAt: row.completed_at ? toIso(row.completed_at) : null,
    repoUrl: row.repo_url,
    stagingUrl: row.staging_url,
    productionUrl: row.production_url,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

export function mapLead(row: LeadRow): LeadDto {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    title: row.title,
    source: row.source,
    clientName: row.client_name,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    companyName: row.company_name,
    websiteUrl: row.website_url,
    platformUrl: row.platform_url,
    budgetMin: row.budget_min,
    budgetMax: row.budget_max,
    currency: row.currency,
    fitScore: row.fit_score,
    stage: row.stage,
    priority: row.priority,
    nextFollowUpAt: row.next_follow_up_at ? toIso(row.next_follow_up_at) : null,
    lostReason: row.lost_reason,
    wonClientId: row.won_client_id,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

export function mapActivity(row: ActivityRow): ActivityEventDto {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    actorUserId: row.actor_user_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    eventType: row.event_type,
    metadataJson: row.metadata_json,
    createdAt: toIso(row.created_at)
  };
}
