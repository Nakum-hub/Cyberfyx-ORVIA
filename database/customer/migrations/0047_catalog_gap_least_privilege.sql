-- The catalog worker opens findings. Only an authorised staff review may
-- assign, resolve or accept them; worker UPDATE is unnecessary.
DROP POLICY catalog_gap_worker_update ON app.coverage_gaps;
REVOKE UPDATE ON app.coverage_gaps FROM orvia_worker;
