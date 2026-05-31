import { useEffect, useState } from "react";
import { projectStatusLabels } from "@belovedops/domain";
import type { ProjectListItemDto } from "@belovedops/shared";
import { listProjects } from "../api/client.js";

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectListItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjects(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const response = await listProjects();
        setProjects(response.projects);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load projects.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadProjects();
  }, []);

  return (
    <main className="page-shell">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Client Delivery</p>
          <h1>Projects</h1>
          <p>Track active client delivery from discovery through launch and completion.</p>
        </div>
      </section>

      {error ? <p className="system-message strong">{error}</p> : null}
      {isLoading ? <p className="system-message">Loading projects.</p> : null}

      {!isLoading && projects.length === 0 ? (
        <section className="empty-state">
          <h2>No projects yet.</h2>
          <p>Create a project from a client record after a won lead becomes active delivery work.</p>
        </section>
      ) : (
        <section className="lead-board">
          <div className="lead-board-header">
            <div>
              <h2>Delivery roster</h2>
              <p>Client, status, budget, launch target, and live links in one working view.</p>
            </div>
            <span>{projects.length} shown</span>
          </div>

          <div className="lead-list project-list">
            <div className="lead-list-heading project-list-heading" aria-hidden="true">
              <span>Project</span>
              <span>Client</span>
              <span>Status</span>
              <span>Budget</span>
              <span>Target launch</span>
              <span>Links</span>
              <span>Created</span>
            </div>
            {projects.map((project) => (
              <a className="lead-row project-row" href={`/projects/${project.id}`} key={project.id}>
                <div className="lead-primary">
                  <strong>{project.name}</strong>
                  <span>{project.scopeSummary ?? project.description ?? "Scope summary not set"}</span>
                </div>
                <span>{project.client.name}</span>
                <span className="badge">{projectStatusLabels[project.status]}</span>
                <span>{formatBudget(project)}</span>
                <span>{formatDate(project.targetLaunchDate)}</span>
                <span>{formatProjectLinks(project)}</span>
                <span>{new Date(project.createdAt).toLocaleDateString()}</span>
              </a>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function formatBudget(project: ProjectListItemDto): string {
  if (project.budgetAmount === null) {
    return "Budget not set";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: project.currency,
    maximumFractionDigits: 0
  }).format(project.budgetAmount);
}

function formatDate(value: string | null): string {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString() : "No launch target";
}

function formatProjectLinks(project: ProjectListItemDto): string {
  const links = [
    project.productionUrl ? "Production" : null,
    project.stagingUrl ? "Staging" : null,
    project.repoUrl ? "Repo" : null
  ].filter(Boolean);

  return links.length > 0 ? links.join(" / ") : "No links";
}
