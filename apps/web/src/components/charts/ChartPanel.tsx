import { useEffect, useRef } from "react";

import {
  formatChartSourceLabel,
  formatChartTypeLabel,
  getChartRecommendation,
  getSafeChartType,
} from "../../lib/charts";
import type { ChartRecommendation, ChartType } from "../../types/manifest";
import type { ChartConfigLike, ScopedChartOption } from "../../lib/scopedCharts";

interface ChartPanelProps {
  chartOptions?: ScopedChartOption[];
  onSelectChartOption?: (optionKey: string) => void;
  selectedChartType: ChartType;
  selectedChartOptionKey?: string | null;
  table: ChartConfigLike;
  onSelect: (chartType: ChartType) => void;
}

const chartPalette = ["#0b7a75", "#be6b2d", "#2a5877", "#8c5c99", "#647a2a", "#b4495f"];

const plotlyConfig = {
  displayModeBar: true,
  displaylogo: false,
  responsive: true,
  modeBarButtonsToRemove: [
    "lasso2d",
    "select2d",
    "autoScale2d",
    "toggleSpikelines",
  ],
} as const;

export function ChartPanel({
  chartOptions,
  onSelectChartOption,
  table,
  selectedChartType,
  selectedChartOptionKey,
  onSelect,
}: ChartPanelProps) {
  const activeOption =
    chartOptions?.find((option) => option.key === selectedChartOptionKey) ??
    chartOptions?.[0] ??
    null;
  const chartTable = activeOption?.table ?? table;
  const activeChartType = getSafeChartType(chartTable, selectedChartType);
  const recommendation = getChartRecommendation(chartTable, activeChartType);

  return (
    <div className="chart-panel">
      {chartOptions && chartOptions.length > 1 ? (
        <div className="chart-panel__focus-picker">
          <label className="search-panel__label" htmlFor="chart-focus">
            Chart focus
          </label>
          <select
            className="chart-panel__focus-select"
            id="chart-focus"
            onChange={(event) => onSelectChartOption?.(event.target.value)}
            value={activeOption?.key ?? chartOptions[0]?.key ?? ""}
          >
            {chartOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="chart-switcher" role="toolbar" aria-label="Chart type options">
        {chartTable.availableChartTypes.map((chartType) => (
          <button
            key={chartType}
            aria-pressed={chartType === activeChartType}
            className={
              chartType === activeChartType
                ? "chart-switcher__button chart-switcher__button--active"
                : "chart-switcher__button"
            }
            onClick={() => onSelect(chartType)}
            type="button"
          >
            {formatChartTypeLabel(chartType)}
          </button>
        ))}
      </div>

      <div className="chart-panel__meta">
        <span className="badge">
          Provenance: {formatChartSourceLabel(chartTable.chartSourceType)}
        </span>
        <span className="badge">
          Selected: {formatChartTypeLabel(activeChartType)}
        </span>
        {activeOption ? <span className="badge">Focus: {activeOption.label}</span> : null}
        {recommendation.truncated ? (
          <span className="badge">Trimmed for readability</span>
        ) : null}
      </div>

      <p className="card-copy">{recommendation.description}</p>
      <p className="provenance-copy">{chartTable.chartSourceReason}</p>

      <figure className="chart-figure">
        <figcaption className="chart-figure__title">{recommendation.title}</figcaption>
        <ChartCanvas chartType={activeChartType} recommendation={recommendation} />
      </figure>
    </div>
  );
}

function ChartCanvas({
  chartType,
  recommendation,
}: {
  chartType: ChartType;
  recommendation: ChartRecommendation;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const target = container;

    if (chartType === "table" || !recommendation.points.length) {
      return;
    }

    let active = true;
    let purgePlot: (() => void) | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let removeWindowResize: (() => void) | null = null;

    async function renderPlot() {
      const Plotly = (await import("plotly.js-dist-min")).default;
      const PlotlyWithResize = Plotly as typeof Plotly & {
        Plots?: {
          resize?: (target: HTMLDivElement) => void;
        };
      };
      if (!active) {
        return;
      }

      const figure = buildPlotlyFigure(chartType, recommendation);
      await Plotly.newPlot(target, figure.data, figure.layout, plotlyConfig);
      const resizePlot = () => PlotlyWithResize.Plots?.resize?.(target);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (active) {
            resizePlot();
          }
        });
      });

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
          if (active) {
            resizePlot();
          }
        });
        resizeObserver.observe(target);
      }

      const handleWindowResize = () => {
        if (active) {
          resizePlot();
        }
      };
      window.addEventListener("resize", handleWindowResize);
      removeWindowResize = () => window.removeEventListener("resize", handleWindowResize);

      if (document.fonts?.ready) {
        void document.fonts.ready.then(() => {
          if (active) {
            resizePlot();
          }
        });
      }

      purgePlot = () => {
        resizeObserver?.disconnect();
        removeWindowResize?.();
        Plotly.purge(target);
      };
    }

    void renderPlot();

    return () => {
      active = false;
      purgePlot?.();
      resizeObserver?.disconnect();
      removeWindowResize?.();
    };
  }, [chartType, recommendation]);

  if (chartType === "table") {
    return (
      <div aria-label={recommendation.title} className="chart-empty-state" role="img">
        <strong>Readable table view</strong>
        <p>This dataset stays available as a table when detail matters more than a chart.</p>
      </div>
    );
  }

  if (!recommendation.points.length) {
    return (
      <div aria-label={recommendation.title} className="chart-empty-state" role="img">
        <strong>No chart points available</strong>
        <p>The current table does not expose enough stable points for this chart yet.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      aria-label={recommendation.title}
      className="chart-figure__plot"
      role="img"
    />
  );
}

function buildPlotlyFigure(chartType: ChartType, recommendation: ChartRecommendation) {
  const points = recommendation.points;
  const labels = points.map((point) => point.label);
  const values = points.map((point) => point.value);

  const baseLayout = {
    paper_bgcolor: "rgba(0, 0, 0, 0)",
    plot_bgcolor: "rgba(255, 250, 242, 0.48)",
    margin: {
      t: 24,
      r: 20,
      b: chartType === "column" || chartType === "line" || chartType === "area" ? 72 : 28,
      l: chartType === "bar" ? 112 : 56,
    },
    font: {
      family: "var(--font-body)",
      color: "#1d2c32",
    },
  };

  if (chartType === "pie") {
    return {
      data: [
        {
          type: "pie",
          labels,
          values,
          hole: 0.46,
          sort: false,
          marker: { colors: chartPalette },
          textinfo: "label+percent",
          hovertemplate: `%{label}: %{value}<extra>${recommendation.measureLabel ?? "Value"}</extra>`,
        },
      ],
      layout: {
        ...baseLayout,
        showlegend: false,
      },
    };
  }

  if (chartType === "bar") {
    return {
      data: [
        {
          type: "bar",
          orientation: "h",
          x: values,
          y: labels,
          marker: {
            color: "#0b7a75",
            line: { color: "#084f4b", width: 1 },
          },
          hovertemplate: `%{y}: %{x}<extra>${recommendation.measureLabel ?? "Value"}</extra>`,
        },
      ],
      layout: {
        ...baseLayout,
        xaxis: { title: recommendation.measureLabel, automargin: true },
        yaxis: { title: recommendation.dimensionLabel, automargin: true },
        hovermode: "closest",
      },
    };
  }

  if (chartType === "column") {
    return {
      data: [
        {
          type: "bar",
          x: labels,
          y: values,
          marker: {
            color: "#be6b2d",
            line: { color: "#7b441e", width: 1 },
          },
          hovertemplate: `%{x}: %{y}<extra>${recommendation.measureLabel ?? "Value"}</extra>`,
        },
      ],
      layout: {
        ...baseLayout,
        xaxis: { title: recommendation.dimensionLabel, automargin: true, tickangle: -18 },
        yaxis: { title: recommendation.measureLabel, automargin: true },
        hovermode: "closest",
      },
    };
  }

  return {
    data: [
      {
        type: "scatter",
        mode: "lines+markers",
        x: labels,
        y: values,
        line: { color: "#0b7a75", width: 4, shape: "linear" },
        marker: { color: "#be6b2d", size: 9 },
        fill: chartType === "area" ? "tozeroy" : undefined,
        fillcolor: chartType === "area" ? "rgba(11, 122, 117, 0.16)" : undefined,
        hovertemplate: `%{x}: %{y}<extra>${recommendation.measureLabel ?? "Value"}</extra>`,
      },
    ],
    layout: {
      ...baseLayout,
      xaxis: { title: recommendation.dimensionLabel, automargin: true, tickangle: -18 },
      yaxis: { title: recommendation.measureLabel, automargin: true },
      hovermode: "x unified",
    },
  };
}
