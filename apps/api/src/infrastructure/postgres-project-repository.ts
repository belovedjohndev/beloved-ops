import type { QueryResult, QueryResultRow } from "pg";
import type {
  ActivityEventDto,
  ProjectDetailDto,
  ProjectDto,
  ProjectListItemDto,
  UpdateProjectRequest
} from "@belovedops/shared";
import type { ProjectStatus } from "@belovedops/domain";
import type {
  ActivityEventInput,
  NormalizedCreateProjectInput,
  ProjectRepository,
  TenantContext
} from "../application/ports.js";
import {
  type ActivityRow,
  type ClientRow,
  type LeadRow,
  type ProjectRow,
  mapActivity,
  mapClient,
  mapLead,
  mapProject
} from "./project-mappers.js";

type DbExecutor = {
  query<Row extends QueryResultRow>(
    sql: string,
    values?: unknown[]
  ): Promise<QueryResult<Row>>;
};

type ProjectListRow = ProjectRow & {
  client_name: string;
  client_company_name: string | null;
  client_website_url: string | null;
  client_source_lead_id: string | null;
  client_status: ClientRow["status"];
  client_created_at: Date;
  client_updated_at: Date;
};

function firstRow<Row extends QueryResultRow>(result: QueryResult<Row>): Row | null {
  return result.rows[0] ?? null;
}

function mapProjectListItem(row: ProjectListRow): ProjectListItemDto {
  return {
    ...mapProject(row),
    client: mapClient({
      id: row.client_id,
      tenant_id: row.tenant_id,
      name: row.client_name,
      company_name: row.client_company_name,
      website_url: row.client_website_url,
      source_lead_id: row.client_source_lead_id,
      status: row.client_status,
      created_at: row.client_created_at,
      updated_at: row.client_updated_at
    })
  };
}

export class PostgresProjectRepository implements ProjectRepository {
  public constructor(private readonly db: DbExecutor) {}

  public async listProjects(context: TenantContext): Promise<ProjectListItemDto[]> {
    const result = await this.db.query<ProjectListRow>(
      `
        select
          p.*,
          c.name as client_name,
          c.company_name as client_company_name,
          c.website_url as client_website_url,
          c.source_lead_id as client_source_lead_id,
          c.status as client_status,
          c.created_at as client_created_at,
          c.updated_at as client_updated_at
        from projects p
        join clients c on c.tenant_id = p.tenant_id and c.id = p.client_id
        where p.tenant_id = $1
        order by p.created_at desc
      `,
      [context.tenantId]
    );

    return result.rows.map(mapProjectListItem);
  }

  public async listProjectsForClient(
    context: TenantContext,
    clientId: string
  ): Promise<ProjectDto[]> {
    const result = await this.db.query<ProjectRow>(
      "select * from projects where tenant_id = $1 and client_id = $2 order by created_at desc",
      [context.tenantId, clientId]
    );

    return result.rows.map(mapProject);
  }

  public async getProjectById(
    context: TenantContext,
    projectId: string
  ): Promise<ProjectDto | null> {
    const result = await this.db.query<ProjectRow>(
      "select * from projects where tenant_id = $1 and id = $2",
      [context.tenantId, projectId]
    );
    const row = firstRow(result);

    return row ? mapProject(row) : null;
  }

  public async getProjectDetail(
    context: TenantContext,
    projectId: string
  ): Promise<ProjectDetailDto | null> {
    const projectResult = await this.db.query<ProjectRow>(
      "select * from projects where tenant_id = $1 and id = $2",
      [context.tenantId, projectId]
    );
    const projectRow = firstRow(projectResult);

    if (!projectRow) {
      return null;
    }

    const [clientResult, sourceLeadRow, activityResult] = await Promise.all([
      this.db.query<ClientRow>(
        "select * from clients where tenant_id = $1 and id = $2",
        [context.tenantId, projectRow.client_id]
      ),
      projectRow.source_lead_id
        ? this.db
            .query<LeadRow>(
              "select * from leads where tenant_id = $1 and id = $2",
              [context.tenantId, projectRow.source_lead_id]
            )
            .then((result) => firstRow(result))
        : Promise.resolve(null),
      this.db.query<ActivityRow>(
        "select * from activity_events where tenant_id = $1 and entity_type = 'project' and entity_id = $2 order by created_at desc limit 25",
        [context.tenantId, projectId]
      )
    ]);
    const clientRow = firstRow(clientResult);

    if (!clientRow) {
      return null;
    }

    return {
      project: mapProject(projectRow),
      client: mapClient(clientRow),
      sourceLead: sourceLeadRow ? mapLead(sourceLeadRow) : null,
      activity: activityResult.rows.map(mapActivity)
    };
  }

  public async createProject(
    context: TenantContext,
    input: NormalizedCreateProjectInput
  ): Promise<ProjectDto> {
    const result = await this.db.query<ProjectRow>(
      `
        insert into projects (
          tenant_id, client_id, source_lead_id, name, status, description,
          scope_summary, budget_amount, currency, start_date, target_launch_date,
          repo_url, staging_url, production_url
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        returning *
      `,
      [
        context.tenantId,
        input.clientId,
        input.sourceLeadId,
        input.name,
        input.status,
        input.description,
        input.scopeSummary,
        input.budgetAmount,
        input.currency,
        input.startDate,
        input.targetLaunchDate,
        input.repoUrl,
        input.stagingUrl,
        input.productionUrl
      ]
    );
    const row = firstRow(result);

    if (!row) {
      throw new Error("Project insert did not return a row.");
    }

    return mapProject(row);
  }

  public async updateProject(
    context: TenantContext,
    projectId: string,
    input: UpdateProjectRequest
  ): Promise<ProjectDto | null> {
    const current = await this.getProjectById(context, projectId);

    if (!current) {
      return null;
    }

    const result = await this.db.query<ProjectRow>(
      `
        update projects
        set
          source_lead_id = $3,
          name = $4,
          status = $5,
          description = $6,
          scope_summary = $7,
          budget_amount = $8,
          currency = $9,
          start_date = $10,
          target_launch_date = $11,
          repo_url = $12,
          staging_url = $13,
          production_url = $14
        where tenant_id = $1 and id = $2
        returning *
      `,
      [
        context.tenantId,
        projectId,
        input.sourceLeadId ?? current.sourceLeadId,
        input.name ?? current.name,
        input.status ?? current.status,
        input.description ?? current.description,
        input.scopeSummary ?? current.scopeSummary,
        input.budgetAmount ?? current.budgetAmount,
        input.currency ?? current.currency,
        input.startDate ?? current.startDate,
        input.targetLaunchDate ?? current.targetLaunchDate,
        input.repoUrl ?? current.repoUrl,
        input.stagingUrl ?? current.stagingUrl,
        input.productionUrl ?? current.productionUrl
      ]
    );
    const row = firstRow(result);

    return row ? mapProject(row) : null;
  }

  public async updateProjectStatus(
    context: TenantContext,
    projectId: string,
    status: ProjectStatus
  ): Promise<ProjectDto | null> {
    const result = await this.db.query<ProjectRow>(
      `
        update projects
        set
          status = $3,
          launched_at = case when $3 = 'launched' and launched_at is null then now() else launched_at end,
          completed_at = case when $3 = 'completed' and completed_at is null then now() else completed_at end
        where tenant_id = $1 and id = $2
        returning *
      `,
      [context.tenantId, projectId, status]
    );
    const row = firstRow(result);

    return row ? mapProject(row) : null;
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
      throw new Error("Project activity insert did not return a row.");
    }

    return mapActivity(row);
  }
}
