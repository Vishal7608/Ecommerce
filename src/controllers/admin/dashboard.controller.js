const User = require('../../models/User');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const Category = require('../../models/Category');
const { sendSuccess, sendError } = require('../../utils/response');

const getDashboardStats = async (req, res) => {
  try {
    // Get current date and dates for comparison
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Total counts
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalCategories = await Category.countDocuments();

    // Monthly stats
    const monthlyUsers = await User.countDocuments({
      role: 'user',
      createdAt: { $gte: startOfMonth }
    });
    const monthlyOrders = await Order.countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    // Revenue stats
    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth },
          orderStatus: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);

    const lastMonthRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
          orderStatus: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);

    // Recent orders
    const recentOrders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    // Low stock products
    const lowStockProducts = await Product.find({
      'inventory.quantity': { $lte: 10 }
    }).limit(5);

    // Order status distribution
    const orderStatusStats = await Order.aggregate([
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    // Sales chart data (last 7 days)
    const salesChartData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          orderStatus: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          sales: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    const currentRevenue = monthlyRevenue[0]?.total || 0;
    const previousRevenue = lastMonthRevenue[0]?.total || 0;
    const revenueGrowth = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(2)
      : 0;

    sendSuccess(res, 'Dashboard stats fetched successfully', {
      summary: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalCategories,
        monthlyUsers,
        monthlyOrders,
        monthlyRevenue: currentRevenue,
        revenueGrowth: parseFloat(revenueGrowth)
      },
      recentOrders,
      lowStockProducts,
      orderStatusStats,
      salesChartData
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const getRecentActivity = async (req, res) => {
  try {
    const recentUsers = await User.find({ role: 'user' })
      .select('name email createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    const recentProducts = await Product.find()
      .select('name price createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    sendSuccess(res, 'Recent activity fetched successfully', {
      recentUsers,
      recentProducts
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

module.exports = {
  getDashboardStats,
  getRecentActivity
};