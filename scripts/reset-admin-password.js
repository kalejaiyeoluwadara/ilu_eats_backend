/**
 * Reset an admin's password when it's been lost.
 * Usage: node scripts/reset-admin-password.js [email]
 *
 * With no email, resets the account if there is exactly one admin; if there are
 * several it lists them and exits rather than guessing which one you meant.
 * Prints the new password exactly once — store it in a password manager.
 *
 * This updates the existing user in place rather than deleting and recreating,
 * so the _id stays stable and anything referencing it (orders, activity) keeps
 * pointing at the same account.
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
  const emailArg = process.argv[2]?.toLowerCase().trim();

  let target;
  if (emailArg) {
    target = await users.findOne({ email: emailArg, role: 'admin' });
    if (!target) {
      throw new Error(`No admin found with email ${emailArg}`);
    }
  } else {
    const admins = await users.find({ role: 'admin' }).toArray();
    if (admins.length === 0) {
      throw new Error(
        'No admin accounts exist. Run: node scripts/create-admin.js [email]',
      );
    }
    if (admins.length > 1) {
      console.log('Multiple admin accounts exist — pass the one you want:');
      admins.forEach((a) => console.log(`  node scripts/reset-admin-password.js ${a.email}`));
      return;
    }
    target = admins[0];
  }

  const password = crypto.randomBytes(9).toString('base64url'); // 12 chars
  const passwordHash = await bcrypt.hash(password, 10);

  await users.updateOne(
    { _id: target._id },
    { $set: { passwordHash, updatedAt: new Date() } },
  );

  console.log('Password reset — sign in at the admin console /login');
  console.log(`  Email:    ${target.email}`);
  console.log(`  Password: ${password}`);
  console.log('Store this in a password manager; it is not recoverable later.');
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
