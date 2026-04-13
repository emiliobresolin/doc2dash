import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { AppRoutes } from "../../app/routes";
import type { PreviewPayload, UploadManifest } from "../../types/manifest";

const { newPlotMock, purgeMock } = vi.hoisted(() => ({
  newPlotMock: vi.fn(() => Promise.resolve()),
  purgeMock: vi.fn(),
}));

vi.mock("plotly.js-dist-min", () => ({
  default: {
    newPlot: newPlotMock,
    purge: purgeMock,
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
      rowCount: 2,
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
      availableChartTypes: ["column", "bar", "table"],
      defaultChartType: "column",
      chartSourceType: "generated",
      chartSourceReason: "Generated from profiled columns.",
      chartRecommendations: [
        {
          chartType: "column",
          title: "Value by Team",
          description: "Column chart for Team and Value.",
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
          description: "Readable table fallback.",
          dimensionLabel: null,
          measureLabel: null,
          points: [],
          truncated: false,
        },
      ],
      stats: {
        rowCount: 2,
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
  rows: [
    { Team: "Platform", Value: 4 },
    { Team: "Architecture", Value: 3 },
  ],
  rowCount: 2,
  page: 1,
  pageSize: 25,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
};

function apiResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data, meta: {}, error: null }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function apiError(message: string, code = "unsupported_file_type", status = 415) {
  return new Response(
    JSON.stringify({ data: null, meta: {}, error: { code, message } }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}

function renderUploadApp(fetchImpl: (url: string, init?: RequestInit) => Promise<Response>) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
      fetchImpl(String(input), init),
    ),
  );

  return render(
    <MemoryRouter
      future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true,
      }}
      initialEntries={["/"]}
    >
      <AppRoutes />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

test("renders the browser upload landing page instead of the demo handoff", async () => {
  renderUploadApp(() => Promise.reject(new Error("Unexpected network request.")));

  expect(
    screen.getByRole("heading", {
      name: "Upload a report and open its dashboard in one browser flow.",
    }),
  ).toBeInTheDocument();
  expect(
    screen.getByLabelText("Spreadsheet report"),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Upload report" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Open demo route" })).not.toBeInTheDocument();
});

test("uploads a valid file and hands the user into the dashboard route", async () => {
  renderUploadApp((url, init) => {
    if (url.endsWith("/api/uploads") && init?.method === "POST") {
      return Promise.resolve(
        apiResponse({
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
        }, 202),
      );
    }

    if (url.endsWith(`/api/uploads/${manifest.uploadId}/manifest`)) {
      return Promise.resolve(apiResponse(manifest));
    }

    if (url.includes(`/api/uploads/${manifest.uploadId}/tables/${preview.tableId}/preview`)) {
      return Promise.resolve(apiResponse(preview));
    }

    return Promise.reject(new Error(`Unhandled request: ${url}`));
  });

  const user = userEvent.setup();
  const input = screen.getByLabelText("Spreadsheet report");
  const file = new File(["team,value\nplatform,4\n"], "report.csv", {
    type: "text/csv",
  });

  await user.upload(input, file);
  await user.click(screen.getByRole("button", { name: "Upload report" }));

  expect(await screen.findByText("report.xlsx / Summary / tbl_01_01")).toBeInTheDocument();
  expect(await screen.findByRole("cell", { name: "Platform" })).toBeInTheDocument();
});

test("shows a backend rejection message when upload fails", async () => {
  renderUploadApp((url, init) => {
    if (url.endsWith("/api/uploads") && init?.method === "POST") {
      return Promise.resolve(
        apiError("We couldn't read this file. Please upload a valid .xlsx or .csv report.", "corrupt_file", 400),
      );
    }

    return Promise.reject(new Error(`Unhandled request: ${url}`));
  });

  const user = userEvent.setup();
  const input = screen.getByLabelText("Spreadsheet report");
  const file = new File(["fake"], "report.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  await user.upload(input, file);
  await user.click(screen.getByRole("button", { name: "Upload report" }));

  expect(
    await screen.findByRole("alert"),
  ).toHaveTextContent("We couldn't read this file. Please upload a valid .xlsx or .csv report.");
  expect(screen.getByRole("button", { name: "Upload report" })).toBeEnabled();
});

test("blocks unsupported files before the upload request is sent", async () => {
  const fetchSpy = vi.fn();
  renderUploadApp((url, init) => {
    fetchSpy(url, init);
    return Promise.reject(new Error(`Unhandled request: ${url}`));
  });

  const user = userEvent.setup({ applyAccept: false });
  const input = screen.getByLabelText("Spreadsheet report");
  const file = new File(["{}"], "report.json", {
    type: "application/json",
  });

  await user.upload(input, file);
  await user.click(screen.getByRole("button", { name: "Upload report" }));

  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(
      "doc2dash accepts only .xlsx and .csv files.",
    ),
  );
  expect(fetchSpy).not.toHaveBeenCalled();
});

test("blocks oversized files before the upload request is sent", async () => {
  const fetchSpy = vi.fn();
  renderUploadApp((url, init) => {
    fetchSpy(url, init);
    return Promise.reject(new Error(`Unhandled request: ${url}`));
  });

  const user = userEvent.setup();
  const input = screen.getByLabelText("Spreadsheet report");
  const oversized = new File(
    [new Uint8Array(30 * 1024 * 1024 + 1)],
    "report.csv",
    { type: "text/csv" },
  );

  await user.upload(input, oversized);
  await user.click(screen.getByRole("button", { name: "Upload report" }));

  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Files must be 30 MB or smaller.",
    ),
  );
  expect(fetchSpy).not.toHaveBeenCalled();
});
