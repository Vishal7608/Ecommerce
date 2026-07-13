const Order = require('../../models/Order');
const User = require('../../models/User');
const OrderService = require('../../services/order.service');
const EmailService = require('../../services/email.service');
const { sendSuccess, sendError } = require('../../utils/response');

const getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      paymentStatus,
      search,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const filter = {};
    
    if (status) filter.orderStatus = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    
    if (search) {
      filter.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { 'shippingAddress.name': { $regex: search, $options: 'i' } },
        { 'shippingAddress.email': { $regex: search, $options: 'i' } }
      ];
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .populate('items.product', 'name images')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    sendSuccess(res, 'Orders fetched successfully', {
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

const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('items.product', 'name images sku');

    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    sendSuccess(res, 'Order fetched successfully', order);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status, trackingNumber, notes } = req.body;
    const orderId = req.params.id;

    const order = await OrderService.updateOrderStatus(orderId, status, trackingNumber);
    
    if (notes) {
      order.notes = notes;
      await order.save();
    }

    sendSuccess(res, 'Order status updated successfully', order);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    const orderId = req.params.id;

    const order = await Order.findById(orderId);
    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    order.paymentStatus = paymentStatus;
    await order.save();

    sendSuccess(res, 'Payment status updated successfully', order);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const orderId = req.params.id;

    const order = await OrderService.cancelOrder(orderId, reason);
    sendSuccess(res, 'Order cancelled successfully', order);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const getOrderStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    
    const statusStats = await Order.aggregate([
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    const paymentStats = await Order.aggregate([
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { 
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) 
          },
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

    const recentOrders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    sendSuccess(res, 'Order stats fetched successfully', {
      totalOrders,
      statusStats,
      paymentStats,
      monthlyRevenue: monthlyRevenue[0]?.total || 0,
      recentOrders
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const generateInvoice = async (req, res) => {
  try {
    const orderId = req.params.id;
    
    const order = await Order.findById(orderId)
      .populate('user', 'name email')
      .populate('items.product', 'name');

    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    // Here you would generate an actual PDF invoice
    // For now, returning order data
    sendSuccess(res, 'Invoice data fetched successfully', order);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const sendOrderUpdate = async (req, res) => {
  try {
    const { message, type } = req.body; // type: 'status_update', 'shipping_info', 'custom'
    const orderId = req.params.id;

    const order = await Order.findById(orderId).populate('user');
    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    await EmailService.sendEmail({
      to: order.user.email,
      subject: `Order Update - ${order.orderId}`,
      html: `
        <h1>Order Update</h1>
        <p>Hi ${order.user.name},</p>
        <p>There's an update for your order ${order.orderId}:</p>
        <p>${message}</p>
        <p>Thank you for shopping with us!</p>
      `
    });

    sendSuccess(res, 'Order update sent successfully');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

module.exports = {
  getAllOrders,
  getOrder,
  updateOrderStatus,
  updatePaymentStatus,
  cancelOrder,
  getOrderStats,
  generateInvoice,
  sendOrderUpdate
};