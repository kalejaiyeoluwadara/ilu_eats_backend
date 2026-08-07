/**
 * Adds home-page banners for the non-restaurant storefronts that launched after
 * the original banner set was written: two shops, a pharmacy and a farm.
 *
 * Banners are keyed by `href` so the script is idempotent — an existing banner
 * for a store is left exactly as it is (copy an admin edited stays edited), and
 * only missing ones are inserted. New banners land at the top of the carousel;
 * everything already there is pushed down by however many rows we add.
 *
 *   node scripts/seed-new-store-banners.js         # insert what's missing
 *   node scripts/seed-new-store-banners.js --dry   # just report, write nothing
 */
const mongoose = require('mongoose');
require('dotenv').config();

const DRY_RUN = process.argv.includes('--dry');

// Images reuse each store's own cover art, the same way the launch banners for
// the kitchens did.
const BANNERS = [
  {
    title: 'Dane Supermarket is now on ìlúEats',
    subtitle:
      'Groceries, household staples and everyday essentials — from store shelf to your door.',
    cta: 'Start shopping',
    href: '/dane-supermarket',
    badge: 'New',
    image:
      'https://res.cloudinary.com/dpz8hsb33/image/upload/v1785965154/stores/nxwibpx5zkpbjojfvdoz.png',
  },
  {
    title: 'WellsPlus Pharmacy & Mart has arrived',
    subtitle:
      'Medication, health and personal care — delivered quickly and discreetly.',
    cta: 'Browse the pharmacy',
    href: '/wellsplus-pharmacy-and-mart',
    badge: 'Pharmacy',
    image:
      'https://res.cloudinary.com/dpz8hsb33/image/upload/v1785965898/stores/nl6puwlj2qtxbykmocln.png',
  },
  {
    title: 'Elyon Farms — straight from the farm',
    subtitle:
      'Fresh poultry raised right, no middlemen, no waiting. Order today, cook tonight.',
    cta: 'Shop fresh',
    href: '/elyon-farms',
    badge: 'Farm fresh',
    image:
      'https://res.cloudinary.com/dpz8hsb33/image/upload/v1786031181/stores/uj87kygmhiys6b0ukiep.png',
  },
  {
    title: 'Odogwu Bigi is open for business',
    subtitle:
      'Provisions, drinks and daily essentials — big value, delivered to your door.',
    cta: 'Shop the aisles',
    href: '/odogwu-bigi',
    badge: 'New',
    image:
      'https://res.cloudinary.com/dpz8hsb33/image/upload/v1785966688/stores/unv3ayjfxxpbkssnak9b.png',
  },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const banners = mongoose.connection.db.collection('banners');

  const existingHrefs = new Set(
    (await banners.find({}, { projection: { href: 1 } }).toArray()).map(
      (b) => b.href,
    ),
  );
  const missing = BANNERS.filter((b) => !existingHrefs.has(b.href));

  if (!missing.length) {
    console.log('All four store banners are already present — nothing to do.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Inserting ${missing.length} banner(s):`);
  missing.forEach((b, i) => console.log(`  ${i}. ${b.title}  →  ${b.href}`));

  if (DRY_RUN) {
    console.log('\n--dry: no changes written.');
    await mongoose.disconnect();
    return;
  }

  // Make room at the front so the new storefronts lead the carousel.
  await banners.updateMany({}, { $inc: { order: missing.length } });

  const now = new Date();
  await banners.insertMany(
    missing.map((b, index) => ({
      ...b,
      order: index,
      createdAt: now,
      updatedAt: now,
      __v: 0,
    })),
  );

  const all = await banners
    .find({}, { projection: { title: 1, order: 1 } })
    .sort({ order: 1 })
    .toArray();
  console.log('\nCarousel order is now:');
  all.forEach((b) => console.log(`  ${b.order}. ${b.title}`));

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
