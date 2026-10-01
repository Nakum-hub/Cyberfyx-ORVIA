-- Correct 0079's activation/state equivalence: a pending decoy may be retired
-- without ever being activated. Retired activated decoys retain their history.
-- The activation actor/time pair and distinct-actor checks remain unchanged.
DO $$
DECLARE old_check text;
BEGIN
  SELECT conname INTO STRICT old_check FROM pg_constraint
  WHERE conrelid = 'app.withdrawal_canaries'::regclass AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%''PENDING''%'
    AND pg_get_constraintdef(oid) LIKE '%activated_at IS NULL%';
  EXECUTE format('ALTER TABLE app.withdrawal_canaries DROP CONSTRAINT %I', old_check);
END $$;
ALTER TABLE app.withdrawal_canaries ADD CONSTRAINT withdrawal_canaries_activation_state
  CHECK ((state <> 'PENDING' OR activated_at IS NULL)
     AND (state <> 'ACTIVE' OR activated_at IS NOT NULL));
