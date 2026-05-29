import { useEffect, useMemo, useState } from "react";
import {
  leadPriorities,
  leadPriorityLabels,
  leadStageLabels,
  leadStages
} from "@belovedops/domain";
import type { CreateLeadRequest, LeadDto } from "@belovedops/shared";
import type { LeadPriority, LeadStage } from "@belovedops/domain";
import { createLead, listLeads } from "../api/client.js";

type LeadsPageProps = {
  onLeadCreated: () => void;
};

const emptyLeadForm: CreateLeadRequest = {
  title: "",
  source: "",
  clientName: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  companyName: "",
  websiteUrl: "",
  platformUrl: "",
  budgetMin: null,
  budgetMax: null,
  currency: "USD",
  fitScore: 75,
  priority: "medium"
};

export function LeadsPage({ onLeadCreated }: LeadsPageProps) {
  const [leads, setLeads] = useState<LeadDto[]>([]);
  const [stage, setStage] = useState<LeadStage | "">("");
  const [priority, setPriority] = useState<LeadPriority | "">("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<CreateLeadRequest>(emptyLeadForm);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const hasActiveFilters = stage !== "" || priority !== "" || search.trim().length > 0;

  async function loadLeads(): Promise<void> {
    setIsLoading(true);
    setError(null);

    try {
      const response = await listLeads({ stage, priority, search });
      setLeads(response.leads);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load leads.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadLeads();
  }, [stage, priority]);

  const visibleLeads = useMemo(() => leads, [leads]);

  async function submitLead(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    try {
      await createLead({
        ...form,
        budgetMin: form.budgetMin === null ? null : Number(form.budgetMin),
        budgetMax: form.budgetMax === null ? null : Number(form.budgetMax),
        fitScore: Number(form.fitScore ?? 3)
      });
      setForm(emptyLeadForm);
      setIsCreateOpen(false);
      onLeadCreated();
      await loadLeads();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create lead.");
    }
  }

  return (
    <main className="page-shell">
      <section className="page-heading leads-heading">
        <div>
          <p className="eyebrow">Lead Management</p>
          <h1>Leads</h1>
          <p>Track real opportunities from first contact through proposal, follow-up, and outcome.</p>
        </div>
        <button className="primary-action" type="button" onClick={() => setIsCreateOpen((value) => !value)}>
          {isCreateOpen ? "Close intake" : "Add lead"}
        </button>
      </section>

      {error ? <p className="system-message strong">{error}</p> : null}

      <section className="lead-layout">
        <div className="lead-board">
          <div className="lead-board-header">
            <div>
              <h2>Opportunity pipeline</h2>
              <p>Stage, fit, budget, source, and next action in one working view.</p>
            </div>
            <span>{visibleLeads.length} shown</span>
          </div>

          <div className="pipeline-tabs" aria-label="Lead stage filters">
            <button className={stage === "" ? "is-active" : ""} type="button" onClick={() => setStage("")}>
              All
            </button>
            {leadStages.map((item) => (
              <button
                className={stage === item ? "is-active" : ""}
                key={item}
                type="button"
                onClick={() => setStage(item)}
              >
                {leadStageLabels[item]}
              </button>
            ))}
          </div>

          <div className="filter-panel">
            <label className="search-field">
              Search
              <div className="toolbar">
                <input
                  aria-label="Search leads"
                  placeholder="Lead title, client, company, or contact"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void loadLeads();
                    }
                  }}
                />
                <button type="button" onClick={() => void loadLeads()}>
                  Search
                </button>
              </div>
            </label>

            <label className="compact-field">
              Priority
              <select value={priority} onChange={(event) => setPriority(event.target.value as LeadPriority | "")}>
                <option value="">All priorities</option>
                {leadPriorities.map((item) => (
                  <option key={item} value={item}>
                    {leadPriorityLabels[item]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isLoading ? <p className="system-message">Loading leads.</p> : null}

          {!isLoading && visibleLeads.length === 0 ? (
            <div className="empty-state">
              {hasActiveFilters ? (
                <>
                  <h2>No leads match this view.</h2>
                  <p>Adjust the stage, priority, or search term to widen the pipeline view.</p>
                </>
              ) : (
                <>
                  <h2>No leads yet.</h2>
                  <p>
                    Add your first opportunity so Beloved Ops can track the client, proposal,
                    next action, and outcome.
                  </p>
                  <ul className="empty-checklist">
                    <li>Client context</li>
                    <li>Proposal notes</li>
                    <li>Follow-up timing</li>
                    <li>Win/loss outcome</li>
                  </ul>
                </>
              )}
            </div>
          ) : (
            <div className="lead-list">
              <div className="lead-list-heading" aria-hidden="true">
                <span>Opportunity</span>
                <span>Stage</span>
                <span>Priority</span>
                <span>Fit</span>
                <span>Budget</span>
                <span>Source</span>
                <span>Next action</span>
              </div>
              {visibleLeads.map((lead) => (
                <a className="lead-row" href={`/leads/${lead.id}`} key={lead.id}>
                  <div className="lead-primary">
                    <strong>{lead.title}</strong>
                    <span>{lead.clientName ?? lead.companyName ?? lead.contactName ?? "No client name yet"}</span>
                  </div>
                  <Badge>{leadStageLabels[lead.stage]}</Badge>
                  <span>{leadPriorityLabels[lead.priority]}</span>
                  <span>{formatFitScore(lead.fitScore)}</span>
                  <span>{formatBudget(lead)}</span>
                  <span>{lead.source ?? "Source not set"}</span>
                  <span>{formatFollowUp(lead.nextFollowUpAt)}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {isCreateOpen ? (
          <form className="side-panel intake-panel" onSubmit={(event) => void submitLead(event)}>
            <div className="panel-heading">
              <p className="eyebrow">Lead Intake</p>
              <h2>Add lead</h2>
              <p>Capture the context needed for the next decision.</p>
            </div>
            <label>
              Lead title
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </label>
            <label>
              Client name
              <input value={form.clientName ?? ""} onChange={(event) => setForm({ ...form, clientName: event.target.value })} />
            </label>
            <label>
              Contact name
              <input value={form.contactName ?? ""} onChange={(event) => setForm({ ...form, contactName: event.target.value })} />
            </label>
            <label>
              Company name
              <input value={form.companyName ?? ""} onChange={(event) => setForm({ ...form, companyName: event.target.value })} />
            </label>
            <label>
              Contact email
              <input value={form.contactEmail ?? ""} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} />
            </label>
            <label>
              Source
              <input value={form.source ?? ""} onChange={(event) => setForm({ ...form, source: event.target.value })} />
            </label>
            <div className="field-group">
              <span>Budget range</span>
              <div className="two-column">
                <label>
                  Minimum
                  <input type="number" value={form.budgetMin ?? ""} onChange={(event) => setForm({ ...form, budgetMin: event.target.value ? Number(event.target.value) : null })} />
                </label>
                <label>
                  Maximum
                  <input type="number" value={form.budgetMax ?? ""} onChange={(event) => setForm({ ...form, budgetMax: event.target.value ? Number(event.target.value) : null })} />
                </label>
              </div>
            </div>
            <div className="two-column">
              <label>
                Fit score
                <input type="number" min="0" max="100" value={form.fitScore ?? 75} onChange={(event) => setForm({ ...form, fitScore: Number(event.target.value) })} />
                <span className="field-help">0-100 signal for budget, urgency, scope, and client fit.</span>
              </label>
              <label>
                Priority
                <select value={form.priority ?? "medium"} onChange={(event) => setForm({ ...form, priority: event.target.value as LeadPriority })}>
                  {leadPriorities.map((item) => (
                    <option key={item} value={item}>
                      {leadPriorityLabels[item]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-actions">
              <button className="primary-action" type="submit">
                Add lead
              </button>
              <button className="secondary-action" type="button" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <aside className="intake-closed">
            <p className="eyebrow">Lead Intake</p>
            <h2>Ready when a real opportunity appears.</h2>
            <p>Open intake to record client, source, budget, fit, and priority.</p>
            <button className="primary-action" type="button" onClick={() => setIsCreateOpen(true)}>
              Add lead
            </button>
          </aside>
        )}
      </section>
    </main>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="badge">{children}</span>;
}

function formatBudget(lead: LeadDto): string {
  if (lead.budgetMin === null && lead.budgetMax === null) {
    return "Budget not set";
  }

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: lead.currency,
    maximumFractionDigits: 0
  });

  if (lead.budgetMin !== null && lead.budgetMax !== null) {
    return `${formatter.format(lead.budgetMin)} - ${formatter.format(lead.budgetMax)}`;
  }

  return formatter.format(lead.budgetMin ?? lead.budgetMax ?? 0);
}

function formatFitScore(fitScore: number): string {
  return `Fit ${fitScore}%`;
}

function formatFollowUp(value: string | null): string {
  if (!value) {
    return "No follow-up";
  }

  const due = new Date(value);
  const today = new Date();
  const sameDay = due.toDateString() === today.toDateString();

  if (sameDay) {
    return "Due today";
  }

  if (due.getTime() < today.getTime()) {
    return "Overdue";
  }

  return `Upcoming ${due.toLocaleDateString()}`;
}
