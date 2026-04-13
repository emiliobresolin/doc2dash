import type { SearchResult } from "../../types/search";

interface SearchResultInspectorProps {
  onClose: () => void;
  query: string;
  result: SearchResult | null;
}

export function SearchResultInspector({
  onClose,
  query,
  result,
}: SearchResultInspectorProps) {
  if (!result) {
    return null;
  }

  const columns = Array.from(
    new Set(result.previewRows.flatMap((row) => Object.keys(row.row))),
  );

  return (
    <div className="search-inspector" role="dialog" aria-modal="true" aria-labelledby="search-inspector-title">
      <div className="search-inspector__backdrop" onClick={onClose} />
      <div className="search-inspector__panel">
        <div className="search-inspector__header">
          <div>
            <p className="eyebrow">Search detail</p>
            <h3 id="search-inspector-title">
              {result.sheetName} / {result.tableId}
            </h3>
          </div>
          <button className="search-inspector__close" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <p className="card-copy">
          <HighlightedText query={query} text={result.snippet} />
        </p>
        <div className="badge-row">
          <span className="badge">
            {result.matchCount} match{result.matchCount === 1 ? "" : "es"}
          </span>
          {result.matchedColumns.map((column) => (
            <span className="badge" key={column}>
              {column}
            </span>
          ))}
        </div>
        <div className="search-inspector__table-wrap">
          <table className="preview-table">
            <thead>
              <tr>
                <th scope="col">Row</th>
                {columns.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.previewRows.map((row) => (
                <tr key={`${result.tableId}-${row.rowIndex}`}>
                  <td>{row.rowIndex + 1}</td>
                  {columns.map((column) => (
                    <td key={`${row.rowIndex}-${column}`}>
                      <HighlightedText
                        query={query}
                        text={row.row[column] === null ? "" : String(row.row[column])}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
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
