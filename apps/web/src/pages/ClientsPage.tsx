import { useEffect, useState } from "react";
import { clientStatusLabels } from "@belovedops/domain";
import type { ClientListItemDto } from "@belovedops/shared";
import { listClients } from "../api/client.js";

export function ClientsPage() {
  const [clients, setClients] = useState<ClientListItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadClients(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const response = await listClients();
        setClients(response.clients);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load clients.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadClients();
  }, []);

  return (
    <main className="page-shell">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Client Records</p>
          <h1>Clients</h1>
          <p>Converted lead relationships with their original opportunity context preserved.</p>
        </div>
      </section>

      {error ? <p className="system-message strong">{error}</p> : null}
      {isLoading ? <p className="system-message">Loading clients.</p> : null}

      {!isLoading && clients.length === 0 ? (
        <section className="empty-state">
          <h2>No clients yet.</h2>
          <p>Convert a won lead to create the first client record while keeping lead history intact.</p>
        </section>
      ) : (
        <section className="lead-board">
          <div className="lead-board-header">
            <div>
              <h2>Client roster</h2>
              <p>Client records created from won leads.</p>
            </div>
            <span>{clients.length} shown</span>
          </div>

          <div className="lead-list client-list">
            <div className="lead-list-heading client-list-heading" aria-hidden="true">
              <span>Client</span>
              <span>Company</span>
              <span>Primary contact</span>
              <span>Website</span>
              <span>Status</span>
              <span>Created</span>
            </div>
            {clients.map((client) => (
              <a className="lead-row client-row" href={`/clients/${client.id}`} key={client.id}>
                <div className="lead-primary">
                  <strong>{client.name}</strong>
                  <span>{client.sourceLeadId ? "Converted from lead" : "Direct client"}</span>
                </div>
                <span>{client.companyName ?? "Not set"}</span>
                <span>{client.primaryContact?.name ?? "No primary contact"}</span>
                <span>{client.websiteUrl ?? "Not set"}</span>
                <span className="badge">{clientStatusLabels[client.status]}</span>
                <span>{new Date(client.createdAt).toLocaleDateString()}</span>
              </a>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
