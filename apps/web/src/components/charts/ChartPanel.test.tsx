import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

test("surfaces scoped chart focus options without changing the chart type switcher contract", async () => {
  const onSelectChartOption = vi.fn();
  const user = userEvent.setup();

  render(
    <ChartPanel
      chartOptions={[
        {
          key: "value-by-team",
          label: "Value by Team",
          table: {
            availableChartTypes: ["column", "bar", "pie", "table"],
            defaultChartType: "column",
            chartSourceType: "generated",
            chartSourceReason: "Generated from the selected scoped rows.",
            chartRecommendations: lineChartTable.chartRecommendations.filter(
              (recommendation) =>
                recommendation.chartType !== "line" &&
                recommendation.chartType !== "area",
            ),
          },
        },
        {
          key: "value-by-region",
          label: "Value by Region",
          table: {
            availableChartTypes: ["column", "bar", "table"],
            defaultChartType: "bar",
            chartSourceType: "generated",
            chartSourceReason: "Generated from the selected scoped rows.",
            chartRecommendations: [
              {
                chartType: "column",
                title: "Value by Region",
                description:
                  "Column chart using Value as the measure and Region as the presentation dimension.",
                dimensionLabel: "Region",
                measureLabel: "Value",
                points: [
                  { label: "EMEA", value: 12 },
                  { label: "AMER", value: 8 },
                ],
                truncated: false,
              },
              {
                chartType: "bar",
                title: "Value by Region",
                description:
                  "Horizontal bar chart using Value as the measure and Region as the presentation dimension.",
                dimensionLabel: "Region",
                measureLabel: "Value",
                points: [
                  { label: "EMEA", value: 12 },
                  { label: "AMER", value: 8 },
                ],
                truncated: false,
              },
              {
                chartType: "table",
                title: "Readable table view",
                description:
                  "The readable table remains available whenever a chart would hide detail.",
                dimensionLabel: null,
                measureLabel: null,
                points: [],
                truncated: false,
              },
            ],
          },
        },
      ]}
      onSelect={() => undefined}
      onSelectChartOption={onSelectChartOption}
      selectedChartOptionKey="value-by-team"
      selectedChartType="column"
      table={lineChartTable}
    />,
  );

  expect(screen.getByRole("combobox", { name: "Chart focus" })).toHaveValue(
    "value-by-team",
  );
  expect(screen.getByText("Focus: Value by Team")).toBeInTheDocument();

  await user.selectOptions(
    screen.getByRole("combobox", { name: "Chart focus" }),
    "value-by-region",
  );

  expect(onSelectChartOption).toHaveBeenCalledWith("value-by-region");
});
