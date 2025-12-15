#!/usr/bin/env node

/**
 * Setup script to create .env.local from template
 * Run with: node scripts/setup-env.js
 */

const fs = require('fs');
const path = require('path');

const envLocalPath = path.join(process.cwd(), '.env.local');
const envTemplatePath = path.join(process.cwd(), 'env.template');

// Check if .env.local already exists
if (fs.existsSync(envLocalPath)) {
  console.log('⚠️  .env.local already exists. Skipping...');
  console.log('   If you want to recreate it, delete .env.local first.');
  process.exit(0);
}

// Check if template exists
if (!fs.existsSync(envTemplatePath)) {
  console.error('❌ env.template file not found!');
  process.exit(1);
}

// Read template
const template = fs.readFileSync(envTemplatePath, 'utf8');

// Generate random secrets
function generateSecret() {
  return require('crypto').randomBytes(32).toString('base64');
}

// Replace placeholder secrets with generated ones
const envContent = template
  .replace(/JWT_SECRET=.*/g, `JWT_SECRET=${generateSecret()}`)
  .replace(/JWT_REFRESH_SECRET=.*/g, `JWT_REFRESH_SECRET=${generateSecret()}`);

// Write .env.local
fs.writeFileSync(envLocalPath, envContent, 'utf8');

console.log('✅ Created .env.local file successfully!');
console.log('📝 Please update the following values:');
console.log('   - MONGODB_URI: Your MongoDB connection string');
console.log('   - SMTP_USER: Your email address (optional for development)');
console.log('   - SMTP_PASS: Your email app password (optional for development)');
console.log('');
console.log('💡 JWT secrets have been auto-generated.');
console.log('💡 If email is not configured, OTPs will be logged to console in development mode.');

