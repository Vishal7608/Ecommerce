const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const InventoryService = require('./inventory.service');
const EmailService = require('./email.service');
const { generateOrderId } = require('../utils/generateOrderId');

class OrderService {
  async createOrder(orderData) {
    const { user, items, shippingAddress, paymentMethod } = orderData;
    
    // Validate stock availability
    for (const item of items) {
      await InventoryService.checkAvailability(item.product, item.quantity);
    }
    
    // Calculate totals
    let subtotal = 0;
    const orderItems = [];
    
    for (const item of items) {
      const product = await Product.findById(item.product);
      const price = product.salePrice || product.price;
      const total = price * item.quantity;
      
      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images[0]?.url || '',
        price,
        quantity: item.quantity,
        total
      });
      
      subtotal += total;
    }
    
    // Calculate tax and shipping
    const tax = subtotal * 0.1; // 10% tax
    const shipping = subtotal > 100 ? 0 : 10; // Free shipping over $100
    const total = subtotal + tax + shipping;
    
    // Create order
    const order = new Order({
      orderId: generateOrderId(),
      user: user._id,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      subtotal,
      tax,
      shipping,
      total
    });
    
    await order.save();
    
    // Reserve stock
    for (const item of items) {
      await InventoryService.reserveStock(item.product, item.quantity);
    }
    
    // Send confirmation email
    await EmailService.sendOrderConfirmation(user, order);
    
    return order;
  }

  async updateOrderStatus(orderId, status, trackingNumber = null) {
    const order = await Order.findById(orderId).populate('user');
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    order.orderStatus = status;
    
    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }
    
    await order.save();
    
    // Send status update email
    if (status === 'shipped' && trackingNumber) {
      await EmailService.sendEmail({
        to: order.user.email,
        subject: `Order ${order.orderId} Shipped`,
        html: `
          <h1>Order Shipped!</h1>
          <p>Your order ${order.orderId} has been shipped.</p>
          <p>Tracking Number: ${trackingNumber}</p>
        `
      });
    }
    
    return order;
  }

  async cancelOrder(orderId, reason = '') {
    const order = await Order.findById(orderId);
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    if (order.orderStatus === 'delivered') {
      throw new Error('Cannot cancel delivered order');
    }
    
    // Release reserved stock
    for (const item of order.items) {
      await InventoryService.releaseStock(item.product, item.quantity);
    }
    
    order.orderStatus = 'cancelled';
    order.notes = reason;
    await order.save();
    
    return order;
  }

  async getOrdersByUser(userId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('items.product', 'name images');
    
    const total = await Order.countDocuments({ user: userId });
    
    return {
      orders,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    };
  }
}

module.exports = new OrderService();