import { isProjectStatus } from "@belovedops/domain";
import type {
  CreateProjectRequest,
  UpdateProjectRequest,
  UpdateProjectStatusRequest
} from "@belovedops/shared";
import { badRequest, notFound } from "./errors.js";
import type {
  ApplicationDependencies,
  NormalizedCreateProjectInput,
  TenantContext
} from "./ports.js";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw badRequest("Request body must be a JSON object.");
  }

  return value as UnknownRecord;
}

function readString(record: UnknownRecord, key: string): string | null {
  const value = record[key];

  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw badRequest(`${key} must be a string.`);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readRequiredString(record: UnknownRecord, key: string): string {
  const value = readString(record, key);

  if (!value) {
    throw badRequest(`${key} is required.`);
  }

  return value;
}

function readOptionalInteger(record: UnknownRecord, key: string): number | null {
  const value = record[key];

  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw badRequest(`${key} must be an integer.`);
  }

  return value;
}

function validateCurrency(currency: string): void {
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw badRequest("currency must be a three-letter uppercase code.");
  }
}

function validateDate(value: string | null, key: string): void {
  if (!value) {
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw badRequest(`${key} must use YYYY-MM-DD format.`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw badRequest(`${key} must be a valid date.`);
  }
}

function validateProjectDates(startDate: string | null, targetLaunchDate: string | null): void {
  validateDate(startDate, "startDate");
  validateDate(targetLaunchDate, "targetLaunchDate");

  if (startDate && targetLaunchDate && targetLaunchDate < startDate) {
    throw badRequest("targetLaunchDate cannot be before startDate.");
  }
}

function parseCreateProjectRequest(body: unknown, clientIdOverride?: string): NormalizedCreateProjectInput {
  const record = asRecord(body);
  const statusValue = readString(record, "status") ?? "discovery";
  const budgetAmount = readOptionalInteger(record, "budgetAmount");
  const currency = readString(record, "currency") ?? "USD";
  const startDate = readString(record, "startDate");
  const targetLaunchDate = readString(record, "targetLaunchDate");

  if (!isProjectStatus(statusValue)) {
    throw badRequest("status is invalid.");
  }

  if (budgetAmount !== null && budgetAmount < 0) {
    throw badRequest("budgetAmount cannot be negative.");
  }

  validateCurrency(currency);
  validateProjectDates(startDate, targetLaunchDate);

  return {
    clientId: clientIdOverride ?? readRequiredString(record, "clientId"),
    sourceLeadId: readString(record, "sourceLeadId"),
    name: readRequiredString(record, "name"),
    status: statusValue,
    description: readString(record, "description"),
    scopeSummary: readString(record, "scopeSummary"),
    budgetAmount,
    currency,
    startDate,
    targetLaunchDate,
    repoUrl: readString(record, "repoUrl"),
    stagingUrl: readString(record, "stagingUrl"),
    productionUrl: readString(record, "productionUrl")
  };
}

function parseUpdateProjectRequest(body: unknown): UpdateProjectRequest {
  const record = asRecord(body);
  const input: UpdateProjectRequest = {};

  if (Object.hasOwn(record, "sourceLeadId")) {
    input.sourceLeadId = readString(record, "sourceLeadId");
  }

  if (Object.hasOwn(record, "name")) {
    input.name = readRequiredString(record, "name");
  }

  if (Object.hasOwn(record, "description")) {
    input.description = readString(record, "description");
  }

  if (Object.hasOwn(record, "scopeSummary")) {
    input.scopeSummary = readString(record, "scopeSummary");
  }

  if (Object.hasOwn(record, "currency")) {
    input.currency = readRequiredString(record, "currency");
  }

  if (Object.hasOwn(record, "startDate")) {
    input.startDate = readString(record, "startDate");
  }

  if (Object.hasOwn(record, "targetLaunchDate")) {
    input.targetLaunchDate = readString(record, "targetLaunchDate");
  }

  if (Object.hasOwn(record, "repoUrl")) {
    input.repoUrl = readString(record, "repoUrl");
  }

  if (Object.hasOwn(record, "stagingUrl")) {
    input.stagingUrl = readString(record, "stagingUrl");
  }

  if (Object.hasOwn(record, "productionUrl")) {
    input.productionUrl = readString(record, "productionUrl");
  }

  if (Object.hasOwn(record, "status")) {
    const status = readRequiredString(record, "status");

    if (!isProjectStatus(status)) {
      throw badRequest("status is invalid.");
    }

    input.status = status;
  }

  if (Object.hasOwn(record, "budgetAmount")) {
    input.budgetAmount = readOptionalInteger(record, "budgetAmount");
  }

  if (input.budgetAmount !== undefined && input.budgetAmount !== null && input.budgetAmount < 0) {
    throw badRequest("budgetAmount cannot be negative.");
  }

  if (input.currency) {
    validateCurrency(input.currency);
  }

  validateProjectDates(input.startDate ?? null, input.targetLaunchDate ?? null);

  return input;
}

function parseStatusRequest(body: unknown): UpdateProjectStatusRequest {
  const record = asRecord(body);
  const status = readRequiredString(record, "status");

  if (!isProjectStatus(status)) {
    throw badRequest("status is invalid.");
  }

  return { status };
}

export async function listProjects(
  dependencies: ApplicationDependencies,
  context: TenantContext
) {
  return { projects: await dependencies.projects.listProjects(context) };
}

export async function getProjectDetail(
  dependencies: ApplicationDependencies,
  context: TenantContext,
  projectId: string
) {
  const detail = await dependencies.projects.getProjectDetail(context, projectId);

  if (!detail) {
    throw notFound("Project was not found.");
  }

  return detail;
}

export async function createProject(
  dependencies: ApplicationDependencies,
  context: TenantContext,
  body: unknown,
  clientIdOverride?: string
) {
  const input = parseCreateProjectRequest(body, clientIdOverride);

  return dependencies.unitOfWork.transaction(async ({ clients, leads, projects }) => {
    const client = await clients.getClientDetail(context, input.clientId);

    if (!client) {
      throw notFound("Client was not found.");
    }

    if (input.sourceLeadId) {
      const sourceLead = await leads.getLeadById(context, input.sourceLeadId);

      if (!sourceLead) {
        throw notFound("Source lead was not found.");
      }
    }

    const project = await projects.createProject(context, input);
    await projects.createActivity(context, {
      entityType: "project",
      entityId: project.id,
      eventType: "project_created",
      metadataJson: {
        clientId: project.clientId,
        sourceLeadId: project.sourceLeadId
      }
    });

    return project;
  });
}

export async function updateProject(
  dependencies: ApplicationDependencies,
  context: TenantContext,
  projectId: string,
  body: unknown
) {
  const input = parseUpdateProjectRequest(body);

  if (input.sourceLeadId) {
    const sourceLead = await dependencies.leads.getLeadById(context, input.sourceLeadId);

    if (!sourceLead) {
      throw notFound("Source lead was not found.");
    }
  }

  const project = await dependencies.projects.updateProject(context, projectId, input);

  if (!project) {
    throw notFound("Project was not found.");
  }

  return project;
}

export async function updateProjectStatus(
  dependencies: ApplicationDependencies,
  context: TenantContext,
  projectId: string,
  body: unknown
) {
  const input = parseStatusRequest(body);

  return dependencies.unitOfWork.transaction(async ({ projects }) => {
    const existingProject = await projects.getProjectById(context, projectId);

    if (!existingProject) {
      throw notFound("Project was not found.");
    }

    const updatedProject = await projects.updateProjectStatus(context, projectId, input.status);

    if (!updatedProject) {
      throw notFound("Project was not found.");
    }

    await projects.createActivity(context, {
      entityType: "project",
      entityId: projectId,
      eventType: "project_status_changed",
      metadataJson: {
        previousStatus: existingProject.status,
        nextStatus: input.status
      }
    });

    return updatedProject;
  });
}
