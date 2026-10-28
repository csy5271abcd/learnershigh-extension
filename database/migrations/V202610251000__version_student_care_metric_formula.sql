-- Preserve every existing snapshot under its original formula; only new domain objects use version 2.
ALTER TABLE care_case ADD COLUMN metric_formula_version INT NOT NULL DEFAULT 1;
