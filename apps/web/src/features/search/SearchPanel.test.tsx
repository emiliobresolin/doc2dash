import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { SearchPanel } from "./SearchPanel";
import type { PreviewSearchResponse } from "../../types/search";

const response: PreviewSearchResponse = {
  query: "platform",
  resultCount: 1,
  limit: 6,
  truncated: false,
  tookMs: 18,
  results: [
    {
      tableId: "tbl_01_01",
      sheetId: "sheet_01",
      sheetName: "Summary",
      matchCount: 2,
      matchedColumns: ["team"],
      snippet: "team: Platform",
      previewRows: [
        {
          rowIndex: 0,
          matchedColumns: ["team"],
          row: { team: "Platform", value: 4 },
        },
      ],
    },
  ],
};

const longFormResponse: PreviewSearchResponse = {
  query: "mozilla",
  resultCount: 1,
  limit: 6,
  truncated: false,
  tookMs: 41,
  results: [
    {
      tableId: "tbl_99_01",
      sheetId: "sheet_99",
      sheetName: "Logs",
      matchCount: 2,
      matchedColumns: ["Notes", "Environment"],
      snippet:
        "Notes: Mozilla log entry with a very long explanation about the request chain and the resulting response payload.",
      previewRows: [
        {
          rowIndex: 0,
          matchedColumns: ["Notes", "Environment"],
          row: {
            Notes:
              "Mozilla log entry with a very long explanation about the request chain and the resulting response payload.",
            Environment: "production",
            Duration: 182,
            Status: "warn",
            Team: "platform",
          },
        },
      ],
    },
  ],
};

function SearchPanelHarness() {
  const [query, setQuery] = useState("platform");
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [inspectedTableId, setInspectedTableId] = useState<string | null>(null);

  return (
    <>
      <SearchPanel
        errorMessage={null}
        onInspectResult={(result) => setInspectedTableId(result.tableId)}
        onQueryChange={setQuery}
        onSelectResult={(result) => setSelectedTableId(result.tableId)}
        presenting={false}
        query={query}
        response={response}
        searching={false}
      />
      <p>{selectedTableId ?? "none"}</p>
      <p>{inspectedTableId ? `inspect:${inspectedTableId}` : "inspect-none"}</p>
    </>
  );
}

test("renders highlighted compact results and selects a table from search", async () => {
  render(<SearchPanelHarness />);
  const user = userEvent.setup();

  expect(screen.getByRole("searchbox", { name: "Search preview rows" })).toBeInTheDocument();
  expect(screen.getByText("1 result in 18 ms")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Present Summary / tbl_01_01" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Inspect rows" })).toBeInTheDocument();
  expect(screen.getAllByText("Platform")[0].tagName).toBe("MARK");

  await user.click(screen.getByRole("button", { name: "Present Summary / tbl_01_01" }));

  expect(screen.getByText("tbl_01_01")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Inspect rows" }));

  expect(screen.getByText("inspect:tbl_01_01")).toBeInTheDocument();
});

test("keeps long and wide result rows compact without dropping the inspect action", () => {
  render(
    <SearchPanel
      errorMessage={null}
      onInspectResult={() => undefined}
      onQueryChange={() => undefined}
      onSelectResult={() => undefined}
      presenting={false}
      query="mozilla"
      response={longFormResponse}
      searching={false}
    />,
  );

  expect(screen.getByText("+2 more fields")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Present Logs / tbl_99_01" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Inspect rows" })).toBeInTheDocument();
});
