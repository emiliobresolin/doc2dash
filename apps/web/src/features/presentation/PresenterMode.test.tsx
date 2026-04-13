import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { AppRoutes } from "../../app/routes";
import type { PreviewPayload, UploadManifest } from "../../types/manifest";

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
    sheetCount: 1,
    tableCount: 1,
    warnings: [],
  },
  presentation: {
    defaultMode: "analysis",
    presenterModeAvailable: true,
  },
  defaultView: {
    sheetId: "sheet_01",
    tableId: "tbl_01_01",
    viewType: "summary_dashboard",
  },
  sheets: [
    {
      sheetId: "sheet_01",
      name: "Summary",
      order: 1,
      rowCount: 4,
      columnCount: 2,
      isEmpty: false,
    },
  ],
  tables: [
    {
      tableId: "tbl_01_01",
      sheetId: "sheet_01",
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

const preview: PreviewPayload = {
  tableId: "tbl_01_01",
  sheetId: "sheet_01",
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
};

const reviewManifest: UploadManifest = {
  ...manifest,
  defaultView: {
    sheetId: "sheet_01",
    tableId: "tbl_01_01",
    viewType: "summary_dashboard",
  },
  tables: [
    {
      ...manifest.tables[0],
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
        rowCount: 3,
        columnCount: 2,
        chartFriendly: false,
        primaryMode: "table",
        reason: "Needs review",
      },
    },
  ],
};

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

test("toggles presenter mode and advances the focused section with keyboard navigation", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      const data = url.includes("/preview") ? preview : manifest;
      return Promise.resolve(
        new Response(JSON.stringify({ data, meta: {}, error: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }),
  );

  render(
    <MemoryRouter
      future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true,
      }}
      initialEntries={["/uploads/upl_demo"]}
    >
      <AppRoutes />
    </MemoryRouter>,
  );

  const user = userEvent.setup();
  await screen.findByText("Platform");
  await user.click(screen.getByRole("button", { name: "Enter presenter mode" }));

  expect(screen.getByText("Focus: summary")).toBeInTheDocument();
  expect(screen.getByText("1 of 3")).toBeInTheDocument();
  expect(
    screen.queryByRole("navigation", { name: "Workbook navigation" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Readable first view" })).toBeInTheDocument();

  await user.keyboard("{ArrowRight}");
  expect(screen.getByText("Focus: charts")).toBeInTheDocument();
  expect(screen.getByText("2 of 3")).toBeInTheDocument();
  expect(
    screen.queryByRole("region", { name: "Readable first view" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Presentation slot" })).toBeInTheDocument();

  await user.keyboard("{ArrowRight}");
  expect(screen.getByText("Focus: preview")).toBeInTheDocument();
  expect(screen.getByText("3 of 3")).toBeInTheDocument();
  expect(
    screen.queryByRole("region", { name: "Presentation slot" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Source-aware rows" })).toBeInTheDocument();

  await user.keyboard("{Escape}");
  expect(screen.getByText("Analysis mode")).toBeInTheDocument();
  expect(screen.getByRole("navigation", { name: "Workbook navigation" })).toBeInTheDocument();
});

test("keeps review-required cues visible in presenter mode", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      const data = url.includes("/preview")
        ? {
            ...preview,
            tableId: "tbl_01_01",
            rows: [
              { Team: "Platform", Value: 4 },
              { Team: "Architecture", Value: 3 },
            ],
          }
        : reviewManifest;
      return Promise.resolve(
        new Response(JSON.stringify({ data, meta: {}, error: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }),
  );

  render(
    <MemoryRouter
      future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true,
      }}
      initialEntries={["/uploads/upl_demo"]}
    >
      <AppRoutes />
    </MemoryRouter>,
  );

  const user = userEvent.setup();
  await screen.findByText("Review required before presentation");
  await user.click(screen.getByRole("button", { name: "Enter presenter mode" }));

  expect(screen.getByLabelText("Current table metadata")).toHaveTextContent("Review required");
  expect(screen.getByRole("region", { name: "Readable first view" })).toBeInTheDocument();

  await user.keyboard("{ArrowRight}");

  expect(screen.getByText("Charts stay locked until review")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Jump to source rows" })).toBeInTheDocument();
});
