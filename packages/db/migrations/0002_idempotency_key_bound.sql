-- Match the accepted 0.2.1 transport bound. Preserve applied migration history.
ALTER TABLE app.idempotency_records DROP CONSTRAINT idempotency_records_key_check;
ALTER TABLE app.idempotency_records ADD CONSTRAINT idempotency_records_key_check CHECK (length(key) BETWEEN 16 AND 128);
