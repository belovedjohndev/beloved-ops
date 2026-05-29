export const leadStages = [
  "new",
  "qualified",
  "proposal_sent",
  "replied",
  "interview_scheduled",
  "won",
  "lost",
  "archived"
] as const;

export type LeadStage = (typeof leadStages)[number];

export const leadStageLabels: Record<LeadStage, string> = {
  new: "New",
  qualified: "Qualified",
  proposal_sent: "Proposal Sent",
  replied: "Replied",
  interview_scheduled: "Interview Scheduled",
  won: "Won",
  lost: "Lost",
  archived: "Archived"
};

export const leadPriorities = ["low", "medium", "high", "urgent"] as const;

export type LeadPriority = (typeof leadPriorities)[number];

export const leadPriorityLabels: Record<LeadPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent"
};

export const leadNoteTypes = [
  "general",
  "client_message",
  "call_summary",
  "proposal_note",
  "decision",
  "risk",
  "scope_change",
  "follow_up"
] as const;

export type LeadNoteType = (typeof leadNoteTypes)[number];

export const leadNoteTypeLabels: Record<LeadNoteType, string> = {
  general: "General",
  client_message: "Client Message",
  call_summary: "Call Summary",
  proposal_note: "Proposal Note",
  decision: "Decision",
  risk: "Risk",
  scope_change: "Scope Change",
  follow_up: "Follow-up"
};

export type LeadActivityEventType =
  | "lead.created"
  | "lead.stage_changed"
  | "lead.note_added"
  | "lead.follow_up_scheduled"
  | "lead.follow_up_completed"
  | "lead.marked_won"
  | "lead.marked_lost";

export function isLeadStage(value: string): value is LeadStage {
  return leadStages.includes(value as LeadStage);
}

export function isLeadPriority(value: string): value is LeadPriority {
  return leadPriorities.includes(value as LeadPriority);
}

export function isLeadNoteType(value: string): value is LeadNoteType {
  return leadNoteTypes.includes(value as LeadNoteType);
}

export function getLeadStageEventType(stage: LeadStage): LeadActivityEventType {
  if (stage === "won") {
    return "lead.marked_won";
  }

  if (stage === "lost") {
    return "lead.marked_lost";
  }

  return "lead.stage_changed";
}

export function canCompleteFollowUp(completedAt: string | null): boolean {
  return completedAt === null;
}
