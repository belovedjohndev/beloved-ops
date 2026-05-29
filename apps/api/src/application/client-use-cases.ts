import { conflict, notFound } from "./errors.js";
import type {
  ApplicationDependencies,
  TenantContext
} from "./ports.js";

function getClientNameFromLead(lead: {
  clientName: string | null;
  companyName: string | null;
  contactName: string | null;
  title: string;
}): string {
  return lead.clientName ?? lead.companyName ?? lead.contactName ?? lead.title;
}

export async function listClients(
  dependencies: ApplicationDependencies,
  context: TenantContext
) {
  return { clients: await dependencies.clients.listClients(context) };
}

export async function getClientDetail(
  dependencies: ApplicationDependencies,
  context: TenantContext,
  clientId: string
) {
  const detail = await dependencies.clients.getClientDetail(context, clientId);

  if (!detail) {
    throw notFound("Client was not found.");
  }

  return detail;
}

export async function convertLeadToClient(
  dependencies: ApplicationDependencies,
  context: TenantContext,
  leadId: string
) {
  return dependencies.unitOfWork.transaction(async ({ leads, clients }) => {
    const lead = await leads.getLeadById(context, leadId);

    if (!lead) {
      throw notFound("Lead was not found.");
    }

    if (lead.wonClientId) {
      throw conflict("Lead has already been converted to a client.");
    }

    const client = await clients.createClientFromLead(context, {
      name: getClientNameFromLead(lead),
      companyName: lead.companyName,
      websiteUrl: lead.websiteUrl,
      sourceLeadId: lead.id
    });

    const primaryContact = await clients.createPrimaryContactFromLead(context, {
      clientId: client.id,
      name: lead.contactName ?? lead.clientName ?? "",
      email: lead.contactEmail,
      phone: lead.contactPhone,
      role: "Primary contact"
    });

    const updatedLead = await leads.markLeadConverted(context, lead.id, client.id);

    if (!updatedLead) {
      throw conflict("Lead has already been converted to a client.");
    }

    await leads.createActivity(context, {
      entityType: "lead",
      entityId: lead.id,
      eventType: "lead_converted_to_client",
      metadataJson: { clientId: client.id, clientName: client.name }
    });

    return {
      lead: updatedLead,
      client,
      primaryContact
    };
  });
}
