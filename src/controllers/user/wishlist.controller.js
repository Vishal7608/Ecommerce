const Wishlist = require('../../models/Wishlist');
const Cart = require('../../models/Cart');
const Product = require('../../models/Product');
const { sendSuccess, sendError } = require('../../utils/response');

const getWishlist = async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user.id })
      .populate('products.product', 'name price salePrice images inventory isActive');

    if (!wishlist) {
      wishlist = new Wishlist({ user: req.user.id, products: [] });
      await wishlist.save();
    }

    // Filter out inactive products
    wishlist.products = wishlist.products.filter(item => 
      item.product && item.product.isActive
    );

    await wishlist.save();

    sendSuccess(res, 'Wishlist fetched successfully', wishlist);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    // Validate product
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return sendError(res, 'Product not found or inactive', 404);
    }

    let wishlist = await Wishlist.findOne({ user: req.user.id });
    if (!wishlist) {
      wishlist = new Wishlist({ user: req.user.id, products: [] });
    }

    // Check if product already in wishlist
    const existingIndex = wishlist.products.findIndex(
      item => item.product.toString() === productId
    );

    if (existingIndex > -1) {
      return sendError(res, 'Product already in wishlist', 400);
    }

    wishlist.products.push({
      product: productId,
      addedAt: new Date()
    });

    await wishlist.save();
    await wishlist.populate('products.product', 'name price salePrice images inventory isActive');

    sendSuccess(res, 'Product added to wishlist', wishlist);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ user: req.user.id });
    if (!wishlist) {
      return sendError(res, 'Wishlist not found', 404);
    }

    wishlist.products = wishlist.products.filter(
      item => item.product.toString() !== productId
    );

    await wishlist.save();
    await wishlist.populate('products.product', 'name price salePrice images inventory isActive');

    sendSuccess(res, 'Product removed from wishlist', wishlist);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const clearWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.id });
    if (!wishlist) {
      return sendError(res, 'Wishlist not found', 404);
    }

    wishlist.products = [];
    await wishlist.save();

    sendSuccess(res, 'Wishlist cleared successfully', wishlist);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const moveToCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity = 1 } = req.body;

    // Get product
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return sendError(res, 'Product not found or inactive', 404);
    }

    // Check inventory
    if (product.inventory.quantity < quantity) {
      return sendError(res, 'Insufficient inventory', 400);
    }

    // Get or create cart
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
    }

    const price = product.salePrice || product.price;

    // Check if product already in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      cart.items.push({
        product: productId,
        quantity,
        price
      });
    }

    cart.calculateTotal();
    await cart.save();

    // Remove from wishlist
    const wishlist = await Wishlist.findOne({ user: req.user.id });
    if (wishlist) {
      wishlist.products = wishlist.products.filter(
        item => item.product.toString() !== productId
      );
      await wishlist.save();
    }

    sendSuccess(res, 'Product moved to cart successfully', {
      cart,
      message: 'Product moved to cart and removed from wishlist'
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  moveToCart
};