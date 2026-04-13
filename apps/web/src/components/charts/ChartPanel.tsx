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
const chartTone = {
  ink: "#16313d",
  muted: "#52656d",
  grid: "rgba(42, 88, 119, 0.14)",
  gridStrong: "rgba(42, 88, 119, 0.24)",
  panel: "rgba(255, 250, 242, 0.68)",
  plot: "rgba(255, 250, 242, 0.84)",
  teal: "#0b7a75",
  tealDeep: "#084f4b",
  amber: "#be6b2d",
  amberDeep: "#7b441e",
  slate: "#2a5877",
  tooltip: "rgba(22, 34, 41, 0.94)",
  tooltipLine: "rgba(255, 250, 242, 0.18)",
};
const chartFonts = {
  body: '"Aptos", "Segoe UI Variable Text", "Trebuchet MS", sans-serif',
  display: '"Georgia", "Iowan Old Style", serif',
};
const pointLabelLimit = 8;

const plotlyConfig = {
  displayModeBar: "hover",
  displaylogo: false,
  responsive: true,
  modeBarButtonsToRemove: [
    "lasso2d",
    "select2d",
    "autoScale2d",
    "toggleSpikelines",
    "zoom2d",
    "pan2d",
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
      <div className="chart-panel__controls">
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
        ) : (
          <div className="chart-panel__focus-picker chart-panel__focus-picker--static">
            <span className="search-panel__label">Chart focus</span>
            <div className="chart-panel__focus-static">
              {activeOption?.label ?? recommendation.title}
            </div>
          </div>
        )}
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
        <div className="chart-figure__header">
          <div className="chart-figure__heading">
            <p className="chart-figure__eyebrow">{formatChartTypeLabel(activeChartType)} view</p>
            <figcaption className="chart-figure__title">{recommendation.title}</figcaption>
          </div>
          <div className="chart-figure__tokens" aria-label="Chart summary">
            {recommendation.dimensionLabel ? (
              <span className="chart-figure__token">
                Dimension: {recommendation.dimensionLabel}
              </span>
            ) : null}
            {recommendation.measureLabel ? (
              <span className="chart-figure__token">
                Measure: {recommendation.measureLabel}
              </span>
            ) : null}
            <span className="chart-figure__token">
              {recommendation.points.length} point{recommendation.points.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
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
  const formattedValues = values.map((value) => formatChartValue(value, values));
  const axisLabels = labels.map((label) => wrapAxisLabel(label));
  const hoverPairs = labels.map((label, index) => [label, formattedValues[index]]);
  const showPointLabels = points.length > 0 && points.length <= pointLabelLimit;

  const baseLayout = {
    paper_bgcolor: "rgba(0, 0, 0, 0)",
    plot_bgcolor: chartTone.plot,
    margin: {
      t: chartType === "pie" ? 12 : 28,
      r: chartType === "pie" ? 20 : 28,
      b: chartType === "column" || chartType === "line" || chartType === "area" ? 84 : 42,
      l: chartType === "bar" ? 140 : 62,
      pad: 6,
    },
    font: {
      family: chartFonts.body,
      color: chartTone.ink,
      size: 13,
    },
    hoverlabel: {
      bgcolor: chartTone.tooltip,
      bordercolor: chartTone.tooltipLine,
      font: {
        family: chartFonts.body,
        color: "#fffaf2",
        size: 13,
      },
      align: "left",
      namelength: -1,
    },
    transition: {
      duration: 260,
      easing: "cubic-in-out",
    },
    legend: {
      orientation: "h",
      yanchor: "bottom",
      y: -0.24,
      xanchor: "left",
      x: 0,
      bgcolor: chartTone.panel,
      bordercolor: chartTone.grid,
      borderwidth: 1,
      font: {
        family: chartFonts.body,
        color: chartTone.muted,
        size: 12,
      },
      itemclick: false,
      itemdoubleclick: false,
    },
  };

  if (chartType === "pie") {
    return {
      data: [
        {
          type: "pie",
          labels,
          values,
          customdata: hoverPairs,
          hole: 0.62,
          sort: false,
          direction: "clockwise",
          pull: buildSliceOffsets(values),
          marker: {
            colors: buildPieColors(points.length),
            line: { color: "rgba(255, 250, 242, 0.94)", width: 2 },
          },
          textinfo: points.length <= 5 ? "percent" : "none",
          textposition: points.length <= 5 ? "inside" : "none",
          insidetextorientation: "horizontal",
          textfont: {
            family: chartFonts.body,
            color: "#fffaf2",
            size: 12,
          },
          hovertemplate:
            `<b>%{customdata[0]}</b><br>${recommendation.measureLabel ?? "Value"}: %{customdata[1]}` +
            `<br>%{percent}<extra></extra>`,
        },
      ],
      layout: {
        ...baseLayout,
        showlegend: points.length > 1,
        margin: {
          ...baseLayout.margin,
          b: 92,
        },
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
          y: axisLabels,
          text: showPointLabels ? formattedValues : undefined,
          textposition: showPointLabels ? "outside" : undefined,
          cliponaxis: false,
          customdata: hoverPairs,
          marker: {
            color: buildEmphasisColors(values, chartTone.teal, chartTone.amber),
            line: { color: hexToRgba(chartTone.tealDeep, 0.22), width: 1.2 },
          },
          textfont: {
            family: chartFonts.body,
            color: chartTone.ink,
            size: 12,
          },
          hovertemplate:
            `<b>%{customdata[0]}</b><br>${recommendation.measureLabel ?? "Value"}: %{customdata[1]}` +
            `<extra></extra>`,
        },
      ],
      layout: {
        ...baseLayout,
        xaxis: buildAxis(recommendation.measureLabel),
        yaxis: buildAxis(recommendation.dimensionLabel, { isCategoryAxis: true }),
        hovermode: "closest",
        showlegend: false,
      },
    };
  }

  if (chartType === "column") {
    return {
      data: [
        {
          type: "bar",
          x: axisLabels,
          y: values,
          text: showPointLabels ? formattedValues : undefined,
          textposition: showPointLabels ? "outside" : undefined,
          cliponaxis: false,
          customdata: hoverPairs,
          marker: {
            color: buildEmphasisColors(values, chartTone.amber, chartTone.teal),
            line: { color: hexToRgba(chartTone.amberDeep, 0.24), width: 1.2 },
          },
          textfont: {
            family: chartFonts.body,
            color: chartTone.ink,
            size: 12,
          },
          hovertemplate:
            `<b>%{customdata[0]}</b><br>${recommendation.measureLabel ?? "Value"}: %{customdata[1]}` +
            `<extra></extra>`,
        },
      ],
      layout: {
        ...baseLayout,
        xaxis: buildAxis(recommendation.dimensionLabel, { isCategoryAxis: true }),
        yaxis: buildAxis(recommendation.measureLabel),
        hovermode: "closest",
        showlegend: false,
      },
    };
  }

  return {
    data: [
      {
        type: "scatter",
        mode: showPointLabels ? "lines+markers+text" : "lines+markers",
        x: axisLabels,
        y: values,
        text: showPointLabels ? formattedValues : undefined,
        textposition: "top center",
        customdata: hoverPairs,
        line: {
          color: chartType === "area" ? chartTone.teal : chartTone.slate,
          width: chartType === "area" ? 3.8 : 3.4,
          shape: "linear",
        },
        marker: {
          color: chartTone.amber,
          size: showPointLabels ? 9 : 8,
          line: { color: "rgba(255, 250, 242, 0.94)", width: 2 },
        },
        fill: chartType === "area" ? "tozeroy" : undefined,
        fillcolor: chartType === "area" ? hexToRgba(chartTone.teal, 0.14) : undefined,
        hovertemplate:
          `<b>%{customdata[0]}</b><br>${recommendation.measureLabel ?? "Value"}: %{customdata[1]}` +
          `<extra></extra>`,
        textfont: {
          family: chartFonts.body,
          color: chartTone.ink,
          size: 12,
        },
      },
    ],
    layout: {
      ...baseLayout,
      xaxis: buildAxis(recommendation.dimensionLabel, { isCategoryAxis: true }),
      yaxis: buildAxis(recommendation.measureLabel),
      hovermode: "x unified",
      showlegend: false,
    },
  };
}

function buildAxis(
  title: string | null,
  options?: {
    isCategoryAxis?: boolean;
  },
) {
  return {
    title: title
      ? {
          text: title,
          standoff: 12,
          font: {
            family: chartFonts.body,
            color: chartTone.muted,
            size: 12,
          },
        }
      : undefined,
    automargin: true,
    ticks: "",
    tickfont: {
      family: chartFonts.body,
      color: chartTone.muted,
      size: 12,
    },
    gridcolor: chartTone.grid,
    zerolinecolor: chartTone.gridStrong,
    linecolor: chartTone.gridStrong,
    showline: false,
    showgrid: true,
    fixedrange: false,
  };
}

function formatChartValue(value: number, allValues: number[]) {
  const hasFractions = allValues.some((item) => !Number.isInteger(item));
  const maxAbs = Math.max(...allValues.map((item) => Math.abs(item)), 0);
  const maximumFractionDigits = hasFractions ? (maxAbs >= 100 ? 1 : 2) : 0;
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value);
}

function buildEmphasisColors(values: number[], baseHex: string, accentHex: string) {
  if (!values.length) {
    return [baseHex];
  }
  const max = Math.max(...values);
  const min = Math.min(...values);
  const spread = Math.max(max - min, 1);

  return values.map((value) => {
    if (value === max) {
      return accentHex;
    }
    const ratio = (value - min) / spread;
    return hexToRgba(baseHex, 0.5 + ratio * 0.28);
  });
}

function buildPieColors(count: number) {
  return Array.from({ length: count }, (_, index) => chartPalette[index % chartPalette.length]);
}

function buildSliceOffsets(values: number[]) {
  if (!values.length) {
    return [];
  }
  const max = Math.max(...values);
  return values.map((value) => (value === max ? 0.03 : 0));
}

function wrapAxisLabel(label: string, lineLength = 16, maxLines = 2) {
  const normalized = String(label).replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length <= lineLength) {
    return normalized;
  }

  const words = normalized.split(" ");
  if (words.length === 1) {
    return truncateLabel(normalized, lineLength * maxLines + 1);
  }

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= lineLength) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }
    currentLine = word;

    if (lines.length === maxLines - 1) {
      break;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length > maxLines) {
    lines.length = maxLines;
  }

  const consumed = lines.join(" ");
  if (consumed.length < normalized.length) {
    lines[lines.length - 1] = truncateLabel(lines[lines.length - 1], lineLength);
  }

  return lines.join("<br>");
}

function truncateLabel(value: string, limit: number) {
  return value.length <= limit ? value : `${value.slice(0, Math.max(limit - 1, 1))}…`;
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const [r, g, b] = normalized.match(/.{1,2}/g)?.map((segment) => parseInt(segment, 16)) ?? [
    0, 0, 0,
  ];
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
