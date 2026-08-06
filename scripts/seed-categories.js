/**
 * Tops up a live database with whichever default categories it is missing.
 *
 * The boot-time seed in CategoriesService only fires on an empty collection, so
 * an existing install never picks up categories shipped after launch — this
 * script closes that gap for every default group (food, shop, produce, care).
 * It is additive and idempotent: rows are inserted only when their slug is
 * absent, so categories an admin edited or deliberately deleted are left alone.
 *
 * Run `npm run build` first (the list is read from dist so there is one source
 * of truth), then:
 *   node scripts/seed-categories.js          # insert what's missing
 *   node scripts/seed-categories.js --dry    # just report, write nothing
 */
const mongoose = require('mongoose');
require('dotenv').config();

// `nest build` emits to dist/src/…; older builds flattened it to dist/…, so try
// both rather than silently exiting on a layout change.
const DEFAULTS_PATHS = [
  '../dist/src/modules/categories/categories.defaults',
  '../dist/modules/categories/categories.defaults',
];

let DEFAULT_CATEGORIES;
for (const path of DEFAULTS_PATHS) {
  try {
    ({ DEFAULT_CATEGORIES } = require(path));
    break;
  } catch {
    // try the next layout
  }
}
if (!DEFAULT_CATEGORIES) {
  console.error(
    `Could not load the compiled category defaults (tried ${DEFAULTS_PATHS.join(', ')}) — run \`npm run build\` first.`,
  );
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
const DRY_RUN = process.argv.includes('--dry');

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
    .find({}, { projection: { slug: 1 } })
    .toArray();
  const have = new Set(existing.map((c) => c.slug));

  const missing = DEFAULT_CATEGORIES.filter((c) => !have.has(c.slug)).map(
    (c) => ({
      image: '',
      isActive: true,
      showOnHome: true,
      ...c,
      createdAt: now,
      updatedAt: now,
      __v: 0,
    }),
  );

  console.log(`categories in db: ${have.size} | defaults: ${DEFAULT_CATEGORIES.length}`);

  if (missing.length === 0) {
    console.log('Nothing missing — all default categories already exist.');
    process.exit(0);
  }

  console.log(`missing (${missing.length}):`);
  for (const c of missing) console.log(`  ${c.emoji} ${c.slug} — ${c.label}`);

  if (DRY_RUN) {
    console.log('\n--dry: no changes written.');
    process.exit(0);
  }

  const res = await db.collection('categories').insertMany(missing);
  console.log(`\nInserted ${res.insertedCount} categories.`);
  console.log(
    'Bump the catalog cache (or wait for the TTL) so the storefront picks them up.',
  );
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
