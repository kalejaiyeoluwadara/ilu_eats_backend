import { Logger } from '@nestjs/common';
import type { Model } from 'mongoose';

/**
 * Atlas Search index definitions for the catalog.
 *
 * These power the customer-facing `/search` and `/search/suggest` endpoints.
 * Each `name` field is mapped twice — once as a full-text `string` (for fuzzy,
 * whole-query relevance) and once as `autocomplete` (edge n-grams, for
 * as-you-type prefix matching). `foldDiacritics` lets "puff puff" match "pùfú"
 * style entries and generally smooths over accents.
 *
 * The indexes are created programmatically on boot (see ensureSearchIndexes),
 * but you can also paste these definitions straight into the Atlas UI
 * (Atlas → Cluster → Search → Create Index → JSON Editor) if you prefer to
 * manage them there.
 */

export const PRODUCT_SEARCH_INDEX = 'products_search';
export const STORE_SEARCH_INDEX = 'stores_search';

const autocompleteField = {
  type: 'autocomplete' as const,
  tokenization: 'edgeGram' as const,
  minGrams: 2,
  maxGrams: 20,
  foldDiacritics: true,
};

export const PRODUCT_SEARCH_DEFINITION = {
  mappings: {
    dynamic: false,
    fields: {
      name: [{ type: 'string' }, autocompleteField],
      description: { type: 'string' },
      storeSlug: { type: 'token' },
      category: { type: 'token' },
      isPopular: { type: 'boolean' },
      rating: { type: 'number' },
      reviews: { type: 'number' },
    },
  },
};

export const STORE_SEARCH_DEFINITION = {
  mappings: {
    dynamic: false,
    fields: {
      name: [{ type: 'string' }, autocompleteField],
      tagline: { type: 'string' },
      description: { type: 'string' },
      location: { type: 'string' },
      tags: { type: 'string' },
      categories: { type: 'token' },
      isPlatform: { type: 'boolean' },
      isOpen: { type: 'boolean' },
      rating: { type: 'number' },
    },
  },
};

/**
 * Create the Atlas Search indexes if they don't already exist. Best-effort and
 * fully guarded: a non-Atlas deployment, an in-progress build, or an
 * already-existing index must never take down application startup. When an
 * index is missing at query time the service falls back to a `$text` search,
 * so this is an optimisation path, not a hard dependency.
 */
export async function ensureSearchIndexes(
  models: { model: Model<any>; name: string; definition: unknown }[],
): Promise<void> {
  const logger = new Logger('AtlasSearch');

  for (const { model, name, definition } of models) {
    try {
      const existing = await model.collection.listSearchIndexes(name).toArray();
      if (existing.length > 0) continue;

      await model.collection.createSearchIndex({ name, definition } as any);
      logger.log(
        `Created Atlas Search index "${name}" on ${model.collection.collectionName} (building asynchronously)`,
      );
    } catch (err) {
      // listSearchIndexes / createSearchIndex throw on non-Atlas clusters or
      // when the tier lacks Search — log once and keep the $text fallback.
      logger.warn(
        `Skipping Atlas Search index "${name}": ${(err as Error).message}`,
      );
    }
  }
}
