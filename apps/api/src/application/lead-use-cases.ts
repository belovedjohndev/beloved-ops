import {
  getLeadStageEventType,
  isLeadNoteType,
  isLeadPriority,
  isLeadStage
} from "@belovedops/domain";
import type {
  CreateLeadFollowUpRequest,
  CreateLeadNoteRequest,
  CreateLeadRequest,
  UpdateLeadRequest,
  UpdateLeadStageRequest
} from "@belovedops/shared";
import { badRequest, conflict, notFound } from "./errors.js";
import type {
  ApplicationDependencies,
  LeadFilters,
  NormalizedCreateLeadInput,
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

function validateEmail(email: string | null): void {
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw badRequest("contactEmail must be a valid email address.");
  }
}

function validateBudgetRange(budgetMin: number | null, budgetMax: number | null): void {
  if (budgetMin !== null && budgetMin < 0) {
    throw badRequest("budgetMin cannot be negative.");
  }

  if (budgetMax !== null && budgetMax < 0) {
    throw badRequest("budgetMax cannot be negative.");
  }

  if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) {
    throw badRequest("budgetMin cannot be greater than budgetMax.");
  }
}

function validateCurrency(currency: string): void {
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw badRequest("currency must be a three-letter uppercase code.");
  }
}

function validateFitScore(fitScore: number): void {
  if (!Number.isInteger(fitScore) || fitScore < 0 || fitScore > 100) {
    throw badRequest("Fit score must be an integer from 0 to 100.");
  }
}

function parseCreateLeadRequest(body: unknown): NormalizedCreateLeadInput {
  const record = asRecord(body);
  const contactEmail = readString(record, "contactEmail");
  const budgetMin = readOptionalInteger(record, "budgetMin");
  const budgetMax = readOptionalInteger(record, "budgetMax");
  const currency = readString(record, "currency") ?? "USD";
  const fitScore = readOptionalInteger(record, "fitScore") ?? 50;
  const priorityValue = readString(record, "priority") ?? "medium";

  if (!isLeadPriority(priorityValue)) {
    throw badRequest("priority is invalid.");
  }

  validateEmail(contactEmail);
  validateBudgetRange(budgetMin, budgetMax);
  validateCurrency(currency);
  validateFitScore(fitScore);

  return {
    title: readRequiredString(record, "title"),
    source: readString(record, "source"),
    clientName: readString(record, "clientName"),
    contactName: readString(record, "contactName"),
    contactEmail,
    contactPhone: readString(record, "contactPhone"),
    companyName: readString(record, "companyName"),
    websiteUrl: readString(record, "websiteUrl"),
    platformUrl: readString(record, "platformUrl"),
    budgetMin,
    budgetMax,
    currency,
    fitScore,
    priority: priorityValue
  };
}

function parseUpdateLeadRequest(body: unknown): UpdateLeadRequest {
  const record = asRecord(body);
  const update: UpdateLeadRequest = {};

  if (Object.hasOwn(record, "title")) {
    update.title = readRequiredString(record, "title");
  }

  if (Object.hasOwn(record, "source")) {
    update.source = readString(record, "source");
  }

  if (Object.hasOwn(record, "clientName")) {
    update.clientName = readString(record, "clientName");
  }

  if (Object.hasOwn(record, "contactName")) {
    update.contactName = readString(record, "contactName");
  }

  if (Object.hasOwn(record, "contactEmail")) {
    update.contactEmail = readString(record, "contactEmail");
  }

  if (Object.hasOwn(record, "contactPhone")) {
    update.contactPhone = readString(record, "contactPhone");
  }

  if (Object.hasOwn(record, "companyName")) {
    update.companyName = readString(record, "companyName");
  }

  if (Object.hasOwn(record, "websiteUrl")) {
    update.websiteUrl = readString(record, "websiteUrl");
  }

  if (Object.hasOwn(record, "platformUrl")) {
    update.platformUrl = readString(record, "platformUrl");
  }

  if (Object.hasOwn(record, "currency")) {
    update.currency = readRequiredString(record, "currency");
  }

  if (Object.hasOwn(record, "lostReason")) {
    update.lostReason = readString(record, "lostReason");
  }

  if (Object.hasOwn(record, "budgetMin")) {
    update.budgetMin = readOptionalInteger(record, "budgetMin");
  }

  if (Object.hasOwn(record, "budgetMax")) {
    update.budgetMax = readOptionalInteger(record, "budgetMax");
  }

  if (Object.hasOwn(record, "fitScore")) {
    const fitScore = readOptionalInteger(record, "fitScore");

    if (fitScore === null) {
      throw badRequest("fitScore is required when provided.");
    }

    update.fitScore = fitScore;
  }

  if (Object.hasOwn(record, "priority")) {
    const priority = readRequiredString(record, "priority");

    if (!isLeadPriority(priority)) {
      throw badRequest("priority is invalid.");
    }

    update.priority = priority;
  }

  validateEmail(update.contactEmail ?? null);
  validateBudgetRange(update.budgetMin ?? null, update.budgetMax ?? null);

  if (update.currency) {
    validateCurrency(update.currency);
  }

  if (update.fitScore !== undefined && update.fitScore !== null) {
    validateFitScore(update.fitScore);
  }

  return update;
}

function parseStageRequest(body: unknown): UpdateLeadStageRequest {
  const record = asRecord(body);
  const stage = readRequiredString(record, "stage");

  if (!isLeadStage(stage)) {
    throw badRequest("stage is invalid.");
  }

  const lostReason = readString(record, "lostReason");

  if (stage === "lost" && !lostReason) {
    throw badRequest("lostReason is required when marking a lead lost.");
  }

  return { stage, lostReason };
}

function parseNoteRequest(body: unknown): CreateLeadNoteRequest {
  const record = asRecord(body);
  const noteType = readRequiredString(record, "noteType");

  if (!isLeadNoteType(noteType)) {
    throw badRequest("noteType is invalid.");
  }

  return {
    noteType,
    body: readRequiredString(record, "body")
  };
}

function parseFollowUpRequest(body: unknown): CreateLeadFollowUpRequest {
  const record = asRecord(body);
  const title = readRequiredString(record, "title");
  const dueAt = readRequiredString(record, "dueAt");
  const dueDate = new Date(dueAt);

  if (Number.isNaN(dueDate.getTime())) {
    throw badRequest("dueAt must be a valid date.");
  }

  return {
    title,
    dueAt: dueDate.toISOString()
  };
}

export async function listLeads(
  dependencies: ApplicationDependencies,
  context: TenantContext,
  filters: LeadFilters
) {
  return { leads: await dependencies.leads.listLeads(context, filters) };
}

export async function getLeadDetail(
  dependencies: ApplicationDependencies,
  context: TenantContext,
  leadId: string
) {
  const detail = await dependencies.leads.getLeadDetail(context, leadId);

  if (!detail) {
    throw notFound("Lead was not found.");
  }

  return detail;
}

export async function createLead(
  dependencies: ApplicationDependencies,
  context: TenantContext,
  body: unknown
) {
  const input = parseCreateLeadRequest(body);

  return dependencies.unitOfWork.transaction(async ({ leads }) => {
    const lead = await leads.createLead(context, input);
    await leads.createActivity(context, {
      entityType: "lead",
      entityId: lead.id,
      eventType: "lead.created",
      metadataJson: { title: lead.title, stage: lead.stage }
    });

    return lead;
  });
}

export async function updateLead(
  dependencies: ApplicationDependencies,
  context: TenantContext,
  leadId: string,
  body: unknown
) {
  const input = parseUpdateLeadRequest(body);
  const lead = await dependencies.leads.updateLead(context, leadId, input);

  if (!lead) {
    throw notFound("Lead was not found.");
  }

  return lead;
}

export async function updateLeadStage(
  dependencies: ApplicationDependencies,
  context: TenantContext,
  leadId: string,
  body: unknown
) {
  const input = parseStageRequest(body);

  return dependencies.unitOfWork.transaction(async ({ leads }) => {
    const existingLead = await leads.getLeadById(context, leadId);

    if (!existingLead) {
      throw notFound("Lead was not found.");
    }

    const updatedLead = await leads.updateLeadStage(
      context,
      leadId,
      input.stage,
      input.lostReason ?? null
    );

    if (!updatedLead) {
      throw notFound("Lead was not found.");
    }

    await leads.createActivity(context, {
      entityType: "lead",
      entityId: leadId,
      eventType: getLeadStageEventType(input.stage),
      metadataJson: {
        fromStage: existingLead.stage,
        toStage: input.stage,
        lostReason: input.lostReason ?? null
      }
    });

    return updatedLead;
  });
}

export async function addLeadNote(
  dependencies: ApplicationDependencies,
  context: TenantContext,
  leadId: string,
  body: unknown
) {
  const input = parseNoteRequest(body);

  return dependencies.unitOfWork.transaction(async ({ leads }) => {
    const existingLead = await leads.getLeadById(context, leadId);

    if (!existingLead) {
      throw notFound("Lead was not found.");
    }

    const note = await leads.addNote(context, leadId, input);
    await leads.createActivity(context, {
      entityType: "lead",
      entityId: leadId,
      eventType: "lead.note_added",
      metadataJson: { noteType: note.noteType }
    });

    return note;
  });
}

export async function scheduleLeadFollowUp(
  dependencies: ApplicationDependencies,
  context: TenantContext,
  leadId: string,
  body: unknown
) {
  const input = parseFollowUpRequest(body);

  return dependencies.unitOfWork.transaction(async ({ leads }) => {
    const existingLead = await leads.getLeadById(context, leadId);

    if (!existingLead) {
      throw notFound("Lead was not found.");
    }

    const followUp = await leads.scheduleFollowUp(context, leadId, input);
    await leads.refreshNextFollowUpAt(context, leadId);
    await leads.createActivity(context, {
      entityType: "lead",
      entityId: leadId,
      eventType: "lead.follow_up_scheduled",
      metadataJson: { title: followUp.title, dueAt: followUp.dueAt }
    });

    return followUp;
  });
}

export async function completeLeadFollowUp(
  dependencies: ApplicationDependencies,
  context: TenantContext,
  leadId: string,
  followUpId: string
) {
  return dependencies.unitOfWork.transaction(async ({ leads }) => {
    const followUp = await leads.completeFollowUp(context, leadId, followUpId);

    if (!followUp) {
      throw conflict("Follow-up is already completed or was not found.");
    }

    await leads.refreshNextFollowUpAt(context, leadId);
    await leads.createActivity(context, {
      entityType: "lead",
      entityId: leadId,
      eventType: "lead.follow_up_completed",
      metadataJson: { followUpId, title: followUp.title }
    });

    return followUp;
  });
}

export async function getDashboardSummary(
  dependencies: ApplicationDependencies,
  context: TenantContext
) {
  return dependencies.leads.getDashboardSummary(context);
}
