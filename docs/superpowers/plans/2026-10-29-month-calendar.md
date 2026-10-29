# Monthly Calendar Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an accessible monthly calendar without changing existing list views or data collection.

**Architecture:** Pure calendar/date helpers in the existing view model generate a Monday-first month grid. The frontend renders native day buttons and reuses full match cards for the selected date.

**Tech Stack:** Buildless HTML/CSS/JavaScript; Node's offline test runner.

**Spec:** `docs/month-calendar-design.md`

## Global Constraints

- Keep hosting free on Actions/Pages; no new dependencies or backend.
- Preserve scores shown by default and directly visible top highlights.
- Use the selected time zone, existing filters and public snapshot.
- Never load `.env` or run production collectors as tests.

## Review Focus

- Local kickoff dates can cross a UTC month boundary.
- Leap years and Sunday-starting months need correct leading/trailing cells.
- Month and filter changes must not strand the selection outside the month.
- Calendar coverage must not inherit the list's 40-match limit.
- Small screens, keyboard focus and empty months must remain usable.

### Task 1: Build and verify the month view

**Files:** Modify `public/view-model.js`, `public/app.js`, `public/index.html`, `public/styles.css`, `tests/view-model.test.js`; update `README.md` usage description.

**Interfaces:** `shiftMonth(month, offset)` returns a YYYY-MM key;
`monthGrid(fixtures, month, timezone)` returns ordered `{ date, inMonth, fixtures }`
cells; `selectCalendarDate(days, today)` returns the initial selected YYYY-MM-DD.

- [x] Add failing tests for month navigation, leap/Sunday grids, local month
  boundaries, chronological ordering, filters, >40 matches and default selection.
  Run `node --test tests/view-model.test.js`; confirm new tests fail.
- [x] Implement the pure helpers and rerun the tests; expect all passing.
- [x] Add the Calendar tab, month controls, grid and selected-day rendering.
  Reuse existing full match cards; reset day selection on month/filter changes.
- [x] Style desktop event summaries and compact mobile match counts. Preserve
  native button labels, selected/today states and focus after grid rerenders.
- [x] Run `node --test tests/*.test.js`, syntax checks for edited JS, and
  `git diff --check`. Expect all passing. Inspect desktop/mobile in the browser;
  exercise navigation, filters, score controls, highlights and empty dates.
- [ ] Commit, obtain one fresh review, fix substantive findings, publish through
  the existing Pages workflow and verify the deployed calendar.
