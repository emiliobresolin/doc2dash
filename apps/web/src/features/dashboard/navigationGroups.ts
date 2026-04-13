import type { SheetSummary, TableSummary, UploadManifest } from "../../types/manifest";

export interface WorkbookNavigationGroup {
  sheet: SheetSummary;
  featuredTables: TableSummary[];
  overflowTables: TableSummary[];
}

function presentationWeight(table: TableSummary) {
  const rowCount = table.stats.rowCount;
  const columnCount = table.stats.columnCount;

  let score = 0;

  if (!table.reviewRequired) {
    score += 8;
  }
  if (table.stats.primaryMode === "chart") {
    score += 14;
  } else if (table.stats.primaryMode === "summary") {
    score += 10;
  }
  if (table.stats.chartFriendly) {
    score += 5;
  }
  score += Math.min(rowCount, 40) / 8;
  score += Math.min(columnCount, 8) / 2;
  score += table.confidence * 2;

  if (rowCount <= 0 || columnCount <= 0) {
    score -= 16;
  } else if (rowCount === 1 && columnCount === 1) {
    score -= 14;
  } else if (rowCount === 1) {
    score -= 10;
  } else if (columnCount === 1 && rowCount <= 6) {
    score -= 8;
  }

  return score;
}

function featuredLimitForTableCount(tableCount: number) {
  if (tableCount <= 4) {
    return tableCount;
  }
  if (tableCount <= 8) {
    return 4;
  }
  return 3;
}

export function buildWorkbookNavigationGroups(
  manifest: UploadManifest | null,
): WorkbookNavigationGroup[] {
  if (!manifest) {
    return [];
  }

  return manifest.sheets
    .filter(
      (sheet) =>
        !sheet.isEmpty || manifest.tables.some((table) => table.sheetId === sheet.sheetId),
    )
    .map((sheet) => {
      const sheetTables = manifest.tables.filter((table) => table.sheetId === sheet.sheetId);
      const featuredLimit = featuredLimitForTableCount(sheetTables.length);
      const featuredIds = new Set(
        [...sheetTables]
          .sort((left, right) => presentationWeight(right) - presentationWeight(left))
          .slice(0, featuredLimit)
          .map((table) => table.tableId),
      );

      if (
        manifest.defaultView.tableId &&
        sheetTables.some((table) => table.tableId === manifest.defaultView.tableId)
      ) {
        featuredIds.add(manifest.defaultView.tableId);
      }

      const featuredTables = sheetTables.filter((table) => featuredIds.has(table.tableId));
      const overflowTables = sheetTables.filter((table) => !featuredIds.has(table.tableId));

      return {
        sheet,
        featuredTables,
        overflowTables,
      };
    });
}
