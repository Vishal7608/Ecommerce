const express = require('express');
const router = express.Router();
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  moveToCart
} = require('../../controllers/user/wishlist.controller');
const authenticate = require('../../middleware/auth');

router.use(authenticate);

router.get('/', getWishlist);
router.post('/add', addToWishlist);
router.delete('/:productId', removeFromWishlist);
router.delete('/', clearWishlist);
router.post('/:productId/move-to-cart', moveToCart);

module.exports = router;