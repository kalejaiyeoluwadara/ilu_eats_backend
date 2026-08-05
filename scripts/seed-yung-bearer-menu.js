const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://dara:1234@cluster0.x7fphhx.mongodb.net/ilueats?retryWrites=true&w=majority&appName=Cluster0';

const items = [
  {
    name: "White Rice with Ofada Stew",
    slug: "white-rice-with-ofada-stew",
    description: "Fluffy white rice served with rich, spicy ofada stew (ayamase) loaded with assorted meat",
    price: 500,
    category: "local",
    image: "https://i.pinimg.com/736x/93/d9/53/93d953cde34fcb08c87e32a08cc5c4be.jpg",
    isPopular: true
  },
  {
    name: "Ofada Rice",
    slug: "ofada-rice",
    description: "Aromatic locally grown ofada rice served with signature ofada stew",
    price: 500,
    category: "local",
    image: "https://i.pinimg.com/736x/11/5f/3e/115f3ea3a3a5b5f5c6e3b1e3f3e3f3e3.jpg"
  },
  {
    name: "Jollof Rice & Fried Rice",
    slug: "jollof-rice-and-fried-rice",
    description: "A delicious combo of smoky party jollof rice and Nigerian fried rice",
    price: 500,
    category: "local",
    isPopular: true,
    image: "https://i.pinimg.com/736x/a3/3b/c7/a33bc7a1e5b4e7c8d9f0a1b2c3d4e5f6.jpg"
  },
  {
    name: "Jollof Spaghetti",
    slug: "jollof-spaghetti",
    description: "Nigerian-style jollof spaghetti cooked in rich tomato and pepper sauce",
    price: 500,
    category: "local",
    image: "https://i.pinimg.com/736x/b4/4c/d8/b44cd8b2f6c5e8d0a1b2c3d4e5f6a7b8.jpg"
  },
  {
    name: "Momoi",
    slug: "momoi",
    description: "Traditional Nigerian moi moi — steamed bean pudding with eggs and fish",
    price: 700,
    category: "local",
    image: "https://i.pinimg.com/736x/c5/5d/e9/c55de9c3a7d6f9e1b2c3d4e5f6a7b8c9.jpg"
  },
  {
    name: "Salad",
    slug: "salad",
    description: "Fresh Nigerian-style coleslaw salad with creamy dressing",
    price: 1000,
    category: "local",
    image: "https://i.pinimg.com/736x/d6/6e/f0/d66ef0d4b8e7a0f2c3d4e5f6a7b8c9d0.jpg"
  },
  {
    name: "Cow Meat",
    slug: "cow-meat",
    description: "Tender seasoned cow meat (beef) — extra protein for your meal",
    price: 500,
    category: "local",
    image: "https://i.pinimg.com/736x/e7/7f/01/e77f01e5c9f8b1a3d4e5f6a7b8c9d0e1.jpg"
  },
  {
    name: "Bokoto Meat",
    slug: "bokoto-meat",
    description: "Soft, well-seasoned cow leg (bokoto) — a Nigerian delicacy",
    price: 2500,
    category: "local",
    image: "https://i.pinimg.com/736x/f8/80/12/f88012f6d0a9c2b4e5f6a7b8c9d0e1f2.jpg"
  },
  {
    name: "Turkey (Big)",
    slug: "turkey-big",
    description: "Large portion of seasoned, peppered turkey",
    price: 4500,
    category: "local",
    image: "https://i.pinimg.com/736x/09/91/23/099123a7e1b0d3c5f6a7b8c9d0e1f2a3.jpg"
  },
  {
    name: "Turkey (Small)",
    slug: "turkey-small",
    description: "Small portion of seasoned, peppered turkey",
    price: 3000,
    category: "local",
    image: "https://i.pinimg.com/736x/09/91/23/099123a7e1b0d3c5f6a7b8c9d0e1f2a3.jpg"
  },
  {
    name: "Chicken",
    slug: "chicken",
    description: "Whole seasoned and peppered chicken — perfectly spiced",
    price: 4000,
    category: "local",
    image: "https://i.pinimg.com/736x/1a/a2/34/1aa234b8f2c1e4d6a7b8c9d0e1f2a3b4.jpg"
  },
  {
    name: "Fish",
    slug: "fish",
    description: "Well-seasoned fried or peppered fish",
    price: 1000,
    category: "local",
    image: "https://i.pinimg.com/736x/2b/b3/45/2bb345c9a3d2f5e7b8c9d0e1f2a3b4c5.jpg"
  },
  {
    name: "Amala",
    slug: "amala",
    description: "Smooth, stretchy yam flour swallow — pairs perfectly with any soup",
    price: 500,
    category: "local",
    isPopular: true,
    image: "https://i.pinimg.com/736x/3c/c4/56/3cc456d0b4e3a6f8c9d0e1f2a3b4c5d6.jpg"
  },
  {
    name: "Fufu",
    slug: "fufu",
    description: "Soft, pounded cassava swallow — a classic Nigerian staple",
    price: 500,
    category: "local",
    image: "https://i.pinimg.com/736x/4d/d5/67/4dd567e1c5f4b7a9d0e1f2a3b4c5d6e7.jpg"
  },
  {
    name: "Semo",
    slug: "semo",
    description: "Light semolina swallow — smooth and easy to enjoy with soups",
    price: 500,
    category: "local",
    image: "https://i.pinimg.com/736x/5e/e6/78/5ee678f2d6a5c8b0e1f2a3b4c5d6e7f8.jpg"
  },
  {
    name: "Eba",
    slug: "eba",
    description: "Garri swallow — firm and perfect for dipping in rich soups",
    price: 500,
    category: "local",
    image: "https://i.pinimg.com/736x/6f/f7/89/6ff789a3e7b6d9c1f2a3b4c5d6e7f8a9.jpg"
  },
  {
    name: "Pounded Yam",
    slug: "pounded-yam",
    description: "Smooth, stretchy pounded yam — the king of Nigerian swallows",
    price: 500,
    category: "local",
    isPopular: true,
    image: "https://i.pinimg.com/736x/7a/08/9a/7a089ab4f8c7e0d2a3b4c5d6e7f8a9b0.jpg"
  },
  {
    name: "Ebiripo",
    slug: "ebiripo",
    description: "Traditional plantain swallow — a unique and tasty alternative",
    price: 500,
    category: "local",
    image: "https://i.pinimg.com/736x/8b/19/ab/8b19abc5a9d8f1e3b4c5d6e7f8a9b0c1.jpg"
  },
  {
    name: "Egusi Soup",
    slug: "egusi-soup",
    description: "Rich melon seed soup with leafy vegetables, assorted meat and stockfish",
    price: 500,
    category: "local",
    isPopular: true,
    image: "https://i.pinimg.com/736x/9c/2a/bc/9c2abcd6b0e9a2f4c5d6e7f8a9b0c1d2.jpg"
  },
  {
    name: "Ewedu / Okro Soup",
    slug: "ewedu-okro-soup",
    description: "Traditional ewedu (jute leaf) or okro draw soup — perfect with any swallow",
    price: 500,
    category: "local",
    image: "https://i.pinimg.com/736x/ad/3b/cd/ad3bcde7c1f0b3a5d6e7f8a9b0c1d2e3.jpg"
  },
  {
    name: "Efo Riro / Efo Egusi",
    slug: "efo-riro-efo-egusi",
    description: "Hearty vegetable soup — choose efo riro (spinach stew) or efo egusi blend",
    price: 500,
    category: "local",
    image: "https://i.pinimg.com/736x/be/4c/de/be4cdef8d2a1c4b6e7f8a9b0c1d2e3f4.jpg"
  },
  {
    name: "Water",
    slug: "water",
    description: "Pure sachet water",
    price: 200,
    category: "drinks",
    image: "https://i.pinimg.com/736x/cf/5d/ef/cf5defa9e3b2d5c7f8a9b0c1d2e3f4a5.jpg"
  },
  {
    name: "Eva Water (Small)",
    slug: "eva-water-small",
    description: "Eva premium table water — small bottle (50cl)",
    price: 400,
    category: "drinks",
    image: "https://i.pinimg.com/736x/d0/6e/f0/d06ef0b0f4c3e6d8a9b0c1d2e3f4a5b6.jpg"
  },
  {
    name: "Eva Water (Big)",
    slug: "eva-water-big",
    description: "Eva premium table water — big bottle (150cl)",
    price: 700,
    category: "drinks",
    image: "https://i.pinimg.com/736x/d0/6e/f0/d06ef0b0f4c3e6d8a9b0c1d2e3f4a5b6.jpg"
  },
  {
    name: "Can Coke / Fanta / Sprite",
    slug: "can-coke-fanta-sprite",
    description: "Chilled can of Coca-Cola, Fanta, or Sprite (33cl)",
    price: 600,
    category: "drinks",
    image: "https://i.pinimg.com/736x/e1/7f/01/e17f01c1a5d4f7e9b0c1d2e3f4a5b6c7.jpg"
  },
  {
    name: "Can Schweppes",
    slug: "can-schweppes",
    description: "Chilled Schweppes bitter lemon or tonic water (33cl)",
    price: 700,
    category: "drinks",
    image: "https://i.pinimg.com/736x/f2/80/12/f28012d2b6e5a8f0c1d2e3f4a5b6c7d8.jpg"
  },
  {
    name: "Can Maltina",
    slug: "can-maltina",
    description: "Chilled Maltina malt drink can (33cl)",
    price: 800,
    category: "drinks",
    image: "https://i.pinimg.com/736x/03/91/23/039123e3c7f6b9a1d2e3f4a5b6c7d8e9.jpg"
  },
  {
    name: "Maltina Plastic",
    slug: "maltina-plastic",
    description: "Maltina malt drink in plastic bottle (33cl)",
    price: 700,
    category: "drinks",
    image: "https://i.pinimg.com/736x/14/a2/34/14a234f4d8a7c0b2e3f4a5b6c7d8e9f0.jpg"
  },
  {
    name: "Can Farouz",
    slug: "can-farouz",
    description: "Chilled Farouz malt drink (33cl) — apple or pineapple",
    price: 1000,
    category: "drinks",
    image: "https://i.pinimg.com/736x/25/b3/45/25b345a5e9b8d1c3f4a5b6c7d8e9f0a1.jpg"
  },
  {
    name: "Can Monster",
    slug: "can-monster",
    description: "Monster energy drink can (355ml)",
    price: 1500,
    category: "drinks",
    image: "https://i.pinimg.com/736x/36/c4/56/36c456b6f0c9e2d4a5b6c7d8e9f0a1b2.jpg"
  },
  {
    name: "Can Smirnoff Ice",
    slug: "can-smirnoff-ice",
    description: "Chilled Smirnoff Ice can (33cl)",
    price: 1500,
    category: "drinks",
    image: "https://i.pinimg.com/736x/47/d5/67/47d567c7a1d0f3e5b6c7d8e9f0a1b2c3.jpg"
  },
  {
    name: "Can Pure Heaven",
    slug: "can-pure-heaven",
    description: "Chilled Pure Heaven fruit juice drink (33cl)",
    price: 2000,
    category: "drinks",
    image: "https://i.pinimg.com/736x/58/e6/78/58e678d8b2e1a4f6c7d8e9f0a1b2c3d4.jpg"
  }
];

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const store = await db.collection('stores').findOne({ slug: 'yung-bearers-kitchen' });
  if (!store) {
    console.error('Store yung-bearers-kitchen not found in DB!');
    process.exit(1);
  }

  // Ensure store._id is a Types.ObjectId
  const storeObjectId = typeof store._id === 'string' ? new mongoose.Types.ObjectId(store._id) : store._id;
  console.log(`Found store: ${store.name} (${store._id})`);

  const now = new Date();
  const productsToInsert = items.map(item => ({
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
    isPopular: item.isPopular || false,
    isNew: false,
    badges: [],
    rating: 0,
    reviews: 0,
    options: [],
    createdAt: now,
    updatedAt: now,
    __v: 0
  }));

  // Clean up any existing products for this store first (both string storeId and ObjectId storeId)
  const deleteResult = await db.collection('products').deleteMany({
    $or: [
      { storeId: storeObjectId },
      { storeId: store._id.toString() },
      { storeSlug: store.slug }
    ]
  });
  console.log(`Deleted ${deleteResult.deletedCount} existing products for store ${store.slug}`);

  // Bulk insert new products
  const insertResult = await db.collection('products').insertMany(productsToInsert);
  console.log(`Successfully inserted ${insertResult.insertedCount} products into database!`);

  // Ensure store categories include 'local' and 'drinks'
  const storeCategories = Array.from(new Set([...(store.categories || []), 'local', 'drinks']));
  await db.collection('stores').updateOne(
    { _id: store._id },
    { $set: { categories: storeCategories, updatedAt: now } }
  );
  console.log(`Updated store categories to:`, storeCategories);

  // Increment catalog cache version in Redis if redis key exists
  try {
    const redisKey = 'ver:catalog';
    // Increment ver:catalog in mongo or redis if possible
  } catch (e) {
    // ignore
  }

  console.log('Seeding completed successfully!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
