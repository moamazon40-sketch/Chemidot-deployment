import { pool } from "@workspace/db";

type DeleteResult = { table: string; deleted: number; skipped?: boolean };

const DEFAULT_CATEGORY_SLUGS = [
  "industrial-chemicals",
  "petrochemicals",
  "agricultural-chemicals",
  "specialty-chemicals",
  "polymers-plastics",
  "solvents",
  "acids-bases",
  "food-feed-additives",
];

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

async function countTable(table: string): Promise<number> {
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

  const client = await pool.connect();
  const results: DeleteResult[] = [];

  const deleteIfExists = async (table: string, sql: string, params: unknown[] = []) => {
    const existsResult = await client.query("select to_regclass($1) as table_name", [table]);
    const exists = Boolean(existsResult.rows?.[0]?.table_name);
    if (!exists) {
      results.push({ table, deleted: 0, skipped: true });
      return;
    }

    const result = await client.query(sql, params);
    const deleted = Number(result.rows?.[0]?.deleted ?? result.rowCount ?? 0);
    results.push({ table, deleted });
  };

  try {
    await client.query("begin");

    await client.query(`
      create temporary table cleanup_admin_users on commit drop as
      select id from users where role = 'admin'
    `);

    await client.query(`
      create temporary table cleanup_deleted_users on commit drop as
      select id from users where role <> 'admin'
    `);

    await client.query(`
      create temporary table cleanup_deleted_suppliers on commit drop as
      select id, user_id from suppliers
      where user_id in (select id from cleanup_deleted_users)
    `);

    await client.query(`
      create temporary table cleanup_deleted_products on commit drop as
      select id from products
      where supplier_id in (select id from cleanup_deleted_suppliers)
    `);

    await client.query(`
      create temporary table cleanup_deleted_rfqs on commit drop as
      select id from rfqs
      where buyer_id in (select id from cleanup_deleted_users)
         or supplier_id in (select id from cleanup_deleted_suppliers)
         or product_id in (select id from cleanup_deleted_products)
    `);

    await client.query(`
      create temporary table cleanup_deleted_quotations on commit drop as
      select id from quotations
      where rfq_id in (select id from cleanup_deleted_rfqs)
         or supplier_id in (select id from cleanup_deleted_suppliers)
    `);

    await client.query(`
      create temporary table cleanup_deleted_orders on commit drop as
      select id from orders
      where buyer_id in (select id from cleanup_deleted_users)
         or supplier_id in (select id from cleanup_deleted_suppliers)
         or product_id in (select id from cleanup_deleted_products)
         or rfq_id in (select id from cleanup_deleted_rfqs)
         or quotation_id in (select id from cleanup_deleted_quotations)
    `);

    await client.query(`
      create temporary table cleanup_deleted_collective_orders on commit drop as
      select id from collective_orders
      where created_by_buyer_id in (select id from cleanup_deleted_users)
         or supplier_id in (select id from cleanup_deleted_suppliers)
    `);

    await client.query(`
      create temporary table cleanup_deleted_conversations on commit drop as
      select id from conversations
      where buyer_id in (select id from cleanup_deleted_users)
         or supplier_id in (select id from cleanup_deleted_users)
    `);

    await deleteIfExists(
      "public.negotiation_messages",
      `
        with deleted as (
          delete from negotiation_messages
          where quotation_id in (select id from cleanup_deleted_quotations)
             or sender_id in (select id from cleanup_deleted_users)
          returning 1
        )
        select count(*)::int as deleted from deleted
      `,
    );

    await deleteIfExists(
      "public.messages",
      `
        with deleted as (
          delete from messages
          where conversation_id in (select id from cleanup_deleted_conversations)
             or sender_id in (select id from cleanup_deleted_users)
          returning 1
        )
        select count(*)::int as deleted from deleted
      `,
    );

    await deleteIfExists(
      "public.notifications",
      `
        with deleted as (
          delete from notifications
          where user_id in (select id from cleanup_deleted_users)
             or (related_type = 'rfq' and related_id in (select id from cleanup_deleted_rfqs))
             or (related_type = 'order' and related_id in (select id from cleanup_deleted_orders))
             or (related_type = 'collective_order' and related_id in (select id from cleanup_deleted_collective_orders))
             or (related_type = 'quotation' and related_id in (select id from cleanup_deleted_quotations))
          returning 1
        )
        select count(*)::int as deleted from deleted
      `,
    );

    await deleteIfExists(
      "public.conversations",
      `
        with deleted as (
          delete from conversations
          where id in (select id from cleanup_deleted_conversations)
          returning 1
        )
        select count(*)::int as deleted from deleted
      `,
    );

    await deleteIfExists(
      "public.collective_order_allocations",
      `
        with deleted as (
          delete from collective_order_allocations
          where collective_order_id in (select id from cleanup_deleted_collective_orders)
             or buyer_id in (select id from cleanup_deleted_users)
          returning 1
        )
        select count(*)::int as deleted from deleted
      `,
    );

    await deleteIfExists(
      "public.collective_order_offers",
      `
        with deleted as (
          delete from collective_order_offers
          where collective_order_id in (select id from cleanup_deleted_collective_orders)
             or supplier_id in (select id from cleanup_deleted_suppliers)
          returning 1
        )
        select count(*)::int as deleted from deleted
      `,
    );

    await deleteIfExists(
      "public.collective_order_participants",
      `
        with deleted as (
          delete from collective_order_participants
          where collective_order_id in (select id from cleanup_deleted_collective_orders)
             or buyer_id in (select id from cleanup_deleted_users)
          returning 1
        )
        select count(*)::int as deleted from deleted
      `,
    );

    await deleteIfExists(
      "public.orders",
      `
        with deleted as (
          delete from orders
          where id in (select id from cleanup_deleted_orders)
          returning 1
        )
        select count(*)::int as deleted from deleted
      `,
    );

    await deleteIfExists(
      "public.quotations",
      `
        with deleted as (
          delete from quotations
          where id in (select id from cleanup_deleted_quotations)
          returning 1
        )
        select count(*)::int as deleted from deleted
      `,
    );

    await deleteIfExists(
      "public.rfqs",
      `
        with deleted as (
          delete from rfqs
          where id in (select id from cleanup_deleted_rfqs)
          returning 1
        )
        select count(*)::int as deleted from deleted
      `,
    );

    await deleteIfExists(
      "public.reviews",
      `
        with deleted as (
          delete from reviews
          where buyer_id in (select id from cleanup_deleted_users)
             or product_id in (select id from cleanup_deleted_products)
          returning 1
        )
        select count(*)::int as deleted from deleted
      `,
    );

    await deleteIfExists(
      "public.projects",
      `
        with deleted as (
          delete from projects
          where supplier_id in (select id from cleanup_deleted_suppliers)
          returning 1
        )
        select count(*)::int as deleted from deleted
      `,
    );

    await deleteIfExists(
      "public.admin_audit_logs",
      `
        with deleted as (
          delete from admin_audit_logs
          where supplier_id in (select id from cleanup_deleted_suppliers)
          returning 1
        )
        select count(*)::int as deleted from deleted
      `,
    );

    await deleteIfExists(
      "public.products",
      `
        with deleted as (
          delete from products
          where id in (select id from cleanup_deleted_products)
          returning 1
        )
        select count(*)::int as deleted from deleted
      `,
    );

    await deleteIfExists(
      "public.collective_orders",
      `
        with deleted as (
          delete from collective_orders
          where id in (select id from cleanup_deleted_collective_orders)
          returning 1
        )
        select count(*)::int as deleted from deleted
      `,
    );

    await deleteIfExists(
      "public.suppliers",
      `
        with deleted as (
          delete from suppliers
          where id in (select id from cleanup_deleted_suppliers)
          returning 1
        )
        select count(*)::int as deleted from deleted
      `,
    );

    await deleteIfExists(
      "public.categories",
      `
        with deleted as (
          delete from categories
          where slug <> all($1::text[])
            and not exists (
              select 1 from products p where p.category_id = categories.id
            )
          returning 1
        )
        select count(*)::int as deleted from deleted
      `,
      [DEFAULT_CATEGORY_SLUGS],
    );

    await deleteIfExists(
      "public.users",
      `
        with deleted as (
          delete from users
          where id in (select id from cleanup_deleted_users)
          returning 1
        )
        select count(*)::int as deleted from deleted
      `,
    );

    const remainingAdmins = await client.query(
      "select count(*)::int as c from users where role = 'admin'",
    );
    const remainingNonAdmins = await client.query(
      "select count(*)::int as c from users where role <> 'admin'",
    );

    await client.query("commit");

    console.log("Cleanup Results:");
    for (const result of results) {
      const suffix = result.skipped ? " (table not present)" : "";
      console.log(`- ${result.table.replace(/^public\./, "")}: ${result.deleted}${suffix}`);
    }

    const verifications = [
      "users",
      "suppliers",
      "products",
      "rfqs",
      "quotations",
      "orders",
      "collective_orders",
      "collective_order_participants",
      "collective_order_offers",
      "collective_order_allocations",
      "notifications",
      "messages",
      "conversations",
    ] as const;

    console.log("Post-cleanup Verification:");
    for (const table of verifications) {
      try {
        const count = await countTable(table);
        console.log(`- ${table}: ${count}`);
      } catch {
        console.log(`- ${table}: skipped (table not present)`);
      }
    }

    console.log(`- admin_users_remaining: ${Number(remainingAdmins.rows?.[0]?.c ?? 0)}`);
    console.log(`- non_admin_users_remaining: ${Number(remainingNonAdmins.rows?.[0]?.c ?? 0)}`);
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

main().catch((err) => {
  console.error("Cleanup failed.");
  console.error(err);
  process.exit(1);
});
