# Original student-care FE snapshot

These 22 source files are byte-identical to `frontend/admin/src/features/student-care` at commit `d44b892d2f3b56031a4f284a1c345d8e8df72ff9`.

They render the 학생 케어 1 menu. Do not edit them when changing the proposals. The narrow Vite plugin `student-care-original-preview-data` maps only this snapshot's API imports to the shared in-memory preview adapter. Thus 1–6 can be compared with the same explicit examples without running a backend, while the original UI source stays intact. Remove this preview mapping when implementing real API integration.

Proposals 2–6 use scoped `.sc-v2` presentation rules. Snapshot sources retain the original CSS; shell theme corrections apply consistently around every student-care screen.
