const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/database_name'
});

async function resetPasswords() {
  const newPassword = 'password123'; // You can change this
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const users = [
    'mohamedesawe40@yahoo.com',
    'mohamedesawe40@gmail.com', 
    'mohamed.marouf@inn-fut.com',
    'moamazon40@gmail.com'
  ];

  try {
    for (const email of users) {
      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2',
        [hashedPassword, email]
      );
      console.log(`✅ Password reset for ${email}`);
    }
    console.log('\n🎉 All passwords reset to: password123');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

resetPasswords();
