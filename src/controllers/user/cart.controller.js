const Cart = require('../../models/Cart');
const Product = require('../../models/Product');
const { sendSuccess, sendError } = require('../../utils/response');

const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id })
      .populate('items.product', 'name price salePrice images inventory isActive');

    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
      await cart.save();
    }

    // Filter out inactive products
    cart.items = cart.items.filter(item => item.product && item.product.isActive);
    
    // Recalculate total
    cart.calculateTotal();
    await cart.save();

    sendSuccess(res, 'Cart fetched successfully', cart);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    // Validate product
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return sendError(res, 'Product not found or inactive', 404);
    }

    // Check inventory
    if (product.inventory.quantity < quantity) {
      return sendError(res, 'Insufficient inventory', 400);
    }

    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
    }

    // Check if product already in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    const price = product.salePrice || product.price;

    if (existingItemIndex > -1) {
      // Update quantity
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      
      if (newQuantity > product.inventory.quantity) {
        return sendError(res, 'Insufficient inventory for requested quantity', 400);
      }

      cart.items[existingItemIndex].quantity = newQuantity;
      cart.items[existingItemIndex].price = price;
    } else {
      // Add new item
      cart.items.push({
        product: productId,
        quantity,
        price
      });
    }

    cart.calculateTotal();
    await cart.save();
    await cart.populate('items.product', 'name price salePrice images inventory isActive');

    sendSuccess(res, 'Product added to cart', cart);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return sendError(res, 'Quantity must be at least 1', 400);
    }

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return sendError(res, 'Cart not found', 404);
    }

    const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
    if (itemIndex === -1) {
      return sendError(res, 'Item not found in cart', 404);
    }

    // Check product availability
    const product = await Product.findById(cart.items[itemIndex].product);
    if (!product || !product.isActive) {
      return sendError(res, 'Product not available', 400);
    }

    if (quantity > product.inventory.quantity) {
      return sendError(res, 'Insufficient inventory', 400);
    }

    // Update quantity and price
    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].price = product.salePrice || product.price;

    cart.calculateTotal();
    await cart.save();
    await cart.populate('items.product', 'name price salePrice images inventory isActive');

    sendSuccess(res, 'Cart item updated', cart);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const removeCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return sendError(res, 'Cart not found', 404);
    }

    cart.items = cart.items.filter(item => item._id.toString() !== itemId);
    cart.calculateTotal();
    
    await cart.save();
    await cart.populate('items.product', 'name price salePrice images inventory isActive');

    sendSuccess(res, 'Item removed from cart', cart);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return sendError(res, 'Cart not found', 404);
    }

    cart.items = [];
    cart.totalAmount = 0;
    await cart.save();

    sendSuccess(res, 'Cart cleared successfully', cart);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const getCartCount = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    const count = cart ? cart.items.reduce((total, item) => total + item.quantity, 0) : 0;

    sendSuccess(res, 'Cart count fetched', { count });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  getCartCount
};