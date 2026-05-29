import type { TenantContext } from "../application/ports.js";

export const devTenantContext: TenantContext = {
  tenantId: "00000000-0000-0000-0000-000000000001",
  userId: "00000000-0000-0000-0000-000000000002",
  role: "owner"
};
