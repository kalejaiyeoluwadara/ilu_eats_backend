/**
 * One-off bootstrap: create the first admin account if none exists.
 * Usage: node scripts/create-admin.js [email]
 * Prints the generated credentials exactly once — store them in a password manager.
 */
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(uri);

  const users = mongoose.connection.collection('users');

  const existing = await users.findOne({ role: 'admin' });
  if (existing) {
    console.log(`An admin already exists: ${existing.email}`);
    console.log('No account was created. Use that email to sign in at /admin/login.');
    return;
  }

  const email = (process.argv[2] || 'admin@ilueats.com').toLowerCase().trim();
  const password = crypto.randomBytes(9).toString('base64url'); // 12 chars
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();

  await users.insertOne({
    name: 'ìlúEats Admin',
    email,
    passwordHash,
    phone: null,
    role: 'admin',
    addresses: [],
    favoriteProductIds: [],
    createdAt: now,
    updatedAt: now,
  });

  console.log('Admin account created — sign in at /admin/login');
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log('Change this password after first sign-in.');
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
