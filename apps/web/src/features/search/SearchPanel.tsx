import { SearchResultList } from "../../components/preview/SearchResultList";
import type { PreviewSearchResponse, SearchResult } from "../../types/search";

interface SearchPanelProps {
  errorMessage: string | null;
  onInspectResult: (result: SearchResult) => void;
  onQueryChange: (value: string) => void;
  onSelectResult: (result: SearchResult) => void;
  presenting: boolean;
  query: string;
  response: PreviewSearchResponse | null;
  searching: boolean;
}

export function SearchPanel({
  errorMessage,
  onInspectResult,
  onQueryChange,
  onSelectResult,
  presenting,
  query,
  response,
  searching,
}: SearchPanelProps) {
  const trimmedQuery = query.trim();
  const showResults = trimmedQuery.length >= 2;
  const results = response?.results ?? [];
  const resultCount = response?.resultCount ?? results.length;

  return (
    <div
      className={presenting ? "search-panel search-panel--presenting" : "search-panel"}
    >
      <label className="search-panel__label" htmlFor="dashboard-search">
        Search preview rows
      </label>
      <div className="search-panel__control">
        <input
          aria-describedby="dashboard-search-status"
          autoComplete="off"
          className="search-panel__input"
          id="dashboard-search"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search across previewed workbook data"
          type="search"
          value={query}
        />
        {showResults ? (
          <div className="search-panel__dropdown" role="region" aria-label="Preview search">
            <p className="search-panel__status" id="dashboard-search-status">
              {searching
                ? "Searching preview rows..."
                : errorMessage
                  ? errorMessage
                  : results.length
                    ? `${resultCount} result${resultCount === 1 ? "" : "s"} in ${response?.tookMs ?? 0} ms`
                    : "No preview matches found."}
            </p>
            {!searching && !errorMessage && results.length ? (
              <SearchResultList
                onInspect={onInspectResult}
                onSelect={onSelectResult}
                query={query}
                results={results}
              />
            ) : null}
          </div>
        ) : (
          <p className="search-panel__hint" id="dashboard-search-status">
            Type at least 2 characters to search the indexed preview rows.
          </p>
        )}
      </div>
    </div>
  );
}
