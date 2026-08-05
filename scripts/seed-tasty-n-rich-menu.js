const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://dara:1234@cluster0.x7fphhx.mongodb.net/ilueats?retryWrites=true&w=majority&appName=Cluster0';

/**
 * Complete Menu items for Tasty 'n' Rich (tasty-n-rich)
 * Total items: 79 across Drinks, Pizza, Shawarma, Burgers, Proteins, Daily Menu, Pastries & Specials.
 */
const items = [
  // === DRINK MENU (category: drinks) ===
  {
    name: "Coke / Fanta / Pepsi",
    slug: "coke-fanta-pepsi",
    description: "Chilled bottle/can of Coke, Fanta, or Pepsi",
    price: 600,
    category: "drinks",
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Table Water",
    slug: "table-water",
    description: "Refreshing pure bottled table water",
    price: 300,
    category: "drinks",
    image: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Exotic / Active Can",
    slug: "exotic-active-can",
    description: "Chilled canned Exotic or Active fruit juice",
    price: 1000,
    category: "drinks",
    image: "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Malt",
    slug: "malt",
    description: "Chilled premium malt drink",
    price: 1000,
    category: "drinks",
    image: "https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Sosa Big",
    slug: "sosa-big",
    description: "Large bottle of refreshing Sosa fruit juice",
    price: 2000,
    category: "drinks",
    image: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Sosa Small",
    slug: "sosa-small",
    description: "Small bottle of refreshing Sosa fruit juice",
    price: 1000,
    category: "drinks",
    image: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Smoothie",
    slug: "smoothie",
    description: "Rich blended fresh fruit smoothie",
    price: 4000,
    category: "smoothies",
    isPopular: true,
    image: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Berry Blast",
    slug: "berry-blast",
    description: "Deliciously sweet and tangy mixed berry blast drink",
    price: 2000,
    category: "drinks",
    image: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "5 Alive",
    slug: "5-alive",
    description: "Chilled 5 Alive fruit juice drink",
    price: 2000,
    category: "drinks",
    image: "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Big Active",
    slug: "big-active",
    description: "Large bottle of Active fruit juice",
    price: 2500,
    category: "drinks",
    image: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Big Exotic",
    slug: "big-exotic",
    description: "Large bottle of Exotic fruit juice",
    price: 2500,
    category: "drinks",
    image: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Zobo",
    slug: "zobo",
    description: "Freshly brewed native Nigerian hibiscus drink (Zobo) with ginger and spices",
    price: 1000,
    category: "drinks",
    isPopular: true,
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Fresh Fruit Juice",
    slug: "fresh-fruit-juice",
    description: "Freshly squeezed natural fruit juice blend",
    price: 3500,
    category: "drinks",
    image: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Tiger Nut",
    slug: "tiger-nut",
    description: "Creamy, naturally sweet tiger nut milk (Kunu Aya)",
    price: 2500,
    category: "drinks",
    isPopular: true,
    image: "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=600&auto=format&fit=crop&q=80"
  },

  // === PIZZA MENU (category: pizza) ===
  {
    name: "Small Pizza",
    slug: "pizza-small",
    description: "Freshly baked small pizza loaded with rich cheese and delicious toppings",
    price: 7500,
    category: "pizza",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Medium Pizza",
    slug: "pizza-medium",
    description: "Medium freshly baked pizza perfect for sharing",
    price: 12000,
    category: "pizza",
    isPopular: true,
    image: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Large Pizza",
    slug: "pizza-large",
    description: "Extra large pizza with generous toppings and gooey mozzarella cheese",
    price: 16000,
    category: "pizza",
    isPopular: true,
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80"
  },

  // === SHAWARMA MENU (category: shawarma) ===
  {
    name: "Chicken Double Sausage Shawarma",
    slug: "chicken-double-sausage-shawarma",
    description: "Creamy chicken shawarma packed with two juicy sausages and delicious cream",
    price: 4000,
    category: "shawarma",
    isPopular: true,
    image: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Chicken Single Sausage Shawarma",
    slug: "chicken-single-sausage-shawarma",
    description: "Classic chicken shawarma with one juicy sausage and house sauce",
    price: 3000,
    category: "shawarma",
    image: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Turkey Single Shawarma",
    slug: "turkey-single-shawarma",
    description: "Savory peppered turkey wrap with single sausage and creamy dressing",
    price: 5000,
    category: "shawarma",
    image: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Turkey Double Shawarma",
    slug: "turkey-double-shawarma",
    description: "Rich peppered turkey wrap with double sausages and extra sauce",
    price: 6000,
    category: "shawarma",
    image: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Beef Single Shawarma",
    slug: "beef-single-shawarma",
    description: "Tender seasoned beef shawarma wrap with sausage",
    price: 4000,
    category: "shawarma",
    image: "https://images.unsplash.com/photo-1561651823-34feb02250e4?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Beef Double Shawarma",
    slug: "beef-double-shawarma",
    description: "Double portion beef shawarma loaded with double sausages",
    price: 5000,
    category: "shawarma",
    image: "https://images.unsplash.com/photo-1561651823-34feb02250e4?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Asun Shawarma",
    slug: "asun-shawarma",
    description: "Spicy roasted goat meat (Asun) shawarma wrap — signature house specialty",
    price: 7500,
    category: "shawarma",
    isPopular: true,
    image: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600&auto=format&fit=crop&q=80"
  },

  // === BURGER MENU (category: burgers) ===
  {
    name: "Burger Double Deck",
    slug: "burger-double-deck",
    description: "Juicy double decker burger with melted cheese and fresh veggies",
    price: 6500,
    category: "burgers",
    isPopular: true,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Burger Single Deck",
    slug: "burger-single-deck",
    description: "Classic single deck burger with beef patty and special sauce",
    price: 4500,
    category: "burgers",
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Beef Double Deck",
    slug: "beef-double-deck",
    description: "Loaded beef double decker burger stacked with extra cheese",
    price: 9500,
    category: "burgers",
    image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Beef Single",
    slug: "beef-single-burger",
    description: "Tender beef single patty burger served on toasted brioche bun",
    price: 6500,
    category: "burgers",
    image: "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "TastynRich Massive Burger",
    slug: "tastynrich-massive-burger",
    description: "Ultimate massive burger loaded with multiple patties, bacon, cheese & signature sauce",
    price: 15000,
    category: "burgers",
    isPopular: true,
    image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80"
  },

  // === PROTEIN MENU (category: local) ===
  {
    name: "Big Chicken",
    slug: "big-chicken",
    description: "Large portion of seasoned, peppered fried chicken",
    price: 3500,
    category: "local",
    image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Small Chicken",
    slug: "small-chicken",
    description: "Small portion of seasoned, peppered fried chicken",
    price: 2500,
    category: "local",
    image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Beef",
    slug: "beef-protein",
    description: "Tender seasoned beef portion",
    price: 500,
    category: "local",
    image: "https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Egg",
    slug: "egg",
    description: "Hard-boiled or fried egg extra protein",
    price: 500,
    category: "local",
    image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Goat Meat",
    slug: "goat-meat",
    description: "Succulent peppered goat meat piece",
    price: 1500,
    category: "local",
    isPopular: true,
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Small Turkey",
    slug: "small-turkey",
    description: "Small piece of peppered fried turkey",
    price: 3500,
    category: "local",
    image: "https://images.unsplash.com/photo-1514944288352-fffac99f0bdf?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Big Turkey",
    slug: "big-turkey",
    description: "Large piece of peppered fried turkey",
    price: 5000,
    category: "local",
    image: "https://images.unsplash.com/photo-1514944288352-fffac99f0bdf?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Fish",
    slug: "fish-protein",
    description: "Fried or peppered fish portion",
    price: 2500,
    category: "local",
    image: "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Chicken and Chips",
    slug: "chicken-and-chips",
    description: "Crispy french fries served with juicy fried chicken",
    price: 8500,
    category: "local",
    isPopular: true,
    image: "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&auto=format&fit=crop&q=80"
  },

  // === DAILY MENU (category: local) ===
  {
    name: "Jollof Rice",
    slug: "jollof-rice",
    description: "Smoky Nigerian party jollof rice",
    price: 700,
    category: "local",
    isPopular: true,
    image: "https://i.pinimg.com/736x/a3/3b/c7/a33bc7a1e5b4e7c8d9f0a1b2c3d4e5f6.jpg"
  },
  {
    name: "Fried Rice",
    slug: "fried-rice",
    description: "Flavorful Nigerian fried rice with mixed vegetables",
    price: 700,
    category: "local",
    image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Basmati Fried Rice",
    slug: "basmati-fried-rice",
    description: "Premium basmati grain fried rice cooked with herbs and spices",
    price: 1500,
    category: "local",
    isPopular: true,
    image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Shrimp Fried Rice",
    slug: "shrimp-fried-rice",
    description: "Rich fried rice sauteed with succulent fresh shrimps",
    price: 1800,
    category: "local",
    isPopular: true,
    image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Native Rice",
    slug: "native-rice",
    description: "Traditional village palm oil native rice made with locust beans and dried fish",
    price: 1000,
    category: "local",
    image: "https://i.pinimg.com/736x/11/5f/3e/115f3ea3a3a5b5f5c6e3b1e3f3e3f3e3.jpg"
  },
  {
    name: "Pasta",
    slug: "pasta",
    description: "Deliciously seasoned spaghetti pasta",
    price: 800,
    category: "local",
    image: "https://i.pinimg.com/736x/b4/4c/d8/b44cd8b2f6c5e8d0a1b2c3d4e5f6a7b8.jpg"
  },
  {
    name: "Chicken Stir Fry Pasta",
    slug: "chicken-stir-fry-pasta",
    description: "Spaghetti stir-fry with shredded chicken and crunchy vegetables",
    price: 1500,
    category: "local",
    isPopular: true,
    image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Farmers Porridge",
    slug: "farmers-porridge",
    description: "Hearty yam porridge cooked in palm oil with vegetables",
    price: 1200,
    category: "local",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Coconut Rice",
    slug: "coconut-rice",
    description: "Fragrant rice simmered in fresh coconut milk broth",
    price: 1000,
    category: "local",
    image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Poundo and Egusi",
    slug: "poundo-and-egusi",
    description: "Smooth poundo yam swallow served with rich melon egusi soup",
    price: 3000,
    category: "local",
    isPopular: true,
    image: "https://i.pinimg.com/736x/9c/2a/bc/9c2abcd6b0e9a2f4c5d6e7f8a9b0c1d2.jpg"
  },
  {
    name: "Semo and Efo",
    slug: "semo-and-efo",
    description: "Semolina swallow served with mouth-watering efo riro vegetable stew",
    price: 3000,
    category: "local",
    image: "https://i.pinimg.com/736x/be/4c/de/be4cdef8d2a1c4b6e7f8a9b0c1d2e3f4.jpg"
  },
  {
    name: "Beans & Big Bread",
    slug: "beans-and-big-bread",
    description: "Stewed honey beans served with a large loaf of soft Agege bread",
    price: 4500,
    category: "local",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Beans & Bread",
    slug: "beans-and-bread",
    description: "Stewed honey beans served with warm soft bread",
    price: 3850,
    category: "local",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Beans, Egg, Round Fish",
    slug: "beans-egg-round-fish",
    description: "Rich stewed beans served with fried egg and seasoned round fish",
    price: 3000,
    category: "local",
    isPopular: true,
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Yam and Egg Sauce",
    slug: "yam-and-egg-sauce",
    description: "Boiled white yam served with rich tomato egg sauce",
    price: 6000,
    category: "local",
    isPopular: true,
    image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Yam and Fish Sauce",
    slug: "yam-and-fish-sauce",
    description: "Boiled white yam served with savory peppered fish sauce",
    price: 6000,
    category: "local",
    image: "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Moimoi",
    slug: "moimoi",
    description: "Steamed bean pudding made with peppers, fish and eggs",
    price: 1000,
    category: "local",
    image: "https://i.pinimg.com/736x/c5/5d/e9/c55de9c3a7d6f9e1b2c3d4e5f6a7b8c9.jpg"
  },
  {
    name: "Coleslaw",
    slug: "coleslaw",
    description: "Fresh creamy Nigerian-style coleslaw salad",
    price: 1000,
    category: "local",
    image: "https://i.pinimg.com/736x/d6/6e/f0/d66ef0d4b8e7a0f2c3d4e5f6a7b8c9d0.jpg"
  },
  {
    name: "Plantain",
    slug: "plantain",
    description: "Fried sweet ripe plantain slices (Dodo)",
    price: 1000,
    category: "local",
    isPopular: true,
    image: "https://images.unsplash.com/photo-1628773822503-930a85859ef0?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "TastynRich Sardine",
    slug: "tastynrich-sardine",
    description: "Special house sardine dish seasoned to perfection",
    price: 9500,
    category: "local",
    image: "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Bread and Egg Sauce",
    slug: "bread-and-egg-sauce",
    description: "Fresh bread served with warm, seasoned egg sauce",
    price: 3000,
    category: "local",
    image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Pancake",
    slug: "pancake",
    description: "Fluffy American-style pancakes served with syrup",
    price: 6500,
    category: "snacks",
    isPopular: true,
    image: "https://images.unsplash.com/photo-1528207776546-384be471947a?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Waffle",
    slug: "waffle",
    description: "Golden crispy waffles drizzled with maple syrup",
    price: 8500,
    category: "snacks",
    image: "https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Chicken Pepper Soup",
    slug: "chicken-pepper-soup",
    description: "Hot, spicy chicken pepper soup simmered with native herbs",
    price: 6000,
    category: "local",
    isPopular: true,
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Turkey Pepper Soup",
    slug: "turkey-pepper-soup",
    description: "Fiery turkey pepper soup infused with fragrant aromatic spices",
    price: 8500,
    category: "local",
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Full Catfish Peppersoup",
    slug: "full-catfish-peppersoup",
    description: "Whole fresh catfish cooked in rich, spicy peppersoup broth (Point & Kill)",
    price: 10000,
    category: "local",
    isPopular: true,
    image: "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=600&auto=format&fit=crop&q=80"
  },

  // === PASTRY MENU (category: snacks) ===
  {
    name: "Meat Pie",
    slug: "meat-pie",
    description: "Golden flaky pastry stuffed with seasoned minced beef and potatoes",
    price: 1000,
    category: "snacks",
    isPopular: true,
    image: "https://images.unsplash.com/photo-1621236378699-8597faf6a176?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Plain Doughnut",
    slug: "plain-doughnut",
    description: "Soft glazed plain doughnut",
    price: 500,
    category: "snacks",
    image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Jam Doughnut",
    slug: "jam-doughnut",
    description: "Soft doughnut filled with sweet strawberry jam",
    price: 800,
    category: "snacks",
    image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Milky Doughnut Box of 3",
    slug: "milky-doughnut-box-of-3",
    description: "Box of 3 soft, rich milky cream doughnuts",
    price: 4500,
    category: "snacks",
    isPopular: true,
    image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Sausage Roll",
    slug: "sausage",
    description: "Flaky pastry roll wrapped around savory sausage meat",
    price: 1000,
    category: "snacks",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Spring Roll",
    slug: "spring-roll",
    description: "Crispy fried spring roll filled with minced vegetables and meat",
    price: 400,
    category: "snacks",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Chicken Pie",
    slug: "chicken-pie",
    description: "Golden flaky pastry stuffed with seasoned chicken and vegetables",
    price: 1200,
    category: "snacks",
    image: "https://images.unsplash.com/photo-1621236378699-8597faf6a176?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Egg Roll",
    slug: "egg-roll",
    description: "Soft golden fried dough with a whole boiled egg inside",
    price: 1000,
    category: "snacks",
    image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Scotch Egg",
    slug: "scotch-egg",
    description: "Hard-boiled egg wrapped in seasoned meat and breadcrumbs, fried golden",
    price: 1000,
    category: "snacks",
    image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Small Chops",
    slug: "small-chops",
    description: "Assorted small chops platter featuring samosa, spring rolls, puff puff & gizzard",
    price: 3000,
    category: "snacks",
    isPopular: true,
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Samosa",
    slug: "samosa",
    description: "Crispy fried triangular pastry filled with spiced meat",
    price: 400,
    category: "snacks",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80"
  },

  // === BEEF DULEX / TURKEY SPECIAL MENU ===
  {
    name: "Beef Dulex / Turkey Special (Small)",
    slug: "beef-dulex-turkey-special-small",
    description: "Special house roasted beef dulex & turkey combo (Small portion)",
    price: 9000,
    category: "local",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Beef Dulex / Turkey Special (Medium)",
    slug: "beef-dulex-turkey-special-medium",
    description: "Special house roasted beef dulex & turkey combo (Medium portion)",
    price: 15000,
    category: "local",
    isPopular: true,
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Beef Dulex / Turkey Special (Large)",
    slug: "beef-dulex-turkey-special-large",
    description: "Special house roasted beef dulex & turkey combo (Large portion)",
    price: 18500,
    category: "local",
    isPopular: true,
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80"
  },
  {
    name: "Extra Cheese",
    slug: "extra-cheese",
    description: "Melted extra cheese topping for your meal",
    price: 3000,
    category: "snacks",
    image: "https://images.unsplash.com/photo-1552767059-ce182ead8c1b?w=600&auto=format&fit=crop&q=80"
  }
];

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const store = await db.collection('stores').findOne({ slug: 'tasty-n-rich' });
  if (!store) {
    console.error("Store 'tasty-n-rich' not found in DB!");
    process.exit(1);
  }

  const storeObjectId = typeof store._id === 'string' ? new mongoose.Types.ObjectId(store._id) : store._id;
  console.log(`Found store: ${store.name} (${store._id})`);

  const now = new Date();
  const productsToInsert = items.map(item => ({
    _id: new mongoose.Types.ObjectId(),
    storeId: storeObjectId,
    storeSlug: store.slug,
    slug: item.slug,
    name: item.name,
    description: item.description || '',
    price: item.price,
    oldPrice: null,
    image: item.image || '',
    category: item.category,
    isPopular: item.isPopular || false,
    isNew: false,
    badges: [],
    rating: 0,
    reviews: 0,
    options: [],
    createdAt: now,
    updatedAt: now,
    __v: 0
  }));

  // Clean up existing products for tasty-n-rich
  const deleteResult = await db.collection('products').deleteMany({
    $or: [
      { storeId: storeObjectId },
      { storeId: store._id.toString() },
      { storeSlug: store.slug }
    ]
  });
  console.log(`Deleted ${deleteResult.deletedCount} existing products for store ${store.slug}`);

  // Bulk insert products
  const insertResult = await db.collection('products').insertMany(productsToInsert);
  console.log(`Successfully inserted ${insertResult.insertedCount} products into database!`);

  // Ensure store categories are updated with all categories present in the items list
  const itemCategories = items.map(i => i.category);
  const updatedCategories = Array.from(new Set([...(store.categories || []), ...itemCategories]));
  await db.collection('stores').updateOne(
    { _id: store._id },
    { $set: { categories: updatedCategories, updatedAt: now } }
  );
  console.log(`Updated store categories to:`, updatedCategories);

  console.log('Seeding completed successfully!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
