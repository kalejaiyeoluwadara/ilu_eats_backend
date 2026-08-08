/**
 * Applies every schema's indexes to the database, as a deliberate deploy step.
 *
 * Production runs with `autoIndex: false` (see AppModule): letting Mongoose
 * rebuild indexes on every serverless cold start burns pool connections and
 * Atlas operations before the first request is even served. Indexes change when
 * the code changes, so they belong to deploys, not requests.
 *
 * Usage:  npm run db:indexes
 *
 * Uses `syncIndexes()`, which also DROPS indexes that are no longer declared on
 * a schema. That is what keeps the database honest about the current code, but
 * it does mean an index you created by hand in Atlas and never wrote into a
 * schema will be removed. Anything you want kept must live in the schema.
 *
 * Safe to re-run: indexes that already match are left untouched.
 */
import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { AppModule } from '../app.module';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const connection = app.get<Connection>(getConnectionToken());
    const modelNames = Object.keys(connection.models).sort();

    if (modelNames.length === 0) {
      console.error('No models registered — nothing to sync.');
      process.exitCode = 1;
      return;
    }

    console.log(
      `Syncing indexes for ${modelNames.length} models on "${connection.name}"…\n`,
    );

    let droppedTotal = 0;
    for (const name of modelNames) {
      const model = connection.models[name];
      try {
        // Resolves to the names of indexes that were dropped because they are
        // no longer declared on the schema.
        const dropped: string[] = await model.syncIndexes();
        droppedTotal += dropped.length;
        console.log(
          dropped.length
            ? `  ✓ ${name} — dropped ${dropped.length}: ${dropped.join(', ')}`
            : `  ✓ ${name}`,
        );
      } catch (err) {
        // Keep going: one bad model shouldn't leave the rest unindexed. The
        // non-zero exit code below still fails the deploy step.
        console.error(
          `  ✗ ${name} — ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exitCode = 1;
      }
    }

    console.log(
      `\nDone. ${modelNames.length} models synced${
        droppedTotal ? `, ${droppedTotal} stale index(es) dropped` : ''
      }.`,
    );
  } finally {
    await app.close();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
