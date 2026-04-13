import type {
  ChartPoint,
  ChartRecommendation,
  ChartSourceType,
  ChartType,
} from "../types/manifest";
import type { SearchResult } from "../types/search";

type RowValue = string | number | null;
type ScopedRow = Record<string, RowValue>;
type DimensionRole = "categorical" | "datetime";

export interface ChartConfigLike {
  availableChartTypes: ChartType[];
  defaultChartType: ChartType;
  chartSourceType: ChartSourceType;
  chartSourceReason: string;
  chartRecommendations: ChartRecommendation[];
}

export interface ScopedChartOption {
  key: string;
  label: string;
  table: ChartConfigLike;
}

export interface ScopedChartModel {
  defaultOptionKey: string;
  options: ScopedChartOption[];
}

interface ColumnProfile {
  averageLength: number;
  distinctCount: number;
  matched: boolean;
  maxLength: number;
  measureScore: number;
  name: string;
  numericValues: number[];
  role: DimensionRole | "text";
  dimensionScore: number;
  valueCount: number;
}

interface ScopedChartPairing {
  availableChartTypes: ChartType[];
  defaultChartType: ChartType;
  dimension: string;
  dimensionDisplay: string;
  dimensionRole: DimensionRole;
  key: string;
  label: string;
  measure: string;
  measureDisplay: string;
  recommendations: ChartRecommendation[];
  score: number;
  sourceReason: string;
}

const MAX_CATEGORY_POINTS = 12;
const MAX_PIE_SLICES = 6;
const MAX_TIME_POINTS = 24;
const MAX_SCOPED_OPTIONS = 4;

export function buildScopedChartModel(result: SearchResult): ScopedChartModel {
  const rows = result.previewRows.map((previewRow) => previewRow.row);
  const profiles = profileColumns(rows, result.matchedColumns);
  const pairings = buildScopedPairings(rows, profiles);

  if (!pairings.length) {
    const fallbackOption: ScopedChartOption = {
      key: "readable-table",
      label: "Readable table view",
      table: {
        availableChartTypes: ["table"],
        defaultChartType: "table",
        chartSourceType: "generated",
        chartSourceReason:
          "The rows captured by this scoped search result do not expose a stable chart pairing yet, so doc2dash keeps them in a readable table view.",
        chartRecommendations: [
          buildTableRecommendation(
            "These scoped rows are still easier to inspect as a table than as a generated chart.",
          ),
        ],
      },
    };

    return {
      defaultOptionKey: fallbackOption.key,
      options: [fallbackOption],
    };
  }

  const options = pairings.slice(0, MAX_SCOPED_OPTIONS).map((pairing) => ({
    key: pairing.key,
    label: pairing.label,
    table: {
      availableChartTypes: pairing.availableChartTypes,
      defaultChartType: pairing.defaultChartType,
      chartSourceType: "generated" as const,
      chartSourceReason: pairing.sourceReason,
      chartRecommendations: pairing.recommendations,
    },
  }));

  return {
    defaultOptionKey: options[0]?.key ?? "readable-table",
    options,
  };
}

function buildScopedPairings(rows: ScopedRow[], profiles: ColumnProfile[]) {
  const numericMeasures = profiles.filter((profile) => profile.measureScore > 0.35);
  const dimensions = profiles.filter((profile) => profile.dimensionScore > 0.2);
  const pairings: ScopedChartPairing[] = [];

  for (const measure of numericMeasures) {
    for (const dimension of dimensions) {
      if (dimension.name === measure.name) {
        continue;
      }

      const pairing = buildNumericPairing(rows, dimension, measure);
      if (pairing) {
        pairings.push(pairing);
      }
    }
  }

  if (!pairings.length) {
    for (const dimension of dimensions.filter((profile) => profile.dimensionScore > 0.65)) {
      const pairing = buildCountPairing(rows, dimension);
      if (pairing) {
        pairings.push(pairing);
      }
    }
  }

  return dedupePairings(pairings).sort((left, right) => right.score - left.score);
}

function buildNumericPairing(
  rows: ScopedRow[],
  dimension: ColumnProfile,
  measure: ColumnProfile,
): ScopedChartPairing | null {
  if (
    isIdentifierDimension(dimension) ||
    (isMeasureLikeDimension(dimension) && !isOrdinalLikeDimension(dimension))
  ) {
    return null;
  }

  const points =
    dimension.role === "datetime"
      ? buildTimePoints(rows, dimension.name, measure.name)
      : buildCategoryPoints(rows, dimension.name, measure.name);
  if (!points) {
    return null;
  }

  const dimensionDisplay = formatDisplayLabel(dimension.name);
  const measureDisplay = formatDisplayLabel(measure.name);
  const availableChartTypes =
    dimension.role === "datetime"
      ? (["line", "area", "column", "table"] as ChartType[])
      : buildCategoricalChartTypes(points.points);
  const defaultChartType =
    dimension.role === "datetime"
      ? ("line" as ChartType)
      : preferBarChart(points.points)
        ? ("bar" as ChartType)
        : ("column" as ChartType);

  const score =
    measure.measureScore +
    dimension.dimensionScore +
    pairingShapeScore(points.points.length) +
    (dimension.matched ? 0.35 : 0) +
    (measure.matched ? 0.2 : 0) +
    (dimension.role === "datetime" ? 0.15 : 0);

  const recommendations = availableChartTypes
    .filter((chartType) => chartType !== "table")
    .map((chartType) =>
      buildChartRecommendation({
        chartType,
        dimension: dimensionDisplay,
        measure: measureDisplay,
        points: points.points,
        truncated: points.truncated,
      }),
    );
  recommendations.push(
    buildTableRecommendation(
      "The readable scoped rows remain available whenever detail matters more than the chart.",
    ),
  );

  const label = `${measureDisplay} by ${dimensionDisplay}`;
  return {
    availableChartTypes,
    defaultChartType,
    dimension: dimension.name,
    dimensionDisplay,
    dimensionRole: dimension.role === "datetime" ? "datetime" : "categorical",
    key: `pair-${slugify(measure.name)}-${slugify(dimension.name)}`,
    label,
    measure: measure.name,
    measureDisplay,
    recommendations,
    score,
    sourceReason:
      recommendations.length > 2
        ? `Generated from the rows captured by this scoped search result. This selection supports ${measureDisplay} by ${dimensionDisplay} and other usable scoped chart pairings.`
        : `Generated from the rows captured by this scoped search result. ${measureDisplay} by ${dimensionDisplay} is the strongest chartable pairing in this scoped selection.`,
  };
}

function buildCountPairing(
  rows: ScopedRow[],
  dimension: ColumnProfile,
): ScopedChartPairing | null {
  if (isIdentifierDimension(dimension) || isMeasureLikeDimension(dimension)) {
    return null;
  }

  const points = buildCategoryPoints(rows, dimension.name, null);
  if (!points) {
    return null;
  }

  const dimensionDisplay = formatDisplayLabel(dimension.name);
  const measureDisplay = "Entries";
  const availableChartTypes = buildCategoricalChartTypes(points.points);
  const defaultChartType = preferBarChart(points.points) ? ("bar" as ChartType) : ("column" as ChartType);
  const label = `${measureDisplay} by ${dimensionDisplay}`;
  const recommendations = availableChartTypes
    .filter((chartType) => chartType !== "table")
    .map((chartType) =>
      buildChartRecommendation({
        chartType,
        dimension: dimensionDisplay,
        measure: measureDisplay,
        points: points.points,
        truncated: points.truncated,
      }),
    );
  recommendations.push(
    buildTableRecommendation(
      "The readable scoped rows remain available whenever detail matters more than the chart.",
    ),
  );

  return {
    availableChartTypes,
    defaultChartType,
    dimension: dimension.name,
    dimensionDisplay,
    dimensionRole: "categorical",
    key: `count-${slugify(dimension.name)}`,
    label,
    measure: "__row_count__",
    measureDisplay,
    recommendations,
    score: dimension.dimensionScore + pairingShapeScore(points.points.length) - 0.35,
    sourceReason: `Generated from the rows captured by this scoped search result. No stronger numeric measure was available, so doc2dash is charting entry counts by ${dimensionDisplay}.`,
  };
}

function profileColumns(rows: ScopedRow[], matchedColumns: string[]) {
  const columns = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((column) => columns.add(column));
  });
  const matched = new Set(matchedColumns.map((column) => normalizeName(column)));

  return Array.from(columns)
    .map((column) => buildColumnProfile(rows, column, matched.has(normalizeName(column))))
    .filter((profile): profile is ColumnProfile => profile !== null);
}

function buildColumnProfile(
  rows: ScopedRow[],
  column: string,
  matched: boolean,
): ColumnProfile | null {
  const values = rows
    .map((row) => row[column])
    .filter((value): value is string | number => value !== null && String(value).trim().length > 0);
  if (!values.length) {
    return null;
  }

  const normalizedValues = values.map((value) => String(value).trim());
  const numericValues = values
    .map((value) => parseLooseNumber(value))
    .filter((value): value is number => value !== null);
  const dateValues = values
    .map((value) => parseLooseDate(value))
    .filter((value): value is Date => value !== null);
  const distinctCount = new Set(normalizedValues.map((value) => value.toLocaleLowerCase())).size;
  const averageLength =
    normalizedValues.reduce((total, value) => total + value.length, 0) / normalizedValues.length;
  const maxLength = normalizedValues.reduce((current, value) => Math.max(current, value.length), 0);
  const numericRatio = numericValues.length / normalizedValues.length;
  const dateRatio = dateValues.length / normalizedValues.length;
  const role: ColumnProfile["role"] =
    dateRatio >= 0.8 && distinctCount >= 2
      ? "datetime"
      : numericRatio >= 0.75 && distinctCount >= 2
        ? "categorical"
        : "text";

  return {
    averageLength,
    distinctCount,
    matched,
    maxLength,
    measureScore: scoreMeasure(column, numericValues, normalizedValues.length, distinctCount, matched),
    name: column,
    numericValues,
    role,
    dimensionScore: scoreDimension({
      averageLength,
      distinctCount,
      matched,
      maxLength,
      name: column,
      role,
      valueCount: normalizedValues.length,
    }),
    valueCount: normalizedValues.length,
  };
}

function buildTimePoints(
  rows: ScopedRow[],
  dimension: string,
  measure: string,
): { points: ChartPoint[]; truncated: boolean } | null {
  const grouped = new Map<number, number>();

  for (const row of rows) {
    const date = parseLooseDate(row[dimension]);
    const value = parseLooseNumber(row[measure]);
    if (!date || value === null) {
      continue;
    }

    const timestamp = date.getTime();
    grouped.set(timestamp, (grouped.get(timestamp) ?? 0) + value);
  }

  const ordered = Array.from(grouped.entries()).sort((left, right) => left[0] - right[0]);
  if (ordered.length < 2) {
    return null;
  }

  const truncated = ordered.length > MAX_TIME_POINTS;
  const visible = truncated ? ordered.slice(-MAX_TIME_POINTS) : ordered;
  return {
    points: visible.map(([timestamp, value]) => ({
      label: formatDateLabel(new Date(timestamp)),
      value,
    })),
    truncated,
  };
}

function buildCategoryPoints(
  rows: ScopedRow[],
  dimension: string,
  measure: string | null,
): { points: ChartPoint[]; truncated: boolean } | null {
  const grouped = new Map<string, number>();

  for (const row of rows) {
    const label = row[dimension] === null ? "" : String(row[dimension]).trim();
    if (!label) {
      continue;
    }

    if (measure) {
      const value = parseLooseNumber(row[measure]);
      if (value === null) {
        continue;
      }
      grouped.set(label, (grouped.get(label) ?? 0) + value);
    } else {
      grouped.set(label, (grouped.get(label) ?? 0) + 1);
    }
  }

  const ordered = Array.from(grouped.entries()).sort((left, right) => {
    const leftNumeric = parseLooseNumber(left[0]);
    const rightNumeric = parseLooseNumber(right[0]);

    if (leftNumeric !== null && rightNumeric !== null) {
      return leftNumeric - rightNumeric;
    }

    return right[1] - left[1];
  });
  if (ordered.length < 2) {
    return null;
  }

  const truncated = ordered.length > MAX_CATEGORY_POINTS;
  const visible = truncated ? ordered.slice(0, MAX_CATEGORY_POINTS) : ordered;
  return {
    points: visible.map(([label, value]) => ({
      label: formatPointLabel(label),
      value,
    })),
    truncated,
  };
}

function buildCategoricalChartTypes(points: ChartPoint[]): ChartType[] {
  const types: ChartType[] = ["column", "bar"];
  if (supportsPie(points)) {
    types.push("pie");
  }
  types.push("table");
  return types;
}

function supportsPie(points: ChartPoint[]) {
  return (
    points.length > 1 &&
    points.length <= MAX_PIE_SLICES &&
    points.every((point) => point.value >= 0) &&
    points.some((point) => point.value > 0)
  );
}

function preferBarChart(points: ChartPoint[]) {
  if (!points.length) {
    return false;
  }
  const longestLabel = Math.max(...points.map((point) => point.label.length));
  const averageLength =
    points.reduce((total, point) => total + point.label.length, 0) / points.length;
  return averageLength >= 12 || longestLabel >= 18;
}

function buildChartRecommendation({
  chartType,
  dimension,
  measure,
  points,
  truncated,
}: {
  chartType: ChartType;
  dimension: string;
  measure: string;
  points: ChartPoint[];
  truncated: boolean;
}): ChartRecommendation {
  const title =
    chartType === "line" || chartType === "area"
      ? `${measure} over ${dimension}`
      : `${measure} by ${dimension}`;
  const chartLabel = {
    area: "Area chart",
    bar: "Horizontal bar chart",
    column: "Column chart",
    line: "Line chart",
    pie: "Pie chart",
    table: "Table",
  }[chartType];

  let description = `${chartLabel} using ${measure} as the measure and ${dimension} as the presentation dimension.`;
  if (truncated) {
    description += " The chart is trimmed to the most readable scoped points for MVP.";
  }

  return {
    chartType,
    title,
    description,
    dimensionLabel: dimension,
    measureLabel: measure,
    points,
    truncated,
  };
}

function buildTableRecommendation(description: string): ChartRecommendation {
  return {
    chartType: "table",
    title: "Readable table view",
    description,
    dimensionLabel: null,
    measureLabel: null,
    points: [],
    truncated: false,
  };
}

function scoreMeasure(
  name: string,
  numericValues: number[],
  valueCount: number,
  distinctCount: number,
  matched: boolean,
) {
  if (numericValues.length < 2) {
    return -1;
  }

  const normalized = normalizeName(name);
  const ratio = numericValues.length / Math.max(valueCount, 1);
  const distinctNumericCount = new Set(numericValues.map((value) => value.toFixed(4))).size;
  let score = ratio;

  if (distinctNumericCount >= 2) {
    score += 0.45;
  }
  if (matched) {
    score += 0.2;
  }
  if (hasToken(normalized, ["cost", "custo", "value", "amount", "price", "total", "revenue", "score", "count", "duration", "latency", "volume"])) {
    score += 0.65;
  }
  if (hasToken(normalized, ["id", "codigo", "code", "request", "account"])) {
    score -= 0.9;
  }
  if (
    distinctCount === numericValues.length &&
    ratio >= 0.95 &&
    !hasToken(normalized, ["cost", "custo", "value", "amount", "price", "total", "revenue", "score", "count", "duration", "latency", "volume"])
  ) {
    score -= 0.45;
  }

  return score;
}

function scoreDimension({
  averageLength,
  distinctCount,
  matched,
  maxLength,
  name,
  role,
  valueCount,
}: {
  averageLength: number;
  distinctCount: number;
  matched: boolean;
  maxLength: number;
  name: string;
  role: ColumnProfile["role"];
  valueCount: number;
}) {
  if (distinctCount < 2) {
    return -1;
  }

  const normalized = normalizeName(name);
  const ratio = distinctCount / Math.max(valueCount, 1);
  let score = role === "datetime" ? 1.4 : 0.3;

  if (distinctCount <= MAX_CATEGORY_POINTS) {
    score += 0.95;
  } else if (distinctCount <= 24) {
    score += 0.45;
  } else {
    score -= 0.25;
  }

  if (matched) {
    score += 0.25;
  }
  if (hasToken(normalized, ["category", "team", "product", "model", "modelo", "region", "status", "type", "tipo", "gastos", "expense", "day", "date", "month", "period", "summary", "environment"])) {
    score += 0.3;
  }
  if (hasToken(normalized, ["id", "request", "session", "transaction", "trace", "uuid", "ip", "url", "uri", "path", "reference"])) {
    score -= 1.15;
  }
  if (hasToken(normalized, ["detail", "detalhe", "description", "notes", "message", "payload", "trace", "log"])) {
    score -= 0.55;
  }
  if (averageLength >= 28) {
    score -= 0.35;
  }
  if (maxLength >= 60) {
    score -= 0.35;
  }
  if (ratio >= 0.95 && role !== "datetime") {
    score -= 0.45;
  }

  return score;
}

function pairingShapeScore(pointCount: number) {
  if (pointCount >= 3 && pointCount <= 8) {
    return 0.45;
  }
  if (pointCount === 2 || (pointCount >= 9 && pointCount <= 12)) {
    return 0.2;
  }
  return -0.1;
}

function dedupePairings(pairings: ScopedChartPairing[]) {
  const seen = new Set<string>();
  const unique: ScopedChartPairing[] = [];
  for (const pairing of pairings) {
    const dedupeKey = `${normalizeName(pairing.measure)}::${normalizeName(pairing.dimension)}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    unique.push(pairing);
  }
  return unique;
}

function isIdentifierDimension(profile: ColumnProfile) {
  const normalized = normalizeName(profile.name);
  const distinctRatio = profile.distinctCount / Math.max(profile.valueCount, 1);

  if (
    hasToken(normalized, [
      "id",
      "request",
      "session",
      "transaction",
      "trace",
      "uuid",
      "account",
      "code",
      "codigo",
      "reference",
      "ip",
      "url",
      "uri",
      "path",
    ])
  ) {
    return true;
  }

  return (
    distinctRatio >= 0.9 &&
    profile.role !== "datetime" &&
    !isOrdinalLikeDimension(profile)
  );
}

function isMeasureLikeDimension(profile: ColumnProfile) {
  return profile.measureScore > 0.35;
}

function isOrdinalLikeDimension(profile: ColumnProfile) {
  const normalized = normalizeName(profile.name);

  return (
    profile.distinctCount <= MAX_CATEGORY_POINTS &&
    hasToken(normalized, [
      "month",
      "day",
      "week",
      "quarter",
      "period",
      "year",
      "date",
      "index",
      "step",
      "stage",
      "sequence",
      "order",
      "rank",
      "environment",
      "env",
    ])
  );
}

function parseLooseNumber(value: RowValue) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") {
    return null;
  }

  let normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (
    !/^[R$€£¥\s+-]*\d[\d.,\s]*\s*(%|ms|s|sec|min|h)?\s*$/i.test(normalized)
  ) {
    return null;
  }

  normalized = normalized.replace(/\s+/g, "");
  normalized = normalized.replace(/[R$€£¥%]/g, "");
  normalized = normalized.replace(/[^\d,.\-]/g, "");
  if (!normalized || /^-?[.,]+$/.test(normalized)) {
    return null;
  }

  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    const commaParts = normalized.split(",");
    const decimalPart = commaParts[commaParts.length - 1] ?? "";
    if (commaParts.length === 2 && decimalPart.length !== 3) {
      normalized = `${commaParts[0]?.replace(/\./g, "")}.${decimalPart}`;
    } else {
      normalized = normalized.replace(/\./g, "").replace(/,/g, "");
    }
  } else {
    normalized = normalized.replace(/,/g, "");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseLooseDate(value: RowValue) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!normalized || !looksLikeDateString(normalized)) {
    return null;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function looksLikeDateString(value: string) {
  return (
    /^\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:[T\s].*)?$/.test(value) ||
    /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}(?:\s+.*)?$/.test(value) ||
    /^[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4}(?:\s+.*)?$/.test(value)
  );
}

function formatDisplayLabel(value: string) {
  const cleaned = value.replace(/[_\n]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.length > 56 ? `${cleaned.slice(0, 53).trimEnd()}...` : cleaned;
}

function formatPointLabel(value: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > 36 ? `${cleaned.slice(0, 33).trimEnd()}...` : cleaned;
}

function formatDateLabel(value: Date) {
  return value.toISOString().slice(0, 10);
}

function slugify(value: string) {
  return normalizeName(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase();
}

function hasToken(value: string, tokens: string[]) {
  return tokens.some((token) => value.includes(token));
}
