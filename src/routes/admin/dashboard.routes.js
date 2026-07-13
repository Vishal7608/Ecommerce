const express = require('express');
const router = express.Router();
const { getDashboardStats, getRecentActivity } = require('../../controllers/admin/dashboard.controller');
const authenticate = require('../../middleware/auth');
const adminOnly = require('../../middleware/admin');

router.use(authenticate);
router.use(adminOnly);

router.get('/stats', getDashboardStats);
router.get('/recent-activity', getRecentActivity);

module.exports = router;