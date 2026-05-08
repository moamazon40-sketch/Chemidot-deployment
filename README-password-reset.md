# Secure Password Reset Script

## Overview
This script securely resets passwords for specified users using environment variables instead of hardcoded credentials.

## Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your actual values:
   ```env
   DATABASE_URL=postgresql://your_user:your_password@localhost:5432/your_database
   RESET_PASSWORD=your_secure_new_password
   USER_EMAILS=user1@example.com,user2@example.com,user3@example.com
   ```

## Usage

```bash
node reset-passwords-secure.js
```

## Security Features

- ✅ No hardcoded passwords or credentials
- ✅ Environment variable validation
- ✅ Email format validation
- ✅ Password strength requirements (minimum 8 characters)
- ✅ User existence verification
- ✅ Detailed error reporting
- ✅ Secure database connections with SSL for production
- ✅ Strong bcrypt hashing (12 rounds)
- ✅ Proper resource cleanup

## Output

The script provides detailed feedback:
- Successful password resets with user IDs
- Failed attempts with error details
- Users not found in the database
- Summary statistics

## Important Notes

- Keep your `.env` file secure and never commit it to version control
- Use strong, unique passwords
- This script should only be used for legitimate password reset operations
- Consider implementing a proper password reset flow for production applications
- trigger redeploy
