const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  getCartCount
} = require('../../controllers/user/cart.controller');
const authenticate = require('../../middleware/auth');

router.use(authenticate);

router.get('/', getCart);
router.get('/count', getCartCount);
router.post('/add', addToCart);
router.put('/items/:itemId', updateCartItem);
router.delete('/items/:itemId', removeCartItem);
router.delete('/clear', clearCart);

module.exports = router;