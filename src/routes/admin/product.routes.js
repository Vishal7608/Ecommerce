const express = require('express');
const router = express.Router();

const {
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteProductImage,
  bulkUpdateStatus
} = require('../../controllers/admin/product.controller');

const {
  createProductValidation,
  updateProductValidation
} = require('../../validations/product.validation');

const authenticateModule = require('../../middleware/auth');
const adminModule = require('../../middleware/admin');
const uploadModule = require('../../middleware/upload');
const validateModule = require('../../middleware/validate');

const authenticate =
  typeof authenticateModule === 'function'
    ? authenticateModule
    : authenticateModule.authenticate;

const adminOnly =
  typeof adminModule === 'function'
    ? adminModule
    : adminModule.adminOnly;

const validate =
  typeof validateModule === 'function'
    ? validateModule
    : validateModule.validate;

const handleUpload =
  typeof uploadModule === 'function'
    ? uploadModule
    : uploadModule.handleUpload;

router.use(authenticate);
router.use(adminOnly);

router.get('/', getAllProducts);
router.get('/:id', getProduct);

router.post(
  '/',
  handleUpload('productImages', 5),
  ...createProductValidation,
  validate,
  createProduct
);

router.put(
  '/:id',
  handleUpload('productImages', 5),
  ...updateProductValidation,
  validate,
  updateProduct
);

router.delete('/:id', deleteProduct);
router.delete('/:id/images/:imageId', deleteProductImage);
router.post('/bulk/status', bulkUpdateStatus);

module.exports = router;