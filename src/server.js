require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const User = require('./models/User');

const PORT = process.env.PORT || 5000;

// ==================== DATABASE CONNECTION ====================
connectDB();

// ==================== CREATE DEFAULT ADMIN ====================
const createDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      role: 'admin'
    });

    if (!adminExists) {
      await User.create({
        name: 'Admin',
        email: process.env.ADMIN_EMAIL || 'admin@example.com',
        password: process.env.ADMIN_PASSWORD || 'admin123',
        role: 'admin'
      });
      console.log('✅ Default admin user created');
      console.log(`   Email: ${process.env.ADMIN_EMAIL || 'admin@example.com'}`);
      console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
    } else {
      console.log('ℹ️  Admin user already exists');
    }
  } catch (error) {
    console.error('❌ Error creating default admin:', error.message);
  }
};

// ==================== START SERVER ====================
const server = app.listen(PORT, () => {
  console.log('=================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log('=================================');
  createDefaultAdmin();
});

// ==================== ERROR HANDLERS ====================

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('💤 Process terminated');
  });
});