const Product = require('../models/Product');

class InventoryService {
  async checkAvailability(productId, quantity) {
    const product = await Product.findById(productId);
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    if (!product.isActive) {
      throw new Error('Product is not available');
    }
    
    if (product.inventory.quantity < quantity) {
      throw new Error(`Only ${product.inventory.quantity} items available`);
    }
    
    return true;
  }

  async reserveStock(productId, quantity) {
    const product = await Product.findById(productId);
    
    if (!product || product.inventory.quantity < quantity) {
      throw new Error('Insufficient stock');
    }
    
    product.inventory.quantity -= quantity;
    await product.save();
    
    return product;
  }

  async releaseStock(productId, quantity) {
    const product = await Product.findById(productId);
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    product.inventory.quantity += quantity;
    await product.save();
    
    return product;
  }

  async getLowStockProducts(threshold = 10) {
    return await Product.find({
      'inventory.quantity': { $lte: threshold },
      isActive: true
    }).populate('category');
  }

  async updateStock(productId, quantity, operation = 'set') {
    const product = await Product.findById(productId);
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    if (operation === 'add') {
      product.inventory.quantity += quantity;
    } else if (operation === 'subtract') {
      product.inventory.quantity = Math.max(0, product.inventory.quantity - quantity);
    } else {
      product.inventory.quantity = quantity;
    }
    
    await product.save();
    return product;
  }
}

module.exports = new InventoryService();