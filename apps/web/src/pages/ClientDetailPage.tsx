import { useEffect, useState } from "react";
import { clientStatusLabels } from "@belovedops/domain";
import type { ClientDetailDto } from "@belovedops/shared";
import { getClientDetail } from "../api/client.js";

type ClientDetailPageProps = {
  clientId: string;
};

export function ClientDetailPage({ clientId }: ClientDetailPageProps) {
  const [detail, setDetail] = useState<ClientDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadClient(): Promise<void> {
      setError(null);

      try {
        setDetail(await getClientDetail(clientId));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load client.");
      }
    }

    void loadClient();
  }, [clientId]);

  if (!detail) {
    return (
      <main className="page-shell">
        <a className="text-link" href="/clients">Back to clients</a>
        {error ? <p className="system-message strong">{error}</p> : <p className="system-message">Loading client.</p>}
      </main>
    );
  }

  const primaryContact = detail.contacts.find((contact) => contact.isPrimary) ?? null;

  return (
    <main className="page-shell">
      <a className="text-link" href="/clients">Back to clients</a>
      <section className="detail-hero">
        <div>
          <p className="eyebrow">Client Record</p>
          <h1>{detail.client.name}</h1>
          <p>{detail.client.companyName ?? "Company not set"}</p>
        </div>
        <span className="stage-pill">{clientStatusLabels[detail.client.status]}</span>
      </section>

      {error ? <p className="system-message strong">{error}</p> : null}

      <section className="detail-grid">
        <article className="operations-section">
          <h2>Client summary</h2>
          <dl className="summary-list">
            <div><dt>Name</dt><dd>{detail.client.name}</dd></div>
            <div><dt>Company</dt><dd>{detail.client.companyName ?? "Not set"}</dd></div>
            <div><dt>Website</dt><dd>{detail.client.websiteUrl ?? "Not set"}</dd></div>
            <div><dt>Status</dt><dd>{clientStatusLabels[detail.client.status]}</dd></div>
            <div><dt>Created</dt><dd>{new Date(detail.client.createdAt).toLocaleDateString()}</dd></div>
          </dl>
        </article>

        <article className="operations-section">
          <h2>Primary contact</h2>
          {primaryContact ? (
            <dl className="summary-list">
              <div><dt>Name</dt><dd>{primaryContact.name}</dd></div>
              <div><dt>Email</dt><dd>{primaryContact.email ?? "Not captured"}</dd></div>
              <div><dt>Phone</dt><dd>{primaryContact.phone ?? "Not captured"}</dd></div>
              <div><dt>Role</dt><dd>{primaryContact.role ?? "Not set"}</dd></div>
            </dl>
          ) : (
            <p className="empty-copy">No primary contact was captured from the source lead.</p>
          )}
        </article>
      </section>

      <section className="operations-section">
        <h2>Source lead context</h2>
        {detail.sourceLead ? (
          <p>
            Created from <a className="text-link inline-link" href={`/leads/${detail.sourceLead.id}`}>{detail.sourceLead.title}</a>.
            Lead notes, follow-ups, decisions, and activity remain attached to the original opportunity.
          </p>
        ) : (
          <p className="empty-copy">No source lead is linked to this client.</p>
        )}
      </section>
    </main>
  );
}
