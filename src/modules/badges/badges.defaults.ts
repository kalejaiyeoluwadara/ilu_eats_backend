/**
 * The badges a fresh database starts with. Everything here is editable (and
 * deletable) from admin afterwards — this is a starting point, not a fixed set.
 * Order matches the order the sections appear on the home feed.
 */
export const DEFAULT_BADGES = [
  {
    slug: 'popular',
    label: 'Popular',
    title: 'Fresh from your ìlú',
    subtitle: 'The crowd favourites this week',
    emoji: '🔥',
    image: '/illustrations/badges/popular.svg',
    color: '#E8541A',
    order: 0,
  },
  {
    slug: 'new',
    label: 'New',
    title: 'Just landed',
    subtitle: 'Newest dishes on ìlúEats',
    emoji: '✨',
    image: '/illustrations/badges/new.svg',
    color: '#2F7DF6',
    order: 1,
  },
  {
    slug: 'combo',
    label: 'Combo',
    title: 'Combo deals',
    subtitle: 'Full plates, one price',
    emoji: '🍱',
    image: '/illustrations/badges/combo.svg',
    color: '#F2A93B',
    order: 2,
  },
  {
    slug: 'breakfast',
    label: 'Breakfast',
    title: 'Breakfast run',
    subtitle: 'Start the day right',
    emoji: '🍳',
    image: '/illustrations/badges/breakfast.svg',
    color: '#F2C14E',
    order: 3,
  },
  {
    slug: 'late-night',
    label: 'Late night',
    title: 'Late night cravings',
    subtitle: 'Still cooking when you are still awake',
    emoji: '🌙',
    image: '/illustrations/badges/late-night.svg',
    color: '#5B4FE9',
    order: 4,
  },
  {
    slug: 'party-time',
    label: 'Party time',
    title: 'Party time',
    subtitle: 'Trays and platters for the squad',
    emoji: '🎉',
    image: '/illustrations/badges/party-time.svg',
    color: '#E0407A',
    order: 5,
  },
  {
    slug: 'five-star',
    label: 'Five star',
    title: 'Five star picks',
    subtitle: 'Rated highest by your ìlú',
    emoji: '⭐',
    image: '/illustrations/badges/five-star.svg',
    color: '#F5B301',
    order: 6,
  },
  {
    slug: 'one-life',
    label: 'One life',
    title: 'One life',
    subtitle: 'Worth every naira, treat yourself',
    emoji: '🫶',
    image: '/illustrations/badges/one-life.svg',
    color: '#12A150',
    order: 7,
  },
];

/**
 * Legacy boolean flags on Product, mapped to the badge that replaces them.
 * Used once, on first boot, to backfill membership.
 */
export const LEGACY_FLAG_BADGES: { flag: 'isPopular' | 'isNew'; slug: string }[] =
  [
    { flag: 'isPopular', slug: 'popular' },
    { flag: 'isNew', slug: 'new' },
  ];
