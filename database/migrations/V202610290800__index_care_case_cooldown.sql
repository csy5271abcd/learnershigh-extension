-- Cooldown lookup (branch_id, status = CLOSED, closed_on BETWEEN ...) scanned every case of the branch.
-- Extend the branch/status index with closed_on; the old two-column index is a prefix of the new one.
CREATE INDEX idx_care_case_branch_status_closed ON care_case (branch_id, status, closed_on);
DROP INDEX idx_care_case_branch_status ON care_case;
