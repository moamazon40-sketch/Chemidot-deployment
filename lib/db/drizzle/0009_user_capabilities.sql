ALTER TABLE "users"
  ADD COLUMN "can_buy" boolean DEFAULT true NOT NULL,
  ADD COLUMN "can_sell" boolean DEFAULT false NOT NULL;

UPDATE "users"
SET
  "can_buy" = CASE
    WHEN "role" = 'supplier' THEN false
    ELSE true
  END,
  "can_sell" = CASE
    WHEN "role" IN ('supplier', 'admin') THEN true
    ELSE false
  END;
