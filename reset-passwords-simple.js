// Simple password reset without external dependencies
const fs = require('fs');
const path = require('path');

// Read environment variables from .env file
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  console.log('🔍 Debug: Looking for .env at:', envPath);
  console.log('🔍 Debug: .env exists:', fs.existsSync(envPath));
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    console.log('🔍 Debug: .env content length:', envContent.length);
    console.log('🔍 Debug: .env content preview:', envContent.substring(0, 200));
    
    const lines = envContent.split(/\r?\n/);
    console.log('🔍 Debug: Number of lines:', lines.length);
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      console.log(`🔍 Debug: Line ${index}: "${trimmed}"`);
      
      if (trimmed && !trimmed.startsWith('#')) {
        const equalIndex = trimmed.indexOf('=');
        if (equalIndex > 0) {
          const key = trimmed.substring(0, equalIndex).trim();
          const value = trimmed.substring(equalIndex + 1).trim();
          console.log(`🔍 Debug: Setting ${key} = ${value}`);
          process.env[key] = value;
        }
      }
    });
  }
}

// Simple password hashing (for demonstration - use bcrypt in production)
async function hashPassword(password) {
  // This is a simple hash - in production use bcrypt
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(password + 'salt').digest('hex');
}

async function resetPasswords() {
  loadEnv();
  
  console.log('🔍 Debug: Environment variables loaded:');
  console.log('   DATABASE_URL:', process.env.DATABASE_URL ? '✓' : '❌');
  console.log('   RESET_PASSWORD:', process.env.RESET_PASSWORD ? '✓' : '❌');
  console.log('   USER_EMAILS:', process.env.USER_EMAILS ? '✓' : '❌');
  
  const databaseUrl = process.env.DATABASE_URL;
  const newPassword = process.env.RESET_PASSWORD;
  const userEmails = process.env.USER_EMAILS;
  
  if (!databaseUrl || !newPassword || !userEmails) {
    console.error('❌ Missing required environment variables');
    console.error('Please set DATABASE_URL, RESET_PASSWORD, and USER_EMAILS in .env file');
    process.exit(1);
  }
  
  const users = userEmails.split(',').map(email => email.trim());
  const hashedPassword = await hashPassword(newPassword);
  
  console.log(`🔧 Starting password reset for ${users.length} users...`);
  console.log(`📝 Users to reset: ${users.join(', ')}`);
  console.log(`🔑 New password: ${newPassword}`);
  console.log(`🔐 Hashed password: ${hashedPassword}`);
  
  console.log('\n⚠️  NOTE: This is a demonstration script.');
  console.log('⚠️  In production, you would need:');
  console.log('   - Proper database connection (pg module)');
  console.log('   - Secure password hashing (bcrypt)');
  console.log('   - Database queries to update users table');
  
  console.log('\n✅ Script completed successfully!');
  console.log('📋 To actually reset passwords, install dependencies and run the full script:');
  console.log('   npm install pg bcryptjs');
  console.log('   node reset-passwords-secure.js');
}

resetPasswords().catch(console.error);
