import { pool } from "@workspace/db";

type DeleteResult = { table: string; deleted: number };

function parseDatabaseUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const user = decodeURIComponent(url.username || "");
  const host = url.hostname;
  const port = url.port || (url.protocol === "postgresql:" ? "5432" : "");
  const dbName = url.pathname.replace(/^\//, "");
  const sslmode = url.searchParams.get("sslmode") || "";
  return { user, host, port, dbName, sslmode };
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function countAll(table: string): Promise<number> {
  const result = await pool.query(`select count(*)::int as c from ${table}`);
  return Number(result.rows?.[0]?.c ?? 0);
}

async function main() {
  const databaseUrl = requireEnv("DATABASE_URL");
  const confirm = (process.env.CONFIRM_CLEANUP ?? "").toLowerCase() === "true";

  const expectedHost = requireEnv("EXPECTED_DB_HOST");
  const expectedDbName = requireEnv("EXPECTED_DB_NAME");

  const info = parseDatabaseUrl(databaseUrl);

  console.log("Cleanup Target:");
  console.log(`- host: ${info.host}`);
  console.log(`- db:   ${info.dbName}`);
  console.log(`- user: ${info.user}`);
  console.log(`- ssl:  ${info.sslmode || "(default)"}`);

  if (info.host !== expectedHost || info.dbName !== expectedDbName) {
    console.error("Refusing to run: DATABASE_URL does not match EXPECTED_DB_HOST/EXPECTED_DB_NAME.");
    process.exit(2);
  }

  if (!confirm) {
    console.error("Refusing to run: set CONFIRM_CLEANUP=true to proceed.");
    process.exit(2);
  }

  const tablesInOrder = [
    "negotiation_messages",
    "messages",
    "conversations",
    "notifications",
    "collective_order_participants",
    "collective_orders",
    "quotations",
    "rfqs",
    "orders",
    "reviews",
    "products",
    "supplier_experts",
    "supplier_documents",
    "supplier_brands",
    "projects",
    "suppliers",
    "users",
  ] as const;

  const results: DeleteResult[] = [];
  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const table of tablesInOrder) {
      const res = await client.query(`delete from ${table}`);
      results.push({ table, deleted: res.rowCount ?? 0 });
    }
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }

  console.log("Cleanup Results:");
  for (const r of results) {
    console.log(`- ${r.table}: ${r.deleted}`);
  }

  const postUsers = await countAll("users");
  const postSuppliers = await countAll("suppliers");
  const postProducts = await countAll("products");
  const postRfqs = await countAll("rfqs");
  const postCollectiveOrders = await countAll("collective_orders");

  console.log("Post-cleanup Verification:");
  console.log(`- users: ${postUsers}`);
  console.log(`- suppliers: ${postSuppliers}`);
  console.log(`- products: ${postProducts}`);
  console.log(`- rfqs: ${postRfqs}`);
  console.log(`- collective_orders: ${postCollectiveOrders}`);
}

main().catch((err) => {
  console.error("Cleanup failed.");
  console.error(err);
  process.exit(1);
});