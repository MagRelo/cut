# Environment Management

This document outlines the environment configuration management for the Cut project, covering both client and server applications.

## Environment Files Structure

The project uses the following environment files:

### Server Environment Files

- `.env`: Main environment file with actual values (gitignored)
- `.env.example`: Template file with placeholder values (committed to git)
- `.env.test`: Test environment configuration (if needed for testing)
- `.env.production`: Production environment template (for deployment reference)

### Client Environment Files

- `.env`: Main environment file with actual values (gitignored)
- `.env.example`: Template file with placeholder values (committed to git)
- `.env.production`: Production environment configuration
- `.env.development`: Development-specific configurations (optional)

## Environment Variables Management Best Practices

### 1. Security

- Never commit actual `.env` files to version control
- Always use `.env.example` as a template with placeholder values
- Keep sensitive values (API keys, secrets) only in the actual `.env` files
- Use strong, unique values for secrets in production

### 2. File Usage

- Development:

  - Copy `.env.example` to `.env` when setting up the project
  - Update `.env` with your local development values
  - Use `.env.development` for development-specific overrides if needed

- Testing:

  - Use `.env.test` for test-specific configurations
  - Consider using mock values for external services in tests

- Production:
  - Use `.env.production` as a template for production deployments
  - Store actual production values securely (e.g., in a secure vault or deployment platform)

### 3. Variable Naming Conventions

- Use UPPERCASE for all environment variables
- Use underscores to separate words
- Use descriptive, clear names (e.g., `DATABASE_URL` instead of `DB_URL`)
- Group related variables with common prefixes (e.g., `EMAIL_HOST`, `EMAIL_PORT`)

### 4. Current Environment Variables

#### Server Environment Variables

\`\`\`env

# Server Configuration

PORT=4000
NODE_ENV=development

# Database Configuration

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cut?schema=public"

# JWT Configuration

JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=24h

# Email Configuration (MailerSend)

MAILERSEND_API_KEY=your_mailersend_api_key
MAILERSEND_FROM_EMAIL=your_verified_sender@domain.com
MAILERSEND_FROM_NAME=Cut App

# Hyperliquid Configuration

HYPERLIQUID_API_URL=https://api.hyperliquid.xyz
HYPERLIQUID_WALLET_PRIVATE_KEY=your_wallet_private_key

# PGA Tour API Configuration

PGA_API_KEY=your_pga_api_key

# CORS Configuration

ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
\`\`\`

#### Client Environment Variables

```env
# API Configuration
VITE_API_URL=http://localhost:4000/api

# Environment
VITE_NODE_ENV=development

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ERROR_REPORTING=false

# External Services
VITE_HYPERLIQUID_API_URL=https://api.hyperliquid.xyz
```

Note: All client-side environment variables must be prefixed with `VITE_` to be exposed to the Vite application.

## Setup Instructions

1. Initial Setup:

   ```bash
   # Server setup
   cd server
   cp .env.example .env

   # Client setup
   cd client
   cp .env.example .env
   ```

2. Update the `.env` files with your actual values

3. Verify all required variables are set before starting the application

## Environment Variable Updates

When adding new environment variables:

1. Add the variable to `.env.example` with a placeholder value
2. Document the variable in this guide if it requires explanation
3. Update deployment documentation/scripts if necessary
4. Notify team members of the new required variable

## Troubleshooting

Common environment-related issues and solutions:

1. Missing Environment Variables:

   - Check if `.env` file exists
   - Compare against `.env.example` to ensure all variables are set
   - Verify variable names match exactly (case-sensitive)

2. Invalid Values:

   - Verify URL formats for services (database, APIs)
   - Check port numbers are available
   - Ensure secrets/keys are valid

3. Environment Not Loading:
   - Verify file names are correct
   - Check file permissions
   - Ensure environment loader is properly configured

## Deployment Considerations

1. Production Environment:

   - Use production-grade secrets
   - Set appropriate NODE_ENV
   - Configure production-specific services

2. CI/CD:
   - Use secure methods to inject environment variables
   - Consider using environment variable management services
   - Never expose sensitive values in logs or error messages
