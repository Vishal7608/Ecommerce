const express = require('express');
const router = express.Router();
const {
  getUserOrders,
  getOrder,
  cancelOrder,
  trackOrder
} = require('../../controllers/user/order.controller');
const authenticate = require('../../middleware/auth');

router.use(authenticate);

router.get('/', getUserOrders);
router.get('/:id', getOrder);
router.post('/:id/cancel', cancelOrder);
router.get('/:id/track', trackOrder);

module.exports = router;