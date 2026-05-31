import type { QueryResult, QueryResultRow } from "pg";
import type {
  ClientContactDto,
  ClientDetailDto,
  ClientDto,
  ClientListItemDto,
  LeadDto,
  ProjectDto
} from "@belovedops/shared";
import type { ClientStatus, LeadPriority, LeadStage } from "@belovedops/domain";
import type {
  ClientRepository,
  CreateClientFromLeadInput,
  CreatePrimaryContactInput,
  TenantContext
} from "../application/ports.js";
import { type ProjectRow, mapProject } from "./project-mappers.js";

type DbExecutor = {
  query<Row extends QueryResultRow>(
    sql: string,
    values?: unknown[]
  ): Promise<QueryResult<Row>>;
};

type ClientRow = {
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

type ClientContactRow = {
  id: string;
  tenant_id: string;
  client_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  is_primary: boolean;
  created_at: Date;
  updated_at: Date;
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

type ClientListRow = ClientRow & {
  contact_id: string | null;
  contact_tenant_id: string | null;
  contact_client_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_role: string | null;
  contact_is_primary: boolean | null;
  contact_created_at: Date | null;
  contact_updated_at: Date | null;
};

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function firstRow<Row extends QueryResultRow>(result: QueryResult<Row>): Row | null {
  return result.rows[0] ?? null;
}

function mapClient(row: ClientRow): ClientDto {
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

function mapContact(row: ClientContactRow): ClientContactDto {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    isPrimary: row.is_primary,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
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

function mapListContact(row: ClientListRow): ClientContactDto | null {
  if (!row.contact_id || !row.contact_tenant_id || !row.contact_client_id || !row.contact_name) {
    return null;
  }

  return {
    id: row.contact_id,
    tenantId: row.contact_tenant_id,
    clientId: row.contact_client_id,
    name: row.contact_name,
    email: row.contact_email,
    phone: row.contact_phone,
    role: row.contact_role,
    isPrimary: row.contact_is_primary ?? false,
    createdAt: row.contact_created_at ? toIso(row.contact_created_at) : toIso(row.created_at),
    updatedAt: row.contact_updated_at ? toIso(row.contact_updated_at) : toIso(row.updated_at)
  };
}

export class PostgresClientRepository implements ClientRepository {
  public constructor(private readonly db: DbExecutor) {}

  public async listClients(context: TenantContext): Promise<ClientListItemDto[]> {
    const result = await this.db.query<ClientListRow>(
      `
        select
          c.*,
          cc.id as contact_id,
          cc.tenant_id as contact_tenant_id,
          cc.client_id as contact_client_id,
          cc.name as contact_name,
          cc.email as contact_email,
          cc.phone as contact_phone,
          cc.role as contact_role,
          cc.is_primary as contact_is_primary,
          cc.created_at as contact_created_at,
          cc.updated_at as contact_updated_at
        from clients c
        left join client_contacts cc
          on cc.tenant_id = c.tenant_id
         and cc.client_id = c.id
         and cc.is_primary = true
        where c.tenant_id = $1
        order by c.created_at desc
      `,
      [context.tenantId]
    );

    return result.rows.map((row) => ({
      ...mapClient(row),
      primaryContact: mapListContact(row)
    }));
  }

  public async getClientDetail(
    context: TenantContext,
    clientId: string
  ): Promise<ClientDetailDto | null> {
    const clientResult = await this.db.query<ClientRow>(
      "select * from clients where tenant_id = $1 and id = $2",
      [context.tenantId, clientId]
    );
    const clientRow = firstRow(clientResult);

    if (!clientRow) {
      return null;
    }

    const [contactsResult, sourceLeadRow] = await Promise.all([
      this.db.query<ClientContactRow>(
        "select * from client_contacts where tenant_id = $1 and client_id = $2 order by is_primary desc, created_at asc",
        [context.tenantId, clientId]
      ),
      clientRow.source_lead_id
        ? this.db
            .query<LeadRow>(
              "select * from leads where tenant_id = $1 and id = $2",
              [context.tenantId, clientRow.source_lead_id]
            )
            .then((result) => firstRow(result))
        : Promise.resolve(null)
    ]);

    const projectsResult = await this.db.query<ProjectRow>(
      "select * from projects where tenant_id = $1 and client_id = $2 order by created_at desc",
      [context.tenantId, clientId]
    );

    const projects: ProjectDto[] = projectsResult.rows.map(mapProject);

    return {
      client: mapClient(clientRow),
      contacts: contactsResult.rows.map(mapContact),
      sourceLead: sourceLeadRow ? mapLead(sourceLeadRow) : null,
      projects
    };
  }

  public async createClientFromLead(
    context: TenantContext,
    input: CreateClientFromLeadInput
  ): Promise<ClientDto> {
    const result = await this.db.query<ClientRow>(
      `
        insert into clients (tenant_id, name, company_name, website_url, source_lead_id, status)
        values ($1, $2, $3, $4, $5, 'active')
        returning *
      `,
      [context.tenantId, input.name, input.companyName, input.websiteUrl, input.sourceLeadId]
    );
    const row = firstRow(result);

    if (!row) {
      throw new Error("Client insert did not return a row.");
    }

    return mapClient(row);
  }

  public async createPrimaryContactFromLead(
    context: TenantContext,
    input: CreatePrimaryContactInput
  ): Promise<ClientContactDto | null> {
    if (!input.name && !input.email && !input.phone) {
      return null;
    }

    const result = await this.db.query<ClientContactRow>(
      `
        insert into client_contacts (
          tenant_id, client_id, name, email, phone, role, is_primary
        )
        values ($1, $2, $3, $4, $5, $6, true)
        returning *
      `,
      [
        context.tenantId,
        input.clientId,
        input.name || "Primary contact",
        input.email,
        input.phone,
        input.role
      ]
    );
    const row = firstRow(result);

    if (!row) {
      throw new Error("Client contact insert did not return a row.");
    }

    return mapContact(row);
  }
}
