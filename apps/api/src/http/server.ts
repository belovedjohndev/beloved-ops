import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { text } from "node:stream/consumers";
import type { Pool } from "pg";
import { isLeadPriority, isLeadStage } from "@belovedops/domain";
import { devTenantContext } from "../config/dev-context.js";
import type { ApiEnv } from "../config/env.js";
import { ApplicationError, badRequest } from "../application/errors.js";
import {
  convertLeadToClient,
  getClientDetail,
  listClients
} from "../application/client-use-cases.js";
import {
  addLeadNote,
  completeLeadFollowUp,
  createLead,
  getDashboardSummary,
  getLeadDetail,
  listLeads,
  scheduleLeadFollowUp,
  updateLead,
  updateLeadStage
} from "../application/lead-use-cases.js";
import {
  createProject,
  getProjectDetail,
  listProjects,
  updateProject,
  updateProjectStatus
} from "../application/project-use-cases.js";
import type { ApplicationDependencies, LeadFilters } from "../application/ports.js";
import { PostgresClientRepository } from "../infrastructure/postgres-client-repository.js";
import { PostgresLeadRepository } from "../infrastructure/postgres-lead-repository.js";
import { PostgresProjectRepository } from "../infrastructure/postgres-project-repository.js";
import { PostgresUnitOfWork } from "../infrastructure/postgres-unit-of-work.js";

type RouteMatch = {
  leadId?: string;
  followUpId?: string;
  clientId?: string;
  projectId?: string;
};

function writeJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function applyCors(request: IncomingMessage, response: ServerResponse, env: ApiEnv): void {
  const origin = request.headers.origin;

  if (origin === env.webOrigin) {
    response.setHeader("access-control-allow-origin", origin);
    response.setHeader("vary", "origin");
  }

  response.setHeader("access-control-allow-methods", "GET,POST,PATCH,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const body = await text(request);

  if (body.trim().length === 0) {
    return {};
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw badRequest("Request body must be valid JSON.");
  }
}

function getLeadFilters(url: URL): LeadFilters {
  const filters: LeadFilters = {};
  const stage = url.searchParams.get("stage");
  const priority = url.searchParams.get("priority");
  const search = url.searchParams.get("search");

  if (stage) {
    if (!isLeadStage(stage)) {
      throw badRequest("stage filter is invalid.");
    }

    filters.stage = stage;
  }

  if (priority) {
    if (!isLeadPriority(priority)) {
      throw badRequest("priority filter is invalid.");
    }

    filters.priority = priority;
  }

  if (search) {
    filters.search = search;
  }

  return filters;
}

function matchLeadDetail(pathname: string): RouteMatch | null {
  const match = /^\/api\/leads\/([^/]+)$/.exec(pathname);
  return match?.[1] ? { leadId: match[1] } : null;
}

function matchLeadStage(pathname: string): RouteMatch | null {
  const match = /^\/api\/leads\/([^/]+)\/stage$/.exec(pathname);
  return match?.[1] ? { leadId: match[1] } : null;
}

function matchLeadNotes(pathname: string): RouteMatch | null {
  const match = /^\/api\/leads\/([^/]+)\/notes$/.exec(pathname);
  return match?.[1] ? { leadId: match[1] } : null;
}

function matchLeadFollowUps(pathname: string): RouteMatch | null {
  const match = /^\/api\/leads\/([^/]+)\/follow-ups$/.exec(pathname);
  return match?.[1] ? { leadId: match[1] } : null;
}

function matchLeadFollowUpComplete(pathname: string): RouteMatch | null {
  const match = /^\/api\/leads\/([^/]+)\/follow-ups\/([^/]+)\/complete$/.exec(pathname);
  return match?.[1] && match[2] ? { leadId: match[1], followUpId: match[2] } : null;
}

function matchLeadConversion(pathname: string): RouteMatch | null {
  const match = /^\/api\/leads\/([^/]+)\/convert-to-client$/.exec(pathname);
  return match?.[1] ? { leadId: match[1] } : null;
}

function matchClientDetail(pathname: string): RouteMatch | null {
  const match = /^\/api\/clients\/([^/]+)$/.exec(pathname);
  return match?.[1] ? { clientId: match[1] } : null;
}

function matchClientProjects(pathname: string): RouteMatch | null {
  const match = /^\/api\/clients\/([^/]+)\/projects$/.exec(pathname);
  return match?.[1] ? { clientId: match[1] } : null;
}

function matchProjectDetail(pathname: string): RouteMatch | null {
  const match = /^\/api\/projects\/([^/]+)$/.exec(pathname);
  return match?.[1] ? { projectId: match[1] } : null;
}

function matchProjectStatus(pathname: string): RouteMatch | null {
  const match = /^\/api\/projects\/([^/]+)\/status$/.exec(pathname);
  return match?.[1] ? { projectId: match[1] } : null;
}

async function handleApiRequest(
  request: IncomingMessage,
  response: ServerResponse,
  dependencies: ApplicationDependencies
): Promise<void> {
  const url = new URL(request.url ?? "/", "http://localhost");
  const method = request.method ?? "GET";
  const context = devTenantContext;

  if (method === "GET" && url.pathname === "/api/health") {
    writeJson(response, 200, { status: "ok", product: "Beloved Ops" });
    return;
  }

  if (method === "GET" && url.pathname === "/api/dashboard/summary") {
    writeJson(response, 200, await getDashboardSummary(dependencies, context));
    return;
  }

  if (method === "GET" && url.pathname === "/api/leads") {
    writeJson(response, 200, await listLeads(dependencies, context, getLeadFilters(url)));
    return;
  }

  if (method === "POST" && url.pathname === "/api/leads") {
    writeJson(response, 201, await createLead(dependencies, context, await readJsonBody(request)));
    return;
  }

  if (method === "GET" && url.pathname === "/api/clients") {
    writeJson(response, 200, await listClients(dependencies, context));
    return;
  }

  if (method === "GET" && url.pathname === "/api/projects") {
    writeJson(response, 200, await listProjects(dependencies, context));
    return;
  }

  if (method === "POST" && url.pathname === "/api/projects") {
    writeJson(
      response,
      201,
      await createProject(dependencies, context, await readJsonBody(request))
    );
    return;
  }

  const clientDetailMatch = matchClientDetail(url.pathname);

  if (clientDetailMatch?.clientId && method === "GET") {
    writeJson(
      response,
      200,
      await getClientDetail(dependencies, context, clientDetailMatch.clientId)
    );
    return;
  }

  const clientProjectsMatch = matchClientProjects(url.pathname);

  if (clientProjectsMatch?.clientId && method === "POST") {
    writeJson(
      response,
      201,
      await createProject(
        dependencies,
        context,
        await readJsonBody(request),
        clientProjectsMatch.clientId
      )
    );
    return;
  }

  const projectDetailMatch = matchProjectDetail(url.pathname);

  if (projectDetailMatch?.projectId && method === "GET") {
    writeJson(
      response,
      200,
      await getProjectDetail(dependencies, context, projectDetailMatch.projectId)
    );
    return;
  }

  if (projectDetailMatch?.projectId && method === "PATCH") {
    writeJson(
      response,
      200,
      await updateProject(
        dependencies,
        context,
        projectDetailMatch.projectId,
        await readJsonBody(request)
      )
    );
    return;
  }

  const projectStatusMatch = matchProjectStatus(url.pathname);

  if (projectStatusMatch?.projectId && method === "POST") {
    writeJson(
      response,
      200,
      await updateProjectStatus(
        dependencies,
        context,
        projectStatusMatch.projectId,
        await readJsonBody(request)
      )
    );
    return;
  }

  const detailMatch = matchLeadDetail(url.pathname);

  if (detailMatch?.leadId && method === "GET") {
    writeJson(response, 200, await getLeadDetail(dependencies, context, detailMatch.leadId));
    return;
  }

  if (detailMatch?.leadId && method === "PATCH") {
    writeJson(
      response,
      200,
      await updateLead(dependencies, context, detailMatch.leadId, await readJsonBody(request))
    );
    return;
  }

  const stageMatch = matchLeadStage(url.pathname);

  if (stageMatch?.leadId && method === "POST") {
    writeJson(
      response,
      200,
      await updateLeadStage(dependencies, context, stageMatch.leadId, await readJsonBody(request))
    );
    return;
  }

  const conversionMatch = matchLeadConversion(url.pathname);

  if (conversionMatch?.leadId && method === "POST") {
    writeJson(
      response,
      201,
      await convertLeadToClient(dependencies, context, conversionMatch.leadId)
    );
    return;
  }

  const notesMatch = matchLeadNotes(url.pathname);

  if (notesMatch?.leadId && method === "POST") {
    writeJson(
      response,
      201,
      await addLeadNote(dependencies, context, notesMatch.leadId, await readJsonBody(request))
    );
    return;
  }

  const followUpsMatch = matchLeadFollowUps(url.pathname);

  if (followUpsMatch?.leadId && method === "POST") {
    writeJson(
      response,
      201,
      await scheduleLeadFollowUp(
        dependencies,
        context,
        followUpsMatch.leadId,
        await readJsonBody(request)
      )
    );
    return;
  }

  const completeMatch = matchLeadFollowUpComplete(url.pathname);

  if (completeMatch?.leadId && completeMatch.followUpId && method === "POST") {
    writeJson(
      response,
      200,
      await completeLeadFollowUp(
        dependencies,
        context,
        completeMatch.leadId,
        completeMatch.followUpId
      )
    );
    return;
  }

  writeJson(response, 404, { error: "Route was not found." });
}

function handleError(response: ServerResponse, error: unknown): void {
  if (error instanceof ApplicationError) {
    writeJson(response, error.statusCode, { error: error.message });
    return;
  }

  console.error(error);
  writeJson(response, 500, { error: "Internal server error." });
}

export function createApiServer(pool: Pool, env: ApiEnv): Server {
  const dependencies: ApplicationDependencies = {
    clients: new PostgresClientRepository(pool),
    leads: new PostgresLeadRepository(pool),
    projects: new PostgresProjectRepository(pool),
    unitOfWork: new PostgresUnitOfWork(pool)
  };

  return createServer((request, response) => {
    applyCors(request, response, env);

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    void handleApiRequest(request, response, dependencies).catch((error: unknown) => {
      handleError(response, error);
    });
  });
}
