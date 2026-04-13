import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { AppRoutes } from "../../app/routes";
import type { PreviewPayload, UploadManifest, UploadRuntime } from "../../types/manifest";
import type { NarrativeSummaryPayload } from "../../types/narrative";
import type { PreviewSearchResponse } from "../../types/search";

const { newPlotMock, purgeMock, resizeMock } = vi.hoisted(() => ({
  newPlotMock: vi.fn(() => Promise.resolve()),
  purgeMock: vi.fn(),
  resizeMock: vi.fn(),
}));

vi.mock("plotly.js-dist-min", () => ({
  default: {
    newPlot: newPlotMock,
    purge: purgeMock,
    Plots: {
      resize: resizeMock,
    },
  },
}));

const manifest: UploadManifest = {
  uploadId: "upl_demo",
  status: "ready",
  source: {
    fileName: "report.xlsx",
    fileType: "xlsx",
    sizeBytes: 1024,
  },
  workbook: {
    sheetCount: 2,
    tableCount: 2,
    warnings: [],
  },
  presentation: {
    defaultMode: "analysis",
    presenterModeAvailable: true,
  },
  defaultView: {
    sheetId: "sheet_02",
    tableId: "tbl_02_01",
    viewType: "summary_dashboard",
  },
  sheets: [
    {
      sheetId: "sheet_01",
      name: "Paged",
      order: 1,
      rowCount: 8,
      columnCount: 2,
      isEmpty: false,
    },
    {
      sheetId: "sheet_02",
      name: "Summary",
      order: 2,
      rowCount: 4,
      columnCount: 2,
      isEmpty: false,
    },
  ],
  tables: [
    {
      tableId: "tbl_01_01",
      sheetId: "sheet_01",
      confidence: 0.58,
      reviewRequired: true,
      orientation: "not_safely_normalizable",
      detectionReasons: ["Repeated header row"],
      normalization: {
        status: "skipped",
        reason: "Review first",
      },
      availableChartTypes: ["table"],
      defaultChartType: "table",
      chartSourceType: "generated",
      chartSourceReason: "Review is required before chart generation because the table is ambiguous.",
      chartRecommendations: [
        {
          chartType: "table",
          title: "Readable table view",
          description: "This dataset stays in readable form until the structure is reviewed.",
          dimensionLabel: null,
          measureLabel: null,
          points: [],
          truncated: false,
        },
      ],
      stats: {
        rowCount: 7,
        columnCount: 2,
        chartFriendly: false,
        primaryMode: "table",
        reason: "Needs review",
      },
    },
    {
      tableId: "tbl_02_01",
      sheetId: "sheet_02",
      confidence: 0.92,
      reviewRequired: false,
      orientation: "long_form",
      detectionReasons: ["Dense region"],
      normalization: {
        status: "none",
        reason: "Already long form",
      },
      availableChartTypes: ["column", "bar", "pie", "table"],
      defaultChartType: "column",
      chartSourceType: "generated",
      chartSourceReason:
        "No reusable source visual was detected for this table, so the dashboard generated a safe default chart from the profiled columns.",
      chartRecommendations: [
        {
          chartType: "column",
          title: "Value by Team",
          description:
            "Column chart using Value as the measure and Team as the presentation dimension.",
          dimensionLabel: "Team",
          measureLabel: "Value",
          points: [
            { label: "Platform", value: 4 },
            { label: "Architecture", value: 3 },
          ],
          truncated: false,
        },
        {
          chartType: "bar",
          title: "Value by Team",
          description:
            "Horizontal bar chart using Value as the measure and Team as the presentation dimension.",
          dimensionLabel: "Team",
          measureLabel: "Value",
          points: [
            { label: "Platform", value: 4 },
            { label: "Architecture", value: 3 },
          ],
          truncated: false,
        },
        {
          chartType: "pie",
          title: "Value by Team",
          description:
            "Pie chart using Value as the measure and Team as the presentation dimension.",
          dimensionLabel: "Team",
          measureLabel: "Value",
          points: [
            { label: "Platform", value: 4 },
            { label: "Architecture", value: 3 },
          ],
          truncated: false,
        },
        {
          chartType: "table",
          title: "Readable table view",
          description: "The readable table remains available whenever a chart would hide detail.",
          dimensionLabel: null,
          measureLabel: null,
          points: [],
          truncated: false,
        },
      ],
      stats: {
        rowCount: 3,
        columnCount: 2,
        chartFriendly: true,
        primaryMode: "chart",
        reason: "Clear dimensions and measures",
      },
    },
  ],
};

const previews: Record<string, PreviewPayload> = {
  tbl_01_01: {
    tableId: "tbl_01_01",
    sheetId: "sheet_01",
    columns: ["Product", "Revenue"],
    rowCount: 2,
    page: 1,
    pageSize: 25,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
    rows: [
      { Product: "Alpha", Revenue: 10 },
      { Product: "Beta", Revenue: 20 },
    ],
  },
  tbl_02_01: {
    tableId: "tbl_02_01",
    sheetId: "sheet_02",
    columns: ["Team", "Value"],
    rowCount: 2,
    page: 1,
    pageSize: 25,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
    rows: [
      { Team: "Platform", Value: 4 },
      { Team: "Architecture", Value: 3 },
    ],
  },
};

const searchResponse: PreviewSearchResponse = {
  query: "alpha",
  resultCount: 1,
  limit: 6,
  truncated: false,
  tookMs: 24,
  results: [
    {
      tableId: "tbl_01_01",
      sheetId: "sheet_01",
      sheetName: "Paged",
      matchCount: 1,
      matchedColumns: ["Product"],
      snippet: "Product: Alpha",
      previewRows: [
        {
          rowIndex: 0,
          matchedColumns: ["Product"],
          row: { Product: "Alpha", Revenue: 10 },
        },
      ],
    },
  ],
};

const fragmentedPreviews: Record<string, PreviewPayload> = {
  tbl_01_04: {
    tableId: "tbl_01_04",
    sheetId: "sheet_01",
    columns: ["Region", "Failures", "Pass Rate"],
    rowCount: 3,
    page: 1,
    pageSize: 25,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
    rows: [
      { Region: "EMEA", Failures: 4, "Pass Rate": "96%" },
      { Region: "APAC", Failures: 3, "Pass Rate": "97%" },
      { Region: "AMER", Failures: 2, "Pass Rate": "98%" },
    ],
  },
};

const tableNarrative: NarrativeSummaryPayload = {
  status: "ready",
  scope: {
    mode: "table",
    uploadId: "upl_demo",
    tableId: "tbl_02_01",
    query: null,
  },
  narrative: {
    description: "This selected table appears to compare delivery value across teams in a compact summary format.",
    insights: [
      "Platform has the highest visible value in the current selected table.",
      "The active table is chart-friendly and already suited to a presentation-first reading flow.",
    ],
    caveat: null,
  },
  basis: {
    sheetName: "Summary",
    rowCount: 3,
    columnCount: 2,
    confidence: 0.92,
    reviewRequired: false,
    defaultChartType: "column",
    primaryMode: "chart",
  },
  fallbackMessage: null,
};

const scopedNarrative: NarrativeSummaryPayload = {
  status: "ready",
  scope: {
    mode: "scopedResult",
    uploadId: "upl_demo",
    tableId: "tbl_01_01",
    query: "alpha",
  },
  narrative: {
    description: "In these scoped rows, Alpha appears as the only matched product in the active result.",
    insights: [
      "The scoped result is limited to one matching row from the Paged table.",
      "This scoped summary should not be read as a workbook-wide conclusion.",
    ],
    caveat: "This narrative is based only on the selected scoped search result.",
  },
  basis: {
    sheetName: "Paged",
    rowCount: 1,
    columnCount: 2,
    confidence: 0.58,
    reviewRequired: true,
    defaultChartType: "table",
    primaryMode: "table",
  },
  fallbackMessage: null,
};

const noTableManifest: UploadManifest = {
  ...manifest,
  workbook: {
    ...manifest.workbook,
    tableCount: 0,
    warnings: ["Sheet Summary has headers only."],
  },
  defaultView: {
    sheetId: "sheet_02",
    tableId: null,
    viewType: "summary_dashboard",
  },
  tables: [],
};

const reviewDefaultManifest: UploadManifest = {
  ...manifest,
  defaultView: {
    sheetId: "sheet_01",
    tableId: "tbl_01_01",
    viewType: "summary_dashboard",
  },
};

const failedManifest: UploadManifest = {
  ...manifest,
  status: "failed",
  workbook: {
    sheetCount: 0,
    tableCount: 0,
    warnings: ["We couldn't prepare a dashboard from this workbook."],
  },
  defaultView: {
    sheetId: null,
    tableId: null,
    viewType: "summary_dashboard",
  },
  sheets: [],
  tables: [],
};

const cancelledManifest: UploadManifest = {
  ...manifest,
  status: "cancelled",
  workbook: {
    ...manifest.workbook,
    tableCount: 0,
    warnings: [
      "This upload was cancelled before the dashboard was fully prepared. Upload the report again to continue.",
    ],
  },
  defaultView: {
    sheetId: null,
    tableId: null,
    viewType: "summary_dashboard",
  },
  tables: [],
};

const fragmentedManifest: UploadManifest = {
  ...manifest,
  uploadId: "upl_fragmented",
  workbook: {
    sheetCount: 1,
    tableCount: 6,
    warnings: [],
  },
  defaultView: {
    sheetId: "sheet_01",
    tableId: "tbl_01_04",
    viewType: "summary_dashboard",
  },
  sheets: [
    {
      sheetId: "sheet_01",
      name: "Validation report",
      order: 1,
      rowCount: 80,
      columnCount: 12,
      isEmpty: false,
    },
  ],
  tables: [
    {
      ...manifest.tables[0],
      tableId: "tbl_01_01",
      sheetId: "sheet_01",
      confidence: 0.95,
      stats: {
        rowCount: 1,
        columnCount: 1,
        chartFriendly: false,
        primaryMode: "table",
        reason: "Single-cell note",
      },
    },
    {
      ...manifest.tables[0],
      tableId: "tbl_01_02",
      sheetId: "sheet_01",
      confidence: 0.76,
      stats: {
        rowCount: 4,
        columnCount: 2,
        chartFriendly: false,
        primaryMode: "table",
        reason: "Small detail block",
      },
    },
    {
      ...manifest.tables[1],
      tableId: "tbl_01_03",
      sheetId: "sheet_01",
      confidence: 0.91,
      stats: {
        rowCount: 7,
        columnCount: 4,
        chartFriendly: true,
        primaryMode: "chart",
        reason: "Presentation summary",
      },
    },
    {
      ...manifest.tables[1],
      tableId: "tbl_01_04",
      sheetId: "sheet_01",
      confidence: 0.94,
      defaultChartType: "bar",
      stats: {
        rowCount: 11,
        columnCount: 5,
        chartFriendly: true,
        primaryMode: "chart",
        reason: "Regional summary",
      },
    },
    {
      ...manifest.tables[0],
      tableId: "tbl_01_05",
      sheetId: "sheet_01",
      confidence: 0.97,
      stats: {
        rowCount: 38,
        columnCount: 12,
        chartFriendly: false,
        primaryMode: "table",
        reason: "Detailed execution log",
      },
    },
    {
      ...manifest.tables[0],
      tableId: "tbl_01_06",
      sheetId: "sheet_01",
      confidence: 0.95,
      stats: {
        rowCount: 3,
        columnCount: 1,
        chartFriendly: false,
        primaryMode: "table",
        reason: "Footer note",
      },
    },
  ],
};

function runtimeForStatus(
  status: UploadRuntime["status"],
  overrides?: Partial<UploadRuntime>,
): UploadRuntime {
  return {
    uploadId: "upl_demo",
    status,
    createdAt: "2026-04-12T08:00:00Z",
    updatedAt: "2026-04-12T08:00:02Z",
    processingStartedAt: "2026-04-12T08:00:00Z",
    processingFinishedAt: status === "processing" ? null : "2026-04-12T08:00:05Z",
    cancellationRequestedAt: status === "cancelled" ? "2026-04-12T08:00:04Z" : null,
    cancelledAt: status === "cancelled" ? "2026-04-12T08:00:05Z" : null,
    failureMessage:
      status === "failed" ? "We couldn't prepare a dashboard from this workbook." : null,
    recoveryHint:
      status === "processing"
        ? "Processing is still running. Keep this route open or check back in a moment."
        : status === "failed"
          ? "We couldn't finish this upload. Review the failure details and upload the report again."
          : status === "cancelled"
            ? "This upload was cancelled. Upload the report again when you are ready to rebuild the dashboard."
            : "Dashboard artifacts are ready. Open the upload route to review or present the report.",
    artifactSummary: {
      tableArtifacts: status === "ready" ? 2 : 0,
      previewArtifacts: status === "ready" ? 2 : 0,
    },
    logFiles:
      status === "cancelled"
        ? ["cancellation.log"]
        : status === "failed"
          ? ["processing-error.log"]
          : [],
    ...overrides,
  };
}

function apiResponse(data: unknown) {
  return new Response(JSON.stringify({ data, meta: {}, error: null }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function apiErrorResponse(message: string, code: string, status: number) {
  return new Response(
    JSON.stringify({ data: null, meta: {}, error: { code, message } }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}

function deferredResponse<T>(data: T) {
  let resolveResponse: (() => void) | undefined;
  const promise = new Promise<Response>((resolve) => {
    resolveResponse = () => resolve(apiResponse(data));
  });

  return {
    promise,
    resolve() {
      resolveResponse?.();
    },
  };
}

function renderDashboard(options?: {
  manifestData?: typeof manifest;
  previewData?: typeof previews;
  searchData?: PreviewSearchResponse;
  runtimeData?: UploadRuntime;
  narrativeData?: NarrativeSummaryPayload | ((url: string, init?: RequestInit) => NarrativeSummaryPayload);
  fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>;
  initialEntries?: Array<string | { pathname: string; state?: unknown }>;
}) {
  const manifestData = options?.manifestData ?? manifest;
  const previewData = options?.previewData ?? previews;
  const nextSearchData = options?.searchData ?? searchResponse;
  const runtimeData = options?.runtimeData ?? runtimeForStatus(manifestData.status);

  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (options?.fetchImpl) {
        return options.fetchImpl(url, init);
      }

      if (url.includes("/manifest")) {
        return Promise.resolve(apiResponse(manifestData));
      }

      if (url.includes("/runtime")) {
        return Promise.resolve(apiResponse(runtimeData));
      }

      if (url.includes("/narratives/summary")) {
        const nextNarrative =
          typeof options?.narrativeData === "function"
            ? options.narrativeData(url, init)
            : options?.narrativeData ?? tableNarrative;
        return Promise.resolve(apiResponse(nextNarrative));
      }

      if (url.includes("/preview")) {
        const tableId = url.split("/tables/")[1]?.split("/preview")[0] ?? "tbl_02_01";
        return Promise.resolve(apiResponse(previewData[tableId as keyof typeof previewData]));
      }

      if (url.includes("/search")) {
        return Promise.resolve(apiResponse(nextSearchData));
      }

      return Promise.reject(new Error(`Unhandled request: ${url}`));
    }),
  );

  return render(
    <MemoryRouter
      future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true,
      }}
      initialEntries={options?.initialEntries ?? ["/uploads/upl_demo"]}
    >
      <AppRoutes />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test("lands on the backend-selected default dashboard view", async () => {
  renderDashboard();

  await screen.findByText("report.xlsx / Summary / tbl_02_01");
  await screen.findByRole("cell", { name: "Platform" });
  await screen.findByText("Value by Team", { selector: "figcaption" });

  expect(screen.getByText("report.xlsx / Summary / tbl_02_01")).toBeInTheDocument();
  expect(screen.getByRole("cell", { name: "Platform" })).toBeInTheDocument();
  expect(screen.getByRole("cell", { name: "Architecture" })).toBeInTheDocument();
  expect(screen.getByText("Mode: chart")).toBeInTheDocument();
  expect(screen.getByText("Provenance: Generated")).toBeInTheDocument();
  expect(
    screen.getByText(
      "This selected table appears to compare delivery value across teams in a compact summary format.",
    ),
  ).toBeInTheDocument();
});

test("shows a loading state in the existing summary area while the AI narrative is still generating", async () => {
  const deferredNarrative = deferredResponse(tableNarrative);

  renderDashboard({
    fetchImpl: (url) => {
      if (url.includes("/manifest")) {
        return Promise.resolve(apiResponse(manifest));
      }
      if (url.includes("/runtime")) {
        return Promise.resolve(apiResponse(runtimeForStatus("ready")));
      }
      if (url.includes("/narratives/summary")) {
        return deferredNarrative.promise;
      }
      if (url.includes("/preview")) {
        const tableId = url.split("/tables/")[1]?.split("/preview")[0] ?? "tbl_02_01";
        return Promise.resolve(apiResponse(previews[tableId as keyof typeof previews]));
      }
      if (url.includes("/search")) {
        return Promise.resolve(apiResponse(searchResponse));
      }
      return Promise.reject(new Error(`Unhandled request: ${url}`));
    },
  });

  await screen.findByRole("region", { name: "AI narrative summary" });
  const narrativeRegion = screen.getByRole("region", { name: "AI narrative summary" });
  expect(within(narrativeRegion).getByText("Grounded table commentary")).toBeInTheDocument();
  expect(within(narrativeRegion).getByText("Scope: Selected table")).toBeInTheDocument();
  expect(within(narrativeRegion).getByText("Rows: 3")).toBeInTheDocument();
  expect(document.querySelector(".summary-narrative__loading")).not.toBeNull();

  deferredNarrative.resolve();

  expect(
    await screen.findByText(
      "This selected table appears to compare delivery value across teams in a compact summary format.",
    ),
  ).toBeInTheDocument();
});

test("falls back cleanly when the AI narrative is unavailable", async () => {
  renderDashboard({
    narrativeData: {
      ...tableNarrative,
      status: "unavailable",
      narrative: null,
      fallbackMessage:
        "AI narrative unavailable in this environment. Use summary, charts, and source-aware rows to review this scope.",
    },
  });

  const narrativeRegion = await screen.findByRole("region", { name: "AI narrative summary" });
  expect(
    await within(narrativeRegion).findByText(
      "AI narrative unavailable in this environment. Use summary, charts, and source-aware rows to review this scope.",
    ),
  ).toBeInTheDocument();
  expect(within(narrativeRegion).getByText("Scope: Selected table")).toBeInTheDocument();
});

test("keeps reading navigation in the top masthead and bounds dense preview content inside the preview card", async () => {
  const longNote = "Long dense preview note ".repeat(20).trim();

  renderDashboard({
    previewData: {
      ...previews,
      tbl_02_01: {
        ...previews.tbl_02_01,
        columns: ["Team", "Value", "Notes"],
        rowCount: 1,
        totalPages: 1,
        rows: [
          {
            Team: "Platform",
            Value: 4,
            Notes: longNote,
          },
        ],
      },
    },
  });

  const readingNavigation = await screen.findByRole("region", {
    name: "Reading navigation",
  });
  const previewRegion = screen.getByRole("region", { name: "Source-aware rows" });

  expect(readingNavigation.closest(".app-masthead")).not.toBeNull();
  expect(readingNavigation.closest(".app-workspace")).toBeNull();
  expect(previewRegion).toHaveClass("workspace-card--preview");
  expect(previewRegion).toHaveClass("workspace-card--preview-wide");
  expect(await within(previewRegion).findByTitle(longNote)).toBeInTheDocument();
});

test("keeps the preview table in the lower full-width workspace band for wider source inspection", async () => {
  renderDashboard();

  const previewRegion = await screen.findByRole("region", { name: "Source-aware rows" });
  const workspace = previewRegion.closest(".app-workspace");

  expect(workspace).not.toBeNull();
  expect(previewRegion).toHaveClass("workspace-card--preview-wide");
});

test("keeps the upload handoff route in a clear processing state until the dashboard is ready", async () => {
  let manifestCalls = 0;

  renderDashboard({
    initialEntries: [
      {
        pathname: "/uploads/upl_demo",
        state: {
          uploadAcknowledged: {
            fileName: "report.csv",
          },
        },
      },
    ],
    fetchImpl: (url) => {
      if (url.includes("/manifest")) {
        manifestCalls += 1;
        return Promise.resolve(
          apiResponse(
            manifestCalls === 1
              ? {
                  ...manifest,
                  status: "processing",
                  workbook: { sheetCount: 0, tableCount: 0, warnings: [] },
                  sheets: [],
                  tables: [],
                  defaultView: {
                    sheetId: null,
                    tableId: null,
                    viewType: "summary_dashboard",
                  },
                }
              : manifest,
          ),
        );
      }

      if (url.includes("/runtime")) {
        return Promise.resolve(apiResponse(runtimeForStatus("processing")));
      }

      if (url.includes("/preview")) {
        const tableId = url.split("/tables/")[1]?.split("/preview")[0] ?? "tbl_02_01";
        return Promise.resolve(apiResponse(previews[tableId as keyof typeof previews]));
      }

      if (url.includes("/search")) {
        return Promise.resolve(apiResponse(searchResponse));
      }

      return Promise.reject(new Error(`Unhandled request: ${url}`));
    },
  });

  expect(
    await screen.findByRole("heading", { name: "Preparing your dashboard" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("report.csv is uploaded. doc2dash is building a readable first view now."),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "Processing is still running. Keep this route open or check back in a moment.",
    ),
  ).toBeInTheDocument();

  expect(await screen.findByText("report.xlsx / Summary / tbl_02_01")).toBeInTheDocument();
  expect(manifestCalls).toBeGreaterThanOrEqual(2);
});

test("switches workbook navigation and loads the matching preview", async () => {
  renderDashboard();
  const user = userEvent.setup();

  await screen.findByRole("cell", { name: "Platform" });
  await user.click(screen.getByRole("button", { name: /tbl_01_01/i }));

  await waitFor(() =>
    expect(screen.getByText("report.xlsx / Paged / tbl_01_01")).toBeInTheDocument(),
  );
  expect(screen.getByText("Alpha")).toBeInTheDocument();
  expect(screen.getByText("Beta")).toBeInTheDocument();
  expect(screen.getByText("Review required before presentation")).toBeInTheDocument();
  expect(screen.getByText("Charts stay locked until review")).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Jump to source rows" })).toHaveLength(2);
});

test("renders a low-confidence default table as review-required and keeps source rows reachable", async () => {
  renderDashboard({ manifestData: reviewDefaultManifest });
  const user = userEvent.setup();

  await screen.findByText("Review required before presentation");

  expect(screen.getAllByText("Repeated header row")).toHaveLength(2);
  expect(
    screen.getAllByText(
      "This table stays source-first until its structure is reviewed, so it is not promoted as presentation-ready by default.",
    ),
  ).toHaveLength(2);
  expect(screen.getByText("Charts stay locked until review")).toBeInTheDocument();
  expect(screen.getByText("Source rows stay reachable while review is pending, so you can inspect the ambiguous table before presenting it.")).toBeInTheDocument();

  await user.click(screen.getAllByRole("button", { name: "Jump to source rows" })[0]);

  await waitFor(() =>
    expect(screen.getByRole("region", { name: "Source-aware rows" })).toHaveFocus(),
  );
  expect(screen.getByRole("cell", { name: "Alpha" })).toBeInTheDocument();
});

test("shows a terminal failure state when the manifest is failed", async () => {
  renderDashboard({
    manifestData: failedManifest,
    runtimeData: runtimeForStatus("failed"),
  });

  await screen.findByRole("alert");

  expect(screen.getByText("Dashboard unavailable")).toBeInTheDocument();
  expect(
    screen.getByText("We couldn't prepare a dashboard from this workbook."),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "We couldn't finish this upload. Review the failure details and upload the report again.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Upload another report" })).toHaveAttribute(
    "href",
    "/",
  );
  expect(screen.queryByText("Loading dashboard...")).not.toBeInTheDocument();
});

test("shows a no-table terminal state instead of staying busy forever", async () => {
  renderDashboard({ manifestData: noTableManifest });

  await screen.findByRole("heading", { name: "No readable tables found" });

  expect(
    screen.getByText(
      /report\.xlsx finished processing, but we couldn't find a presentation-ready table on Summary\./i,
    ),
  ).toBeInTheDocument();
  expect(screen.getByText("Sheet Summary has headers only.")).toBeInTheDocument();
  expect(screen.queryByText("Loading dashboard...")).not.toBeInTheDocument();
});

test("shows a cancelled terminal state with a recovery hint", async () => {
  renderDashboard({
    manifestData: cancelledManifest,
    runtimeData: runtimeForStatus("cancelled"),
  });

  await screen.findByRole("heading", { name: "Upload cancelled" });

  expect(
    screen.getByText(
      "This upload was cancelled before the dashboard was fully prepared. Upload the report again to continue.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "This upload was cancelled. Upload the report again when you are ready to rebuild the dashboard.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Upload another report" })).toHaveAttribute(
    "href",
    "/",
  );
  expect(screen.queryByText("Loading dashboard...")).not.toBeInTheDocument();
});

test("shows a distinct not-found state for missing upload routes", async () => {
  renderDashboard({
    fetchImpl: (url) => {
      if (url.includes("/manifest")) {
        return Promise.resolve(
          apiErrorResponse(
            "We couldn't find that upload. Please upload the report again.",
            "upload_not_found",
            404,
          ),
        );
      }

      return Promise.reject(new Error(`Unhandled request: ${url}`));
    },
  });

  await screen.findByRole("heading", { name: "Upload not found" });

  expect(
    screen.getByText("We couldn't find that upload. Please upload the report again."),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Return to the landing page and upload the report again to continue."),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Return to upload" })).toHaveAttribute(
    "href",
    "/",
  );
});

test("clears stale preview rows while the next table preview is loading", async () => {
  const nextPreview = deferredResponse(previews.tbl_01_01);
  renderDashboard({
    fetchImpl: (url) => {
      if (url.includes("/manifest")) {
        return Promise.resolve(apiResponse(manifest));
      }
      if (url.includes("/tables/tbl_02_01/preview")) {
        return Promise.resolve(apiResponse(previews.tbl_02_01));
      }
      if (url.includes("/tables/tbl_01_01/preview")) {
        return nextPreview.promise;
      }
      return Promise.reject(new Error(`Unhandled request: ${url}`));
    },
  });
  const user = userEvent.setup();

  await screen.findByRole("cell", { name: "Platform" });
  await user.click(screen.getByRole("button", { name: /tbl_01_01/i }));

  await waitFor(() =>
    expect(screen.getByText("report.xlsx / Paged / tbl_01_01")).toBeInTheDocument(),
  );
  await waitFor(() => expect(screen.queryByRole("cell", { name: "Platform" })).not.toBeInTheDocument());
  expect(screen.getByText("Preview rows are loading.")).toBeInTheDocument();

  nextPreview.resolve();

  expect(await screen.findByText("Alpha")).toBeInTheDocument();
  expect(screen.getByText("Beta")).toBeInTheDocument();
});

test("shows only valid chart options and switches the chart without changing the dataset", async () => {
  renderDashboard();
  const user = userEvent.setup();

  await screen.findByText("Value by Team", { selector: "figcaption" });

  expect(screen.getByRole("button", { name: "Column" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Bar" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Pie" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Line" })).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Bar" }));

  expect(
    screen.getByText(
      "Horizontal bar chart using Value as the measure and Team as the presentation dimension.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByRole("cell", { name: "Platform" })).toBeInTheDocument();
});

test("derives stronger scoped chart pairings from the selected result and lets the user switch between them", async () => {
  const user = userEvent.setup();
  const scopedSearchData: PreviewSearchResponse = {
    query: "gastos",
    resultCount: 1,
    limit: 6,
    truncated: false,
    tookMs: 17,
    results: [
      {
        tableId: "tbl_02_01",
        sheetId: "sheet_02",
        sheetName: "Costs",
        matchCount: 4,
        matchedColumns: ["GASTOS DIARIOS", "Custo"],
        snippet: "GASTOS DIARIOS: Hotel / Custo: R$ 340,40",
        previewRows: [
          {
            rowIndex: 0,
            matchedColumns: ["GASTOS DIARIOS", "Custo"],
            row: {
              "GASTOS DIARIOS": "Hotel",
              Custo: "R$ 340,40",
              Modelo: "Viagem",
              Detalhe: "Hospedagem com cafe incluso",
            },
          },
          {
            rowIndex: 1,
            matchedColumns: ["GASTOS DIARIOS", "Custo"],
            row: {
              "GASTOS DIARIOS": "Taxi",
              Custo: "R$ 58,90",
              Modelo: "Transporte",
              Detalhe: "Deslocamento aeroporto",
            },
          },
          {
            rowIndex: 2,
            matchedColumns: ["GASTOS DIARIOS", "Custo"],
            row: {
              "GASTOS DIARIOS": "Taxi",
              Custo: "R$ 42,15",
              Modelo: "Transporte",
              Detalhe: "Reuniao cliente centro",
            },
          },
          {
            rowIndex: 3,
            matchedColumns: ["GASTOS DIARIOS", "Custo"],
            row: {
              "GASTOS DIARIOS": "Alimentacao",
              Custo: "R$ 75,00",
              Modelo: "Reembolso",
              Detalhe: "Jantar com equipe do projeto",
            },
          },
        ],
      },
    ],
  };

  renderDashboard({ searchData: scopedSearchData });

  await screen.findByRole("cell", { name: "Platform" });
  await user.type(screen.getByRole("searchbox", { name: "Search preview rows" }), "gastos");
  await user.click(await screen.findByRole("button", { name: "Present Costs / tbl_02_01" }));

  const chartFocus = await screen.findByRole("combobox", { name: "Chart focus" });
  const optionLabels = within(chartFocus)
    .getAllByRole("option")
    .map((option) => option.textContent);

  expect(optionLabels).toContain("Custo by GASTOS DIARIOS");
  expect(optionLabels).toContain("Custo by Modelo");
  expect(screen.getByText("Scoped charts")).toBeInTheDocument();
  expect(screen.getByText("Focus: Custo by GASTOS DIARIOS")).toBeInTheDocument();
  expect(
    screen.getByText("Custo by GASTOS DIARIOS", { selector: "figcaption" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("cell", { name: "Hotel" })).toBeInTheDocument();
  expect(screen.queryByRole("cell", { name: "Platform" })).not.toBeInTheDocument();

  await user.selectOptions(chartFocus, "pair-custo-modelo");

  expect(screen.getByText("Focus: Custo by Modelo")).toBeInTheDocument();
  expect(screen.getByText("Custo by Modelo", { selector: "figcaption" })).toBeInTheDocument();
});

test("paginates preview rows without leaving presenter mode or reloading the manifest", async () => {
  let manifestRequests = 0;
  renderDashboard({
    fetchImpl: (url) => {
      if (url.includes("/manifest")) {
        manifestRequests += 1;
        return Promise.resolve(apiResponse(manifest));
      }

      if (url.includes("/tables/tbl_02_01/preview")) {
        const page = Number(new URL(url, "https://doc2dash.test").searchParams.get("page") ?? "1");
        const pagePayload: PreviewPayload =
          page === 2
            ? {
                ...previews.tbl_02_01,
                page: 2,
                pageSize: 25,
                totalPages: 2,
                hasPreviousPage: true,
                hasNextPage: false,
                rowCount: 30,
                rows: [
                  { Team: "Team 26", Value: 26 },
                  { Team: "Team 27", Value: 27 },
                  { Team: "Team 28", Value: 28 },
                  { Team: "Team 29", Value: 29 },
                  { Team: "Team 30", Value: 30 },
                ],
              }
            : {
                ...previews.tbl_02_01,
                page: 1,
                pageSize: 25,
                totalPages: 2,
                hasPreviousPage: false,
                hasNextPage: true,
                rowCount: 30,
                rows: Array.from({ length: 25 }, (_, index) => ({
                  Team: `Team ${index + 1}`,
                  Value: index + 1,
                })),
              };
        return Promise.resolve(apiResponse(pagePayload));
      }

      if (url.includes("/tables/tbl_01_01/preview")) {
        return Promise.resolve(apiResponse(previews.tbl_01_01));
      }

      if (url.includes("/search")) {
        return Promise.resolve(apiResponse(searchResponse));
      }

      return Promise.reject(new Error(`Unhandled request: ${url}`));
    },
  });
  const user = userEvent.setup();

  await screen.findByRole("cell", { name: "Team 1" });
  await user.click(screen.getByRole("button", { name: "Enter presenter mode" }));
  await user.keyboard("{ArrowRight}{ArrowRight}");

  expect(screen.getByText("Focus: preview")).toBeInTheDocument();
  expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Reading navigation" })).toBeInTheDocument();
  expect(screen.getByText("Preview page 1 of 2")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Next page" }));

  expect(await screen.findByRole("cell", { name: "Team 26" })).toBeInTheDocument();
  expect(screen.getByText("Focus: preview")).toBeInTheDocument();
  expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  expect(screen.getByText("Preview page 2 of 2")).toBeInTheDocument();
  expect(manifestRequests).toBe(1);
});

test("filters the current preview table and resets pagination to the first filtered page", async () => {
  renderDashboard({
    fetchImpl: (url) => {
      if (url.includes("/manifest")) {
        return Promise.resolve(apiResponse(manifest));
      }

      if (url.includes("/tables/tbl_02_01/preview")) {
        const parsedUrl = new URL(url, "https://doc2dash.test");
        const page = Number(parsedUrl.searchParams.get("page") ?? "1");
        const filter = (parsedUrl.searchParams.get("filter") ?? "").toLowerCase();
        const rows = Array.from({ length: 30 }, (_, index) => ({
          Team: `Team ${index + 1}`,
          Value: index + 1,
        })).filter((row) =>
          filter ? Object.values(row).some((value) => String(value).toLowerCase().includes(filter)) : true,
        );
        const pageSize = 10;
        const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
        const boundedPage = Math.min(page, totalPages);
        const startIndex = (boundedPage - 1) * pageSize;
        return Promise.resolve(
          apiResponse({
            ...previews.tbl_02_01,
            page: boundedPage,
            pageSize,
            totalPages,
            hasPreviousPage: boundedPage > 1,
            hasNextPage: boundedPage < totalPages,
            rowCount: rows.length,
            rows: rows.slice(startIndex, startIndex + pageSize),
          }),
        );
      }

      if (url.includes("/tables/tbl_01_01/preview")) {
        return Promise.resolve(apiResponse(previews.tbl_01_01));
      }

      if (url.includes("/search")) {
        return Promise.resolve(apiResponse(searchResponse));
      }

      return Promise.reject(new Error(`Unhandled request: ${url}`));
    },
  });
  const user = userEvent.setup();

  await screen.findByRole("cell", { name: "Team 1" });
  await user.click(screen.getByRole("button", { name: "Next page" }));

  expect(await screen.findByRole("cell", { name: "Team 11" })).toBeInTheDocument();
  expect(screen.getByText("Preview page 2 of 3")).toBeInTheDocument();

  await user.type(
    screen.getByRole("searchbox", { name: "Filter current preview table" }),
    "Team 2",
  );

  expect(await screen.findByRole("cell", { name: "Team 2" })).toBeInTheDocument();
  expect(screen.queryByRole("cell", { name: "Team 11" })).not.toBeInTheDocument();
  expect(screen.getByText("Preview page 1 of 2")).toBeInTheDocument();
  expect(
    screen.getByText("Showing page 1 of 2 from 11 rows."),
  ).toBeInTheDocument();
});

test("keeps presenter mode stable while search jumps to a different table preview", async () => {
  renderDashboard();
  const user = userEvent.setup();

  await screen.findByRole("cell", { name: "Platform" });
  await user.click(screen.getByRole("button", { name: "Enter presenter mode" }));
  await user.keyboard("{ArrowRight}{ArrowRight}");

  expect(screen.getByText("Focus: preview")).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Source-aware rows" })).toBeInTheDocument();
  expect(
    screen.queryByRole("navigation", { name: "Workbook navigation" }),
  ).not.toBeInTheDocument();

  await user.type(screen.getByRole("searchbox", { name: "Search preview rows" }), "alpha");

  const searchResult = await screen.findByRole("button", {
    name: "Present Paged / tbl_01_01",
  });
  await user.click(searchResult);

  await waitFor(() =>
    expect(screen.getByText("report.xlsx / Paged / tbl_01_01")).toBeInTheDocument(),
  );
  expect(screen.getByRole("region", { name: "Scoped search presentation" })).toBeInTheDocument();
  expect(screen.getByText("Focus: preview")).toBeInTheDocument();
  expect(screen.getByText("3 of 3")).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Source-aware rows" })).toBeInTheDocument();
  expect(
    screen.queryByRole("navigation", { name: "Workbook navigation" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("cell", { name: "Alpha" })).toBeInTheDocument();
  expect(screen.queryByRole("cell", { name: "Beta" })).not.toBeInTheDocument();
  expect(screen.getByText("Scoped charts")).toBeInTheDocument();
  expect(screen.getByText("Showing the rows captured by the active search result. Exit scoped view to return to the full table preview.")).toBeInTheDocument();
  expect(screen.getByRole("searchbox", { name: "Search preview rows" })).toHaveValue("");
});

test("keeps preview filtering scoped to the selected search result and clears it on exit", async () => {
  renderDashboard();
  const user = userEvent.setup();

  await screen.findByRole("cell", { name: "Platform" });
  await user.type(screen.getByRole("searchbox", { name: "Search preview rows" }), "alpha");
  await user.click(
    await screen.findByRole("button", { name: "Present Paged / tbl_01_01" }),
  );

  const previewFilter = screen.getByRole("searchbox", {
    name: "Filter current preview table",
  });
  await user.type(previewFilter, "Beta");

  expect(
    await screen.findByText('No rows in this preview match "Beta".'),
  ).toBeInTheDocument();
  expect(screen.getByText("Scoped charts")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Exit scoped view" }));

  await waitFor(() =>
    expect(
      screen.queryByRole("region", { name: "Scoped search presentation" }),
    ).not.toBeInTheDocument(),
  );
  expect(screen.getByRole("searchbox", { name: "Filter current preview table" })).toHaveValue(
    "",
  );
  expect(screen.getByRole("cell", { name: "Platform" })).toBeInTheDocument();
  expect(screen.getByRole("cell", { name: "Architecture" })).toBeInTheDocument();
});

test("exits scoped search presentation back to the workbook context predictably", async () => {
  renderDashboard();
  const user = userEvent.setup();

  await screen.findByRole("cell", { name: "Platform" });
  await user.type(screen.getByRole("searchbox", { name: "Search preview rows" }), "alpha");
  await user.click(
    await screen.findByRole("button", { name: "Present Paged / tbl_01_01" }),
  );

  expect(await screen.findByRole("region", { name: "Scoped search presentation" })).toBeInTheDocument();
  expect(screen.getByRole("cell", { name: "Alpha" })).toBeInTheDocument();
  expect(screen.queryByRole("cell", { name: "Beta" })).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Exit scoped view" }));

  await waitFor(() =>
    expect(
      screen.queryByRole("region", { name: "Scoped search presentation" }),
    ).not.toBeInTheDocument(),
  );
  expect(screen.getByText("report.xlsx / Summary / tbl_02_01")).toBeInTheDocument();
  expect(screen.getByRole("cell", { name: "Platform" })).toBeInTheDocument();
  expect(screen.getByRole("cell", { name: "Architecture" })).toBeInTheDocument();
});

test("switches the AI narrative to the selected scoped result and restores the table narrative on exit", async () => {
  renderDashboard({
    narrativeData: (_url, init) => {
      const payload = JSON.parse(String(init?.body ?? "{}")) as {
        mode: "table" | "scopedResult";
      };
      return payload.mode === "scopedResult" ? scopedNarrative : tableNarrative;
    },
  });
  const user = userEvent.setup();

  await screen.findByText(
    "This selected table appears to compare delivery value across teams in a compact summary format.",
  );
  await user.type(screen.getByRole("searchbox", { name: "Search preview rows" }), "alpha");
  await user.click(
    await screen.findByRole("button", { name: "Present Paged / tbl_01_01" }),
  );

  expect(
    await screen.findByText(
      "In these scoped rows, Alpha appears as the only matched product in the active result.",
    ),
  ).toBeInTheDocument();
  const scopedNarrativeRegion = screen.getByRole("region", { name: "AI narrative summary" });
  expect(within(scopedNarrativeRegion).getByText("Scope: Scoped result")).toBeInTheDocument();
  expect(
    within(scopedNarrativeRegion).getByText(
      "Caveat: This narrative is based only on the selected scoped search result.",
    ),
  ).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Exit scoped view" }));

  expect(
    await screen.findByText(
      "This selected table appears to compare delivery value across teams in a compact summary format.",
    ),
  ).toBeInTheDocument();
  expect(
    within(screen.getByRole("region", { name: "AI narrative summary" })).getByText(
      "Scope: Selected table",
    ),
  ).toBeInTheDocument();
});

test("reuses the same active narrative state in presenter mode", async () => {
  renderDashboard();
  const user = userEvent.setup();

  await screen.findByText(
    "This selected table appears to compare delivery value across teams in a compact summary format.",
  );
  await user.click(screen.getByRole("button", { name: "Enter presenter mode" }));

  expect(screen.getByText("Focus: summary")).toBeInTheDocument();
  expect(
    screen.getByText(
      "This selected table appears to compare delivery value across teams in a compact summary format.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "AI narrative summary" })).toBeInTheDocument();
});

test("opens long-form search detail in a separate inspector surface", async () => {
  renderDashboard({
    searchData: {
      query: "mozilla",
      resultCount: 1,
      limit: 6,
      truncated: false,
      tookMs: 41,
      results: [
        {
          tableId: "tbl_01_01",
          sheetId: "sheet_01",
          sheetName: "Paged",
          matchCount: 2,
          matchedColumns: ["Notes", "Status"],
          snippet:
            "Notes: Mozilla log entry with a very long explanation about the request chain and the resulting response payload.",
          previewRows: [
            {
              rowIndex: 0,
              matchedColumns: ["Notes"],
              row: {
                Notes:
                  "Mozilla log entry with a very long explanation about the request chain and the resulting response payload.",
                Status: "warn",
                Duration: 182,
                Environment: "prod",
              },
            },
          ],
        },
      ],
    },
  });
  const user = userEvent.setup();

  await screen.findByRole("cell", { name: "Platform" });
  await user.type(screen.getByRole("searchbox", { name: "Search preview rows" }), "mozilla");
  await user.click(await screen.findByRole("button", { name: "Inspect rows" }));

  const inspector = await screen.findByRole("dialog", { name: "Paged / tbl_01_01" });
  expect(inspector).toBeInTheDocument();
  expect(inspector).toHaveTextContent(/Mozilla log entry/i);
  expect(screen.getByText("Environment")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Close" }));

  await waitFor(() =>
    expect(screen.queryByRole("dialog", { name: "Paged / tbl_01_01" })).not.toBeInTheDocument(),
  );
});

test("supports arrow-key workbook navigation for keyboard users", async () => {
  renderDashboard();
  const user = userEvent.setup();

  await screen.findByRole("cell", { name: "Platform" });

  const reviewTable = screen.getByRole("button", { name: /tbl_01_01/i });
  const trustedTable = screen.getByRole("button", { name: /tbl_02_01/i });

  reviewTable.focus();
  await user.keyboard("{ArrowDown}");
  expect(trustedTable).toHaveFocus();

  await user.keyboard("{ArrowUp}");
  expect(reviewTable).toHaveFocus();

  await user.keyboard("{End}");
  expect(trustedTable).toHaveFocus();

  await user.keyboard("{Home}");
  expect(reviewTable).toHaveFocus();
});

test("condenses fragmented workbook navigation into featured and overflow tables", async () => {
  renderDashboard({
    manifestData: fragmentedManifest,
    previewData: fragmentedPreviews,
  });
  const user = userEvent.setup();

  await screen.findByText("report.xlsx / Validation report / tbl_01_04");

  expect(screen.getByText("4 featured / 2 more")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /tbl_01_03/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /tbl_01_04/i })).toBeInTheDocument();
  const overflowGroup = screen
    .getByText("More extracted tables (2)")
    .closest("details");
  expect(overflowGroup).not.toHaveAttribute("open");

  await user.click(screen.getByText("More extracted tables (2)"));

  expect(overflowGroup).toHaveAttribute("open");
  expect(await screen.findByRole("button", { name: /tbl_01_01/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /tbl_01_06/i })).toBeInTheDocument();
});

test("keeps presenter shortcuts scoped away from the focused search input", async () => {
  renderDashboard();
  const user = userEvent.setup();

  await screen.findByRole("cell", { name: "Platform" });
  await user.click(screen.getByRole("button", { name: "Enter presenter mode" }));

  const searchInput = screen.getByRole("searchbox", { name: "Search preview rows" });
  await user.click(searchInput);
  await user.keyboard("a");
  await user.keyboard("{ArrowRight}{ArrowLeft}{Escape}");

  expect(screen.getByText("Focus: summary")).toBeInTheDocument();
  expect(screen.getByText("1 of 3")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Exit presenter mode" })).toBeInTheDocument();
  expect(searchInput).toHaveValue("a");
});

test("shows a searching state instead of a premature empty state for eligible queries", async () => {
  const pendingSearch = deferredResponse<PreviewSearchResponse>({
    query: "gamma",
    resultCount: 0,
    limit: 6,
    truncated: false,
    tookMs: 31,
    results: [],
  });
  renderDashboard({
    fetchImpl: (url) => {
      if (url.includes("/manifest")) {
        return Promise.resolve(apiResponse(manifest));
      }
      if (url.includes("/preview")) {
        const tableId = url.split("/tables/")[1]?.split("/preview")[0] ?? "tbl_02_01";
        return Promise.resolve(apiResponse(previews[tableId as keyof typeof previews]));
      }
      if (url.includes("/search")) {
        return pendingSearch.promise;
      }
      return Promise.reject(new Error(`Unhandled request: ${url}`));
    },
  });
  const user = userEvent.setup();

  await screen.findByRole("cell", { name: "Platform" });
  await user.type(screen.getByRole("searchbox", { name: "Search preview rows" }), "gamma");

  expect(await screen.findByText("Searching preview rows...")).toBeInTheDocument();
  expect(screen.queryByText("No preview matches found.")).not.toBeInTheDocument();

  pendingSearch.resolve();

  expect(await screen.findByText("No preview matches found.")).toBeInTheDocument();
});
