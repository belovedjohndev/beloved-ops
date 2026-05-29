import { useEffect, useMemo, useState } from "react";
import type { DashboardSummaryDto } from "@belovedops/shared";
import { getDashboardSummary } from "./api/client.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { LeadDetailPage } from "./pages/LeadDetailPage.js";
import { LeadsPage } from "./pages/LeadsPage.js";

export function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);

  async function loadSummary(): Promise<void> {
    setIsSummaryLoading(true);
    setSummaryError(null);

    try {
      setSummary(await getDashboardSummary());
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : "Unable to load dashboard summary.");
    } finally {
      setIsSummaryLoading(false);
    }
  }

  useEffect(() => {
    const onPopState = (): void => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    void loadSummary();

    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent): void => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a");

      if (!anchor || anchor.origin !== window.location.origin) {
        return;
      }

      event.preventDefault();
      window.history.pushState({}, "", anchor.href);
      setPath(window.location.pathname);
      window.scrollTo({ top: 0 });
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const leadId = useMemo(() => {
    const match = /^\/leads\/([^/]+)$/.exec(path);
    return match?.[1] ?? null;
  }, [path]);

  return (
    <>
      <header className="app-header">
        <a className="brand-lockup" href="/">
          <span className="brand-mark">Beloved Ops</span>
          <span className="brand-subtitle">Client Operations System</span>
        </a>
        <div className="workspace-label">
          <span>Workspace</span>
          <strong>Beloved John Dev</strong>
        </div>
        <nav>
          <a className={path === "/" ? "active" : ""} href="/">Dashboard</a>
          <a className={path.startsWith("/leads") ? "active" : ""} href="/leads">Leads</a>
        </nav>
      </header>

      {leadId ? (
        <LeadDetailPage leadId={leadId} onChanged={() => void loadSummary()} />
      ) : path === "/leads" ? (
        <LeadsPage onLeadCreated={() => void loadSummary()} />
      ) : (
        <DashboardPage summary={summary} isLoading={isSummaryLoading} error={summaryError} />
      )}
    </>
  );
}
