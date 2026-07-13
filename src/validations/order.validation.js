const { body } = require('express-validator');

const createOrderValidation = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  
  body('items.*.product')
    .isMongoId()
    .withMessage('Invalid product ID'),
  
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  
  body('shippingAddress.name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('shippingAddress.email')
    .isEmail()
    .withMessage('Please provide a valid email'),
  
  body('shippingAddress.phone')
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  body('paymentMethod')
    .isIn(['card', 'paypal', 'cod'])
    .withMessage('Invalid payment method')
];

const updateOrderStatusValidation = [
  body('status')
    .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid order status')
];

module.exports = {
  createOrderValidation,
  updateOrderStatusValidation
};