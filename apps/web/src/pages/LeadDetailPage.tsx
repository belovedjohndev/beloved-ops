import { useEffect, useMemo, useState } from "react";
import {
  leadNoteTypeLabels,
  leadNoteTypes,
  leadStageLabels,
  leadStages
} from "@belovedops/domain";
import type { LeadDetailDto } from "@belovedops/shared";
import type { LeadNoteType, LeadStage } from "@belovedops/domain";
import {
  addLeadNote,
  completeLeadFollowUp,
  getLeadDetail,
  scheduleLeadFollowUp,
  updateLeadStage
} from "../api/client.js";

type LeadDetailPageProps = {
  leadId: string;
  onChanged: () => void;
};

export function LeadDetailPage({ leadId, onChanged }: LeadDetailPageProps) {
  const [detail, setDetail] = useState<LeadDetailDto | null>(null);
  const [stage, setStage] = useState<LeadStage>("new");
  const [lostReason, setLostReason] = useState("");
  const [noteType, setNoteType] = useState<LeadNoteType>("general");
  const [noteBody, setNoteBody] = useState("");
  const [followUpTitle, setFollowUpTitle] = useState("");
  const [followUpDueAt, setFollowUpDueAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadDetail(): Promise<void> {
    setError(null);

    try {
      const response = await getLeadDetail(leadId);
      setDetail(response);
      setStage(response.lead.stage);
      setLostReason(response.lead.lostReason ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load lead.");
    }
  }

  useEffect(() => {
    void loadDetail();
  }, [leadId]);

  const importantNotes = useMemo(
    () => detail?.notes.filter((note) => note.noteType === "risk" || note.noteType === "decision") ?? [],
    [detail]
  );

  async function submitStage(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    try {
      await updateLeadStage(leadId, {
        stage,
        lostReason: lostReason.trim() ? lostReason : null
      });
      onChanged();
      await loadDetail();
    } catch (stageError) {
      setError(stageError instanceof Error ? stageError.message : "Unable to update stage.");
    }
  }

  async function submitNote(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    try {
      setDetail(await addLeadNote(leadId, { noteType, body: noteBody }));
      setNoteBody("");
      onChanged();
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : "Unable to add note.");
    }
  }

  async function submitFollowUp(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    try {
      if (!followUpDueAt) {
        setError("Follow-up due date is required.");
        return;
      }

      setDetail(
        await scheduleLeadFollowUp(leadId, {
          title: followUpTitle,
          dueAt: new Date(followUpDueAt).toISOString()
        })
      );
      setFollowUpTitle("");
      setFollowUpDueAt("");
      onChanged();
    } catch (followUpError) {
      setError(followUpError instanceof Error ? followUpError.message : "Unable to schedule follow-up.");
    }
  }

  async function completeFollowUp(followUpId: string): Promise<void> {
    setError(null);

    try {
      setDetail(await completeLeadFollowUp(leadId, followUpId));
      onChanged();
    } catch (completeError) {
      setError(completeError instanceof Error ? completeError.message : "Unable to complete follow-up.");
    }
  }

  if (!detail) {
    return (
      <main className="page-shell">
        <a className="text-link" href="/leads">Back to leads</a>
        {error ? <p className="system-message strong">{error}</p> : <p className="system-message">Loading lead.</p>}
      </main>
    );
  }

  return (
    <main className="page-shell">
      <a className="text-link" href="/leads">Back to leads</a>
      <section className="detail-hero">
        <div>
          <p className="eyebrow">Opportunity Command Center</p>
          <h1>{detail.lead.title}</h1>
          <p>{detail.lead.clientName ?? detail.lead.companyName ?? "Client identity still forming"}</p>
        </div>
        <span className="stage-pill">{leadStageLabels[detail.lead.stage]}</span>
      </section>

      {error ? <p className="system-message strong">{error}</p> : null}

      <section className="detail-grid">
        <article className="operations-section">
          <h2>Lead summary</h2>
          <dl className="summary-list">
            <div><dt>Contact</dt><dd>{detail.lead.contactName ?? "Not captured"}</dd></div>
            <div><dt>Email</dt><dd>{detail.lead.contactEmail ?? "Not captured"}</dd></div>
            <div><dt>Source</dt><dd>{detail.lead.source ?? "Not set"}</dd></div>
            <div><dt>Budget</dt><dd>{formatBudget(detail.lead)}</dd></div>
            <div><dt>Fit score</dt><dd>{detail.lead.fitScore}%</dd></div>
            <div><dt>Priority</dt><dd>{detail.lead.priority[0]?.toUpperCase()}{detail.lead.priority.slice(1)}</dd></div>
            <div><dt>Next follow-up</dt><dd>{formatFollowUp(detail.lead.nextFollowUpAt)}</dd></div>
          </dl>
        </article>

        <form className="operations-section" onSubmit={(event) => void submitStage(event)}>
          <h2>Stage control</h2>
          <label>
            Current stage
            <select value={stage} onChange={(event) => setStage(event.target.value as LeadStage)}>
              {leadStages.map((item) => (
                <option key={item} value={item}>{leadStageLabels[item]}</option>
              ))}
            </select>
          </label>
          {stage === "lost" ? (
            <label>
              Lost reason
              <textarea value={lostReason} onChange={(event) => setLostReason(event.target.value)} />
            </label>
          ) : null}
          <button className="primary-action" type="submit">Update stage</button>
        </form>
      </section>

      {importantNotes.length > 0 ? (
        <section className="operations-section important-strip">
          <h2>Risks and decisions</h2>
          {importantNotes.map((note) => (
            <article key={note.id}>
              <strong>{leadNoteTypeLabels[note.noteType]}</strong>
              <p>{note.body}</p>
            </article>
          ))}
        </section>
      ) : null}

      <section className="detail-grid">
        <form className="operations-section" onSubmit={(event) => void submitNote(event)}>
          <h2>Add note</h2>
          <label>
            Note type
            <select value={noteType} onChange={(event) => setNoteType(event.target.value as LeadNoteType)}>
              {leadNoteTypes.map((item) => (
                <option key={item} value={item}>{leadNoteTypeLabels[item]}</option>
              ))}
            </select>
          </label>
          <label>
            Note
            <textarea value={noteBody} onChange={(event) => setNoteBody(event.target.value)} />
          </label>
          <button className="primary-action" type="submit">Add note</button>
        </form>

        <form className="operations-section" onSubmit={(event) => void submitFollowUp(event)}>
          <h2>Schedule follow-up</h2>
          <label>
            Follow-up title
            <input value={followUpTitle} onChange={(event) => setFollowUpTitle(event.target.value)} />
          </label>
          <label>
            Due at
            <input type="datetime-local" value={followUpDueAt} onChange={(event) => setFollowUpDueAt(event.target.value)} />
          </label>
          <button className="primary-action" type="submit">Schedule follow-up</button>
        </form>
      </section>

      <section className="detail-grid">
        <article className="operations-section">
          <h2>Notes timeline</h2>
          {detail.notes.length > 0 ? (
            <ol className="timeline">
              {detail.notes.map((note) => (
                <li key={note.id}>
                  <strong>{leadNoteTypeLabels[note.noteType]}</strong>
                  <p>{note.body}</p>
                  <span>{new Date(note.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="empty-copy">No notes yet. Capture the next client signal here.</p>
          )}
        </article>

        <article className="operations-section">
          <h2>Follow-ups</h2>
          {detail.followUps.length > 0 ? (
            <ol className="timeline">
              {detail.followUps.map((followUp) => (
                <li key={followUp.id}>
                  <strong>{followUp.title}</strong>
                  <span>{formatFollowUp(followUp.dueAt, followUp.completedAt)}</span>
                  {!followUp.completedAt ? (
                    <button type="button" onClick={() => void completeFollowUp(followUp.id)}>
                      Mark complete
                    </button>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="empty-copy">No follow-ups scheduled. Add the next action before context fades.</p>
          )}
        </article>
      </section>

      <section className="operations-section">
        <h2>Activity timeline</h2>
        {detail.activity.length > 0 ? (
          <ol className="timeline">
            {detail.activity.map((event) => (
              <li key={event.id}>
                <strong>{event.eventType.replaceAll(".", " ")}</strong>
                <span>{new Date(event.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty-copy">No activity events recorded yet.</p>
        )}
      </section>
    </main>
  );
}

function formatBudget(lead: LeadDetailDto["lead"]): string {
  if (lead.budgetMin === null && lead.budgetMax === null) {
    return "Not set";
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

function formatFollowUp(value: string | null, completedAt: string | null = null): string {
  if (completedAt) {
    return "Completed";
  }

  if (!value) {
    return "No follow-up";
  }

  const due = new Date(value);
  const now = new Date();

  if (due.toDateString() === now.toDateString()) {
    return "Due today";
  }

  if (due.getTime() < now.getTime()) {
    return "Overdue";
  }

  return `Upcoming ${due.toLocaleString()}`;
}
