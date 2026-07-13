const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUser,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  getUserStats,
  searchUsers,
  getUserOrders
} = require('../../controllers/admin/user.controller');
const authenticate = require('../../middleware/auth');
const adminOnly = require('../../middleware/admin');

router.use(authenticate);
router.use(adminOnly);

router.get('/', getAllUsers);
router.get('/stats', getUserStats);
router.get('/search', searchUsers);
router.get('/:id', getUser);
router.get('/:id/orders', getUserOrders);
router.put('/:id/status', updateUserStatus);
router.put('/:id/role', updateUserRole);
router.delete('/:id', deleteUser);

module.exports = router;