-- W01-A02-F01: PostgreSQL clock-semantics control, not a full application test.
-- NOT RUN in Work's environment: PostgreSQL/Docker are unavailable.
-- Codex may run this only in its authorized isolated synthetic PostgreSQL profile.
-- Uses one temporary table and rolls back; never modifies an application row.
-- Expected: current predicate accepts=true; current-time predicate accepts=false.
BEGIN;
CREATE TEMP TABLE w01_a02_expiry_probe (expires_at timestamptz) ON COMMIT DROP;
INSERT INTO w01_a02_expiry_probe VALUES (clock_timestamp() + interval '1 second');
SELECT pg_sleep(1.2);
SELECT expires_at > now() AS transaction_time_accepts,
       expires_at > clock_timestamp() AS current_time_accepts
FROM w01_a02_expiry_probe;
ROLLBACK;
