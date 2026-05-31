import type { DashboardSummaryDto } from "@belovedops/shared";

type DashboardPageProps = {
  summary: DashboardSummaryDto | null;
  isLoading: boolean;
  error: string | null;
};

export function DashboardPage({ summary, isLoading, error }: DashboardPageProps) {
  const hasAttention =
    (summary?.overdueFollowUps ?? 0) > 0 || (summary?.followUpsDueToday ?? 0) > 0;

  return (
    <main className="page-shell">
      <section className="page-heading overview-heading">
        <div>
          <p className="eyebrow">Daily Console</p>
          <h1>Today&apos;s Operations</h1>
          <p>Review lead movement, follow-ups, and client opportunities that need action.</p>
        </div>
        <a className="primary-action" href="/leads">
          Review leads
        </a>
      </section>

      {error ? <p className="system-message strong">{error}</p> : null}

      <section className="attention-panel" aria-label="Attention today">
        <div>
          <p className="eyebrow">Attention Today</p>
          <h2>{hasAttention ? "Follow-up work is waiting." : "No immediate follow-up pressure."}</h2>
          <p>
            {hasAttention
              ? "Work overdue items first, then clear anything due today before adding new intake."
              : "Use the calm window to review high-fit leads or capture the next real opportunity."}
          </p>
        </div>
        <div className="attention-counts">
          <Metric label="Overdue" value={summary?.overdueFollowUps ?? 0} loading={isLoading} />
          <Metric label="Due today" value={summary?.followUpsDueToday ?? 0} loading={isLoading} />
        </div>
      </section>

      <section className="dashboard-grid" aria-label="Lead operations summary">
        <div className="metric-group">
          <div className="section-heading compact">
            <h2>Pipeline health</h2>
            <p>Lead volume and high-fit opportunities currently in motion.</p>
          </div>
          <div className="metric-grid two-up">
            <Metric label="Open leads" value={summary?.openLeads ?? 0} loading={isLoading} />
            <Metric label="High fit leads" value={summary?.hotLeads ?? 0} loading={isLoading} />
          </div>
        </div>

        <div className="metric-group">
          <div className="section-heading compact">
            <h2>Delivery load</h2>
            <p>Active client projects and work waiting on review or launch readiness.</p>
          </div>
          <div className="metric-grid two-up">
            <Metric label="Active projects" value={summary?.activeProjects ?? 0} loading={isLoading} />
            <Metric label="In review" value={summary?.projectsInReview ?? 0} loading={isLoading} />
          </div>
        </div>

        <div className="metric-group">
          <div className="section-heading compact">
            <h2>Outcomes this month</h2>
            <p>Stage outcomes recorded from real lead movement.</p>
          </div>
          <div className="metric-grid two-up">
            <Metric label="Won" value={summary?.wonLeadsThisMonth ?? 0} loading={isLoading} />
            <Metric label="Lost" value={summary?.lostLeadsThisMonth ?? 0} loading={isLoading} />
          </div>
        </div>

        <div className="metric-group">
          <div className="section-heading compact">
            <h2>Launch window</h2>
            <p>Projects with a target launch in the next 30 days.</p>
          </div>
          <div className="metric-grid two-up single-metric">
            <Metric label="Upcoming launches" value={summary?.launchesUpcoming ?? 0} loading={isLoading} />
          </div>
        </div>
      </section>

      <section className="operations-section">
        <div className="section-heading">
          <h2>Recent activity</h2>
          <p>Lead decisions, notes, and follow-up changes as they happen.</p>
        </div>
        {summary && summary.recentActivity.length > 0 ? (
          <ol className="timeline activity-log">
            {summary.recentActivity.map((event) => (
              <li key={event.id}>
                <strong>{formatActivityEvent(event.eventType)}</strong>
                <span>{new Date(event.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="empty-state compact-empty">
            <h2>No activity yet.</h2>
            <p>Activity will appear after leads are created, notes are added, or follow-ups move.</p>
          </div>
        )}
      </section>
    </main>
  );
}

type MetricProps = {
  label: string;
  value: number;
  loading: boolean;
};

function Metric({ label, value, loading }: MetricProps) {
  return (
    <article className="metric-tile">
      <span>{label}</span>
      <strong>{loading ? "0" : value}</strong>
    </article>
  );
}

function formatActivityEvent(eventType: string): string {
  const labels: Record<string, string> = {
    "lead.created": "Lead created",
    "lead.stage_changed": "Lead stage changed",
    "lead.note_added": "Lead note added",
    "lead.follow_up_scheduled": "Follow-up scheduled",
            "lead.follow_up_completed": "Follow-up completed",
            "lead.marked_won": "Lead marked won",
            "lead.marked_lost": "Lead marked lost",
    lead_converted_to_client: "Lead converted to client",
    project_created: "Project created",
    project_status_changed: "Project status changed"
  };

  return labels[eventType] ?? eventType.replaceAll(".", " ");
}
