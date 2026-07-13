const express = require('express');
const router = express.Router();
const {
  getAllBanners,
  getBanner,
  createBanner,
  updateBanner,
  deleteBanner,
  getAllHeroBanners,
  getHeroBanner,
  createHeroBanner,
  updateHeroBanner,
  deleteHeroBanner,
  updateBannerOrder
} = require('../../controllers/admin/banner.controller');
const authenticate = require('../../middleware/auth');
const adminOnly = require('../../middleware/admin');
const handleUpload = require('../../middleware/upload');

router.use(authenticate);
router.use(adminOnly);

// Regular banners
router.get('/', getAllBanners);
router.get('/:id', getBanner);
router.post('/', handleUpload('bannerImage', 1), createBanner);
router.put('/:id', handleUpload('bannerImage', 1), updateBanner);
router.delete('/:id', deleteBanner);

// Hero banners
router.get('/hero', getAllHeroBanners);
router.get('/hero/:id', getHeroBanner);
router.post('/hero', handleUpload('bannerImage', 1), createHeroBanner);
router.put('/hero/:id', handleUpload('bannerImage', 1), updateHeroBanner);
router.delete('/hero/:id', deleteHeroBanner);

// Order management
router.post('/update-order', updateBannerOrder);

module.exports = router;