const express = require('express');
const router = express.Router();
const {
  getInventoryOverview,
  getInventoryList,
  updateStock,
  bulkUpdateStock,
  getLowStockAlerts,
  getStockMovementHistory
} = require('../../controllers/admin/inventory.controller');
const authenticate = require('../../middleware/auth');
const adminOnly = require('../../middleware/admin');

router.use(authenticate);
router.use(adminOnly);

router.get('/overview', getInventoryOverview);
router.get('/list', getInventoryList);
router.put('/:productId/stock', updateStock);
router.post('/bulk-update', bulkUpdateStock);
router.get('/alerts', getLowStockAlerts);
router.get('/:productId/history', getStockMovementHistory);

module.exports = router;