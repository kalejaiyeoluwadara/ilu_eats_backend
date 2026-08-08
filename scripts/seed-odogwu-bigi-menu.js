const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://dara:1234@cluster0.x7fphhx.mongodb.net/ilueats?retryWrites=true&w=majority&appName=Cluster0';

/**
 * Drinks catalogue for Odogwu Bigi (odogwu-bigi).
 *
 * Odogwu Bigi sells in bulk — every price below is for a FULL PACK / CRATE,
 * not a single bottle or can. Names and descriptions say so explicitly so the
 * customer never mistakes a ₦4,300 crate for a ₦4,300 bottle.
 *
 * Items with `price: null` are pending a price from the vendor and are skipped
 * by the seeder (it logs them) — fill the number in and re-run.
 */

const SOFT_DRINK = 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80';
const WATER = 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80';
const CAN_DRINK = 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600&auto=format&fit=crop&q=80';
const MALT = 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=600&auto=format&fit=crop&q=80';
const BOTTLED_JUICE = 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&auto=format&fit=crop&q=80';
const DAIRY = 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&auto=format&fit=crop&q=80';

/** Flavour picker used by the multi-flavour packs. */
const flavourOption = (choices) => [
  {
    id: 'flavour',
    name: 'Flavour',
    required: true,
    multi: false,
    choices: choices.map((name) => ({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name,
      priceDelta: 0,
    })),
  },
];

const items = [
  {
    name: 'Fearless (Pack)',
    slug: 'fearless-pack',
    description: 'Full pack of Fearless energy drink — big bottles',
    price: 4300,
    category: 'drinks',
    image: CAN_DRINK,
    isPopular: true,
  },
  {
    name: 'Fearless Small (Pack)',
    slug: 'fearless-small-pack',
    description: 'Full pack of Fearless energy drink — small bottles',
    price: null, // TODO: vendor to confirm pack price
    category: 'drinks',
    image: CAN_DRINK,
  },
  {
    name: 'Fearless Can (Pack)',
    slug: 'fearless-can-pack',
    description: 'Full pack of canned Fearless energy drink',
    price: 10000,
    category: 'drinks',
    image: CAN_DRINK,
  },
  {
    name: 'Sosa Big (Pack)',
    slug: 'sosa-big-pack',
    description: 'Full pack of Sosa fruit drink — big bottles',
    price: 5100,
    category: 'drinks',
    image: BOTTLED_JUICE,
  },
  {
    name: 'Sosa Small (Pack)',
    slug: 'sosa-small-pack',
    description: 'Full pack of Sosa fruit drink — small bottles',
    price: null, // TODO: vendor to confirm pack price
    category: 'drinks',
    image: BOTTLED_JUICE,
  },
  {
    name: 'Bigi Nla (Pack)',
    slug: 'bigi-nla-pack',
    description: 'Full pack of Bigi Nla soft drink — orange, tropical or cola',
    price: 3500,
    category: 'drinks',
    image: SOFT_DRINK,
    isPopular: true,
    options: flavourOption(['Orange', 'Tropical', 'Cola']),
  },
  {
    name: 'Bigi Small (Pack)',
    slug: 'bigi-small-pack',
    description: 'Full pack of Bigi soft drink, small bottles — tropical, apple, orange or cola',
    price: 2300,
    category: 'drinks',
    image: SOFT_DRINK,
    isPopular: true,
    options: flavourOption(['Tropical', 'Apple', 'Orange', 'Cola']),
  },
  {
    name: 'Bigi Water (Pack)',
    slug: 'bigi-water-pack',
    description: 'Full pack of Bigi bottled table water',
    price: 1500,
    category: 'drinks',
    image: WATER,
    isPopular: true,
  },
  {
    name: 'Reaktor Can (Pack)',
    slug: 'reaktor-can-pack',
    description: 'Full pack of canned Reaktor energy drink',
    price: 10000,
    category: 'drinks',
    image: CAN_DRINK,
  },
  {
    name: 'Pepsi / 7Up / Teem (Pack)',
    slug: 'pepsi-7up-teem-pack',
    description: 'Full pack of Pepsi, 7Up or Teem',
    price: 4100,
    category: 'drinks',
    image: SOFT_DRINK,
    options: flavourOption(['Pepsi', '7Up', 'Teem']),
  },
  {
    name: 'American Cola Big (Pack)',
    slug: 'american-cola-big-pack',
    description: 'Full pack of American Cola — big bottles',
    price: 3600,
    category: 'drinks',
    image: SOFT_DRINK,
  },
  {
    name: 'American Cola Small (Pack)',
    slug: 'american-cola-small-pack',
    description: 'Full pack of American Cola — small bottles',
    price: 2300,
    category: 'drinks',
    image: SOFT_DRINK,
  },
  {
    name: 'Maltina Pet (Pack)',
    slug: 'maltina-pet-pack',
    description: 'Full pack of Maltina malt drink in pet bottles',
    price: 5200,
    category: 'drinks',
    image: MALT,
  },
  {
    name: 'Maltina Can (Pack)',
    slug: 'maltina-can-pack',
    description: 'Full pack of canned Maltina malt drink',
    price: 13800,
    category: 'drinks',
    image: MALT,
  },
  {
    name: 'Komando Big (Pack)',
    slug: 'komando-big-pack',
    description: 'Full pack of Komando energy drink — big bottles',
    price: 4100,
    category: 'drinks',
    image: CAN_DRINK,
  },
  {
    name: 'Komando Small (Pack)',
    slug: 'komando-small-pack',
    description: 'Full pack of Komando energy drink — small bottles',
    price: 2900,
    category: 'drinks',
    image: CAN_DRINK,
  },
  {
    name: 'Frutta Juice 35cl (Pack)',
    slug: 'frutta-juice-35cl-pack',
    description: 'Full pack of Frutta juice, 35cl bottles',
    price: 3200,
    category: 'drinks',
    image: BOTTLED_JUICE,
  },
  {
    name: 'Waka Waka Alcoholic (Pack)',
    slug: 'waka-waka-alcoholic-pack',
    description: 'Full pack of Waka Waka alcoholic drink',
    price: 5300,
    category: 'drinks',
    image: BOTTLED_JUICE,
  },
  {
    name: 'Nutri Milk (Pack)',
    slug: 'nutri-milk-pack',
    description: 'Full pack of Nutri Milk dairy drink',
    price: 5500,
    category: 'drinks',
    image: DAIRY,
  },
  {
    name: 'Reaktor Energy Drink (Pack)',
    slug: 'reaktor-energy-drink-pack',
    description: 'Full pack of Reaktor energy drink — bottles',
    price: 4200,
    category: 'drinks',
    image: CAN_DRINK,
  },
  {
    name: 'Schweppes (Pack)',
    slug: 'schweppes-pack',
    description: 'Full pack of Schweppes — chapman, bitter lemon or tonic',
    price: 4500,
    category: 'drinks',
    image: SOFT_DRINK,
  },
  {
    name: 'Nutri Choco (Pack)',
    slug: 'nutri-choco-pack',
    description: 'Full pack of Nutri Choco chocolate drink',
    price: 8500,
    category: 'drinks',
    image: DAIRY,
  },
  {
    name: 'Smoov (Pack)',
    slug: 'smoov-pack',
    description: 'Full pack of Smoov drink',
    price: 2300,
    category: 'drinks',
    image: BOTTLED_JUICE,
  },
  {
    name: 'Fanta (Pack)',
    slug: 'fanta-pack',
    description: 'Full pack of Fanta',
    price: 4500,
    category: 'drinks',
    image: SOFT_DRINK,
  },
  {
    name: 'Predator (Pack)',
    slug: 'predator-pack',
    description: 'Full pack of Predator energy drink',
    price: 5200,
    category: 'drinks',
    image: CAN_DRINK,
  },
  {
    name: 'La Casera Big (Pack)',
    slug: 'la-casera-big-pack',
    description: 'Full pack of La Casera apple drink — big bottles',
    price: 3800,
    category: 'drinks',
    image: SOFT_DRINK,
  },
  {
    name: 'Cappuccino (Pack)',
    slug: 'cappuccino-pack',
    description: 'Full pack of Cappuccino coffee drink',
    price: 7800,
    category: 'drinks',
    image: MALT,
  },
  {
    name: 'Boxi Energy Boost (Pack)',
    slug: 'boxi-energy-boost-pack',
    description: 'Full pack of Boxi Energy Boost',
    price: 5000,
    category: 'drinks',
    image: CAN_DRINK,
  },
  {
    name: 'Farouz (Pack)',
    slug: 'farouz-pack',
    description: 'Full pack of Farouz malt drink',
    price: 14000,
    category: 'drinks',
    image: MALT,
  },
  {
    name: 'Hollandia Yoghurt Small (Pack)',
    slug: 'hollandia-yoghurt-small-pack',
    description: 'Full pack of Hollandia yoghurt — small bottles',
    price: 8000,
    category: 'drinks',
    image: DAIRY,
  },
  {
    name: 'Fizzy Big (Pack)',
    slug: 'fizzy-big-pack',
    description: 'Full pack of Fizzy drink — big bottles',
    price: 3400,
    category: 'drinks',
    image: SOFT_DRINK,
  },
  {
    name: 'Peach (Pack)',
    slug: 'peach-pack',
    description: 'Full pack of Peach drink',
    price: 5600,
    category: 'drinks',
    image: BOTTLED_JUICE,
  },
  {
    name: 'Nutri Yo (Pack)',
    slug: 'nutri-yo-pack',
    description: 'Full pack of Nutri Yo yoghurt drink',
    price: 6500,
    category: 'drinks',
    image: DAIRY,
  },
];

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const store = await db.collection('stores').findOne({ slug: 'odogwu-bigi' });
  if (!store) {
    console.error("Store 'odogwu-bigi' not found in DB!");
    process.exit(1);
  }

  const storeObjectId = typeof store._id === 'string' ? new mongoose.Types.ObjectId(store._id) : store._id;
  console.log(`Found store: ${store.name} (${store._id})`);

  const pending = items.filter((item) => item.price == null);
  if (pending.length) {
    console.warn(`Skipping ${pending.length} item(s) with no price yet: ${pending.map((i) => i.name).join(', ')}`);
  }

  const now = new Date();
  const productsToInsert = items
    .filter((item) => item.price != null)
    .map((item) => ({
      _id: new mongoose.Types.ObjectId(),
      storeId: storeObjectId,
      storeSlug: store.slug,
      slug: item.slug,
      name: item.name,
      description: item.description || '',
      price: item.price,
      oldPrice: null,
      image: item.image || '',
      category: item.category,
      isHidden: false,
      isPopular: item.isPopular || false,
      isNew: false,
      badges: [],
      rating: 0,
      reviews: 0,
      options: item.options || [],
      createdAt: now,
      updatedAt: now,
      __v: 0,
    }));

  // Clean up any existing products for this store first (string storeId, ObjectId storeId, or storeSlug)
  const deleteResult = await db.collection('products').deleteMany({
    $or: [
      { storeId: storeObjectId },
      { storeId: store._id.toString() },
      { storeSlug: store.slug },
    ],
  });
  console.log(`Deleted ${deleteResult.deletedCount} existing products for store ${store.slug}`);

  const insertResult = await db.collection('products').insertMany(productsToInsert);
  console.log(`Successfully inserted ${insertResult.insertedCount} products into database!`);

  // Ensure the store advertises the 'drinks' category
  const storeCategories = Array.from(new Set([...(store.categories || []), 'drinks']));
  await db.collection('stores').updateOne(
    { _id: store._id },
    { $set: { categories: storeCategories, updatedAt: now } },
  );
  console.log('Updated store categories to:', storeCategories);

  console.log('Seeding completed successfully!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
