/**
 * Adds the /shops browse categories (supermarket, mini-marts, groceries, …) to
 * a database that was already seeded with the original food set.
 *
 * The boot-time seed in CategoriesService only fires on an empty collection, so
 * live databases never pick up newly shipped defaults — this script closes that
 * gap. It is additive and idempotent: rows are inserted only when their slug is
 * missing, so categories an admin edited or deleted are left alone.
 *
 * Run `npm run build` first (the category list is read from dist so there is one
 * source of truth), then:
 *   node scripts/seed-shop-categories.js
 */
const mongoose = require('mongoose');
require('dotenv').config();

let SHOP_CATEGORIES;
try {
  ({ SHOP_CATEGORIES } = require('../dist/modules/categories/categories.defaults'));
} catch {
  console.error(
    'Could not load dist/modules/categories/categories.defaults — run `npm run build` first.'
  );
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;

async function seed() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const now = new Date();

  const existing = await db
    .collection('categories')
    .find({ slug: { $in: SHOP_CATEGORIES.map((c) => c.slug) } })
    .project({ slug: 1 })
    .toArray();
  const have = new Set(existing.map((c) => c.slug));

  const missing = SHOP_CATEGORIES.filter((c) => !have.has(c.slug)).map((c) => ({
    image: '',
    isActive: true,
    showOnHome: true,
    ...c,
    createdAt: now,
    updatedAt: now,
    __v: 0,
  }));

  if (missing.length === 0) {
    console.log('All shop categories already exist — nothing to do.');
    process.exit(0);
  }

  const res = await db.collection('categories').insertMany(missing);
  console.log(
    `Inserted ${res.insertedCount} categories: ${missing.map((c) => c.slug).join(', ')}`
  );
  console.log(
    'Bump the catalog cache (or wait for the TTL) so the storefront picks them up.'
  );
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
