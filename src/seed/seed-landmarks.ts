import 'dotenv/config';
import mongoose from 'mongoose';
import { LandmarkSchema } from '../modules/landmark/schemas/landmark.schema';
import { GOOGLE_LANDMARKS_SEED } from './landmarks-google.seed';

/**
 * Upserts the curated Google-sourced Ilishan-Remo landmarks into the DB.
 * Idempotent: keyed by slug, so re-running updates coordinates/descriptions
 * rather than creating duplicates. Existing admin-added landmarks are untouched.
 *
 *   npm run seed:landmarks
 */
async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  await mongoose.connect(uri);
  const LandmarkModel = mongoose.model('Landmark', LandmarkSchema);

  let created = 0;
  let updated = 0;
  for (const l of GOOGLE_LANDMARKS_SEED) {
    const res = await LandmarkModel.updateOne(
      { slug: l.slug },
      {
        $set: {
          name: l.name,
          area: l.area,
          description: l.description,
          geo: l.geo,
          isActive: l.isActive,
        },
        $setOnInsert: { slug: l.slug },
      },
      { upsert: true },
    );
    if (res.upsertedCount) {
      created += 1;
      console.log(`+ created: ${l.name}`);
    } else {
      updated += 1;
      console.log(`~ updated: ${l.name}`);
    }
  }

  const total = await LandmarkModel.countDocuments({ isActive: true });
  console.log(
    `\nDone. ${created} created, ${updated} updated. ${total} active landmarks in total.`,
  );
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Landmark seed failed:', err);
  process.exit(1);
});
