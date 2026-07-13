const express = require('express');
const router = express.Router();
const { processCheckout, validateCoupon, calculateShipping } = require('../../controllers/user/checkout.controller');
const { createOrderValidation } = require('../../validations/order.validation');
const authenticate = require('../../middleware/auth');
const validate = require('../../middleware/validate');

router.use(authenticate);

router.post('/', createOrderValidation, validate, processCheckout);
router.post('/validate-coupon', validateCoupon);
router.post('/calculate-shipping', calculateShipping);

module.exports = router;