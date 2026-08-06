/**
 * What kind of business a store is — the top-level way the app slices the
 * catalog, one browse page per value ("Restaurants", "Shops", …).
 *
 * Deliberately an enum rather than a Category document: a store's vertical is
 * structural (it decides which page it appears on and, later, which ordering
 * rules apply), while categories are editable merchandising. A store carries
 * exactly one vertical but many categories.
 */
export enum StoreVertical {
  Restaurant = 'restaurant',
  Shop = 'shop',
  Pharmacy = 'pharmacy',
  Market = 'market',
  Farm = 'farm',
  Herbal = 'herbal',
}
