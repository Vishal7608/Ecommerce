const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  getCategories,
  searchProducts
} = require('../../controllers/user/shop.controller');

router.get('/products', getProducts);
router.get('/products/:id', getProduct);
router.get('/categories', getCategories);
router.get('/search', searchProducts);

module.exports = router;