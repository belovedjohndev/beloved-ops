export const projectStatuses = [
  "discovery",
  "scope_approved",
  "in_progress",
  "client_review",
  "revision",
  "ready_to_launch",
  "launched",
  "maintenance",
  "completed",
  "paused",
  "cancelled"
] as const;

export type ProjectStatus = (typeof projectStatuses)[number];

export const projectStatusLabels: Record<ProjectStatus, string> = {
  discovery: "Discovery",
  scope_approved: "Scope Approved",
  in_progress: "In Progress",
  client_review: "Client Review",
  revision: "Revision",
  ready_to_launch: "Ready to Launch",
  launched: "Launched",
  maintenance: "Maintenance",
  completed: "Completed",
  paused: "Paused",
  cancelled: "Cancelled"
};

export type ProjectActivityEventType = "project_created" | "project_status_changed";

export function isProjectStatus(value: string): value is ProjectStatus {
  return projectStatuses.includes(value as ProjectStatus);
}
