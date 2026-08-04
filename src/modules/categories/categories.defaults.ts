import { CategoryId } from '../../common/enums/category.enum';

/**
 * The categories a database starts with — exactly the nine that used to be
 * hardcoded in the `CategoryId` enum, so existing products and stores keep
 * resolving after the migration. Slugs here MUST match the old enum values.
 *
 * Everything below is editable and deletable from admin afterwards. The enum
 * itself survives only as the seed source and as a convenience for referring
 * to the starter set in code (see the `CategoryId.Snacks` fallback in
 * CatalogService); it is no longer a constraint on what may exist.
 */
export const DEFAULT_CATEGORIES = [
  {
    slug: CategoryId.Local,
    label: 'Local',
    title: 'Taste of home',
    subtitle: 'Jollof, amala, egusi and every plate you grew up on',
    emoji: '🍲',
    color: '#E8541A',
    order: 0,
  },
  {
    slug: CategoryId.Pizza,
    label: 'Pizza',
    title: 'Pizza night',
    subtitle: 'Hot, cheesy and cut to share',
    emoji: '🍕',
    color: '#D64545',
    order: 1,
  },
  {
    slug: CategoryId.Burgers,
    label: 'Burgers',
    title: 'Stacked burgers',
    subtitle: 'Grilled, sauced and worth the napkins',
    emoji: '🍔',
    color: '#B4682B',
    order: 2,
  },
  {
    slug: CategoryId.Shawarma,
    label: 'Shawarma',
    title: 'Shawarma run',
    subtitle: 'Wrapped tight, sauce on everything',
    emoji: '🌯',
    color: '#C9821F',
    order: 3,
  },
  {
    slug: CategoryId.Snacks,
    label: 'Snacks',
    title: 'Small chops',
    subtitle: 'Puff puff, samosa and the in-between bites',
    emoji: '🥟',
    color: '#F2A93B',
    order: 4,
  },
  {
    slug: CategoryId.Cakes,
    label: 'Cakes',
    title: 'Cakes & pastries',
    subtitle: 'For the birthdays and the just-because days',
    emoji: '🍰',
    color: '#E0407A',
    order: 5,
  },
  {
    slug: CategoryId.Icecream,
    label: 'Ice cream',
    title: 'Cold and sweet',
    subtitle: 'Scoops, cones and sundaes',
    emoji: '🍦',
    color: '#5B4FE9',
    order: 6,
  },
  {
    slug: CategoryId.Smoothies,
    label: 'Smoothies',
    title: 'Blended fresh',
    subtitle: 'Fruit, yoghurt and nothing artificial',
    emoji: '🥤',
    color: '#12A150',
    order: 7,
  },
  {
    slug: CategoryId.Drinks,
    label: 'Drinks',
    title: 'Something to drink',
    subtitle: 'Chilled and ready to go',
    emoji: '🧃',
    color: '#2F7DF6',
    order: 8,
  },
];
