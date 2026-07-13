const express = require('express');
const router = express.Router();
const {
  getAllCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  getCouponStats
} = require('../../controllers/admin/coupon.controller');
const { createCouponValidation } = require('../../validations/coupon.validation');
const authenticate = require('../../middleware/auth');
const adminOnly = require('../../middleware/admin');
const validate = require('../../middleware/validate');

router.use(authenticate);
router.use(adminOnly);

router.get('/', getAllCoupons);
router.get('/stats', getCouponStats);
router.get('/:id', getCoupon);
router.post('/', createCouponValidation, validate, createCoupon);
router.put('/:id', updateCoupon);
router.delete('/:id', deleteCoupon);
router.post('/validate', validateCoupon);

module.exports = router;