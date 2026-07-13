const express = require('express');
const router = express.Router();
const {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  getUserReviews
} = require('../../controllers/user/review.controller');
const authenticate = require('../../middleware/auth');
const handleUpload = require('../../middleware/upload');

// Public routes
router.get('/product/:productId', getProductReviews);

// Protected routes
router.use(authenticate);
router.get('/my-reviews', getUserReviews);
router.post('/', handleUpload('reviewImages', 3), createReview);
router.put('/:id', handleUpload('reviewImages', 3), updateReview);
router.delete('/:id', deleteReview);

module.exports = router;