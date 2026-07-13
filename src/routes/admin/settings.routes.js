const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateGeneralSettings,
  updateSocialMediaSettings,
  updateEmailSettings,
  updatePaymentSettings,
  updateInventorySettings,
  testEmailSettings,
  resetSettings,
  exportSettings,
  importSettings
} = require('../../controllers/admin/settings.controller');
const authenticate = require('../../middleware/auth');
const adminOnly = require('../../middleware/admin');
const handleUpload = require('../../middleware/upload');

router.use(authenticate);
router.use(adminOnly);

router.get('/', getSettings);
router.put('/general', handleUpload('logo', 1), updateGeneralSettings);
router.put('/social', updateSocialMediaSettings);
router.put('/email', updateEmailSettings);
router.put('/payment', updatePaymentSettings);
router.put('/inventory', updateInventorySettings);
router.post('/email/test', testEmailSettings);
router.post('/reset', resetSettings);
router.get('/export', exportSettings);
router.post('/import', importSettings);

module.exports = router;