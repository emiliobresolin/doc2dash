import type { SearchResult } from "../../types/search";

interface SearchResultListProps {
  onInspect: (result: SearchResult) => void;
  query: string;
  results: SearchResult[];
  onSelect: (result: SearchResult) => void;
}

export function SearchResultList({
  onInspect,
  query,
  results,
  onSelect,
}: SearchResultListProps) {
  return (
    <ul className="search-results" role="listbox" aria-label="Search results">
      {results.map((result) => (
        <li className="search-results__item" key={`${result.tableId}-${result.sheetId}`}>
          <article className="search-result-card">
            <div className="search-result-card__header">
              <strong>
                {result.sheetName} / {result.tableId}
              </strong>
              <span className="badge">
                {result.matchCount} match{result.matchCount === 1 ? "" : "es"}
              </span>
            </div>
            <p className="search-result-card__snippet">
              <HighlightedText query={query} text={truncateText(result.snippet, 280)} />
            </p>
            <div className="search-result-card__meta">
              {result.matchedColumns.map((column) => (
                <span className="badge" key={column}>
                  {column}
                </span>
              ))}
            </div>
            <div className="search-result-card__rows">
              {result.previewRows.map((row) => (
                <div className="search-result-card__row" key={`${result.tableId}-${row.rowIndex}`}>
                  <div className="search-result-card__row-header">
                    <span className="badge">Row {row.rowIndex + 1}</span>
                    {hiddenColumnCount(row) ? (
                      <span className="badge">+{hiddenColumnCount(row)} more fields</span>
                    ) : null}
                  </div>
                  <div className="search-result-card__cells">
                    {visibleColumnsForRow(row).map(([column, value]) => (
                      <span
                        className={
                          row.matchedColumns.includes(column)
                            ? "search-result-card__cell search-result-card__cell--matched"
                            : "search-result-card__cell"
                        }
                        key={`${result.tableId}-${row.rowIndex}-${column}`}
                      >
                        <strong>{column}</strong>
                        <span className="search-result-card__cell-value">
                          <HighlightedText
                            query={query}
                            text={truncateText(value === null ? "" : String(value), 180)}
                          />
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="search-result-card__actions">
              <button
                className="search-result-card__action search-result-card__action--primary"
                onClick={() => onSelect(result)}
                type="button"
              >
                Present {result.sheetName} / {result.tableId}
              </button>
              <button
                className="search-result-card__action"
                onClick={() => onInspect(result)}
                type="button"
              >
                Inspect rows
              </button>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}

const MAX_COMPACT_COLUMNS = 3;

function visibleColumnsForRow(row: SearchResult["previewRows"][number]) {
  const orderedColumns = [
    ...row.matchedColumns,
    ...Object.keys(row.row).filter((column) => !row.matchedColumns.includes(column)),
  ];

  return orderedColumns.slice(0, MAX_COMPACT_COLUMNS).map((column) => [column, row.row[column]] as const);
}

function hiddenColumnCount(row: SearchResult["previewRows"][number]) {
  return Math.max(Object.keys(row.row).length - MAX_COMPACT_COLUMNS, 0);
}

function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function HighlightedText({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  const tokens = query
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.length) {
    return <>{text}</>;
  }

  const escapedTokens = tokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const matcher = new RegExp(`(${escapedTokens.join("|")})`, "ig");
  const parts = text.split(matcher).filter((part) => part.length > 0);

  return (
    <>
      {parts.map((part, index) =>
        tokens.some((token) => token.toLowerCase() === part.toLowerCase()) ? (
          <mark key={`${part}-${index}`}>{part}</mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </>
  );
}
