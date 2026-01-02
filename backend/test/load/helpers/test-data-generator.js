/**
 * Test Data Generator for Load Tests
 * Generates realistic test data for various scenarios
 */

const crypto = require('crypto');

/**
 * Product catalog for testing
 */
const PRODUCTS = {
  beer: [
    { sku: 'BEER-BUD-12', name: 'Budweiser 12oz', price: 8.99, abv: 5.0 },
    { sku: 'BEER-CORONA-6', name: 'Corona 6-pack', price: 12.99, abv: 4.6 },
    { sku: 'BEER-HEINEKEN-12', name: 'Heineken 12oz', price: 9.99, abv: 5.0 },
    { sku: 'BEER-MILLER-12', name: 'Miller Lite 12oz', price: 7.99, abv: 4.2 },
    { sku: 'BEER-COORS-12', name: 'Coors Light 12oz', price: 7.99, abv: 4.2 },
  ],
  wine: [
    { sku: 'WINE-CAB-750', name: 'Cabernet Sauvignon 750ml', price: 19.99, abv: 13.5 },
    { sku: 'WINE-CHARD-750', name: 'Chardonnay 750ml', price: 15.99, abv: 13.0 },
    { sku: 'WINE-PINOT-750', name: 'Pinot Noir 750ml', price: 22.99, abv: 13.5 },
    { sku: 'WINE-MERLOT-750', name: 'Merlot 750ml', price: 18.99, abv: 13.5 },
    { sku: 'WINE-SAUV-750', name: 'Sauvignon Blanc 750ml', price: 16.99, abv: 12.5 },
  ],
  spirits: [
    { sku: 'VODKA-GREY-750', name: 'Grey Goose Vodka 750ml', price: 34.99, abv: 40.0 },
    { sku: 'WHISKEY-JACK-750', name: 'Jack Daniels 750ml', price: 29.99, abv: 40.0 },
    { sku: 'RUM-BACARDI-750', name: 'Bacardi Rum 750ml', price: 24.99, abv: 40.0 },
    { sku: 'TEQUILA-PATRON-750', name: 'Patron Tequila 750ml', price: 44.99, abv: 40.0 },
    { sku: 'GIN-BOMBAY-750', name: 'Bombay Sapphire Gin 750ml', price: 27.99, abv: 40.0 },
    { sku: 'VODKA-ABSOLUT-750', name: 'Absolut Vodka 750ml', price: 24.99, abv: 40.0 },
  ],
  mixers: [
    { sku: 'MIXER-COKE-2L', name: 'Coca-Cola 2L', price: 2.99, abv: 0 },
    { sku: 'MIXER-SPRITE-2L', name: 'Sprite 2L', price: 2.99, abv: 0 },
    { sku: 'MIXER-TONIC-1L', name: 'Tonic Water 1L', price: 3.99, abv: 0 },
    { sku: 'MIXER-JUICE-1L', name: 'Orange Juice 1L', price: 4.99, abv: 0 },
  ],
  snacks: [
    { sku: 'SNACK-CHIPS-REG', name: 'Potato Chips Regular', price: 3.99, abv: 0 },
    { sku: 'SNACK-NUTS-MIX', name: 'Mixed Nuts', price: 5.99, abv: 0 },
    { sku: 'SNACK-PRETZELS', name: 'Pretzels', price: 3.49, abv: 0 },
  ],
};

/**
 * Location and terminal configurations
 */
const LOCATIONS = [
  { id: 'loc-001', name: 'Downtown Store', taxRate: 0.07 },
  { id: 'loc-002', name: 'Airport Store', taxRate: 0.075 },
  { id: 'loc-003', name: 'Beach Store', taxRate: 0.07 },
];

const TERMINALS = ['term-001', 'term-002', 'term-003', 'term-004', 'term-005'];

const PAYMENT_METHODS = ['cash', 'card', 'split'];
const CHANNELS = ['counter', 'web', 'uber_eats', 'doordash'];

/**
 * Generate a random order with realistic product combinations
 */
function generateRandomOrder() {
  const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
  const terminal = TERMINALS[Math.floor(Math.random() * TERMINALS.length)];
  const paymentMethod = PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)];
  const channel = CHANNELS[Math.floor(Math.random() * CHANNELS.length)];

  // Generate realistic item combinations
  const items = generateRealisticItems();

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.priceAtSale * item.quantity), 0);
  const tax = subtotal * location.taxRate;
  const total = subtotal + tax;

  return {
    locationId: location.id,
    terminalId: terminal,
    items: items,
    paymentMethod: paymentMethod,
    channel: channel,
    ageVerified: true,
    idScanned: Math.random() > 0.3, // 70% have ID scanned
    idempotencyKey: crypto.randomUUID(),
    subtotal: parseFloat(subtotal.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
  };
}

/**
 * Generate realistic item combinations based on shopping patterns
 */
function generateRealisticItems() {
  const items = [];
  const rand = Math.random();

  // Shopping patterns:
  // 40% - Single item purchase (beer or wine)
  // 30% - Party pack (multiple beers or wines)
  // 20% - Mixed purchase (alcohol + mixers/snacks)
  // 10% - Large order (multiple categories)

  if (rand < 0.4) {
    // Single item
    const category = Math.random() > 0.5 ? 'beer' : 'wine';
    const product = getRandomProduct(category);
    items.push(createOrderItem(product, 1));
  } else if (rand < 0.7) {
    // Party pack - multiple of same category
    const category = Math.random() > 0.5 ? 'beer' : 'wine';
    const count = Math.floor(Math.random() * 3) + 2; // 2-4 items
    for (let i = 0; i < count; i++) {
      const product = getRandomProduct(category);
      items.push(createOrderItem(product, Math.floor(Math.random() * 2) + 1));
    }
  } else if (rand < 0.9) {
    // Mixed purchase
    const alcoholCategory = ['beer', 'wine', 'spirits'][Math.floor(Math.random() * 3)];
    const alcoholProduct = getRandomProduct(alcoholCategory);
    items.push(createOrderItem(alcoholProduct, Math.floor(Math.random() * 2) + 1));

    // Add mixer or snack
    if (Math.random() > 0.5) {
      const mixer = getRandomProduct('mixers');
      items.push(createOrderItem(mixer, 1));
    } else {
      const snack = getRandomProduct('snacks');
      items.push(createOrderItem(snack, 1));
    }
  } else {
    // Large order - multiple categories
    const categories = ['beer', 'wine', 'spirits', 'mixers', 'snacks'];
    const numCategories = Math.floor(Math.random() * 3) + 2; // 2-4 categories

    for (let i = 0; i < numCategories; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const product = getRandomProduct(category);
      items.push(createOrderItem(product, Math.floor(Math.random() * 2) + 1));
    }
  }

  return items;
}

/**
 * Get a random product from a category
 */
function getRandomProduct(category) {
  const products = PRODUCTS[category];
  return products[Math.floor(Math.random() * products.length)];
}

/**
 * Create an order item with optional discount
 */
function createOrderItem(product, quantity) {
  // 10% chance of discount
  const hasDiscount = Math.random() < 0.1;
  const discount = hasDiscount ? parseFloat((product.price * 0.1).toFixed(2)) : 0;

  return {
    sku: product.sku,
    quantity: quantity,
    priceAtSale: product.price,
    discount: discount,
  };
}

/**
 * Generate a batch of orders for bulk testing
 */
function generateOrderBatch(count) {
  const orders = [];
  for (let i = 0; i < count; i++) {
    orders.push(generateRandomOrder());
  }
  return orders;
}

/**
 * Generate test data for specific scenarios
 */
function generateScenarioData(scenario) {
  switch (scenario) {
    case 'high-value':
      // High-value orders (spirits and premium wines)
      return generateHighValueOrder();
    
    case 'quick-sale':
      // Quick single-item sales
      return generateQuickSaleOrder();
    
    case 'party-order':
      // Large party orders
      return generatePartyOrder();
    
    case 'online-order':
      // Online delivery orders
      return generateOnlineOrder();
    
    default:
      return generateRandomOrder();
  }
}

function generateHighValueOrder() {
  const order = generateRandomOrder();
  order.items = [
    createOrderItem(getRandomProduct('spirits'), 2),
    createOrderItem(PRODUCTS.wine[2], 1), // Premium wine
  ];
  return order;
}

function generateQuickSaleOrder() {
  const order = generateRandomOrder();
  order.items = [createOrderItem(getRandomProduct('beer'), 1)];
  order.channel = 'counter';
  return order;
}

function generatePartyOrder() {
  const order = generateRandomOrder();
  order.items = [
    createOrderItem(getRandomProduct('beer'), 6),
    createOrderItem(getRandomProduct('wine'), 3),
    createOrderItem(getRandomProduct('mixers'), 4),
    createOrderItem(getRandomProduct('snacks'), 5),
  ];
  return order;
}

function generateOnlineOrder() {
  const order = generateRandomOrder();
  order.channel = Math.random() > 0.5 ? 'uber_eats' : 'doordash';
  return order;
}

/**
 * Artillery processor functions
 */
function setRandomOrderData(context, events, done) {
  const orderData = generateRandomOrder();
  context.vars.orderData = orderData;
  context.vars.idempotencyKey = orderData.idempotencyKey;
  done();
}

function setHighValueOrderData(context, events, done) {
  const orderData = generateHighValueOrder();
  context.vars.orderData = orderData;
  context.vars.idempotencyKey = orderData.idempotencyKey;
  done();
}

function setQuickSaleOrderData(context, events, done) {
  const orderData = generateQuickSaleOrder();
  context.vars.orderData = orderData;
  context.vars.idempotencyKey = orderData.idempotencyKey;
  done();
}

function setPartyOrderData(context, events, done) {
  const orderData = generatePartyOrder();
  context.vars.orderData = orderData;
  context.vars.idempotencyKey = orderData.idempotencyKey;
  done();
}

function setOnlineOrderData(context, events, done) {
  const orderData = generateOnlineOrder();
  context.vars.orderData = orderData;
  context.vars.idempotencyKey = orderData.idempotencyKey;
  done();
}

module.exports = {
  generateRandomOrder,
  generateOrderBatch,
  generateScenarioData,
  setRandomOrderData,
  setHighValueOrderData,
  setQuickSaleOrderData,
  setPartyOrderData,
  setOnlineOrderData,
  PRODUCTS,
  LOCATIONS,
  TERMINALS,
  PAYMENT_METHODS,
  CHANNELS,
};

