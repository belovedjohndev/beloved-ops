import { useEffect, useState } from "react";
import {
  projectStatusLabels,
  projectStatuses
} from "@belovedops/domain";
import type { ProjectDetailDto } from "@belovedops/shared";
import type { ProjectStatus } from "@belovedops/domain";
import { getProjectDetail, updateProjectStatus } from "../api/client.js";

type ProjectDetailPageProps = {
  projectId: string;
  onChanged: () => void;
};

export function ProjectDetailPage({ projectId, onChanged }: ProjectDetailPageProps) {
  const [detail, setDetail] = useState<ProjectDetailDto | null>(null);
  const [status, setStatus] = useState<ProjectStatus>("discovery");
  const [error, setError] = useState<string | null>(null);

  async function loadProject(): Promise<void> {
    setError(null);

    try {
      const response = await getProjectDetail(projectId);
      setDetail(response);
      setStatus(response.project.status);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load project.");
    }
  }

  useEffect(() => {
    void loadProject();
  }, [projectId]);

  async function submitStatus(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    try {
      const project = await updateProjectStatus(projectId, { status });
      setDetail(detail ? { ...detail, project } : detail);
      onChanged();
      await loadProject();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Unable to update project status.");
    }
  }

  if (!detail) {
    return (
      <main className="page-shell">
        <a className="text-link" href="/projects">Back to projects</a>
        {error ? <p className="system-message strong">{error}</p> : <p className="system-message">Loading project.</p>}
      </main>
    );
  }

  return (
    <main className="page-shell">
      <a className="text-link" href="/projects">Back to projects</a>
      <section className="detail-hero">
        <div>
          <p className="eyebrow">Delivery Command Center</p>
          <h1>{detail.project.name}</h1>
          <p>
            Client: <a className="text-link inline-link" href={`/clients/${detail.client.id}`}>{detail.client.name}</a>
          </p>
        </div>
        <span className="stage-pill">{projectStatusLabels[detail.project.status]}</span>
      </section>

      {error ? <p className="system-message strong">{error}</p> : null}

      <section className="detail-grid">
        <article className="operations-section">
          <h2>Project summary</h2>
          <dl className="summary-list">
            <div><dt>Client</dt><dd>{detail.client.name}</dd></div>
            <div><dt>Status</dt><dd>{projectStatusLabels[detail.project.status]}</dd></div>
            <div><dt>Budget</dt><dd>{formatBudget(detail.project)}</dd></div>
            <div><dt>Start date</dt><dd>{formatDate(detail.project.startDate)}</dd></div>
            <div><dt>Target launch</dt><dd>{formatDate(detail.project.targetLaunchDate)}</dd></div>
            <div><dt>Launched</dt><dd>{formatDateTime(detail.project.launchedAt)}</dd></div>
            <div><dt>Completed</dt><dd>{formatDateTime(detail.project.completedAt)}</dd></div>
          </dl>
        </article>

        <form className="operations-section" onSubmit={(event) => void submitStatus(event)}>
          <h2>Status control</h2>
          <p className="empty-copy">Move the project only when the delivery state has actually changed.</p>
          <label>
            Delivery status
            <select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)}>
              {projectStatuses.map((item) => (
                <option key={item} value={item}>{projectStatusLabels[item]}</option>
              ))}
            </select>
          </label>
          <button className="primary-action" type="submit">Update status</button>
        </form>
      </section>

      <section className="detail-grid">
        <article className="operations-section">
          <h2>Scope context</h2>
          <dl className="summary-list">
            <div><dt>Description</dt><dd>{detail.project.description ?? "Not set"}</dd></div>
            <div><dt>Scope summary</dt><dd>{detail.project.scopeSummary ?? "Not set"}</dd></div>
          </dl>
        </article>

        <article className="operations-section">
          <h2>Delivery links</h2>
          <dl className="summary-list">
            <div><dt>Repository</dt><dd>{renderExternalLink(detail.project.repoUrl)}</dd></div>
            <div><dt>Staging</dt><dd>{renderExternalLink(detail.project.stagingUrl)}</dd></div>
            <div><dt>Production</dt><dd>{renderExternalLink(detail.project.productionUrl)}</dd></div>
          </dl>
        </article>
      </section>

      <section className="operations-section">
        <h2>Source lead context</h2>
        {detail.sourceLead ? (
          <p>
            Created from <a className="text-link inline-link" href={`/leads/${detail.sourceLead.id}`}>{detail.sourceLead.title}</a>.
            Proposal notes, decisions, and follow-ups remain preserved on the original lead.
          </p>
        ) : (
          <p className="empty-copy">No source lead is linked to this project.</p>
        )}
      </section>

      <section className="operations-section">
        <h2>Project activity</h2>
        {detail.activity.length > 0 ? (
          <ol className="timeline">
            {detail.activity.map((event) => (
              <li key={event.id}>
                <strong>{formatActivityEvent(event.eventType)}</strong>
                <span>{new Date(event.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty-copy">No project activity recorded yet.</p>
        )}
      </section>
    </main>
  );
}

function formatBudget(project: ProjectDetailDto["project"]): string {
  if (project.budgetAmount === null) {
    return "Not set";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: project.currency,
    maximumFractionDigits: 0
  }).format(project.budgetAmount);
}

function formatDate(value: string | null): string {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString() : "Not set";
}

function formatDateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "Not set";
}

function renderExternalLink(value: string | null): React.ReactNode {
  if (!value) {
    return "Not set";
  }

  return (
    <a className="text-link inline-link" href={value} rel="noreferrer" target="_blank">
      Open
    </a>
  );
}

function formatActivityEvent(eventType: string): string {
  const labels: Record<string, string> = {
    project_created: "Project created",
    project_status_changed: "Project status changed"
  };

  return labels[eventType] ?? eventType.replaceAll("_", " ");
}
