import { useEffect, useState } from "react";
import { clientStatusLabels, projectStatusLabels } from "@belovedops/domain";
import type { ClientDetailDto, CreateProjectRequest } from "@belovedops/shared";
import { createClientProject, getClientDetail } from "../api/client.js";

type ClientDetailPageProps = {
  clientId: string;
};

type ClientProjectForm = Omit<CreateProjectRequest, "clientId">;

const emptyProjectForm: ClientProjectForm = {
  sourceLeadId: null,
  name: "",
  status: "discovery",
  description: "",
  scopeSummary: "",
  budgetAmount: null,
  currency: "USD",
  startDate: null,
  targetLaunchDate: null,
  repoUrl: "",
  stagingUrl: "",
  productionUrl: ""
};

export function ClientDetailPage({ clientId }: ClientDetailPageProps) {
  const [detail, setDetail] = useState<ClientDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [projectForm, setProjectForm] = useState<ClientProjectForm>(emptyProjectForm);

  async function loadClient(): Promise<void> {
    setError(null);

    try {
      setDetail(await getClientDetail(clientId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load client.");
    }
  }

  useEffect(() => {
    void loadClient();
  }, [clientId]);

  async function submitProject(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    try {
      const project = await createClientProject(clientId, {
        ...projectForm,
        sourceLeadId: detail?.client.sourceLeadId ?? null,
        budgetAmount: projectForm.budgetAmount === null ? null : Number(projectForm.budgetAmount),
        startDate: projectForm.startDate || null,
        targetLaunchDate: projectForm.targetLaunchDate || null,
        repoUrl: projectForm.repoUrl || null,
        stagingUrl: projectForm.stagingUrl || null,
        productionUrl: projectForm.productionUrl || null
      });
      setProjectForm(emptyProjectForm);
      setIsProjectFormOpen(false);
      await loadClient();
      window.history.pushState({}, "", `/projects/${project.id}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create project.");
    }
  }

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

      <section className="operations-section">
        <div className="lead-board-header">
          <div>
            <h2>Client projects</h2>
            <p>Delivery work connected to this client record.</p>
          </div>
          <button
            className="primary-action"
            type="button"
            onClick={() => setIsProjectFormOpen((value) => !value)}
          >
            {isProjectFormOpen ? "Close project intake" : "Create project"}
          </button>
        </div>

        {isProjectFormOpen ? (
          <form className="inline-form project-create-form" onSubmit={(event) => void submitProject(event)}>
            <label>
              Project name
              <input
                value={projectForm.name}
                onChange={(event) => setProjectForm({ ...projectForm, name: event.target.value })}
              />
            </label>
            <label>
              Description
              <textarea
                value={projectForm.description ?? ""}
                onChange={(event) => setProjectForm({ ...projectForm, description: event.target.value })}
              />
            </label>
            <label>
              Scope summary
              <textarea
                value={projectForm.scopeSummary ?? ""}
                onChange={(event) => setProjectForm({ ...projectForm, scopeSummary: event.target.value })}
              />
            </label>
            <div className="two-column">
              <label>
                Budget
                <input
                  min="0"
                  type="number"
                  value={projectForm.budgetAmount ?? ""}
                  onChange={(event) => setProjectForm({
                    ...projectForm,
                    budgetAmount: event.target.value ? Number(event.target.value) : null
                  })}
                />
              </label>
              <label>
                Currency
                <input
                  maxLength={3}
                  value={projectForm.currency ?? "USD"}
                  onChange={(event) => setProjectForm({
                    ...projectForm,
                    currency: event.target.value.toUpperCase()
                  })}
                />
              </label>
            </div>
            <div className="two-column">
              <label>
                Start date
                <input
                  type="date"
                  value={projectForm.startDate ?? ""}
                  onChange={(event) => setProjectForm({ ...projectForm, startDate: event.target.value || null })}
                />
              </label>
              <label>
                Target launch date
                <input
                  type="date"
                  value={projectForm.targetLaunchDate ?? ""}
                  onChange={(event) => setProjectForm({
                    ...projectForm,
                    targetLaunchDate: event.target.value || null
                  })}
                />
              </label>
            </div>
            <div className="two-column">
              <label>
                Repository URL
                <input
                  value={projectForm.repoUrl ?? ""}
                  onChange={(event) => setProjectForm({ ...projectForm, repoUrl: event.target.value })}
                />
              </label>
              <label>
                Staging URL
                <input
                  value={projectForm.stagingUrl ?? ""}
                  onChange={(event) => setProjectForm({ ...projectForm, stagingUrl: event.target.value })}
                />
              </label>
            </div>
            <label>
              Production URL
              <input
                value={projectForm.productionUrl ?? ""}
                onChange={(event) => setProjectForm({ ...projectForm, productionUrl: event.target.value })}
              />
            </label>
            <div className="form-actions">
              <button className="primary-action" type="submit">Create project</button>
              <button
                className="secondary-action"
                type="button"
                onClick={() => setIsProjectFormOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {detail.projects.length > 0 ? (
          <div className="lead-list project-list compact-list">
            <div className="lead-list-heading project-list-heading" aria-hidden="true">
              <span>Project</span>
              <span>Status</span>
              <span>Budget</span>
              <span>Target launch</span>
              <span>Links</span>
              <span>Created</span>
            </div>
            {detail.projects.map((project) => (
              <a className="lead-row project-row compact-project-row" href={`/projects/${project.id}`} key={project.id}>
                <div className="lead-primary">
                  <strong>{project.name}</strong>
                  <span>{project.scopeSummary ?? project.description ?? "Scope summary not set"}</span>
                </div>
                <span className="badge">{projectStatusLabels[project.status]}</span>
                <span>{formatProjectBudget(project.budgetAmount, project.currency)}</span>
                <span>{formatProjectDate(project.targetLaunchDate)}</span>
                <span>{formatProjectLinks(project)}</span>
                <span>{new Date(project.createdAt).toLocaleDateString()}</span>
              </a>
            ))}
          </div>
        ) : (
          <p className="empty-copy">No projects yet. Create the first delivery record when the client work begins.</p>
        )}
      </section>
    </main>
  );
}

function formatProjectBudget(amount: number | null, currency: string): string {
  if (amount === null) {
    return "Budget not set";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(amount);
}

function formatProjectDate(value: string | null): string {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString() : "No launch target";
}

function formatProjectLinks(project: ClientDetailDto["projects"][number]): string {
  const links = [
    project.productionUrl ? "Production" : null,
    project.stagingUrl ? "Staging" : null,
    project.repoUrl ? "Repo" : null
  ].filter(Boolean);

  return links.length > 0 ? links.join(" / ") : "No links";
}
