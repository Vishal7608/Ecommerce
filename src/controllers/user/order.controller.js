const Order = require('../../models/Order');
const OrderService = require('../../services/order.service');
const { sendSuccess, sendError } = require('../../utils/response');

const getUserOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const result = await OrderService.getOrdersByUser(req.user.id, page, limit);

    sendSuccess(res, 'Orders fetched successfully', result);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const getOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('items.product', 'name images');

    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    sendSuccess(res, 'Order fetched successfully', order);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    if (order.orderStatus === 'delivered') {
      return sendError(res, 'Cannot cancel delivered order', 400);
    }

    if (order.orderStatus === 'shipped') {
      return sendError(res, 'Cannot cancel shipped order', 400);
    }

    const cancelledOrder = await OrderService.cancelOrder(order._id, reason);
    
    sendSuccess(res, 'Order cancelled successfully', cancelledOrder);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const trackOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    const trackingInfo = {
      orderId: order.orderId,
      status: order.orderStatus,
      trackingNumber: order.trackingNumber,
      estimatedDelivery: null, // You can calculate this based on shipping date
      timeline: [
        {
          status: 'pending',
          date: order.createdAt,
          description: 'Order placed successfully'
        }
      ]
    };

    // Add more timeline events based on order status
    if (order.orderStatus !== 'pending') {
      trackingInfo.timeline.push({
        status: 'processing',
        date: order.updatedAt,
        description: 'Order is being processed'
      });
    }

    if (order.orderStatus === 'shipped' || order.orderStatus === 'delivered') {
      trackingInfo.timeline.push({
        status: 'shipped',
        date: order.updatedAt,
        description: 'Order has been shipped'
      });
    }

    if (order.orderStatus === 'delivered') {
      trackingInfo.timeline.push({
        status: 'delivered',
        date: order.updatedAt,
        description: 'Order has been delivered'
      });
    }

    sendSuccess(res, 'Tracking info fetched successfully', trackingInfo);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

module.exports = {
  getUserOrders,
  getOrder,
  cancelOrder,
  trackOrder
};