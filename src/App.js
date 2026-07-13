const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import middlewares
const { errorHandler, notFound } = require('./middleware/errorHandler');

// ==================== ROUTE SECTIONS ====================
const authRoutes = require('./routes/auth.routes');

// Admin routes
const adminDashboardRoutes = require('./routes/admin/dashboard.routes');
const adminProductRoutes = require('./routes/admin/product.routes');
const adminInventoryRoutes = require('./routes/admin/inventory.routes');
const adminOrderRoutes = require('./routes/admin/order.routes');
const adminUserRoutes = require('./routes/admin/user.routes');
const adminCategoryRoutes = require('./routes/admin/category.routes');
const adminBannerRoutes = require('./routes/admin/banner.routes');
const adminCouponRoutes = require('./routes/admin/coupon.routes');
const adminSettingsRoutes = require('./routes/admin/settings.routes');

// User routes
const userHomeRoutes = require('./routes/user/home.routes');
const userShopRoutes = require('./routes/user/shop.routes');
const userCartRoutes = require('./routes/user/cart.routes');
const userCheckoutRoutes = require('./routes/user/checkout.routes');
const userOrderRoutes = require('./routes/user/order.routes');
const userWishlistRoutes = require('./routes/user/wishlist.routes');
const userReviewRoutes = require('./routes/user/review.routes');
const userProfileRoutes = require('./routes/user/profile.routes');

const app = express();

// ==================== SAFE ROUTER RESOLVER ====================
// Supports:
// module.exports = router
// module.exports = { router }
// module.exports.default = router
const resolveRouter = (routeModule, routeName) => {
  if (typeof routeModule === 'function') {
    return routeModule;
  }

  if (routeModule && typeof routeModule.router === 'function') {
    console.warn(`⚠️ ${routeName} exported as { router }. Using routeModule.router`);
    return routeModule.router;
  }

  if (routeModule && typeof routeModule.default === 'function') {
    console.warn(`⚠️ ${routeName} exported as default. Using routeModule.default`);
    return routeModule.default;
  }

  console.error(`❌ Invalid route export for: ${routeName}`);
  console.error('Type:', typeof routeModule);
  console.error('Keys:', Object.keys(routeModule || {}));

  throw new Error(
    `Invalid route export for ${routeName}. Route file must end with: module.exports = router;`
  );
};

// ==================== SECURITY ====================
app.use(helmet());

// Rate limit configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api', limiter);

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy'));
      }
    },
    credentials: true
  })
);

// ==================== BODY PARSING ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== STATIC FILES ====================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================== HEALTH MONITORING ====================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Luxe Backend Services online',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ==================== ROOT FALLBACK ====================
app.get('/', (req, res) => {
  res.send('Welcome to the Luxe Premium Store API Backend.');
});

// ==================== ROUTE REGISTRATION ====================
app.use('/api/auth', resolveRouter(authRoutes, 'authRoutes'));

// Admin Services
app.use('/api/admin/dashboard', resolveRouter(adminDashboardRoutes, 'adminDashboardRoutes'));
app.use('/api/admin/products', resolveRouter(adminProductRoutes, 'adminProductRoutes'));
app.use('/api/admin/inventory', resolveRouter(adminInventoryRoutes, 'adminInventoryRoutes'));
app.use('/api/admin/orders', resolveRouter(adminOrderRoutes, 'adminOrderRoutes'));
app.use('/api/admin/users', resolveRouter(adminUserRoutes, 'adminUserRoutes'));
app.use('/api/admin/categories', resolveRouter(adminCategoryRoutes, 'adminCategoryRoutes'));
app.use('/api/admin/banners', resolveRouter(adminBannerRoutes, 'adminBannerRoutes'));
app.use('/api/admin/coupons', resolveRouter(adminCouponRoutes, 'adminCouponRoutes'));
app.use('/api/admin/settings', resolveRouter(adminSettingsRoutes, 'adminSettingsRoutes'));

// User/Customer Services
app.use('/api', resolveRouter(userHomeRoutes, 'userHomeRoutes'));
app.use('/api/shop', resolveRouter(userShopRoutes, 'userShopRoutes'));
app.use('/api/cart', resolveRouter(userCartRoutes, 'userCartRoutes'));
app.use('/api/checkout', resolveRouter(userCheckoutRoutes, 'userCheckoutRoutes'));
app.use('/api/orders', resolveRouter(userOrderRoutes, 'userOrderRoutes'));
app.use('/api/wishlist', resolveRouter(userWishlistRoutes, 'userWishlistRoutes'));
app.use('/api/reviews', resolveRouter(userReviewRoutes, 'userReviewRoutes'));
app.use('/api/profile', resolveRouter(userProfileRoutes, 'userProfileRoutes'));

// ==================== ERROR DISPATCHERS ====================
app.use(notFound);
app.use(errorHandler);

module.exports = app;