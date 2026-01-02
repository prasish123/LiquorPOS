/**
 * Authentication Helper for Artillery Load Tests
 * Handles login and token management for load testing
 */

const axios = require('axios');

/**
 * Get CSRF token from the server
 */
async function getCsrfToken(baseUrl) {
  try {
    const response = await axios.get(`${baseUrl}/auth/csrf-token`, {
      withCredentials: true,
    });
    return response.data.csrfToken;
  } catch (error) {
    console.error('Failed to get CSRF token:', error.message);
    throw error;
  }
}

/**
 * Login and get authentication token
 */
async function login(baseUrl, username, password) {
  try {
    // First get CSRF token
    const csrfToken = await getCsrfToken(baseUrl);

    // Then login
    const response = await axios.post(
      `${baseUrl}/auth/login`,
      {
        username,
        password,
      },
      {
        headers: {
          'x-csrf-token': csrfToken,
        },
        withCredentials: true,
      }
    );

    // Extract token from cookie
    const cookies = response.headers['set-cookie'];
    let accessToken = null;
    
    if (cookies) {
      for (const cookie of cookies) {
        if (cookie.startsWith('access_token=')) {
          accessToken = cookie.split(';')[0].split('=')[1];
          break;
        }
      }
    }

    return {
      user: response.data.user,
      jti: response.data.jti,
      accessToken,
      csrfToken,
    };
  } catch (error) {
    console.error('Login failed:', error.message);
    throw error;
  }
}

/**
 * Artillery hook: Before scenario - authenticate user
 */
async function beforeScenario(context, events, done) {
  const baseUrl = context.vars.target || 'http://localhost:3000';
  const username = context.vars.username || 'admin';
  const password = context.vars.password || 'admin123';

  try {
    const authData = await login(baseUrl, username, password);
    
    // Store auth data in context for use in requests
    context.vars.accessToken = authData.accessToken;
    context.vars.csrfToken = authData.csrfToken;
    context.vars.userId = authData.user.id;
    context.vars.userRole = authData.user.role;

    done();
  } catch (error) {
    console.error('Authentication failed in beforeScenario:', error.message);
    done(error);
  }
}

/**
 * Generate unique idempotency key
 */
function generateIdempotencyKey(context, events, done) {
  const crypto = require('crypto');
  context.vars.idempotencyKey = crypto.randomUUID();
  done();
}

/**
 * Generate random order data
 */
function generateOrderData(context, events, done) {
  const items = [
    { sku: 'BEER-BUD-12', name: 'Budweiser 12oz', price: 8.99 },
    { sku: 'WINE-CAB-750', name: 'Cabernet Sauvignon 750ml', price: 19.99 },
    { sku: 'VODKA-GREY-750', name: 'Grey Goose Vodka 750ml', price: 34.99 },
    { sku: 'WHISKEY-JACK-750', name: 'Jack Daniels 750ml', price: 29.99 },
    { sku: 'BEER-CORONA-6', name: 'Corona 6-pack', price: 12.99 },
    { sku: 'WINE-CHARD-750', name: 'Chardonnay 750ml', price: 15.99 },
    { sku: 'RUM-BACARDI-750', name: 'Bacardi Rum 750ml', price: 24.99 },
    { sku: 'TEQUILA-PATRON-750', name: 'Patron Tequila 750ml', price: 44.99 },
  ];

  // Select 1-3 random items
  const numItems = Math.floor(Math.random() * 3) + 1;
  const selectedItems = [];
  
  for (let i = 0; i < numItems; i++) {
    const item = items[Math.floor(Math.random() * items.length)];
    const quantity = Math.floor(Math.random() * 3) + 1;
    
    selectedItems.push({
      sku: item.sku,
      quantity: quantity,
      priceAtSale: item.price,
      discount: 0,
    });
  }

  // Generate random location and terminal IDs
  const locationIds = ['loc-001', 'loc-002', 'loc-003'];
  const terminalIds = ['term-001', 'term-002', 'term-003', 'term-004'];
  const paymentMethods = ['cash', 'card', 'split'];
  const channels = ['counter', 'web', 'uber_eats', 'doordash'];

  context.vars.orderData = {
    locationId: locationIds[Math.floor(Math.random() * locationIds.length)],
    terminalId: terminalIds[Math.floor(Math.random() * terminalIds.length)],
    items: selectedItems,
    paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
    channel: channels[Math.floor(Math.random() * channels.length)],
    ageVerified: true,
    idScanned: Math.random() > 0.5,
    idempotencyKey: context.vars.idempotencyKey,
  };

  done();
}

/**
 * Log response for debugging
 */
function logResponse(context, events, done) {
  if (context.vars.$loopCount === 0 || context.vars.$loopCount % 10 === 0) {
    console.log(`Request ${context.vars.$loopCount}: Status ${context.vars.$statusCode}`);
  }
  done();
}

module.exports = {
  beforeScenario,
  generateIdempotencyKey,
  generateOrderData,
  logResponse,
  getCsrfToken,
  login,
};

