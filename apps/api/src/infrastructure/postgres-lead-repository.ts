import type { QueryResult, QueryResultRow } from "pg";
import type {
  ActivityEventDto,
  CreateLeadFollowUpRequest,
  CreateLeadNoteRequest,
  DashboardSummaryDto,
  LeadDetailDto,
  LeadDto,
  LeadFollowUpDto,
  LeadNoteDto,
  UpdateLeadRequest
} from "@belovedops/shared";
import type { LeadActivityEventType, LeadNoteType, LeadPriority, LeadStage } from "@belovedops/domain";
import type {
  ActivityEventInput,
  LeadFilters,
  LeadRepository,
  NormalizedCreateLeadInput,
  TenantContext
} from "../application/ports.js";

type DbExecutor = {
  query<Row extends QueryResultRow>(
    sql: string,
    values?: unknown[]
  ): Promise<QueryResult<Row>>;
};

type LeadRow = {
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

type NoteRow = {
  id: string;
  tenant_id: string;
  lead_id: string;
  author_user_id: string;
  note_type: LeadNoteType;
  body: string;
  created_at: Date;
  updated_at: Date;
};

type FollowUpRow = {
  id: string;
  tenant_id: string;
  lead_id: string;
  title: string;
  due_at: Date;
  completed_at: Date | null;
  created_by_user_id: string;
  created_at: Date;
  updated_at: Date;
};

type ActivityRow = {
  id: string;
  tenant_id: string;
  actor_user_id: string;
  entity_type: "lead";
  entity_id: string;
  event_type: LeadActivityEventType;
  metadata_json: Record<string, unknown>;
  created_at: Date;
};

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapLead(row: LeadRow): LeadDto {
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

function mapNote(row: NoteRow): LeadNoteDto {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    leadId: row.lead_id,
    authorUserId: row.author_user_id,
    noteType: row.note_type,
    body: row.body,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function mapFollowUp(row: FollowUpRow): LeadFollowUpDto {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    leadId: row.lead_id,
    title: row.title,
    dueAt: toIso(row.due_at),
    completedAt: row.completed_at ? toIso(row.completed_at) : null,
    createdByUserId: row.created_by_user_id,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function mapActivity(row: ActivityRow): ActivityEventDto {
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

function firstRow<Row extends QueryResultRow>(result: QueryResult<Row>): Row | null {
  return result.rows[0] ?? null;
}

export class PostgresLeadRepository implements LeadRepository {
  public constructor(private readonly db: DbExecutor) {}

  public async listLeads(context: TenantContext, filters: LeadFilters): Promise<LeadDto[]> {
    const where: string[] = ["tenant_id = $1"];
    const values: unknown[] = [context.tenantId];

    if (filters.stage) {
      values.push(filters.stage);
      where.push(`stage = $${values.length}`);
    }

    if (filters.priority) {
      values.push(filters.priority);
      where.push(`priority = $${values.length}`);
    }

    if (filters.search) {
      values.push(`%${filters.search}%`);
      where.push(
        `(title ilike $${values.length} or client_name ilike $${values.length} or company_name ilike $${values.length} or contact_name ilike $${values.length})`
      );
    }

    const result = await this.db.query<LeadRow>(
      `
        select *
        from leads
        where ${where.join(" and ")}
        order by
          case priority when 'urgent' then 1 when 'high' then 2 when 'medium' then 3 else 4 end,
          coalesce(next_follow_up_at, created_at) asc
      `,
      values
    );

    return result.rows.map(mapLead);
  }

  public async getLeadById(context: TenantContext, leadId: string): Promise<LeadDto | null> {
    const result = await this.db.query<LeadRow>(
      "select * from leads where tenant_id = $1 and id = $2",
      [context.tenantId, leadId]
    );
    const row = firstRow(result);

    return row ? mapLead(row) : null;
  }

  public async getLeadDetail(
    context: TenantContext,
    leadId: string
  ): Promise<LeadDetailDto | null> {
    const lead = await this.getLeadById(context, leadId);

    if (!lead) {
      return null;
    }

    const [notes, followUps, activity] = await Promise.all([
      this.db.query<NoteRow>(
        "select * from lead_notes where tenant_id = $1 and lead_id = $2 order by created_at desc",
        [context.tenantId, leadId]
      ),
      this.db.query<FollowUpRow>(
        "select * from lead_follow_ups where tenant_id = $1 and lead_id = $2 order by completed_at nulls first, due_at asc",
        [context.tenantId, leadId]
      ),
      this.db.query<ActivityRow>(
        "select * from activity_events where tenant_id = $1 and entity_type = 'lead' and entity_id = $2 order by created_at desc limit 25",
        [context.tenantId, leadId]
      )
    ]);

    return {
      lead,
      notes: notes.rows.map(mapNote),
      followUps: followUps.rows.map(mapFollowUp),
      activity: activity.rows.map(mapActivity)
    };
  }

  public async createLead(
    context: TenantContext,
    input: NormalizedCreateLeadInput
  ): Promise<LeadDto> {
    const result = await this.db.query<LeadRow>(
      `
        insert into leads (
          tenant_id, title, source, client_name, contact_name, contact_email,
          contact_phone, company_name, website_url, platform_url, budget_min,
          budget_max, currency, fit_score, priority
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        returning *
      `,
      [
        context.tenantId,
        input.title,
        input.source,
        input.clientName,
        input.contactName,
        input.contactEmail,
        input.contactPhone,
        input.companyName,
        input.websiteUrl,
        input.platformUrl,
        input.budgetMin,
        input.budgetMax,
        input.currency,
        input.fitScore,
        input.priority
      ]
    );
    const row = firstRow(result);

    if (!row) {
      throw new Error("Lead insert did not return a row.");
    }

    return mapLead(row);
  }

  public async updateLead(
    context: TenantContext,
    leadId: string,
    input: UpdateLeadRequest
  ): Promise<LeadDto | null> {
    const current = await this.getLeadById(context, leadId);

    if (!current) {
      return null;
    }

    const result = await this.db.query<LeadRow>(
      `
        update leads
        set
          title = $3,
          source = $4,
          client_name = $5,
          contact_name = $6,
          contact_email = $7,
          contact_phone = $8,
          company_name = $9,
          website_url = $10,
          platform_url = $11,
          budget_min = $12,
          budget_max = $13,
          currency = $14,
          fit_score = $15,
          priority = $16,
          lost_reason = $17
        where tenant_id = $1 and id = $2
        returning *
      `,
      [
        context.tenantId,
        leadId,
        input.title ?? current.title,
        input.source ?? current.source,
        input.clientName ?? current.clientName,
        input.contactName ?? current.contactName,
        input.contactEmail ?? current.contactEmail,
        input.contactPhone ?? current.contactPhone,
        input.companyName ?? current.companyName,
        input.websiteUrl ?? current.websiteUrl,
        input.platformUrl ?? current.platformUrl,
        input.budgetMin ?? current.budgetMin,
        input.budgetMax ?? current.budgetMax,
        input.currency ?? current.currency,
        input.fitScore ?? current.fitScore,
        input.priority ?? current.priority,
        input.lostReason ?? current.lostReason
      ]
    );
    const row = firstRow(result);

    return row ? mapLead(row) : null;
  }

  public async updateLeadStage(
    context: TenantContext,
    leadId: string,
    stage: LeadStage,
    lostReason: string | null
  ): Promise<LeadDto | null> {
    const result = await this.db.query<LeadRow>(
      `
        update leads
        set stage = $3, lost_reason = $4
        where tenant_id = $1 and id = $2
        returning *
      `,
      [context.tenantId, leadId, stage, lostReason]
    );
    const row = firstRow(result);

    return row ? mapLead(row) : null;
  }

  public async markLeadConverted(
    context: TenantContext,
    leadId: string,
    clientId: string
  ): Promise<LeadDto | null> {
    const result = await this.db.query<LeadRow>(
      `
        update leads
        set stage = 'won', won_client_id = $3, lost_reason = null
        where tenant_id = $1 and id = $2 and won_client_id is null
        returning *
      `,
      [context.tenantId, leadId, clientId]
    );
    const row = firstRow(result);

    return row ? mapLead(row) : null;
  }

  public async addNote(
    context: TenantContext,
    leadId: string,
    input: CreateLeadNoteRequest
  ): Promise<LeadNoteDto> {
    const result = await this.db.query<NoteRow>(
      `
        insert into lead_notes (tenant_id, lead_id, author_user_id, note_type, body)
        values ($1, $2, $3, $4, $5)
        returning *
      `,
      [context.tenantId, leadId, context.userId, input.noteType, input.body]
    );
    const row = firstRow(result);

    if (!row) {
      throw new Error("Lead note insert did not return a row.");
    }

    return mapNote(row);
  }

  public async scheduleFollowUp(
    context: TenantContext,
    leadId: string,
    input: CreateLeadFollowUpRequest
  ): Promise<LeadFollowUpDto> {
    const result = await this.db.query<FollowUpRow>(
      `
        insert into lead_follow_ups (tenant_id, lead_id, title, due_at, created_by_user_id)
        values ($1, $2, $3, $4, $5)
        returning *
      `,
      [context.tenantId, leadId, input.title, input.dueAt, context.userId]
    );
    const row = firstRow(result);

    if (!row) {
      throw new Error("Lead follow-up insert did not return a row.");
    }

    return mapFollowUp(row);
  }

  public async completeFollowUp(
    context: TenantContext,
    leadId: string,
    followUpId: string
  ): Promise<LeadFollowUpDto | null> {
    const result = await this.db.query<FollowUpRow>(
      `
        update lead_follow_ups
        set completed_at = now()
        where tenant_id = $1 and lead_id = $2 and id = $3 and completed_at is null
        returning *
      `,
      [context.tenantId, leadId, followUpId]
    );
    const row = firstRow(result);

    return row ? mapFollowUp(row) : null;
  }

  public async refreshNextFollowUpAt(
    context: TenantContext,
    leadId: string
  ): Promise<void> {
    await this.db.query(
      `
        update leads
        set next_follow_up_at = (
          select min(due_at)
          from lead_follow_ups
          where tenant_id = $1 and lead_id = $2 and completed_at is null
        )
        where tenant_id = $1 and id = $2
      `,
      [context.tenantId, leadId]
    );
  }

  public async createActivity(
    context: TenantContext,
    input: ActivityEventInput
  ): Promise<ActivityEventDto> {
    const result = await this.db.query<ActivityRow>(
      `
        insert into activity_events (
          tenant_id, actor_user_id, entity_type, entity_id, event_type, metadata_json
        )
        values ($1, $2, $3, $4, $5, $6::jsonb)
        returning *
      `,
      [
        context.tenantId,
        context.userId,
        input.entityType,
        input.entityId,
        input.eventType,
        JSON.stringify(input.metadataJson)
      ]
    );
    const row = firstRow(result);

    if (!row) {
      throw new Error("Activity event insert did not return a row.");
    }

    return mapActivity(row);
  }

  public async getDashboardSummary(context: TenantContext): Promise<DashboardSummaryDto> {
    const [counts, activity] = await Promise.all([
      this.db.query<{
        open_leads: string;
        hot_leads: string;
        follow_ups_due_today: string;
        overdue_follow_ups: string;
        won_leads_this_month: string;
        lost_leads_this_month: string;
      }>(
        `
          select
            count(*) filter (where stage not in ('won', 'lost', 'archived'))::text as open_leads,
            count(*) filter (where stage not in ('won', 'lost', 'archived') and fit_score >= 80)::text as hot_leads,
            (
              select count(*)::text
              from lead_follow_ups
              where tenant_id = $1
                and completed_at is null
                and due_at >= date_trunc('day', now())
                and due_at < date_trunc('day', now()) + interval '1 day'
            ) as follow_ups_due_today,
            (
              select count(*)::text
              from lead_follow_ups
              where tenant_id = $1
                and completed_at is null
                and due_at < now()
            ) as overdue_follow_ups,
            count(*) filter (where stage = 'won' and updated_at >= date_trunc('month', now()))::text as won_leads_this_month,
            count(*) filter (where stage = 'lost' and updated_at >= date_trunc('month', now()))::text as lost_leads_this_month
          from leads
          where tenant_id = $1
        `,
        [context.tenantId]
      ),
      this.db.query<ActivityRow>(
        "select * from activity_events where tenant_id = $1 order by created_at desc limit 8",
        [context.tenantId]
      )
    ]);
    const row = firstRow(counts);

    return {
      openLeads: Number(row?.open_leads ?? 0),
      hotLeads: Number(row?.hot_leads ?? 0),
      followUpsDueToday: Number(row?.follow_ups_due_today ?? 0),
      overdueFollowUps: Number(row?.overdue_follow_ups ?? 0),
      wonLeadsThisMonth: Number(row?.won_leads_this_month ?? 0),
      lostLeadsThisMonth: Number(row?.lost_leads_this_month ?? 0),
      recentActivity: activity.rows.map(mapActivity)
    };
  }
}
