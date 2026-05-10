ALTER TABLE "rfqs" ADD COLUMN IF NOT EXISTS "supplier_id" integer REFERENCES "suppliers"("id");
ALTER TABLE "rfqs" ADD COLUMN IF NOT EXISTS "product_id" integer REFERENCES "products"("id");

CREATE INDEX IF NOT EXISTS "idx_rfqs_supplier_id" ON "rfqs" ("supplier_id");
CREATE INDEX IF NOT EXISTS "idx_rfqs_product_id" ON "rfqs" ("product_id");

UPDATE "rfqs"
SET
  "product_id" = "matched_products"."id",
  "supplier_id" = "matched_products"."supplier_id",
  "category_id" = COALESCE("rfqs"."category_id", "matched_products"."category_id"),
  "cas_number" = COALESCE("rfqs"."cas_number", "matched_products"."cas_number")
FROM LATERAL (
  SELECT "products"."id", "products"."supplier_id", "products"."category_id", "products"."cas_number"
  FROM "products"
  WHERE
    lower("products"."name") = lower("rfqs"."product_name")
    OR (
      "rfqs"."cas_number" IS NOT NULL
      AND "products"."cas_number" IS NOT NULL
      AND "products"."cas_number" = "rfqs"."cas_number"
    )
  ORDER BY
    CASE WHEN lower("products"."name") = lower("rfqs"."product_name") THEN 0 ELSE 1 END,
    "products"."id"
  LIMIT 1
) AS "matched_products"
WHERE "rfqs"."product_id" IS NULL;
