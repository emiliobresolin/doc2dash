import { buildScopedChartModel } from "./scopedCharts";
import type { SearchResult } from "../types/search";

test("derives multiple meaningful scoped chart pairings from selected rows", () => {
  const model = buildScopedChartModel({
    tableId: "tbl_01_01",
    sheetId: "sheet_01",
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
  });

  const optionLabels = model.options.map((option) => option.label);

  expect(optionLabels).toContain("Custo by GASTOS DIARIOS");
  expect(optionLabels).toContain("Custo by Modelo");
  expect(model.options[0]?.table.defaultChartType).not.toBe("table");
  expect(model.options[0]?.table.availableChartTypes).toContain("column");
  expect(model.options[0]?.table.chartRecommendations[0]?.title).toMatch(/Custo/);
});

test("falls back to a readable scoped table when the selected rows are not chartable", () => {
  const model = buildScopedChartModel({
    tableId: "tbl_01_05",
    sheetId: "sheet_01",
    sheetName: "Logs",
    matchCount: 2,
    matchedColumns: ["Detalhe"],
    snippet: "Detalhe: very long request payload trace",
    previewRows: [
      {
        rowIndex: 0,
        matchedColumns: ["Detalhe"],
        row: {
          Detalhe: "Very long request payload trace for tenant A",
          Payload: "request=/alpha status=warn trace=9c2f",
          RequestId: "req-001",
        },
      },
      {
        rowIndex: 1,
        matchedColumns: ["Detalhe"],
        row: {
          Detalhe: "Very long request payload trace for tenant B",
          Payload: "request=/beta status=warn trace=72df",
          RequestId: "req-002",
        },
      },
    ],
  } satisfies SearchResult);

  expect(model.options).toHaveLength(1);
  expect(model.options[0]?.label).toBe("Readable table view");
  expect(model.options[0]?.table.defaultChartType).toBe("table");
  expect(model.options[0]?.table.availableChartTypes).toEqual(["table"]);
});

test("avoids identifier-driven scoped chart pairings for log-style results", () => {
  const model = buildScopedChartModel({
    tableId: "tbl_02_01",
    sheetId: "sheet_02",
    sheetName: "Logs",
    matchCount: 3,
    matchedColumns: ["browserVersion"],
    snippet: "browserVersion: Mozilla/5.0 ...",
    previewRows: [
      {
        rowIndex: 0,
        matchedColumns: ["browserVersion"],
        row: {
          browserVersion: "Mozilla/5.0 Chrome/146.0.0.0",
          component: "ACTIONS :_interact",
          event: "Resource Operation (REST API)",
          requestId: "41e6aa87-42f7-4a6a-88ba-118cbb3719e2",
          id: 2350415386,
          serverTime: 51,
        },
      },
      {
        rowIndex: 1,
        matchedColumns: ["browserVersion"],
        row: {
          browserVersion: "Mozilla/5.0 Chrome/146.0.0.0",
          component: "ACTIONS :_interact",
          event: "Resource Operation (REST API)",
          requestId: "c814c325-ce1d-4ae8-84fc-63408052482b",
          id: 2350415385,
          serverTime: 28,
        },
      },
      {
        rowIndex: 2,
        matchedColumns: ["browserVersion"],
        row: {
          browserVersion: "Mozilla/5.0 Chrome/146.0.0.0",
          component: "Other Commerce Rules",
          event: "Commerce Rule",
          requestId: "7cf1d171-9207-476e-b81a-39507836a664",
          id: 2350415384,
          serverTime: 31,
        },
      },
    ],
  });

  const optionLabels = model.options.map((option) => option.label);

  expect(optionLabels).not.toContain("serverTime by id");
  expect(optionLabels).not.toContain("serverTime by requestId");
  expect(optionLabels).toContain("serverTime by component");
});

test("falls back to the readable scoped table when only a numeric field varies", () => {
  const model = buildScopedChartModel({
    tableId: "tbl_01_05",
    sheetId: "sheet_01",
    sheetName: "Jan 2025",
    matchCount: 3,
    matchedColumns: ["Detalhe", "GASTOS DIARIOS"],
    snippet: "GASTOS DIARIOS: mercado praia | Detalhe: Mercado",
    previewRows: [
      {
        rowIndex: 14,
        matchedColumns: ["GASTOS DIARIOS", "Detalhe"],
        row: {
          "GASTOS DIARIOS": "mercado praia",
          Custo: 14,
          Modelo: "DEBITO",
          Detalhe: "Mercado",
        },
      },
      {
        rowIndex: 15,
        matchedColumns: ["GASTOS DIARIOS", "Detalhe"],
        row: {
          "GASTOS DIARIOS": "mercado praia",
          Custo: 19,
          Modelo: "DEBITO",
          Detalhe: "Mercado",
        },
      },
      {
        rowIndex: 16,
        matchedColumns: ["GASTOS DIARIOS", "Detalhe"],
        row: {
          "GASTOS DIARIOS": "mercado praia",
          Custo: 49,
          Modelo: "DEBITO",
          Detalhe: "Mercado",
        },
      },
    ],
  });

  expect(model.options).toHaveLength(1);
  expect(model.options[0]?.label).toBe("Readable table view");
  expect(model.options[0]?.table.defaultChartType).toBe("table");
});

test("keeps ordinal numeric dimensions categorical instead of turning them into fake time axes", () => {
  const model = buildScopedChartModel({
    tableId: "tbl_10_01",
    sheetId: "sheet_10",
    sheetName: "Ordinal summary",
    matchCount: 4,
    matchedColumns: ["MonthNo", "Cost"],
    snippet: "MonthNo: 1 / Cost: 10",
    previewRows: [
      {
        rowIndex: 0,
        matchedColumns: ["MonthNo", "Cost"],
        row: { MonthNo: 1, Cost: 10, Label: "Jan" },
      },
      {
        rowIndex: 1,
        matchedColumns: ["MonthNo", "Cost"],
        row: { MonthNo: 2, Cost: 12, Label: "Feb" },
      },
      {
        rowIndex: 2,
        matchedColumns: ["MonthNo", "Cost"],
        row: { MonthNo: 3, Cost: 9, Label: "Mar" },
      },
      {
        rowIndex: 3,
        matchedColumns: ["MonthNo", "Cost"],
        row: { MonthNo: 4, Cost: 11, Label: "Apr" },
      },
    ],
  });

  const monthOption = model.options.find((option) => option.label === "Cost by MonthNo");

  expect(monthOption).toBeDefined();
  expect(monthOption?.table.defaultChartType).toBe("column");
  expect(monthOption?.table.availableChartTypes).toEqual(["column", "bar", "pie", "table"]);
  expect(monthOption?.table.chartRecommendations[0]?.points.map((point) => point.label)).toEqual([
    "1",
    "2",
    "3",
    "4",
  ]);
  expect(
    monthOption?.table.chartRecommendations.flatMap((recommendation) =>
      recommendation.points.map((point) => point.label),
    ),
  ).not.toContain("1970-01-01");
});

test("does not emit reverse measure-vs-measure scoped pairings", () => {
  const model = buildScopedChartModel({
    tableId: "tbl_10_02",
    sheetId: "sheet_10",
    sheetName: "Measure pairings",
    matchCount: 4,
    matchedColumns: ["MonthNo", "Cost"],
    snippet: "MonthNo: 1 / Cost: 10",
    previewRows: [
      {
        rowIndex: 0,
        matchedColumns: ["MonthNo", "Cost"],
        row: { MonthNo: 1, Cost: 10, Revenue: 13 },
      },
      {
        rowIndex: 1,
        matchedColumns: ["MonthNo", "Cost"],
        row: { MonthNo: 2, Cost: 12, Revenue: 14 },
      },
      {
        rowIndex: 2,
        matchedColumns: ["MonthNo", "Cost"],
        row: { MonthNo: 3, Cost: 9, Revenue: 12 },
      },
      {
        rowIndex: 3,
        matchedColumns: ["MonthNo", "Cost"],
        row: { MonthNo: 4, Cost: 11, Revenue: 15 },
      },
    ],
  });

  const optionLabels = model.options.map((option) => option.label);

  expect(optionLabels).toContain("Cost by MonthNo");
  expect(optionLabels).toContain("Revenue by MonthNo");
  expect(optionLabels).not.toContain("MonthNo by Cost");
  expect(optionLabels).not.toContain("MonthNo by Revenue");
  expect(optionLabels).not.toContain("Revenue by Cost");
  expect(optionLabels).not.toContain("Cost by Revenue");
});
