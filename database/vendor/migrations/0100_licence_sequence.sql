-- Revision 1.11/1.12: every licence the vendor issues to a customer installation carries its commercial term and a sequence
-- that increases per installation, so the installation can refuse re-importing an older (e.g. larger, pre-downgrade) licence.
-- Uses 0100 so it cannot collide with the base lane's reserved 0018. Rows issued before this carry no sequence.
ALTER TABLE vendor.licence_issues
  ADD COLUMN term text CHECK (term IS NULL OR term IN ('MONTHLY', 'QUARTERLY', 'ANNUAL', 'TRIAL', 'CONTRACT')),
  ADD COLUMN sequence integer CHECK (sequence IS NULL OR sequence >= 1);
CREATE UNIQUE INDEX licence_issues_installation_sequence ON vendor.licence_issues(installation_id, sequence) WHERE sequence IS NOT NULL;
