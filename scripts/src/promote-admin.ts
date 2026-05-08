import { pool } from "@workspace/db";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const email = requireEnv("ADMIN_EMAIL").trim().toLowerCase();

  const client = await pool.connect();
  try {
    const res = await client.query(
      "update users set role = 'admin', updated_at = now() where lower(email) = $1 returning id, email, role",
      [email],
    );

    if ((res.rowCount ?? 0) === 0) {
      console.error(`No user found with email: ${email}`);
      process.exit(2);
    }

    console.log("Admin promotion successful:");
    console.log(res.rows[0]);
  } finally {
    client.release();
  }
}

main().catch((err) => {
  console.error("Admin promotion failed.");
  console.error(err);
  process.exit(1);
});