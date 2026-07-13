const { body } = require('express-validator');
const mongoose = require('mongoose');

const createProductValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be between 2 and 100 characters'),

  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 2000 })
    .withMessage('Description must be between 2 and 2000 characters'),

  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  // ✅ Accepts MongoDB ObjectId OR category name like "Women"
  body('category')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;

      if (mongoose.Types.ObjectId.isValid(value)) {
        return true;
      }

      if (typeof value === 'string' && value.trim().length >= 1) {
        return true;
      }

      throw new Error('Invalid category');
    }),

  body('inventory.quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer'),

  body('tags')
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) return true;
      if (typeof value === 'string') return true;
      return true;
    }),

  body('images')
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) return true;
      return true;
    })
];

const updateProductValidation = [
  body('name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be between 2 and 100 characters'),

  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 2000 })
    .withMessage('Description must be between 2 and 2000 characters'),

  body('price')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  // ✅ Accepts MongoDB ObjectId OR category name like "Women"
  body('category')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;

      if (mongoose.Types.ObjectId.isValid(value)) {
        return true;
      }

      if (typeof value === 'string' && value.trim().length >= 1) {
        return true;
      }

      throw new Error('Invalid category');
    }),

  body('inventory.quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer')
];

module.exports = {
  createProductValidation,
  updateProductValidation
};