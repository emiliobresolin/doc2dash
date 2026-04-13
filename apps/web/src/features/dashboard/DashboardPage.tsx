import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import { ChartPanel } from "../../components/charts/ChartPanel";
import { AppFrame } from "../../components/layout/AppFrame";
import { SearchResultInspector } from "../../components/preview/SearchResultInspector";
import {
  ApiRequestError,
  getTablePreview,
  getUploadManifest,
  getUploadRuntime,
  searchUploadPreview,
} from "../../lib/api";
import { formatChartSourceLabel, getSafeChartType } from "../../lib/charts";
import { buildScopedChartModel } from "../../lib/scopedCharts";
import type {
  ChartType,
  PreviewPayload,
  SheetSummary,
  TableSummary,
  UploadManifest,
  UploadRuntime,
} from "../../types/manifest";
import { PresenterToolbar } from "../presentation/PresenterToolbar";
import { SearchPanel } from "../search/SearchPanel";
import type { PreviewSearchResponse, SearchResult } from "../../types/search";
import { ReviewRequiredState } from "./ReviewRequiredState";
import { buildWorkbookNavigationGroups } from "./navigationGroups";

const presenterSections = ["summary", "charts", "preview"] as const;
type PresenterSection = (typeof presenterSections)[number];
type DashboardRouteState = {
  uploadAcknowledged?: {
    fileName: string;
  };
};
type SearchScopeState = {
  previousChartType: ChartType;
  previousPresenterIndex: number;
  previousTableId: string | null;
  result: SearchResult;
};

function findTableById(manifest: UploadManifest | null, tableId: string | null) {
  if (!manifest || !tableId) {
    return null;
  }
  return manifest.tables.find((table) => table.tableId === tableId) ?? null;
}

function sheetLabel(sheets: SheetSummary[], sheetId: string | null) {
  return sheets.find((sheet) => sheet.sheetId === sheetId)?.name ?? "Unknown sheet";
}

function firstWorkbookWarning(manifest: UploadManifest | null) {
  return manifest?.workbook.warnings[0] ?? null;
}

function buildSearchScopedPreview(result: SearchResult): PreviewPayload {
  const columns = Array.from(
    new Set(result.previewRows.flatMap((row) => Object.keys(row.row))),
  );

  return {
    tableId: result.tableId,
    sheetId: result.sheetId,
    columns,
    rows: result.previewRows.map((row) => row.row),
    rowCount: result.previewRows.length,
    page: 1,
    pageSize: result.previewRows.length || 1,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  };
}

function filterPreviewRows(
  rows: Array<Record<string, string | number | null>>,
  query: string,
) {
  const trimmedQuery = query.trim().toLocaleLowerCase();
  if (!trimmedQuery) {
    return rows;
  }

  return rows.filter((row) =>
    Object.values(row).some((value) =>
      String(value ?? "")
        .toLocaleLowerCase()
        .includes(trimmedQuery),
    ),
  );
}

function formatStatusLabel(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  return value
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function isInteractiveShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return Boolean(
    target.closest(
      [
        "input",
        "textarea",
        "select",
        "button",
        "[contenteditable='true']",
        "[role='textbox']",
        "[role='searchbox']",
        "[role='combobox']",
      ].join(", "),
    ),
  );
}

export function DashboardPage() {
  const previewPageSize = 25;
  const { uploadId = "" } = useParams();
  const location = useLocation();
  const routeState = location.state as DashboardRouteState | null;
  const acknowledgedFileName = routeState?.uploadAcknowledged?.fileName ?? null;
  const [manifest, setManifest] = useState<UploadManifest | null>(null);
  const [runtime, setRuntime] = useState<UploadRuntime | null>(null);
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [statusLabel, setStatusLabel] = useState(
    acknowledgedFileName
      ? `Preparing dashboard for ${acknowledgedFileName}...`
      : "Opening dashboard...",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notFoundMessage, setNotFoundMessage] = useState<string | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [presenterIndex, setPresenterIndex] = useState(0);
  const [selectedChartType, setSelectedChartType] = useState<ChartType>("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewFilterQuery, setPreviewFilterQuery] = useState("");
  const [searchContextQuery, setSearchContextQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const deferredPreviewFilterQuery = useDeferredValue(previewFilterQuery);
  const [searchResponse, setSearchResponse] = useState<PreviewSearchResponse | null>(null);
  const [searchErrorMessage, setSearchErrorMessage] = useState<string | null>(null);
  const [searchInspectorResult, setSearchInspectorResult] = useState<SearchResult | null>(null);
  const [searchScope, setSearchScope] = useState<SearchScopeState | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedScopedChartOptionKey, setSelectedScopedChartOptionKey] = useState<string | null>(
    null,
  );
  const [requestedSectionFocus, setRequestedSectionFocus] = useState<PresenterSection | null>(
    null,
  );
  const workbookNavRef = useRef<HTMLElement | null>(null);
  const summarySectionRef = useRef<HTMLElement | null>(null);
  const chartsSectionRef = useRef<HTMLElement | null>(null);
  const previewSectionRef = useRef<HTMLElement | null>(null);
  const currentSection = presenterSections[presenterIndex];

  function getSectionElement(section: PresenterSection) {
    if (section === "summary") {
      return summarySectionRef.current;
    }
    if (section === "charts") {
      return chartsSectionRef.current;
    }
    return previewSectionRef.current;
  }

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    setManifest(null);
    setRuntime(null);
    setPreview(null);
    setSearchInspectorResult(null);
    setSearchContextQuery("");
    setSearchScope(null);
    setPreviewFilterQuery("");
    setSelectedTableId(null);
    setPreviewPage(1);
    setErrorMessage(null);
    setNotFoundMessage(null);
    setStatusLabel(
      acknowledgedFileName
        ? `Preparing dashboard for ${acknowledgedFileName}...`
        : "Opening dashboard...",
    );

    async function loadManifest() {
      try {
        const nextManifest = await getUploadManifest(uploadId);
        if (cancelled) {
          return;
        }

        setManifest(nextManifest);
        setErrorMessage(null);
        setNotFoundMessage(null);

        let nextRuntime: UploadRuntime | null = null;
        if (nextManifest.status !== "ready") {
          try {
            nextRuntime = await getUploadRuntime(uploadId);
          } catch (error) {
            if (
              !(error instanceof ApiRequestError) ||
              error.code !== "runtime_not_found"
            ) {
              throw error;
            }
          }
        }
        if (cancelled) {
          return;
        }

        setRuntime(nextRuntime);

        if (nextManifest.status === "processing") {
          setStatusLabel(
            `Preparing dashboard for ${nextManifest.source.fileName ?? acknowledgedFileName ?? "your report"}...`,
          );
          timer = window.setTimeout(loadManifest, 600);
          return;
        }

        setStatusLabel(
          nextManifest.status === "failed"
            ? "Dashboard unavailable"
            : nextManifest.status === "cancelled"
              ? "Upload cancelled"
              : "Dashboard ready",
        );
        setSelectedTableId(
          nextManifest.defaultView.tableId ?? nextManifest.tables[0]?.tableId ?? null,
        );
      } catch (error) {
        if (cancelled) {
          return;
        }
        setRuntime(null);
        if (error instanceof ApiRequestError && error.code === "upload_not_found") {
          setNotFoundMessage(error.message);
          return;
        }
        setErrorMessage(
          error instanceof Error ? error.message : "We couldn't load this dashboard.",
        );
      }
    }

    void loadManifest();

    return () => {
      cancelled = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [acknowledgedFileName, uploadId]);

  useEffect(() => {
    let cancelled = false;
    const tableId = selectedTableId;
    if (!tableId || searchScope) {
      setPreview(null);
      return;
    }
    setPreview(null);
    setErrorMessage(null);
    const previewTableId: string = tableId;

    async function loadPreview() {
      try {
        const nextPreview = await getTablePreview(uploadId, previewTableId, {
          filter: deferredPreviewFilterQuery,
          page: previewPage,
          pageSize: previewPageSize,
        });
        if (!cancelled) {
          setPreview(nextPreview);
        }
      } catch (error) {
        if (!cancelled) {
          setPreview(null);
          setErrorMessage(
            error instanceof Error ? error.message : "We couldn't load preview rows.",
          );
        }
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [deferredPreviewFilterQuery, previewPage, searchScope, selectedTableId, uploadId]);

  useEffect(() => {
    const nextSelectedTable = findTableById(manifest, selectedTableId);
    setSelectedChartType(nextSelectedTable?.defaultChartType ?? "table");
  }, [manifest, selectedTableId]);

  useEffect(() => {
    const trimmedQuery = deferredSearchQuery.trim();
    if (trimmedQuery.length < 2) {
      setSearching(false);
      setSearchResponse(null);
      setSearchErrorMessage(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setSearching(true);
        const nextResponse = await searchUploadPreview(uploadId, trimmedQuery, {
          limit: 6,
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setSearchResponse(nextResponse);
          setSearchErrorMessage(null);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setSearchResponse(null);
          setSearchErrorMessage(
            error instanceof Error ? error.message : "We couldn't search preview rows.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [deferredSearchQuery, uploadId]);

  useEffect(() => {
    if (!presenting) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (isInteractiveShortcutTarget(event.target)) {
        return;
      }

      if (event.key === "ArrowRight") {
        setPresenterIndex((current) => Math.min(current + 1, presenterSections.length - 1));
      }
      if (event.key === "ArrowLeft") {
        setPresenterIndex((current) => Math.max(current - 1, 0));
      }
      if (event.key === "Escape") {
        setPresenting(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [presenting]);

  useEffect(() => {
    if (!presenting) {
      return;
    }

    const target = getSectionElement(currentSection);
    target?.focus();
  }, [currentSection, presenting]);

  useEffect(() => {
    if (!requestedSectionFocus) {
      return;
    }

    if (presenting && currentSection !== requestedSectionFocus) {
      return;
    }

    const target = getSectionElement(requestedSectionFocus);
    if (!target) {
      return;
    }

    target.focus();
    target.scrollIntoView?.({ block: "start" });
    setRequestedSectionFocus(null);
  }, [currentSection, presenting, requestedSectionFocus]);

  const selectedTable = findTableById(manifest, selectedTableId);
  const selectedSheetId = selectedTable?.sheetId ?? manifest?.defaultView.sheetId ?? null;
  const selectedSheetName = sheetLabel(manifest?.sheets ?? [], selectedSheetId);
  const activePreview = useMemo(() => {
    if (searchScope) {
      const scopedPreview = buildSearchScopedPreview(searchScope.result);
      const filteredRows = filterPreviewRows(scopedPreview.rows, previewFilterQuery);
      return {
        ...scopedPreview,
        rows: filteredRows,
        rowCount: filteredRows.length,
        pageSize: filteredRows.length || 1,
      };
    }
    return preview;
  }, [preview, previewFilterQuery, searchScope]);
  const processingFileName = acknowledgedFileName ?? manifest?.source.fileName ?? "your report";
  const processingHint =
    runtime?.recoveryHint ??
    "Keep this route open. doc2dash will continue checking automatically.";
  const navigationGroups = useMemo(() => buildWorkbookNavigationGroups(manifest), [manifest]);
  const scopedChartModel = useMemo(
    () => (searchScope ? buildScopedChartModel(searchScope.result) : null),
    [searchScope],
  );
  const activeScopedChartOption = useMemo(() => {
    if (!scopedChartModel) {
      return null;
    }
    return (
      scopedChartModel.options.find((option) => option.key === selectedScopedChartOptionKey) ??
      scopedChartModel.options[0] ??
      null
    );
  }, [scopedChartModel, selectedScopedChartOptionKey]);

  useEffect(() => {
    if (!scopedChartModel) {
      setSelectedScopedChartOptionKey(null);
      return;
    }

    setSelectedScopedChartOptionKey((current) =>
      scopedChartModel.options.some((option) => option.key === current)
        ? current
        : scopedChartModel.defaultOptionKey,
    );
  }, [scopedChartModel]);

  useEffect(() => {
    if (!activeScopedChartOption) {
      return;
    }

    setSelectedChartType((current) => getSafeChartType(activeScopedChartOption.table, current));
  }, [activeScopedChartOption]);

  function setNextTable(table: TableSummary) {
    setSearchScope(null);
    setSelectedScopedChartOptionKey(null);
    setPreviewFilterQuery("");
    setPreviewPage(1);
    setSelectedTableId(table.tableId);
  }

  function handleWorkbookNavKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (!workbookNavRef.current) {
      return;
    }

    const buttons = Array.from(
      workbookNavRef.current.querySelectorAll<HTMLButtonElement>("[data-table-nav-button='true']"),
    ).filter((button) => !button.closest("details:not([open])"));
    const currentIndex = buttons.indexOf(event.currentTarget);
    if (currentIndex === -1) {
      return;
    }

    const key = event.key;
    const moveToIndex =
      key === "ArrowDown"
        ? Math.min(currentIndex + 1, buttons.length - 1)
        : key === "ArrowUp"
          ? Math.max(currentIndex - 1, 0)
          : key === "Home"
            ? 0
            : key === "End"
              ? buttons.length - 1
              : null;

    if (moveToIndex === null) {
      return;
    }

    event.preventDefault();
    buttons[moveToIndex]?.focus();
  }

  function handleSearchQueryChange(value: string) {
    const trimmedQuery = value.trim();
    setSearchQuery(value);
    if (trimmedQuery.length >= 2) {
      setSearching(true);
      setSearchResponse(null);
      setSearchErrorMessage(null);
      return;
    }

    setSearching(false);
    setSearchResponse(null);
    setSearchErrorMessage(null);
  }

  function handleInspectSearchResult(result: SearchResult) {
    setSearchContextQuery(searchQuery.trim());
    setSearchInspectorResult(result);
  }

  function handleSearchResultSelect(result: SearchResult) {
    const nextScopedTable = findTableById(manifest, result.tableId);
    setPreviewFilterQuery("");
    setPreviewPage(1);
    setSelectedTableId(result.tableId);
    setSelectedChartType(nextScopedTable?.defaultChartType ?? "table");
    setSearchContextQuery(searchQuery.trim());
    setSearchQuery("");
    setSearchResponse(null);
    setSearchErrorMessage(null);
    setSearchScope((current) => ({
      previousChartType: current?.previousChartType ?? selectedChartType,
      previousPresenterIndex: current?.previousPresenterIndex ?? presenterIndex,
      previousTableId: current?.previousTableId ?? selectedTableId,
      result,
    }));
    setRequestedSectionFocus("preview");
    if (presenting) {
      setPresenterIndex(2);
    }
  }

  function exitSearchScope() {
    if (!searchScope) {
      return;
    }

    const fallbackTableId =
      searchScope.previousTableId ??
      manifest?.defaultView.tableId ??
      manifest?.tables[0]?.tableId ??
      null;
    setSearchScope(null);
    setSearchContextQuery("");
    setSelectedScopedChartOptionKey(null);
    setPreviewFilterQuery("");
    setPreviewPage(1);
    setSelectedTableId(fallbackTableId);
    setSelectedChartType(searchScope.previousChartType);
    setPresenterIndex(searchScope.previousPresenterIndex);
  }

  function handlePreviewFilterChange(value: string) {
    setPreviewFilterQuery(value);
    setPreviewPage(1);
  }

  function togglePresenterMode() {
    setPresenting((current) => !current);
    setPresenterIndex(0);
  }

  function movePresenter(delta: number) {
    setPresenterIndex((current) =>
      Math.max(0, Math.min(current + delta, presenterSections.length - 1)),
    );
  }

  function focusSection(section: PresenterSection) {
    if (presenting) {
      setPresenterIndex(presenterSections.indexOf(section));
    }
    setRequestedSectionFocus(section);
  }

  if (errorMessage) {
    return (
      <main className="dashboard-state" role="alert">
        <h1>Dashboard unavailable</h1>
        <p>{errorMessage}</p>
        <Link className="primary-link" to="/">
          Upload another report
        </Link>
      </main>
    );
  }

  if (notFoundMessage) {
    return (
      <main className="dashboard-state" role="status">
        <p className="eyebrow">Route state</p>
        <h1>Upload not found</h1>
        <p>{notFoundMessage}</p>
        <p>Return to the landing page and upload the report again to continue.</p>
        <Link className="primary-link" to="/">
          Return to upload
        </Link>
      </main>
    );
  }

  if (!manifest || manifest.status === "processing") {
    return (
      <main className="dashboard-state" aria-busy="true">
        <p className="eyebrow">Upload handoff</p>
        <h1>Preparing your dashboard</h1>
        <p>{processingFileName} is uploaded. doc2dash is building a readable first view now.</p>
        <p>{processingHint}</p>
      </main>
    );
  }

  if (manifest.status === "failed") {
    return (
      <main className="dashboard-state" role="alert">
        <h1>Dashboard unavailable</h1>
        <p>{firstWorkbookWarning(manifest) ?? "We couldn't prepare this dashboard."}</p>
        <p>
          {runtime?.recoveryHint ??
            "We couldn't finish this upload. Review the message above and upload the report again."}
        </p>
        <Link className="primary-link" to="/">
          Upload another report
        </Link>
      </main>
    );
  }

  if (manifest.status === "cancelled") {
    return (
      <main className="dashboard-state" role="status">
        <h1>Upload cancelled</h1>
        <p>
          {firstWorkbookWarning(manifest) ??
            "This upload was cancelled before the dashboard finished preparing."}
        </p>
        <p>
          {runtime?.recoveryHint ??
            "Upload the report again when you are ready to rebuild the dashboard."}
        </p>
        <Link className="primary-link" to="/">
          Upload another report
        </Link>
      </main>
    );
  }

  if (!selectedTable) {
    return (
      <main className="dashboard-state" role="status">
        <h1>No readable tables found</h1>
        <p>
          {manifest.source.fileName} finished processing, but we couldn't find a
          presentation-ready table{selectedSheetId ? ` on ${selectedSheetName}` : ""}.
        </p>
        <p>
          {firstWorkbookWarning(manifest) ??
            "Try another workbook or continue once table review support expands for this layout."}
        </p>
      </main>
    );
  }

  const activeChartTable = activeScopedChartOption?.table ?? selectedTable;
  const sectionPosition = `${presenterIndex + 1} of ${presenterSections.length}`;
  const sourceLabel = `${selectedSheetName} / ${selectedTable.tableId}`;

  return (
    <main className={`dashboard-shell${presenting ? " dashboard-shell--presenting" : ""}`}>
      <AppFrame
        presenting={presenting}
        sidebar={
          <nav
            aria-label="Workbook navigation"
            className="workbook-nav"
            ref={workbookNavRef}
          >
            <p className="eyebrow">Workbook</p>
            <h1>{manifest.source.fileName}</h1>
            <p className="nav-caption">
              {manifest.workbook.sheetCount} sheets / {manifest.workbook.tableCount} tables
            </p>
            {navigationGroups.map(({ sheet, featuredTables, overflowTables }) => (
              <section className="sheet-group" key={sheet.sheetId}>
                <div className="sheet-group__header">
                  <h2>{sheet.name}</h2>
                  {overflowTables.length > 0 ? (
                    <p className="sheet-group__meta">
                      {featuredTables.length} featured / {overflowTables.length} more
                    </p>
                  ) : null}
                </div>
                <ul>
                  {featuredTables.map((table) => (
                    <li key={table.tableId}>
                      <button
                        aria-pressed={table.tableId === selectedTableId}
                        data-table-nav-button="true"
                        className={
                          table.tableId === selectedTableId
                            ? "table-link table-link--active"
                            : "table-link"
                        }
                        onKeyDown={handleWorkbookNavKeyDown}
                        onClick={() => setNextTable(table)}
                        type="button"
                      >
                        <span>{table.tableId}</span>
                        <small>
                          {table.stats.primaryMode}
                          {table.reviewRequired ? " / review" : ""}
                        </small>
                      </button>
                    </li>
                  ))}
                </ul>
                {overflowTables.length > 0 ? (
                  <details className="sheet-group__overflow">
                    <summary>More extracted tables ({overflowTables.length})</summary>
                    <ul>
                      {overflowTables.map((table) => (
                        <li key={table.tableId}>
                          <button
                            aria-pressed={table.tableId === selectedTableId}
                            data-table-nav-button="true"
                            className={
                              table.tableId === selectedTableId
                                ? "table-link table-link--active"
                                : "table-link"
                            }
                            onKeyDown={handleWorkbookNavKeyDown}
                            onClick={() => setNextTable(table)}
                            type="button"
                          >
                            <span>{table.tableId}</span>
                            <small>
                              {table.stats.primaryMode}
                              {table.reviewRequired ? " / review" : ""}
                            </small>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </section>
            ))}
          </nav>
        }
        masthead={
          <>
            <div className="masthead-copy">
              <p className="eyebrow">Default-first dashboard</p>
              <h2>{selectedSheetName}</h2>
              <p className="location-indicator">
                {manifest.source.fileName} / {selectedSheetName} / {selectedTable.tableId}
              </p>
              <div className="context-strip" aria-label="Current table metadata">
                <span
                  className={`badge${selectedTable.reviewRequired ? " badge--warning" : ""}`}
                >
                  {selectedTable.reviewRequired ? "Review required" : "Trusted"}
                </span>
                <span className="badge">
                  Confidence: {Math.round(selectedTable.confidence * 100)}%
                </span>
                <span className="badge">
                  Transformation: {formatStatusLabel(selectedTable.normalization.status)}
                </span>
                <span className="badge">
                  Chart provenance: {formatChartSourceLabel(activeChartTable.chartSourceType)}
                </span>
              </div>
            </div>
            <div className="masthead-actions">
              <SearchPanel
                errorMessage={searchErrorMessage}
                onInspectResult={handleInspectSearchResult}
                onQueryChange={handleSearchQueryChange}
                onSelectResult={handleSearchResultSelect}
                presenting={presenting}
                query={searchQuery}
                response={searchResponse}
                searching={searching}
              />
              <div className="masthead-utility-row" role="region" aria-label="Reading navigation">
                <PresenterToolbar
                  enabled={presenting}
                  canPresent={manifest.presentation.presenterModeAvailable}
                  sectionLabel={currentSection}
                  sectionPosition={sectionPosition}
                  onToggle={togglePresenterMode}
                  onPrevious={() => movePresenter(-1)}
                  onNext={() => movePresenter(1)}
                />
                {!searchScope && activePreview && activePreview.totalPages > 1 ? (
                  <div className="sticky-preview-nav" aria-label="Preview page controls">
                    <p className="card-copy">
                      Preview page {activePreview.page} of {activePreview.totalPages}
                    </p>
                    <div className="sticky-preview-nav__actions">
                      <button
                        onClick={() => setPreviewPage((current) => Math.max(current - 1, 1))}
                        type="button"
                        disabled={!activePreview.hasPreviousPage}
                      >
                        Previous page
                      </button>
                      <button
                        onClick={() =>
                          setPreviewPage((current) =>
                            Math.min(current + 1, activePreview.totalPages),
                          )
                        }
                        type="button"
                        disabled={!activePreview.hasNextPage}
                      >
                        Next page
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        }
      >
        {searchScope ? (
          <section
            className="workspace-card workspace-card--scope"
            aria-label="Scoped search presentation"
          >
            <div className="card-header">
              <div>
                <p className="eyebrow">Scoped from search</p>
                <h3>{searchScope.result.sheetName} / {searchScope.result.tableId}</h3>
              </div>
              <div className="badge-row">
                <span className="badge">
                  {searchScope.result.matchCount} match{searchScope.result.matchCount === 1 ? "" : "es"}
                </span>
                {searchScope.result.matchedColumns.map((column) => (
                  <span className="badge" key={column}>
                    {column}
                  </span>
                ))}
              </div>
            </div>
            <p className="card-copy">
              Charts and source rows are now scoped to this selected search result. Exit this scoped view to return to the broader workbook context.
            </p>
            <div className="search-scope__actions">
              <button
                className="secondary-button"
                onClick={() => setSearchInspectorResult(searchScope.result)}
                type="button"
              >
                Inspect scoped rows
              </button>
              <button className="presenter-toggle" onClick={exitSearchScope} type="button">
                Exit scoped view
              </button>
            </div>
          </section>
        ) : null}
        <section
          className={`workspace-card${currentSection === "summary" ? " workspace-card--focus" : ""}`}
          aria-labelledby="summary-heading"
          hidden={presenting && currentSection !== "summary"}
          ref={summarySectionRef}
          tabIndex={-1}
        >
          <div className="card-header">
            <div>
              <p className="eyebrow">Summary</p>
              <h3 id="summary-heading">Readable first view</h3>
            </div>
            <div className="badge-row">
              <span className="badge">Mode: {selectedTable.stats.primaryMode}</span>
              {searchScope ? <span className="badge">Scoped result active</span> : null}
              <span className="badge">
                Confidence: {Math.round(selectedTable.confidence * 100)}%
              </span>
              <span className="badge">Orientation: {selectedTable.orientation ?? "unknown"}</span>
            </div>
          </div>
          {selectedTable.reviewRequired ? (
            <ReviewRequiredState
              onJumpToSource={() => focusSection("preview")}
              sourceLabel={sourceLabel}
              table={selectedTable}
            />
          ) : null}
          <div className="summary-grid">
            <article>
              <strong>{selectedTable.stats.rowCount}</strong>
              <span>Rows</span>
            </article>
            <article>
              <strong>{selectedTable.stats.columnCount}</strong>
              <span>Columns</span>
            </article>
            <article>
              <strong>{selectedTable.reviewRequired ? "Review" : "Trusted"}</strong>
              <span>Promotion state</span>
            </article>
          </div>
          <p className="card-copy">{selectedTable.stats.reason}</p>
          <p className="provenance-copy">{selectedTable.normalization.reason}</p>
        </section>

        <section
          className={`workspace-card${currentSection === "charts" ? " workspace-card--focus" : ""}`}
          aria-labelledby="charts-heading"
          hidden={presenting && currentSection !== "charts"}
          ref={chartsSectionRef}
          tabIndex={-1}
        >
          <div className="card-header">
            <div>
              <p className="eyebrow">Charts</p>
              <h3 id="charts-heading">Presentation slot</h3>
            </div>
            <div className="badge-row">
              <span className="badge">Source: {selectedSheetName}</span>
              {searchScope ? <span className="badge">Scoped charts</span> : null}
              <span className="badge">
                Provenance: {activeChartTable.chartSourceType}
              </span>
              <span className="badge">Default: {activeChartTable.defaultChartType}</span>
            </div>
          </div>
          {selectedTable.reviewRequired ? (
            <ReviewRequiredState
              compact
              onJumpToSource={() => focusSection("preview")}
              sourceLabel={sourceLabel}
              table={selectedTable}
            />
          ) : (
            <ChartPanel
              chartOptions={scopedChartModel?.options}
              onSelect={setSelectedChartType}
              onSelectChartOption={setSelectedScopedChartOptionKey}
              selectedChartType={selectedChartType}
              selectedChartOptionKey={selectedScopedChartOptionKey}
              table={activeChartTable}
            />
          )}
        </section>

        <section
          className={`workspace-card workspace-card--preview workspace-card--preview-wide${currentSection === "preview" ? " workspace-card--focus" : ""}`}
          aria-labelledby="preview-heading"
          hidden={presenting && currentSection !== "preview"}
          ref={previewSectionRef}
          tabIndex={-1}
        >
          <div className="card-header">
            <div>
              <p className="eyebrow">Preview</p>
              <h3 id="preview-heading">Source-aware rows</h3>
            </div>
            <div className="badge-row">
              <span className="badge">Table: {activePreview?.tableId ?? selectedTable.tableId}</span>
              <span className="badge">
                Rows: {activePreview?.rowCount ?? selectedTable.stats.rowCount}
              </span>
              {searchScope ? (
                <span className="badge">Scoped rows</span>
              ) : activePreview ? (
                <span className="badge">
                  Page {activePreview.page} of {activePreview.totalPages}
                </span>
              ) : null}
            </div>
          </div>
          {selectedTable.reviewRequired ? (
            <p className="card-copy">
              Source rows stay reachable while review is pending, so you can inspect the
              ambiguous table before presenting it.
            </p>
          ) : null}
          <div className="preview-filter">
            <label className="search-panel__label" htmlFor="preview-filter">
              Filter current preview table
            </label>
            <input
              className="search-panel__input"
              id="preview-filter"
              onChange={(event) => handlePreviewFilterChange(event.target.value)}
              placeholder="Narrow rows in the open table only"
              type="search"
              value={previewFilterQuery}
            />
            <p className="card-copy">
              {searchScope
                ? "This filter refines only the scoped search selection shown here."
                : "This filter refines only the currently open preview table."}
            </p>
          </div>
          {activePreview ? (
            <>
              {activePreview.rows.length ? (
                <div className="preview-table-wrap">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        {activePreview.columns.map((column) => (
                          <th key={column} scope="col">
                            <span
                              className="preview-table__cell-content preview-table__cell-content--head"
                              title={column}
                            >
                              {column}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activePreview.rows.map((row, rowIndex) => (
                        <tr key={`${activePreview.tableId}-${activePreview.page}-${rowIndex}`}>
                          {activePreview.columns.map((column) => (
                            <td key={`${rowIndex}-${column}`}>
                              <span
                                className="preview-table__cell-content"
                                title={String(row[column] ?? "")}
                              >
                                {String(row[column] ?? "")}
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="card-copy">
                  {previewFilterQuery.trim()
                    ? `No rows in this preview match "${previewFilterQuery.trim()}".`
                    : "This table does not have preview rows available yet."}
                </p>
              )}
              {!searchScope && activePreview.totalPages > 1 ? (
                <div className="preview-pagination" aria-label="Preview pagination">
                  <p className="card-copy">
                    Showing page {activePreview.page} of {activePreview.totalPages} from {activePreview.rowCount} rows.
                  </p>
                  <div className="preview-pagination__controls">
                    <button
                      onClick={() =>
                        setPreviewPage((current) => Math.max(current - 1, 1))
                      }
                      type="button"
                      disabled={!activePreview.hasPreviousPage}
                    >
                      Previous rows
                    </button>
                    <button
                      onClick={() =>
                        setPreviewPage((current) =>
                          Math.min(current + 1, activePreview.totalPages),
                        )
                      }
                      type="button"
                      disabled={!activePreview.hasNextPage}
                    >
                      Next rows
                    </button>
                  </div>
                </div>
              ) : searchScope ? (
                <p className="card-copy">
                  Showing the rows captured by the active search result. Exit scoped view to return to the full table preview.
                </p>
              ) : null}
            </>
          ) : (
            <p className="card-copy">Preview rows are loading.</p>
          )}
        </section>
        <SearchResultInspector
          onClose={() => setSearchInspectorResult(null)}
          query={searchContextQuery}
          result={searchInspectorResult}
        />
      </AppFrame>
    </main>
  );
}
