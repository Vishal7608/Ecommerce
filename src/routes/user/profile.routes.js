const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  changePassword,
  uploadAvatar,
  deleteAvatar,        // NEW
  addAddress,
  getAddresses,        // NEW
  updateAddress,
  deleteAddress,
  setDefaultAddress
} = require('../../controllers/user/profile.controller');
const authenticate = require('../../middleware/auth');
const handleUpload = require('../../middleware/upload');

// All routes require authentication
router.use(authenticate);

// ============ PROFILE ROUTES ============
router.get('/', getProfile);                              // GET /api/profile
router.put('/', updateProfile);                           // PUT /api/profile

// ============ PASSWORD ROUTES ============
router.post('/change-password', changePassword);          // POST /api/profile/change-password

// ============ AVATAR ROUTES ============
router.post('/avatar', handleUpload('avatar', 1), uploadAvatar);  // POST /api/profile/avatar
router.delete('/avatar', deleteAvatar);                          // DELETE /api/profile/avatar

// ============ ADDRESS ROUTES ============
router.get('/addresses', getAddresses);                          // GET /api/profile/addresses
router.post('/addresses', addAddress);                           // POST /api/profile/addresses
router.put('/addresses/:addressId', updateAddress);              // PUT /api/profile/addresses/:addressId
router.delete('/addresses/:addressId', deleteAddress);           // DELETE /api/profile/addresses/:addressId
router.patch('/addresses/:addressId/default', setDefaultAddress); // PATCH /api/profile/addresses/:addressId/default

module.exports = router;