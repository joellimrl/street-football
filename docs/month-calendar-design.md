# Monthly match calendar

Add a Calendar tab to the existing static dashboard. Upcoming stays the default.
The calendar opens to the current month in the selected time zone, starts weeks
on Monday, and has previous/next month and This month controls.

Use the existing public snapshot; no backend, dependencies, paid services or
historical collection changes. Existing team, gameweek and favourites filters
apply to all fixtures in the displayed month, including completed matches.

Desktop day cells show compact kickoff/team summaries. Mobile cells show match
counts in the same seven-column grid. Selecting a day displays the existing full
match cards underneath, including visible scores and top highlight previews.
The global and per-match score controls retain their existing behavior.

Retain a selected day while interacting with its matches. On month or filter
changes, select the next matching date on/after today, otherwise the last matching
date; empty months select today if present or the first day. Clearly distinguish
today, the selected date, and days outside the month. Empty dates/months remain
navigable. Date cells use labelled native buttons and preserve keyboard focus.

The compact grid plus existing day details avoids duplicating full match cards
inside narrow calendar cells. A desktop-only grid or mobile-only agenda would
hide the requested month overview on phones; a new calendar dependency is
unnecessary for displaying the existing snapshot.

Verify local-day/month boundaries, daylight saving, leap years, navigation across
December/January, empty months, filters and complete month coverage without the
list's 40-match limit. Check desktop, 390px and 320px layouts in the browser.
