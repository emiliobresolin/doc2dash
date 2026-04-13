# Story 3.4: Rebaseline Current Fixture Library And Presentation Regression Expectations

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a product team,  
I want the current workbook fixture library and expectations to match the real files we demo and QA today,  
so that presentation regressions are measured against the actual report inputs the product must handle well.

## Story Goal

Make the current workbook fixture set under `apps/api/tests/fixtures` the authoritative regression baseline for the next corrective slice.

This story should align the project with the real files now being used in demos and QA, not the deleted legacy workbook set. It should also establish the baseline expectations that later stories will improve against, especially for:

- `Monthly budget.xlsx`
- `Google Finance Investment Tracker.xlsx`
- `performance-logs-report.xlsx`
- `test-validation-multiple-environments.xlsx`
- `extensive-document-academic-report.xlsx`
- `costs of 2025.xlsx`

## Acceptance Criteria

1. The fixture README and machine-readable fixture catalog describe the current workbook set instead of deleted legacy fixtures.
2. Each current workbook fixture has an explicit baseline expectation that covers at least:
   - upload readiness / expected terminal state
   - sheet and table counts
   - default-view target or default-view quality expectation
   - any known presentation-risk markers needed by follow-on stories
3. The regression baseline is aligned with the `2026-04-12` fixture-library QA report and makes the current weak fixtures explicit instead of hiding them behind stale expectations.
4. Automated checks cover the current fixture set and can be used as the baseline guardrail for stories `3.5` through `3.8`.
5. Legacy notes that imply the browser-first flow is not implemented, or that deleted fixtures are still authoritative, are removed from the current fixture documentation.

## Boundaries / Non-Goals

- Do not change product heuristics, chart logic, or dashboard rendering in this story.
- Do not improve default-view scoring or report condensation yet. That belongs to later stories in this slice.
- Do not redesign the fixture library around hypothetical future files; focus on the workbook fixtures that actually exist now.
- Do not expand scope into deployment, auth, or browser-entry work.

## Tasks / Subtasks

- [x] Rebaseline the human-readable fixture inventory (AC: 1, 5)
  - [x] Update `apps/api/tests/fixtures/README.md` to describe the current workbook set
  - [x] Remove references to deleted legacy fixtures as the active regression baseline
  - [x] Correct stale language that no longer matches the current browser-first product state
- [x] Rebaseline the machine-readable fixture expectations (AC: 1, 2, 3)
  - [x] Update `apps/api/tests/fixtures/fixture_catalog.py` for the current workbook files
  - [x] Capture the baseline outcomes needed by follow-on stories without pretending the current weak fixtures are already solved
  - [x] Mark which fixtures are the primary targets for search, layout, and default-view improvement work
- [x] Refresh the automated regression guardrail (AC: 3, 4)
  - [x] Update or add tests so the current fixture set is exercised automatically
  - [x] Ensure the baseline outputs are stable enough to support later story-by-story improvements

## Affected Areas

- `apps/api/tests/fixtures/README.md`
- `apps/api/tests/fixtures/fixture_catalog.py`
- backend fixture/integration coverage under `apps/api/tests/`
- QA artifacts that treat the fixture library as authoritative regression input

## Test Expectations

- Backend tests should verify the current fixture catalog points to real files present in the fixture folder.
- Fixture-driven integration coverage should exercise the six current workbook fixtures through the real upload-to-ready path.
- The baseline should be explicit enough that later stories can prove improvement without rewriting the entire fixture contract each time.

## Dev Notes

- This is the guardrail story for the corrective slice. It should land before the user-facing hardening work so later improvements are measured against the right files.
- The QA report already tells us which files are strong, weak, or overloaded. Use that as the baseline source of truth instead of inventing new expectations.
- Be honest in the catalog. If a fixture is currently weak for presentation, record that weakness as baseline context rather than masking it with overly optimistic expectations.

### Reuse From Current Implementation

- Reuse as-is:
  - `apps/api/tests/fixtures/`
  - current upload-to-ready integration path
  - the `2026-04-12` QA report under `_bmad-output/implementation-artifacts/tests/`
- Likely extension points:
  - `apps/api/tests/fixtures/README.md`
  - `apps/api/tests/fixtures/fixture_catalog.py`
  - fixture-driven backend integration tests

### Current-Code Alignment Notes

- The current fixture folder contents no longer match the documented fixture inventory.
- Later corrective stories depend on this baseline being accurate, especially for the long-form search, card-sizing, and report-condensation work.
- This story is intentionally light on product logic changes so it can be completed quickly and de-risk the rest of the slice.

### Small Risk / Dependency Note

- If this story is skipped, the next stories can still be implemented, but the team will be measuring improvements against stale or misleading regression expectations.

### References

- QA source of truth: [Source: _bmad-output/implementation-artifacts/tests/fixture-library-qa-report-2026-04-12.md]
- Epic 3 corrective direction: [Source: _bmad-output/planning-artifacts/epics.md#Corrective-Extension-Real-Fixture-Presentation-Hardening]
- Product hardening goal: [Source: _bmad-output/planning-artifacts/prd.md#10-Acceptance-Criteria]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Replace the stale fixture inventory with the six real workbook fixtures now used in demos and QA.
- Turn the fixture catalog into a machine-readable presentation baseline, including weak-default and presentation-risk markers.
- Add upload-to-ready regression coverage that walks the current fixture set through the live API path.

### Debug Log References

- `python -m pytest apps/api/tests/integration/test_fixture_library_regressions.py`

### Completion Notes List

- Rewrote the fixture README so it documents the current workbook library instead of deleted legacy files.
- Replaced the stale fixture catalog with current expectations for `Monthly budget`, `Google Finance Investment Tracker`, `performance-logs-report`, `test-validation-multiple-environments`, `extensive-document-academic-report`, and `costs of 2025`.
- Added fixture-driven integration coverage that uploads each current workbook, waits for the real manifest, and asserts the baseline default-view and presentation-risk contract.

### File List

- _bmad-output/implementation-artifacts/3-4-rebaseline-current-fixture-library-and-presentation-regression-expectations.md
- apps/api/tests/fixtures/README.md
- apps/api/tests/fixtures/fixture_catalog.py
- apps/api/tests/integration/test_fixture_library_regressions.py

## Change Log

- 2026-04-12: Story created from the fixture-library QA sweep and the architect correction slice.
- 2026-04-12: Rebaselined the fixture README, fixture catalog, and live upload regression checks around the current workbook library.
