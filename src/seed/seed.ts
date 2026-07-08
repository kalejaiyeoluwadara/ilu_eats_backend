import 'dotenv/config';
import mongoose from 'mongoose';
import { StoreSchema } from '../modules/catalog/schemas/store.schema';
import { ProductSchema } from '../modules/catalog/schemas/product.schema';
import { STORES_SEED, PRODUCTS_SEED } from './seed-data';

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  await mongoose.connect(uri);
  const StoreModel = mongoose.model('Store', StoreSchema);
  const ProductModel = mongoose.model('Product', ProductSchema);

  const storeIdBySlug = new Map<string, mongoose.Types.ObjectId>();

  for (const store of STORES_SEED) {
    const { id: _id, ...data } = store;
    const doc = await StoreModel.findOneAndUpdate(
      { slug: store.slug },
      { $set: data },
      { upsert: true, new: true },
    );
    storeIdBySlug.set(store.slug, doc._id as mongoose.Types.ObjectId);
    console.log(`store upserted: ${store.slug}`);
  }

  for (const product of PRODUCTS_SEED) {
    const { id: _id, storeId: _storeId, ...data } = product;
    const storeId = storeIdBySlug.get(product.storeSlug);
    if (!storeId) {
      console.warn(`skipping product ${product.slug}: unknown store ${product.storeSlug}`);
      continue;
    }
    await ProductModel.findOneAndUpdate(
      { storeId, slug: product.slug },
      { $set: { ...data, storeId } },
      { upsert: true, new: true },
    );
    console.log(`product upserted: ${product.storeSlug}/${product.slug}`);
  }

  await mongoose.disconnect();
  console.log('Seed complete.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
