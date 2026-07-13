const { body } = require('express-validator');

const createCouponValidation = [
  body('code')
    .trim()
    .isLength({ min: 3, max: 20 })
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Coupon code must be 3-20 characters and contain only uppercase letters and numbers'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Description must be between 10 and 200 characters'),
  
  body('type')
    .isIn(['percentage', 'fixed'])
    .withMessage('Type must be either percentage or fixed'),
  
  body('value')
    .isFloat({ min: 0 })
    .withMessage('Value must be a positive number'),
  
  body('validFrom')
    .isISO8601()
    .withMessage('Valid from must be a valid date'),
  
  body('validTo')
    .isISO8601()
    .withMessage('Valid to must be a valid date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.validFrom)) {
        throw new Error('Valid to date must be after valid from date');
      }
      return true;
    })
];

module.exports = {
  createCouponValidation
};