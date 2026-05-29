export const clientStatuses = ["active", "inactive", "archived"] as const;

export type ClientStatus = (typeof clientStatuses)[number];

export const clientStatusLabels: Record<ClientStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  archived: "Archived"
};

export function isClientStatus(value: string): value is ClientStatus {
  return clientStatuses.includes(value as ClientStatus);
}
