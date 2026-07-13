const Cart = require('../../models/Cart');
const Coupon = require('../../models/Coupon');
const OrderService = require('../../services/order.service');
const PaymentService = require('../../services/payment.service');
const { sendSuccess, sendError } = require('../../utils/response');

const processCheckout = async (req, res) => {
  try {
    const {
      shippingAddress,
      paymentMethod,
      paymentDetails,
      couponCode
    } = req.body;

    // Get user's cart
    const cart = await Cart.findOne({ user: req.user.id })
      .populate('items.product', 'name price salePrice inventory category');

    if (!cart || cart.items.length === 0) {
      return sendError(res, 'Cart is empty', 400);
    }

    // Validate cart items
    for (const item of cart.items) {
      if (!item.product.isActive) {
        return sendError(res, `Product ${item.product.name} is no longer available`, 400);
      }
      
      if (item.product.inventory.quantity < item.quantity) {
        return sendError(res, `Insufficient stock for ${item.product.name}`, 400);
      }
    }

    let discount = { amount: 0, coupon: null };

    // Apply coupon if provided
    if (couponCode) {
      const coupon = await Coupon.findOne({ 
        code: couponCode.toUpperCase(), 
        isActive: true 
      });

      if (coupon) {
        // Validate coupon
        const now = new Date();
        if (now >= coupon.validFrom && now <= coupon.validTo) {
          let discountAmount = 0;
          
          if (coupon.type === 'percentage') {
            discountAmount = (cart.totalAmount * coupon.value) / 100;
          } else {
            discountAmount = coupon.value;
          }

          if (coupon.maximumDiscount && discountAmount > coupon.maximumDiscount) {
            discountAmount = coupon.maximumDiscount;
          }

          if (discountAmount > cart.totalAmount) {
            discountAmount = cart.totalAmount;
          }

          discount = {
            amount: discountAmount,
            coupon: coupon.code
          };
        }
      }
    }

    // Process payment
    if (paymentMethod === 'card') {
      try {
        await PaymentService.validateCard(paymentDetails);
        const paymentResult = await PaymentService.processPayment({
          amount: cart.totalAmount - discount.amount,
          paymentMethod,
          cardDetails: paymentDetails
        });
      } catch (paymentError) {
        return sendError(res, paymentError.message, 400);
      }
    }

    // Create order
    const orderData = {
      user: req.user,
      items: cart.items.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
        category: item.product.category
      })),
      shippingAddress,
      paymentMethod,
      discount
    };

    const order = await OrderService.createOrder(orderData);

    // Clear cart
    cart.items = [];
    cart.totalAmount = 0;
    await cart.save();

    sendSuccess(res, 'Order placed successfully', order, 201);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const validateCoupon = async (req, res) => {
  try {
    const { code, cartTotal } = req.body;

    const coupon = await Coupon.findOne({ 
      code: code.toUpperCase(), 
      isActive: true 
    });

    if (!coupon) {
      return sendError(res, 'Invalid coupon code', 404);
    }

    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validTo) {
      return sendError(res, 'Coupon has expired or not yet valid', 400);
    }

    if (cartTotal < coupon.minimumAmount) {
      return sendError(res, `Minimum order amount of $${coupon.minimumAmount} required`, 400);
    }

    let discountAmount = 0;
    if (coupon.type === 'percentage') {
      discountAmount = (cartTotal * coupon.value) / 100;
    } else {
      discountAmount = coupon.value;
    }

    if (coupon.maximumDiscount && discountAmount > coupon.maximumDiscount) {
      discountAmount = coupon.maximumDiscount;
    }

    if (discountAmount > cartTotal) {
      discountAmount = cartTotal;
    }

    sendSuccess(res, 'Coupon is valid', {
      code: coupon.code,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      finalAmount: parseFloat((cartTotal - discountAmount).toFixed(2))
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const calculateShipping = async (req, res) => {
  try {
    const { address, items } = req.body;

    // Simple shipping calculation (you can make this more complex)
    const totalWeight = items.reduce((total, item) => {
      return total + (item.weight || 1) * item.quantity;
    }, 0);

    const subtotal = items.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);

    let shippingCost = 10; // Base shipping cost
    
    if (subtotal >= 100) {
      shippingCost = 0; // Free shipping over $100
    } else if (totalWeight > 5) {
      shippingCost = 15; // Heavy items
    }

    const estimatedDays = address.country === 'US' ? 3 : 7;

    sendSuccess(res, 'Shipping calculated', {
      cost: shippingCost,
      estimatedDays,
      method: 'Standard Shipping'
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

module.exports = {
  processCheckout,
  validateCoupon,
  calculateShipping
};