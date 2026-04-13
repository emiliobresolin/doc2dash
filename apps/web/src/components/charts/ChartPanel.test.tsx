import { render, waitFor } from "@testing-library/react";

import { ChartPanel } from "./ChartPanel";
import type { TableSummary } from "../../types/manifest";

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

const lineChartTable: TableSummary = {
  tableId: "tbl_01_01",
  sheetId: "sheet_01",
  confidence: 0.93,
  reviewRequired: false,
  orientation: "long_form",
  detectionReasons: ["Dense region"],
  normalization: {
    status: "none",
    reason: "Already long form",
  },
  availableChartTypes: ["line", "area", "column", "table"],
  defaultChartType: "line",
  chartSourceType: "generated",
  chartSourceReason:
    "No reusable source visual was detected for this table, so the dashboard generated a safe default chart from the profiled columns.",
  chartRecommendations: [
    {
      chartType: "line",
      title: "Value over Month",
      description: "Line chart using Value as the measure and Month as the presentation dimension.",
      dimensionLabel: "Month",
      measureLabel: "Value",
      points: [
        { label: "Jan", value: 10 },
        { label: "Feb", value: 12 },
      ],
      truncated: false,
    },
    {
      chartType: "area",
      title: "Value over Month",
      description: "Area chart using Value as the measure and Month as the presentation dimension.",
      dimensionLabel: "Month",
      measureLabel: "Value",
      points: [
        { label: "Jan", value: 10 },
        { label: "Feb", value: 12 },
      ],
      truncated: false,
    },
    {
      chartType: "column",
      title: "Value by Month",
      description: "Column chart using Value as the measure and Month as the presentation dimension.",
      dimensionLabel: "Month",
      measureLabel: "Value",
      points: [
        { label: "Jan", value: 10 },
        { label: "Feb", value: 12 },
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
    rowCount: 2,
    columnCount: 2,
    chartFriendly: true,
    primaryMode: "chart",
    reason: "Clear dimensions and measures",
  },
};

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

test("resizes line charts after the initial plot mount to stabilize first render", async () => {
  render(
    <ChartPanel
      onSelect={() => undefined}
      selectedChartType="line"
      table={lineChartTable}
    />,
  );

  await waitFor(() => expect(newPlotMock).toHaveBeenCalled());
  await waitFor(() => expect(resizeMock).toHaveBeenCalled());
});
