import type {
  ClientDetailDto,
  ClientListResponse,
  ConvertLeadToClientResponse,
  CreateLeadFollowUpRequest,
  CreateLeadNoteRequest,
  CreateLeadRequest,
  DashboardSummaryDto,
  LeadDetailDto,
  LeadDto,
  LeadListResponse,
  UpdateLeadStageRequest
} from "@belovedops/shared";
import type { LeadPriority, LeadStage } from "@belovedops/domain";

const apiBaseUrl = import.meta.env["VITE_API_BASE_URL"] ?? "http://localhost:4000";

type LeadListFilters = {
  stage?: LeadStage | "";
  priority?: LeadPriority | "";
  search?: string;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...options.headers
    }
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

export async function getDashboardSummary(): Promise<DashboardSummaryDto> {
  return request<DashboardSummaryDto>("/api/dashboard/summary");
}

export async function listClients(): Promise<ClientListResponse> {
  return request<ClientListResponse>("/api/clients");
}

export async function getClientDetail(clientId: string): Promise<ClientDetailDto> {
  return request<ClientDetailDto>(`/api/clients/${clientId}`);
}

export async function listLeads(filters: LeadListFilters): Promise<LeadListResponse> {
  const params = new URLSearchParams();

  if (filters.stage) {
    params.set("stage", filters.stage);
  }

  if (filters.priority) {
    params.set("priority", filters.priority);
  }

  if (filters.search) {
    params.set("search", filters.search);
  }

  const query = params.toString();
  return request<LeadListResponse>(`/api/leads${query ? `?${query}` : ""}`);
}

export async function createLead(input: CreateLeadRequest): Promise<LeadDto> {
  return request<LeadDto>("/api/leads", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function getLeadDetail(leadId: string): Promise<LeadDetailDto> {
  return request<LeadDetailDto>(`/api/leads/${leadId}`);
}

export async function updateLeadStage(
  leadId: string,
  input: UpdateLeadStageRequest
): Promise<LeadDto> {
  return request<LeadDto>(`/api/leads/${leadId}/stage`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function addLeadNote(
  leadId: string,
  input: CreateLeadNoteRequest
): Promise<LeadDetailDto> {
  await request(`/api/leads/${leadId}/notes`, {
    method: "POST",
    body: JSON.stringify(input)
  });

  return getLeadDetail(leadId);
}

export async function scheduleLeadFollowUp(
  leadId: string,
  input: CreateLeadFollowUpRequest
): Promise<LeadDetailDto> {
  await request(`/api/leads/${leadId}/follow-ups`, {
    method: "POST",
    body: JSON.stringify(input)
  });

  return getLeadDetail(leadId);
}

export async function completeLeadFollowUp(
  leadId: string,
  followUpId: string
): Promise<LeadDetailDto> {
  await request(`/api/leads/${leadId}/follow-ups/${followUpId}/complete`, {
    method: "POST"
  });

  return getLeadDetail(leadId);
}

export async function convertLeadToClient(
  leadId: string
): Promise<ConvertLeadToClientResponse> {
  return request<ConvertLeadToClientResponse>(`/api/leads/${leadId}/convert-to-client`, {
    method: "POST"
  });
}
