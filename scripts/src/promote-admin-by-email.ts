import { pool } from "@workspace/db";

type UserRow = {
  id: number;
  email: string;
  role: string;
  can_buy: boolean;
  can_sell: boolean;
};

function requireEmailArg() {
  const raw = process.argv[2]?.trim().toLowerCase();
  if (!raw) {
    throw new Error("Usage: tsx ./src/promote-admin-by-email.ts <email>");
  }
  return raw;
}

function printUser(label: string, row: UserRow | undefined) {
  if (!row) {
    console.log(`${label}: not found`);
    return;
  }

  console.log(`${label}:`);
  console.log(
    JSON.stringify(
      {
        id: row.id,
        email: row.email,
        role: row.role,
        canBuy: row.can_buy,
        canSell: row.can_sell,
      },
      null,
      2,
    ),
  );
}

async function promoteUser(email: string) {
  const client = await pool.connect();
  try {
    const before = await client.query<UserRow>(
      `select id, email, role, can_buy, can_sell
       from users
       where lower(email) = $1
       limit 1`,
      [email],
    );

    if ((before.rowCount ?? 0) === 0) {
      return { before: undefined, after: undefined };
    }

    const after = await client.query<UserRow>(
      `update users
       set role = 'admin',
           can_buy = false,
           can_sell = false,
           updated_at = now()
       where lower(email) = $1
       returning id, email, role, can_buy, can_sell`,
      [email],
    );

    return {
      before: before.rows[0],
      after: after.rows[0],
    };
  } finally {
    client.release();
  }
}

async function main() {
  const email = requireEmailArg();
  const result = await promoteUser(email);

  if (!result.before) {
    console.error(`No user found with email: ${email}`);
    process.exit(2);
  }

  printUser("Before", result.before);
  printUser("After", result.after);
}

main()
  .catch((err) => {
    console.error("Admin promotion failed.");
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
