import { CategoryId } from '../../common/enums/category.enum';

/**
 * The food categories a database starts with — exactly the nine that used to
 * be hardcoded in the `CategoryId` enum, so existing products and stores keep
 * resolving after the migration. Slugs here MUST match the old enum values.
 *
 * Everything below is editable and deletable from admin afterwards. The enum
 * itself survives only as the seed source and as a convenience for referring
 * to the starter set in code (see the `CategoryId.Snacks` fallback in
 * CatalogService); it is no longer a constraint on what may exist.
 */
const FOOD_CATEGORIES = [
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

/**
 * The non-food categories the storefront's /shops filters ask for. These are
 * the slugs the shops page pills and icon rail send, so a shop can only be
 * filtered into one of them if the matching category row exists — that is what
 * these seed.
 *
 * They live here rather than in the enum because nothing legacy references
 * them; they are ordinary editable rows that simply ship in the box.
 */
const SHOP_CATEGORIES = [
  {
    slug: 'supermarket',
    label: 'Supermarkets',
    title: 'Supermarkets',
    subtitle: 'Aisles of everything, delivered',
    emoji: '🏬',
    color: '#2563EB',
    order: 9,
    showOnHome: false,
  },
  {
    slug: 'mini-marts',
    label: 'Mini Marts',
    title: 'Mini marts',
    subtitle: 'The corner shop, on demand',
    emoji: '🛒',
    color: '#0EA5E9',
    order: 10,
    showOnHome: false,
  },
  {
    slug: 'groceries',
    label: 'Groceries',
    title: 'Groceries',
    subtitle: 'Provisions and everyday staples',
    emoji: '🧺',
    color: '#16A34A',
    order: 11,
    showOnHome: false,
  },
  {
    slug: 'bakery',
    label: 'Bakery',
    title: 'Fresh from the oven',
    subtitle: 'Bread, rolls and pastries',
    emoji: '🍞',
    color: '#C2853B',
    order: 12,
    showOnHome: false,
  },
  {
    slug: 'fruits',
    label: 'Fruits',
    title: 'Fruits & veg',
    subtitle: 'Picked fresh, delivered fresh',
    emoji: '🍌',
    color: '#F59E0B',
    order: 13,
    showOnHome: false,
  },
  {
    slug: 'frozen',
    label: 'Frozen Food',
    title: 'Frozen food',
    subtitle: 'Proteins and freezer staples',
    emoji: '🧊',
    color: '#38BDF8',
    order: 14,
    showOnHome: false,
  },
  {
    slug: 'alcohol',
    label: 'Alcohol',
    title: 'Drinks cabinet',
    subtitle: 'Beer, wine and spirits',
    emoji: '🍾',
    color: '#7C3AED',
    order: 15,
    showOnHome: false,
  },
  {
    slug: 'cleaning',
    label: 'Cleaning',
    title: 'Home & cleaning',
    subtitle: 'Detergents, soaps and household bits',
    emoji: '🧴',
    color: '#14B8A6',
    order: 16,
    showOnHome: false,
  },
  {
    slug: 'electronics',
    label: 'Electronics',
    title: 'Electronics',
    subtitle: 'Gadgets, chargers and accessories',
    emoji: '📱',
    color: '#475569',
    order: 17,
    showOnHome: false,
  },
];

/** Everything a fresh database starts with. */
export const DEFAULT_CATEGORIES = [...FOOD_CATEGORIES, ...SHOP_CATEGORIES];

/** Exported for the top-up script, which adds only the missing shop rows to a
 * database that was already seeded with the food set. */
export { FOOD_CATEGORIES, SHOP_CATEGORIES };
