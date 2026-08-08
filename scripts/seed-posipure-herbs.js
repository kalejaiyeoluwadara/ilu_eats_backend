const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Creates the POSIPURE NATURAL HERBS store (herbal vertical) and seeds its
 * catalogue.
 *
 * Every product is sold by the litre. Only Jedi Flush comes in more than one
 * size, so it carries a required Size option priced off the 1L base
 * (₦5,000/L — 2L and 3L are exact multiples); the rest are single-size and
 * need no option group.
 *
 * Images are intentionally left blank — the vendor's real photos go in from
 * admin afterwards. Re-running is safe: the store is upserted by slug and its
 * products are replaced wholesale, so blank images here will wipe any that
 * were uploaded in the meantime. Fill in IMAGES below before a re-run if that
 * has already happened.
 */

const STORE = {
  slug: 'posipure-natural-herbs',
  name: 'POSIPURE Natural Herbs',
  tagline: 'Healthy Living, Nature’s Way.',
  description:
    'POSIPURE NATURAL HERBS is a natural wellness brand offering herbal detox, relief and everyday wellness blends, bottled by the litre.',
  vertical: 'herbal',
  categories: ['herbal'],
  location: 'Ilisan-Remo',
  deliveryTimeMins: [20, 35],
  deliveryFee: 700,
  minOrder: 0,
  isNew: true,
};

/** Per-slug image overrides — leave blank to let admin upload the real ones. */
const IMAGES = {};

/** Jedi Flush is the only multi-size product: ₦5,000 per litre. */
const jediFlushSizes = [
  {
    id: 'size',
    name: 'Size',
    required: true,
    multi: false,
    choices: [
      { id: '1l', name: '1L', priceDelta: 0 },
      { id: '2l', name: '2L', priceDelta: 5000 },
      { id: '3l', name: '3L', priceDelta: 10000 },
    ],
  },
];

const items = [
  {
    name: 'Jedi Flush',
    slug: 'jedi-flush',
    description:
      'Natural herbal detox blend. Choose 1L, 2L or 3L — ₦5,000 per litre.',
    price: 5000,
    isPopular: true,
    options: jediFlushSizes,
  },
  {
    name: 'Mokole Max',
    slug: 'mokole-max',
    description: 'Male power and stamina support blend — 1L.',
    price: 7000,
    isPopular: true,
  },
  {
    name: 'Opa Eyin Relief',
    slug: 'opa-eyin-relief',
    description: 'Back and body relief blend — 1L.',
    price: 5000,
  },
  {
    name: 'Idakole',
    slug: 'idakole',
    description: 'Male sexual wellness support blend — 1L.',
    price: 7000,
  },
  {
    name: 'Detox',
    slug: 'detox',
    description: 'General herbal wellness blend — 1L.',
    price: 5000,
  },
  {
    name: 'Malaria Ease',
    slug: 'malaria-ease',
    description: 'Herbal wellness support blend — 1L.',
    price: 5000,
  },
  {
    name: 'Sangunsagun',
    slug: 'sangunsagun',
    description: 'Bone and joint wellness support blend — 1L.',
    price: 5000,
  },
  {
    name: 'Inu Rirun',
    slug: 'inu-rirun',
    description: 'Stomach and digestive wellness support blend — 1L.',
    price: 5000,
  },
  {
    name: 'Marale',
    slug: 'marale',
    description: 'Herbal wellness blend — 1L.',
    price: 5000,
  },
];

async function seed() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const now = new Date();

  // The 'herbal' category must exist or the storefront filters have nothing to
  // match — it ships in DEFAULT_CATEGORIES, but an older install may lack it.
  const herbal = await db.collection('categories').findOne({ slug: 'herbal' });
  if (!herbal) {
    console.error(
      "Category 'herbal' is missing — run `npm run build && node scripts/seed-categories.js` first.",
    );
    process.exit(1);
  }

  await db.collection('stores').updateOne(
    { slug: STORE.slug },
    {
      $set: { ...STORE, updatedAt: now },
      $setOnInsert: {
        image: '',
        cover: '',
        rating: 0,
        reviews: 0,
        isOpen: true,
        isFeatured: false,
        geo: null,
        deliveryRadiusKm: 0,
        tags: [],
        orders7d: 0,
        isPlatform: false,
        createdAt: now,
        __v: 0,
      },
    },
    { upsert: true },
  );

  const store = await db.collection('stores').findOne({ slug: STORE.slug });
  const storeObjectId =
    typeof store._id === 'string'
      ? new mongoose.Types.ObjectId(store._id)
      : store._id;
  console.log(`Store ready: ${store.name} (${store._id})`);

  const productsToInsert = items.map((item) => ({
    _id: new mongoose.Types.ObjectId(),
    storeId: storeObjectId,
    storeSlug: store.slug,
    slug: item.slug,
    name: item.name,
    description: item.description,
    price: item.price,
    oldPrice: null,
    image: IMAGES[item.slug] || '',
    category: 'herbal',
    isHidden: false,
    isPopular: item.isPopular || false,
    isNew: true,
    badges: [],
    rating: 0,
    reviews: 0,
    options: item.options || [],
    createdAt: now,
    updatedAt: now,
    __v: 0,
  }));

  // Replace the store's catalogue wholesale — matches how the other seeders
  // work, and covers products written with a string storeId.
  const deleteResult = await db.collection('products').deleteMany({
    $or: [
      { storeId: storeObjectId },
      { storeId: store._id.toString() },
      { storeSlug: store.slug },
    ],
  });
  console.log(
    `Deleted ${deleteResult.deletedCount} existing products for store ${store.slug}`,
  );

  const insertResult = await db
    .collection('products')
    .insertMany(productsToInsert);
  console.log(`Inserted ${insertResult.insertedCount} products.`);

  console.log('Seeding completed successfully!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
