# Student care UI implementation plan

**Goal:** Improve the pushed React FE in place: whole-branch roster, flagged students first, whole-branch metric comparison, consistent readable metrics and self-study defaults.

**Architecture:** Preserve the feature source from commit d44b892 as the v1 comparison. Keep the Admin shell, existing student detail/counsel/recheck components and chart primitives. Use explicit in-memory FE preview fixtures for roster, details, settings and care interactions. No backend implementation in this phase. V2 presentation styles are scoped to the V2 wrapper so they cannot change v1.

**Tech stack:** Existing React/TypeScript/Vite workspace, existing chart primitives and Node checks. No new libraries, no commits or pushes.

- [x] Preserve and verify the exact pushed feature files as v1; add v1/v2 controls inside the existing route.
- [x] Implement complete FE-only preview responses and provisional settings; leave backend source and contract unchanged.
- [x] Show all roster students in the existing master/detail list, keeping explicit signal, management and insufficient-record states; add search and an optional attention filter.
- [x] Extract structured numeric comparisons from existing metric views without parsing Korean labels. Show current/comparator/change in the same places and open one existing detailed chart on request. Mark generated metric data as examples.
- [x] Replace branch-count summaries with all selected-branch students on shared-scale metric comparison charts; retain branch selector and individual drill-down.
- [x] Explain provisional self-study defaults in the existing settings dialog; support restoring the recommended draft without overwriting saved settings automatically.
- [x] Verify formatting boundaries, roster order, charts, filter/branch transitions, settings, original v1 snapshot integrity, light/dark contrast and mobile bounds; run typecheck, lint, build and relevant FE checks. Review the final scoped diff.

Acceptance: clearly label all preview fixtures as example students, no silent zero values for missing data, no new design system, no changes to other owners' features, no automatic counseling or case closure. Existing data source remains the repository's declared mock integration.

Verification: original 22 source blobs match d44b892; backend/contract/spec tracked diff empty. Admin TypeScript build and lint pass; 12 model/API tests pass. Browser checks cover blocked API, full roster, filter/search, settings draft/save, branch comparison/drilldown, version tabs, light/dark and 390px bounds. FE examples reset on reload. V1 retains its original API behavior.
