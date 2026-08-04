/**
 * Cache namespaces shared by more than one service.
 *
 * A namespace is a versioned cache bucket: bumping it invalidates every key
 * under it in O(1). When two services read the same underlying documents they
 * must agree on the namespace, otherwise one of them serves stale data after
 * the other writes — which is why these constants live here rather than being
 * redeclared per service.
 */

/** Stores, products, and anything derived from them (featured, badge groups). */
export const CATALOG_NS = 'catalog';
