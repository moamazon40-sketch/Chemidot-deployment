const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Configuration validation
function validateConfig() {
  const required = ['DATABASE_URL', 'RESET_PASSWORD', 'USER_EMAILS'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('Please set the following environment variables:');
    missing.forEach(key => {
      if (key === 'DATABASE_URL') {
        console.error(`  ${key}=postgresql://username:password@localhost:5432/database_name`);
      } else if (key === 'RESET_PASSWORD') {
        console.error(`  ${key}=your_secure_password_here`);
      } else if (key === 'USER_EMAILS') {
        console.error(`  ${key}=email1@example.com,email2@example.com`);
      }
    });
    process.exit(1);
  }
}

// Parse user emails from environment variable
function parseUserEmails() {
  const emails = process.env.USER_EMAILS.split(',').map(email => email.trim());
  const invalidEmails = emails.filter(email => !email.includes('@'));
  
  if (invalidEmails.length > 0) {
    console.error('❌ Invalid email format:', invalidEmails.join(', '));
    process.exit(1);
  }
  
  return emails;
}

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function resetPasswords() {
  validateConfig();
  
  const newPassword = process.env.RESET_PASSWORD;
  const users = parseUserEmails();
  
  console.log(`🔧 Starting password reset for ${users.length} users...`);
  
  // Validate password strength
  if (newPassword.length < 8) {
    console.error('❌ Password must be at least 8 characters long');
    process.exit(1);
  }
  
  const hashedPassword = await bcrypt.hash(newPassword, 12); // Use stronger rounds
  
  const results = {
    success: [],
    failed: [],
    notFound: []
  };

  try {
    for (const email of users) {
      try {
        // Check if user exists first
        const userCheck = await pool.query(
          'SELECT id, email FROM users WHERE email = $1',
          [email]
        );
        
        if (userCheck.rows.length === 0) {
          console.log(`⚠️  User not found: ${email}`);
          results.notFound.push(email);
          continue;
        }
        
        // Update password
        const updateResult = await pool.query(
          'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2 RETURNING id',
          [hashedPassword, email]
        );
        
        if (updateResult.rows.length > 0) {
          console.log(`✅ Password reset successful for ${email} (User ID: ${updateResult.rows[0].id})`);
          results.success.push(email);
        } else {
          console.log(`❌ Password reset failed for ${email} - no rows affected`);
          results.failed.push(email);
        }
      } catch (error) {
        console.error(`❌ Error resetting password for ${email}:`, error.message);
        results.failed.push(email);
      }
    }
    
    // Summary
    console.log('\n📊 Password Reset Summary:');
    console.log(`✅ Successful: ${results.success.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log(`⚠️  Not Found: ${results.notFound.length}`);
    
    if (results.success.length > 0) {
      console.log(`\n✅ Successfully reset passwords for: ${results.success.join(', ')}`);
    }
    
    if (results.failed.length > 0) {
      console.log(`\n❌ Failed to reset passwords for: ${results.failed.join(', ')}`);
    }
    
    if (results.notFound.length > 0) {
      console.log(`\n⚠️  Users not found: ${results.notFound.join(', ')}`);
    }
    
    if (results.failed.length > 0 || results.notFound.length > 0) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

resetPasswords();
