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

const pieChartTable: TableSummary = {
  ...lineChartTable,
  tableId: "tbl_01_02",
  availableChartTypes: ["pie", "table"],
  defaultChartType: "pie",
  chartRecommendations: [
    {
      chartType: "pie",
      title: "Value split by Team",
      description: "Pie chart using Value as the measure and Team as the presentation dimension.",
      dimensionLabel: "Team",
      measureLabel: "Value",
      points: [
        { label: "Platform", value: 10 },
        { label: "Finance", value: 6 },
        { label: "Sales", value: 4 },
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

  const latestLineCall = newPlotMock.mock.calls[newPlotMock.mock.calls.length - 1] as unknown[];
  const traces = latestLineCall[1] as Array<Record<string, unknown>>;
  const layout = latestLineCall[2] as Record<string, unknown> & {
    hoverlabel: Record<string, unknown>;
    transition: Record<string, unknown>;
    legend: Record<string, unknown>;
    xaxis: Record<string, unknown>;
  };
  const config = latestLineCall[3] as Record<string, unknown>;
  expect(config.displayModeBar).toBe("hover");
  expect(layout.hoverlabel.bgcolor).toBe("rgba(22, 34, 41, 0.94)");
  expect(layout.transition.duration).toBe(260);
  expect(layout.legend.orientation).toBe("h");
  expect(layout.xaxis.gridcolor).toBe("rgba(42, 88, 119, 0.14)");
  expect(traces[0].mode).toContain("text");
  expect(traces[0].hovertemplate).toContain("<extra></extra>");
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

test("gives pie charts the polished legend and premium hover treatment", async () => {
  render(
    <ChartPanel
      onSelect={() => undefined}
      selectedChartType="pie"
      table={pieChartTable}
    />,
  );

  await waitFor(() => expect(newPlotMock).toHaveBeenCalled());

  const latestPieCall = newPlotMock.mock.calls[newPlotMock.mock.calls.length - 1] as unknown[];
  const traces = latestPieCall[1] as Array<Record<string, unknown>>;
  const layout = latestPieCall[2] as Record<string, unknown> & {
    legend: Record<string, unknown>;
  };
  expect(traces[0].type).toBe("pie");
  expect(traces[0].hole).toBe(0.62);
  expect(traces[0].textinfo).toBe("percent");
  expect(traces[0].hovertemplate).toContain("%{percent}");
  expect(layout.showlegend).toBe(true);
  expect(layout.legend.bgcolor).toBe("rgba(255, 250, 242, 0.68)");
});
