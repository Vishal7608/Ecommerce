    const User = require('../../models/User');
const Order = require('../../models/Order');
const { sendSuccess, sendError } = require('../../utils/response');

// Get all users with pagination and filters
const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      role,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const filter = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (role) filter.role = role;

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const users = await User.find(filter)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    // Get additional stats for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const orderCount = await Order.countDocuments({ user: user._id });
        const totalSpent = await Order.aggregate([
          { $match: { user: user._id, orderStatus: { $ne: 'cancelled' } } },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]);

        return {
          ...user.toObject(),
          orderCount,
          totalSpent: totalSpent[0]?.total || 0
        };
      })
    );

    sendSuccess(res, 'Users fetched successfully', {
      users: usersWithStats,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Get single user by ID
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    // Get user's orders
    const orders = await Order.find({ user: user._id })
      .select('orderId total orderStatus createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get user stats
    const orderStats = await Order.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          avgOrderValue: { $avg: '$total' }
        }
      }
    ]);

    const stats = orderStats[0] || {
      totalOrders: 0,
      totalSpent: 0,
      avgOrderValue: 0
    };

    sendSuccess(res, 'User fetched successfully', {
      user,
      recentOrders: orders,
      stats
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Update user status (activate/deactivate)
const updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    const userId = req.params.id;

    if (typeof isActive !== 'boolean') {
      return sendError(res, 'isActive must be a boolean value', 400);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    sendSuccess(res, `User ${isActive ? 'activated' : 'deactivated'} successfully`, user);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Update user role
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;

    if (!['user', 'admin'].includes(role)) {
      return sendError(res, 'Invalid role. Must be "user" or "admin"', 400);
    }

    // Prevent removing the last admin
    if (role !== 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (adminCount <= 1) {
        return sendError(res, 'Cannot remove the last admin user', 400);
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    sendSuccess(res, 'User role updated successfully', user);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Delete user (soft delete by deactivating or hard delete)
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent deleting yourself
    if (userId === req.user.id) {
      return sendError(res, 'You cannot delete your own account', 400);
    }

    // Check if user has orders
    const orderCount = await Order.countDocuments({ user: userId });
    
    if (orderCount > 0) {
      return sendError(res, 'Cannot delete user with existing orders. Deactivate the user instead.', 400);
    }

    const user = await User.findByIdAndDelete(userId);
    
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    sendSuccess(res, 'User deleted successfully');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Get user statistics for dashboard
const getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const activeUsers = await User.countDocuments({ role: 'user', isActive: true });
    const inactiveUsers = await User.countDocuments({ role: 'user', isActive: false });
    
    const newUsersThisMonth = await User.countDocuments({
      role: 'user',
      createdAt: { 
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) 
      }
    });

    const newUsersThisWeek = await User.countDocuments({
      role: 'user',
      createdAt: { 
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
      }
    });

    // Top customers by total spent
    const topCustomers = await Order.aggregate([
      { $match: { orderStatus: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$user',
          totalSpent: { $sum: '$total' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          name: '$user.name',
          email: '$user.email',
          avatar: '$user.avatar',
          totalSpent: 1,
          orderCount: 1
        }
      }
    ]);

    // User registration trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const registrationTrend = await User.aggregate([
      {
        $match: {
          role: 'user',
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          month: '$_id.month',
          year: '$_id.year',
          count: 1
        }
      }
    ]);

    sendSuccess(res, 'User stats fetched successfully', {
      summary: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        newUsersThisMonth,
        newUsersThisWeek
      },
      topCustomers,
      registrationTrend
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Search users
const searchUsers = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return sendSuccess(res, 'Search results', []);
    }

    const users = await User.find({
      role: 'user',
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    })
      .select('_id name email avatar')
      .limit(parseInt(limit));

    sendSuccess(res, 'Search results', users);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Get user orders history
const getUserOrders = async (req, res) => {
  try {
    const userId = req.params.id;
    const { page = 1, limit = 10, status } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { user: userId };
    if (status) filter.orderStatus = status;

    const orders = await Order.find(filter)
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    sendSuccess(res, 'User orders fetched successfully', {
      orders,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

module.exports = {
  getAllUsers,
  getUser,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  getUserStats,
  searchUsers,
  getUserOrders
};