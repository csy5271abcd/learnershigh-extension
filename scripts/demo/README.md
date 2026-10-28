# Local persisted care examples

## Current management timeline (2026-10-28)

`seed-care-timeline.mjs` adds twelve synthetic cases / 49 events across the three centers. With the original 최하준 example, the local database contains thirteen cases / 51 events: ten active and three closed. Scenarios include repeated missing plans, reduced study, subject imbalance, later arrivals, unanswered calls, additional meetings, continued management, recovery/closure, expected changes and a reported source-record discrepancy. Memo text is a fictional demonstration, not an actual student's counseling record or proof of intervention efficacy.

Run this explicitly against a **separate loopback-only** seed process on `127.0.0.1:8082`, using the same local care-demo database and immutable jar, `care-demo,e2e`, `app.fixed-date=2026-10-28`, `learnershigh.mock.anchor-date=2026-10-27`, `learnershigh.mock.database-examples=true`, and `learnershigh.test-endpoints.enabled=true`. The interactive server stays on8081 with test endpoints disabled. Run `node scripts/demo/seed-care-timeline.mjs`, then stop only the seed process.

The script uses existing clock/case/note/decision APIs to calculate snapshots at each historical date (10/20–10/28). It never calls reset, directly rewrites event dates, changes source rows, invents API fields, or overwrites existing unrelated history. Re-running the completed fixture yields `{created:0,actions:0,cases:12}`. A failed partial run retains prior writes and can resume; unrelated history requires inspection rather than automatic replacement.

## Acceptance suite and local API target

`e2e/playwright.config.ts` runs the current27 acceptance cases against the100-student source at fixed date10/28, including the original persisted history example. The old prototype specs remain historical evidence; CI now seeds the isolated source explicitly before these tests. Model/API80 and source-seed6 tests also run in CI.

The default Vite target is `http://localhost:8080`. For the local8081 server, set `VITE_CARE_API_TARGET=http://127.0.0.1:8081` in the ignored `frontend/admin/.env.local` or the process environment. `VITE_API_TARGET` continues to control other features. Do not commit runtime jars, credentials or logs.

2026-10-28 latest: care formula3 is documented in `docs/specs/wangyu/domain.md` and `docs/api/api-contract.md`. It excludes known off-days from missing-plan alerts, compares arrival against the student's same-weekday history, and pairs subject planned/actual dates. Statements below about older formula behavior are historical. The synthetic source rows were not altered to force alerts to pass.

For the local management-history screen example, after starting this exact60/30/10 demo and fixed-date2026-10-28 server, run `node scripts/demo/seed-care-history.mjs`. It adds one clearly marked synthetic consultation through the care API only if that example does not already exist and the student has no existing active case. It never resets/replaces history. The persisted-history Playwright proof requires this explicit fixture. Seeded day data still contains100students/3500days.

Run the packaged server from an immutable copy of the built jar outside `backend/build/libs`. Rebuilding a jar while it is running can break deferred class loading. The current local runtime uses `.local-runtime/care-api-formula3-final.jar`; stop that process before replacing its runtime jar.

This is synthetic source data for a local demonstration, not an importer, a production source schema, or a change to care formulas. The existing 13-student Java fixture remains the default. These records are read only when both the `care-demo` Spring profile and `learnershigh.mock.database-examples=true` are enabled, with `learnershigh.integration.mode=mock`.

## Scope and dates

- Three centers: `demo_large` 강남점 (60 students), `demo_medium` 분당점 (30), `demo_small` 수지점 (10).
- IDs `demo_s001` through `demo_s100`; neutral synthetic Korean names, no scenario labels in student names or API JSON.
- Exactly 3,500 source-day rows: 2026-09-23 through 2026-10-27 inclusive.
- The review snapshot is **2026-10-27**, with recent seven days **10-21..10-27** and preceding 28 days **09-23..10-20**. These windows do not overlap. Demonstration today is **2026-10-28**; no source records for today or future days are synthesized.
- The adapter returns only persisted dates. Unknown IDs and dates outside the seeded interval return no source rows; database errors remain errors.

## Cohorts

- 10 `healthy_morning`: stable morning attendance and moderate study duration.
- 15 `healthy_evening`: stable after-school evening attendance and shorter realistic duration.
- 10 `healthy_long`: morning starts and longer study duration. Long duration alone is not a reason to flag.
- 10 `healthy_weekend`: short weekday sessions and substantially longer weekend sessions. Same-weekday patterns repeat across all five weeks; weekend differences are not injected only into the recent week.
- 4 `temporary_dip`: brief reduction at the start of the recent week, then ordinary duration.
- 4 `temporary_late`: brief later starts, then ordinary start times.
- 3 `persistent_drop`: recent-week study remains around 44% of the usual daily amount.
- 3 `persistent_late`: starts remain around 100 minutes later through the recent week; study/plan minutes still fit before midnight.
- 3 `execution_gap`: recent plans increase while actual study stays near usual; totals still fit before midnight.
- 3 `subject_shift`: recent math share falls to around 5% while overall study stays near usual.
- 10 `missed_plans`: multiple scheduled days without submitted plans, despite attending and studying.
- 8 `scheduled_absence`: several scheduled days near the end of the recent week have no check-in and no plan.
- 9 `recovery`: reduced study during the preceding two weeks returns to ordinary routines during the recent week. No care case, approved leave, administrator action, or causal claim is fabricated.
- 8 `missing_records`: three recent source days each are unavailable (24 missing rows total), distinct from recorded zero study.

Counts describe constructed source scenarios, **not promised alert counts**. Production formulas and per-center settings determine actual signals. A coprime permutation spreads scenarios across centers. Daily start times, study totals, plan totals, and subject shares vary deterministically per student/date. Study and plan minutes fit within the remaining calendar day after check-in; they are not claimed to be measured concentration quality.

## Rest days and missing data

All students have one regular weekly off-day. A recorded off-day has `scheduled=false`, `checked_in=false`, `plan_submitted=false`, and empty study/plan JSON objects. It is **not** a submitted empty plan and **not** approved leave. The current production `planMissingDays` formula counts recorded no-plan days even when `scheduled=false`; the default threshold is two, so one regular weekly off-day alone does not trigger it. This fixture does not change that rule. A future two-off-day schedule could be flagged solely by that existing rule and must not be advertised as supported healthy behavior.

Unavailable source days have `record_available=false`, SQL `NULL` subject JSON columns and `scheduled=NULL`. The unchanged boundary record maps those subject columns to empty maps with `recordAvailable=false`; consumers must use that flag rather than interpret empty maps as measured zero. Absences and off-days have `record_available=true` and actual empty JSON objects. Recovery means a visible source trend, not a stored `RECOVERED` care status.

## Generate, test, and seed

Use Node.js **22** (stdlib only):

```powershell
node --test scripts/demo/generate-care-seed.test.mjs
node scripts/demo/generate-care-seed.mjs
```

The ignored output `scripts/demo/care-demo.generated.sql` creates only `demo_care_branch`, `demo_care_student`, and `demo_care_day`, then upserts only this dataset's IDs. It contains no DELETE, DROP, TRUNCATE, ALTER, care-history updates, or Flyway entries. Re-running preserves row identities. It does not remove unrelated pre-existing rows from the demo tables.

Before applying, confirm the intended **local** database:

```powershell
docker exec learnershigh-care-api-mysql mysql -u care_local -p student_care_local -N -e "SELECT DATABASE();"
docker cp scripts/demo/care-demo.generated.sql learnershigh-care-api-mysql:/tmp/care-demo.generated.sql
```

Apply the file through the container's MySQL client using the configured local credentials and database `student_care_local`, with `--default-character-set=utf8mb4`. Avoid PowerShell text piping that may alter Korean names. Never point the seed at production or reset a database to apply it.

Backend startup additions (keep the existing datasource environment variables):

```text
--spring.profiles.active=care-demo
--learnershigh.integration.mode=mock
--learnershigh.mock.database-examples=true
--learnershigh.mock.anchor-date=2026-10-27
```

The new profile is selected by the adapter's `@Profile`; no production YAML defaults or migrations change. `anchor-date` keeps the fallback fixture date explicit but does not shift persisted dates. The normal Clock still uses the real Asia/Seoul date. For a fixed demo date outside 2026-10-28, the existing `e2e` clock profile can be combined explicitly (`care-demo,e2e`, `--app.fixed-date=2026-10-28`), keeping `learnershigh.test-endpoints.enabled=false`. `app.fixed-date` alone has no effect without that existing profile.

Pending Java verification from `backend/`:

```powershell
.\gradlew.bat test --tests '*DemoStudyDataStoreTest' --tests '*MockExistingStudyClientTest' --tests '*MockScenarioSignalTest' --tests '*ArchitectureTest'
```

The new Java tests exercise JSON mapping, SQL NULL versus recorded zero, corrupt data errors, optional delegation, unknown IDs, and the existing availability switch. They do not replace live MySQL/API verification with the demo profile. The existing contract DTOs, API JSON, care formulas, production migrations, and ordinary fixture stay unchanged by this local adapter.
