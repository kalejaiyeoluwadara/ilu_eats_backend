import 'dotenv/config';
import mongoose from 'mongoose';
import { StoreSchema } from '../modules/catalog/schemas/store.schema';
import { ProductSchema } from '../modules/catalog/schemas/product.schema';
import { BannerSchema } from '../modules/banners/schemas/banner.schema';
import { LandmarkSchema } from '../modules/landmark/schemas/landmark.schema';
import {
  STORES_SEED,
  PRODUCTS_SEED,
  BANNERS_SEED,
  LANDMARKS_SEED,
} from './seed-data';

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  await mongoose.connect(uri);
  const StoreModel = mongoose.model('Store', StoreSchema);
  const ProductModel = mongoose.model('Product', ProductSchema);
  const BannerModel = mongoose.model('Banner', BannerSchema);
  const LandmarkModel = mongoose.model('Landmark', LandmarkSchema);

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

  for (const banner of BANNERS_SEED) {
    await BannerModel.findOneAndUpdate(
      { title: banner.title },
      { $set: banner },
      { upsert: true, new: true },
    );
    console.log(`banner upserted: ${banner.title}`);
  }

  for (const landmark of LANDMARKS_SEED) {
    await LandmarkModel.findOneAndUpdate(
      { slug: landmark.slug },
      { $set: landmark },
      { upsert: true, new: true },
    );
    console.log(`landmark upserted: ${landmark.slug}`);
  }

  await mongoose.disconnect();
  console.log('Seed complete.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
