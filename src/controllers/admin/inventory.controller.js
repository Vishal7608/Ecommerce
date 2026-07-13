const Product = require('../../models/Product');
const InventoryService = require('../../services/inventory.service');
const { sendSuccess, sendError } = require('../../utils/response');

const getInventoryOverview = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments({ isActive: true });
    const lowStockProducts = await InventoryService.getLowStockProducts();
    const outOfStockProducts = await Product.countDocuments({
      'inventory.quantity': 0,
      isActive: true
    });

    const totalStockValue = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalValue: {
            $sum: { $multiply: ['$price', '$inventory.quantity'] }
          }
        }
      }
    ]);

    sendSuccess(res, 'Inventory overview fetched successfully', {
      totalProducts,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts,
      totalStockValue: totalStockValue[0]?.totalValue || 0,
      lowStockProducts: lowStockProducts.slice(0, 10) // Show only first 10
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const getInventoryList = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      stockStatus,
      category,
      sortBy = 'inventory.quantity',
      sortOrder = 'asc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const filter = { isActive: true };
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      filter.category = category;
    }
    
    if (stockStatus === 'low') {
      filter['inventory.quantity'] = { $lte: 10 };
    } else if (stockStatus === 'out') {
      filter['inventory.quantity'] = 0;
    } else if (stockStatus === 'in-stock') {
      filter['inventory.quantity'] = { $gt: 10 };
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const products = await Product.find(filter)
      .populate('category', 'name')
      .select('name sku price inventory category images')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(filter);

    sendSuccess(res, 'Inventory list fetched successfully', {
      products,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const updateStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity, operation = 'set', reason } = req.body;

    if (quantity < 0) {
      return sendError(res, 'Quantity cannot be negative', 400);
    }

    const product = await InventoryService.updateStock(productId, quantity, operation);

    // Log inventory change (you might want to create an InventoryLog model for this)
    // await InventoryLog.create({
    //   product: productId,
    //   previousQuantity: product.inventory.quantity,
    //   newQuantity: quantity,
    //   operation,
    //   reason,
    //   updatedBy: req.user.id
    // });

    sendSuccess(res, 'Stock updated successfully', {
      productId,
      newQuantity: product.inventory.quantity,
      operation
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const bulkUpdateStock = async (req, res) => {
  try {
    const { updates } = req.body; // Array of { productId, quantity, operation }
    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const product = await InventoryService.updateStock(
          update.productId,
          update.quantity,
          update.operation || 'set'
        );
        
        results.push({
          productId: update.productId,
          success: true,
          newQuantity: product.inventory.quantity
        });
      } catch (error) {
        errors.push({
          productId: update.productId,
          error: error.message
        });
      }
    }

    sendSuccess(res, 'Bulk stock update completed', {
      successful: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const getLowStockAlerts = async (req, res) => {
  try {
    const { threshold = 10 } = req.query;
    const lowStockProducts = await InventoryService.getLowStockProducts(threshold);

    sendSuccess(res, 'Low stock alerts fetched successfully', {
      count: lowStockProducts.length,
      products: lowStockProducts
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const getStockMovementHistory = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // This would typically come from an InventoryLog model
    // For now, returning mock data
    const mockHistory = [
      {
        date: new Date(),
        operation: 'add',
        quantity: 50,
        previousQuantity: 100,
        newQuantity: 150,
        reason: 'New stock received',
        updatedBy: 'Admin'
      },
      {
        date: new Date(Date.now() - 24 * 60 * 60 * 1000),
        operation: 'subtract',
        quantity: 5,
        previousQuantity: 105,
        newQuantity: 100,
        reason: 'Order fulfillment',
        updatedBy: 'System'
      }
    ];

    sendSuccess(res, 'Stock movement history fetched successfully', {
      history: mockHistory,
      pagination: {
        current: parseInt(page),
        pages: 1,
        total: mockHistory.length
      }
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

module.exports = {
  getInventoryOverview,
  getInventoryList,
  updateStock,
  bulkUpdateStock,
  getLowStockAlerts,
  getStockMovementHistory
};