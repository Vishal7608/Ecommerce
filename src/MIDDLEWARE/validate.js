const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => err.msg);

    return res.status(400).json({
      success: false,
      message: errorMessages[0] || 'Validation Error',
      errors: errorMessages
    });
  }

  next();
};

// Supports both:
// const validate = require('../middleware/validate')
// const { validate } = require('../middleware/validate')
validate.validate = validate;

module.exports = validate;