const express = require('express');
const router = express.Router();
const {
  getAllOrders,
  getOrder,
  updateOrderStatus,
  updatePaymentStatus,
  cancelOrder,
  getOrderStats,
  generateInvoice,
  sendOrderUpdate
} = require('../../controllers/admin/order.controller');
const { updateOrderStatusValidation } = require('../../validations/order.validation');
const authenticate = require('../../middleware/auth');
const adminOnly = require('../../middleware/admin');
const validate = require('../../middleware/validate');

router.use(authenticate);
router.use(adminOnly);

router.get('/', getAllOrders);
router.get('/stats', getOrderStats);
router.get('/:id', getOrder);
router.put('/:id/status', updateOrderStatusValidation, validate, updateOrderStatus);
router.put('/:id/payment-status', updatePaymentStatus);
router.post('/:id/cancel', cancelOrder);
router.get('/:id/invoice', generateInvoice);
router.post('/:id/send-update', sendOrderUpdate);

module.exports = router;