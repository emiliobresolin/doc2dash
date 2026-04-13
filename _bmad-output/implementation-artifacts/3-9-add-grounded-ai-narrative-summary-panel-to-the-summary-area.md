# Story 3.9: Add Grounded AI Narrative Summary Panel To The Summary Area

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a report reader or presenter,  
I want the summary area to include a grounded AI narrative for the currently active data scope,  
so that I can understand what the selected table or scoped search result appears to represent without needing a chatbot or manual interpretation work.

## Story Goal

Reuse the existing summary area to add a passive AI Narrative Summary panel that:

- describes what the current table or scoped search result appears to represent
- surfaces 2 to 4 concise grounded findings
- adds 1 short caveat when the data is sparse, messy, fragmented, low-confidence, or otherwise weak

This feature must remain commentary, not source-of-truth logic. It must not block dashboard load, must not add a chat workflow, and must stay free of paid model/API dependencies.

## Acceptance Criteria

1. The summary area in the normal dashboard view includes an AI Narrative Summary panel that is visually integrated into the existing summary space instead of expanding the dashboard layout.
2. Presenter mode shows the same AI Narrative Summary content inside the summary section so the narrative remains available during presentation without creating a second summary model.
3. In normal table mode, the AI Narrative Summary is scoped only to the currently selected table and its current deterministic context; it must not summarize the whole workbook.
4. In scoped search presentation mode, the AI Narrative Summary is scoped only to the currently selected search result and its selected scoped rows; it must not merge multiple search results or revert to workbook-wide commentary while scoped mode remains active.
5. Exiting scoped search presentation clears the scoped AI narrative state and restores the normal table-scoped narrative behavior predictably.
6. The AI narrative uses a strict bounded content shape:
   - `description`: one short grounded description
   - `insights`: 2 to 4 concise findings
   - `caveat`: 0 or 1 short caveat
7. Dashboard load remains usable even when AI generation is slow, unavailable, disabled, invalid, or times out. The deterministic summary, chart slot, preview area, and navigation must remain usable without waiting for AI completion.
8. The backend builds a compact structured analysis packet from bounded existing app context rather than sending raw workbook dumps or arbitrary full-table payloads to the model.
9. The feature uses only a no-cost local or self-hosted model runtime path. Paid hosted AI APIs are out of scope. If no local/self-hosted provider is configured, the panel shows a clear non-blocking unavailable state.
10. The AI narrative includes visible grounding cues in the response context, such as active scope, row/column size, confidence/review state, or “scoped result” status, so users can tell what the commentary is based on.
11. The system validates model output against a strict schema and downgrades to a safe unavailable/fallback state when output is malformed, generic, overlong, or unsupported.
12. Automated and manual QA cover:
    - normal table scope
    - scoped search scope
    - scoped exit/reset behavior
    - presenter mode visibility
    - unavailable/timeout fallback
    - hard-fixture realism on current workbook fixtures

## Boundaries / Non-Goals

- Do not add a chatbot, conversational UI, or arbitrary Q&A.
- Do not let AI replace provenance, confidence cues, source-aware preview, chart metadata, or deterministic table logic.
- Do not summarize the whole workbook at once.
- Do not merge multiple search results into one AI narrative.
- Do not let AI output drive chart selection, table detection, normalization, or review-required business logic.
- Do not block the initial dashboard route, selected table load, or presenter mode transition while AI is generating.
- Do not introduce a paid API provider, paid credits, or a dependency on third-party billing.
- Do not expand this story into workbook-wide semantic analytics, recommendation engines, or exportable executive reports.

## Scope Rules

### Default Table Scope

The AI narrative may summarize only the currently selected table using:

- current upload ID
- current sheet and table identifiers
- row and column counts
- deterministic stats and mode (`chart`, `summary`, `table`)
- confidence and review-required state
- normalization status and reason
- chart recommendation context
- bounded preview-derived summaries, numeric summaries, and top categories derived server-side

### Scoped Search Scope

When scoped search presentation is active, the AI narrative may summarize only:

- the selected search result
- the selected result's matched columns
- the selected result's bounded preview rows
- the active table and sheet metadata for that result
- the active scoped chart context

It must not summarize:

- other search results
- the rest of the table outside the scoped result
- the wider workbook while scoped mode is active

### Presenter Mode

Presenter mode reads the same narrative state and must not create a second AI summary model. The summary section in presenter mode shows the same scoped or table narrative that is active in normal analysis mode.

## Data Contract / Output Schema

### Backend Request Contract

Use one narrow backend route for generation, for example:

- `POST /api/uploads/{uploadId}/narratives/summary`

The request body should be one of:

```json
{
  "mode": "table",
  "tableId": "tbl_01_01"
}
```

or

```json
{
  "mode": "scopedResult",
  "tableId": "tbl_01_01",
  "query": "pix",
  "matchedColumns": ["Detalhe", "Modelo"],
  "previewRows": [
    {
      "rowIndex": 12,
      "matchedColumns": ["Detalhe"],
      "row": {
        "GASTOS DIARIOS": "PIX",
        "Custo": 7400,
        "Modelo": "6k+1.4k premio",
        "Detalhe": "DESPESA TOTAL REAL"
      }
    }
  ]
}
```

The frontend may provide the scoped result envelope, but the backend remains responsible for:

- validating the request shape
- enriching the request with trusted manifest/table/chart metadata
- building the compact structured analysis packet actually sent to the model

### Compact Structured Analysis Packet

The provider-facing packet should be built server-side and stay bounded. It should include only compact structured context such as:

- `scopeMode`
- `sheetName`
- `tableId`
- `tableName` or selected-table label
- `rowCount`
- `columnCount`
- `chartFriendly`
- `primaryMode`
- `confidence`
- `reviewRequired`
- `normalizationStatus`
- `normalizationReason`
- `defaultChartType`
- `chartDimension`
- `chartMeasure`
- `topCategories`
- `numericSummary`
- `warnings`
- `scopedMatchedColumns` when applicable
- `scopedPreviewRows` when applicable, bounded to the selected result only

### Model Output Contract

The model output must validate against a strict schema such as:

```json
{
  "description": "Short grounded description of what this data appears to represent.",
  "insights": [
    "Insight 1",
    "Insight 2"
  ],
  "caveat": "Short caveat when the data is weak, sparse, or ambiguous."
}
```

Validation rules:

- `description`: required, string, 1 to 240 chars
- `insights`: required, array, 2 to 4 items
- each insight: string, 1 to 180 chars
- `caveat`: nullable string, 1 to 180 chars when present

### API Response Contract

The backend should return a UI-safe envelope such as:

```json
{
  "status": "ready",
  "scope": {
    "mode": "table",
    "uploadId": "upl_123",
    "tableId": "tbl_01_01"
  },
  "narrative": {
    "description": "This table appears to summarize daily operating costs for December 2025.",
    "insights": [
      "PIX-related rows contribute the largest visible cost entries.",
      "The current view is compact and chart-friendly rather than raw detail-heavy."
    ],
    "caveat": "This summary is based on the active selected table, not the whole workbook."
  },
  "basis": {
    "sheetName": "Copy of Dec 2025",
    "rowCount": 3,
    "columnCount": 4,
    "confidence": 0.68,
    "reviewRequired": false,
    "defaultChartType": "bar"
  },
  "fallbackMessage": null
}
```

The response status should support at least:

- `ready`
- `loading` only as a frontend local state, not a long-lived API contract
- `unavailable`
- `invalid`
- `timeout`

## Loading / Error / Fallback Behavior

- The dashboard route must load as it does today without waiting for AI.
- Once the active table or scoped result is known, the frontend requests the narrative asynchronously.
- While the narrative is being generated, the summary area shows a compact loading state or skeleton inside the existing summary space.
- If the provider is disabled, unavailable, times out, or returns invalid output, the panel shows a bounded non-blocking fallback message such as:
  - `AI narrative unavailable in this environment. Use summary, charts, and source-aware rows to review this table.`
- If the table is low-confidence or review-required, the panel may still render but must show a caveat and must not present overly confident language.
- If the scoped state changes, the in-flight table summary should not overwrite the newly active scoped summary, and vice versa.
- If the user exits scoped state, scoped narrative content clears and the panel returns to the current selected-table narrative.
- If the same scope is revisited during the same upload session, the implementation should prefer a lightweight cache path appropriate to the current file-bundle architecture so the user does not repeatedly wait on the same narrative generation.

## Guardrails Against Hallucination And Fluff

- The model must only describe what is evidenced by the provided structured packet.
- The model must not invent workbook-wide conclusions from table-local or scoped-local inputs.
- The model must not make business recommendations, forecasts, or prescriptive advice unless explicitly supported by the provided evidence, and that is not the goal of this story.
- The model must not claim certainty when confidence is low or review is required.
- Prompts must explicitly prefer cautious wording such as `appears to`, `in this selected table`, or `in the active scoped rows` when the data is partial.
- Outputs that are generic, boilerplate, or ungrounded should be treated as invalid and downgraded to the fallback state.

## Tasks / Subtasks

- [x] Add the passive AI narrative backend surface (AC: 7, 8, 9, 11)
  - [x] Add a narrow summary-generation route under the upload API surface
  - [x] Add provider configuration for a no-cost local or self-hosted model runtime only
  - [x] Keep the feature disabled-by-environment when no provider is configured
- [x] Build the compact analysis packet server-side (AC: 3, 4, 8, 10)
  - [x] Support table-scoped packet generation from manifest/table/preview context
  - [x] Support scoped-result packet generation from the selected search result only
  - [x] Preserve grounding metadata for the UI response envelope
- [x] Validate and sanitize model output (AC: 6, 11)
  - [x] Enforce a strict schema
  - [x] Reject malformed, overlong, generic, or ungrounded responses
  - [x] Downgrade safely to unavailable/fallback when validation fails
- [x] Integrate the narrative panel into the existing summary area (AC: 1, 2, 5, 7)
  - [x] Reuse the current summary card space instead of adding a new dashboard region
  - [x] Show loading, ready, and fallback states cleanly
  - [x] Keep presenter mode aligned with the same active narrative state
- [x] Add regression coverage and hard-fixture validation (AC: 12)
  - [x] Backend tests for packet generation and schema validation
  - [x] Frontend tests for summary loading, scoped switching, scoped exit/reset, and presenter mode
  - [ ] Manual QA on representative real fixtures and scoped search cases

## Affected Areas

- `apps/api/app/api/routes/uploads.py` or a neighboring route module for narrative generation
- new backend service modules under `apps/api/app/services/` for:
  - analysis packet construction
  - provider adapter
  - output schema validation
- upload bundle store only if cache persistence is implemented there
- frontend dashboard summary area in `apps/web/src/features/dashboard/DashboardPage.tsx`
- frontend API client/types in `apps/web/src/lib/api.ts` and `apps/web/src/types/`
- tests under:
  - `apps/api/tests/`
  - `apps/web/src/features/dashboard/`

## QA Expectations

### Automated

- Backend unit tests must cover:
  - table-scope packet generation
  - scoped-result packet generation
  - review-required / low-confidence caveat behavior
  - invalid model output downgrade behavior
  - provider timeout/unavailable behavior
- Backend integration tests must verify:
  - the narrative route never blocks normal manifest/dashboard loading
  - scoped requests do not summarize outside the selected scoped rows
- Frontend tests must verify:
  - loading state in summary area
  - ready state rendering
  - fallback rendering
  - scoped summary activation
  - scoped summary exit/reset
  - presenter mode uses the same active narrative state

### Manual

Manual QA should validate the feature on real fixtures including:

- `Monthly budget.xlsx`
- `costs of 2025.xlsx`
- `Google Finance Investment Tracker.xlsx`
- `performance-logs-report.xlsx`
- `extensive-document-academic-report.xlsx`

Manual QA should also validate scoped-result behavior on representative search selections, including at least one:

- compact categorical result
- long-form/log-like result
- weak scoped result that should produce a caveat or unavailable state

Pass criteria:

- the narrative feels grounded in the visible data scope
- the copy is concise and useful
- the panel does not feel like chatbot UI
- the dashboard remains usable when AI is unavailable or slow

## Dev Notes

- This story intentionally keeps AI commentary secondary to deterministic product logic.
- The cleanest no-cost architecture path is a local or self-hosted provider adapter, for example an OpenAI-compatible local runtime such as Ollama, with the feature defaulting to unavailable when not configured.
- This story should not assume free hosted public AI inference exists. Cost-free software use still consumes local or self-hosted compute.
- Keep prompts and schema validation boring, explicit, and bounded. This is not the place to experiment with agentic orchestration or multi-step reasoning flows.
- Reuse the current summary area so the feature improves the screen instead of creating a new layout problem.

## Single Story Or Split?

This should remain a single story **only because** the scope is tightly bounded:

- one passive panel
- one no-cost provider path
- one strict output schema
- one active-scope model (`table` or `scopedResult`)
- no chat, no workbook-wide synthesis, no cross-result merge

If you later want:

- multiple providers
- workbook-wide executive summaries
- persisted narrative history
- user-triggered regenerate/explain actions
- cross-result or cross-table AI synthesis

then that should be split into follow-on stories.

## References

- Product non-goals and dashboard summary-first direction: [Source: _bmad-output/planning-artifacts/prd.md]
- Architecture constraint against paid/heavy AI infrastructure in MVP: [Source: _bmad-output/planning-artifacts/architecture.md]
- Current product context and deterministic-first guardrails: [Source: docs/project-context.md]

## Change Log

- 2026-04-13: Story created from the locked product decision to add a passive AI Narrative Summary panel to the summary area for table scope and scoped search scope only.
- 2026-04-13: Implemented the bounded narrative route, local/self-hosted provider configuration, summary-area UI integration, cache path, and focused backend/frontend regression coverage.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Add one narrow backend summary route and service that build a grounded compact packet from trusted upload context rather than sending raw workbook dumps.
- Keep the provider free-only and optional by using a local/self-hosted OpenAI-compatible runtime path with graceful disabled fallback.
- Reuse the current underused summary-card area for loading, ready, and unavailable narrative states so the dashboard layout stays intact.
- Keep the active AI scope aligned with the current deterministic UI scope: selected table in normal mode, selected scoped result in scoped mode, and shared state in presenter mode.
- Add focused backend and frontend regression coverage for scoping, fallback, caching, and presenter reuse.

### Debug Log References

- `python -m pytest apps/api/tests/unit/test_narrative_summary.py apps/api/tests/integration/test_uploads.py -k narrative`
- `npm.cmd test -- --run src/features/dashboard/DashboardPage.test.tsx`
- `npm.cmd run build`

### Completion Notes List

- Added `POST /api/uploads/{upload_id}/narratives/summary` with a bounded request contract for `table` and `scopedResult` modes.
- Built the provider-facing packet server-side from manifest, table profile, preview rows, chart recommendation context, confidence signals, and scoped rows only when scoped mode is active.
- Added a local/self-hosted OpenAI-compatible provider adapter with strict schema validation, grounding checks, timeout/unavailable downgrade paths, and upload-bundle narrative caching.
- Reused the current summary-area space inside the existing summary card for AI loading, ready, and fallback states instead of adding a new dashboard block.
- Kept presenter mode on the same active narrative state and restored table narrative predictably when scoped search presentation exits.
- Added backend route/service tests and frontend dashboard tests for loading, fallback, scoped switching, scoped reset, and presenter-mode reuse.

### File List

- _bmad-output/implementation-artifacts/3-9-add-grounded-ai-narrative-summary-panel-to-the-summary-area.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/api/app/api/deps.py
- apps/api/app/api/routes/uploads.py
- apps/api/app/core/config.py
- apps/api/app/schemas/narratives.py
- apps/api/app/services/narrative_summary.py
- apps/api/app/services/upload_bundle_store.py
- apps/api/tests/integration/test_uploads.py
- apps/api/tests/unit/test_narrative_summary.py
- apps/web/src/features/dashboard/DashboardPage.test.tsx
- apps/web/src/features/dashboard/DashboardPage.tsx
- apps/web/src/lib/api.ts
- apps/web/src/styles/globals.css
- apps/web/src/types/narrative.ts
