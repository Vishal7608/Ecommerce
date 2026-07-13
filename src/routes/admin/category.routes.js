const express = require('express');
const router = express.Router();
const {
  getAllCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryTree,
  updateCategoryOrder
} = require('../../controllers/admin/category.controller');
const authenticate = require('../../middleware/auth');
const adminOnly = require('../../middleware/admin');
const handleUpload = require('../../middleware/upload');

router.use(authenticate);
router.use(adminOnly);

router.get('/', getAllCategories);
router.get('/tree', getCategoryTree);
router.get('/:id', getCategory);
router.post('/', handleUpload('categoryImage', 1), createCategory);
router.put('/:id', handleUpload('categoryImage', 1), updateCategory);
router.delete('/:id', deleteCategory);
router.post('/update-order', updateCategoryOrder);

module.exports = router;