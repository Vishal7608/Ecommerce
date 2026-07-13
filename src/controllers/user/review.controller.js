const Review = require('../../models/Review');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const cloudinary = require('../../config/cloudinary');
const { sendSuccess, sendError } = require('../../utils/response');

const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const reviews = await Review.find({
      product: productId,
      isApproved: true
    })
      .populate('user', 'name avatar')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({
      product: productId,
      isApproved: true
    });

    // Get rating distribution
    const ratingStats = await Review.aggregate([
      { $match: { product: productId, isApproved: true } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    const avgRating = await Review.aggregate([
      { $match: { product: productId, isApproved: true } },
      {
        $group: {
          _id: null,
          average: { $avg: '$rating' },
          total: { $sum: 1 }
        }
      }
    ]);

    sendSuccess(res, 'Reviews fetched successfully', {
      reviews,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      },
      stats: {
        average: avgRating[0]?.average || 0,
        total: avgRating[0]?.total || 0,
        distribution: ratingStats
      }
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const createReview = async (req, res) => {
  try {
    const { productId, orderId, rating, title, comment } = req.body;

    // Validate product
    const product = await Product.findById(productId);
    if (!product) {
      return sendError(res, 'Product not found', 404);
    }

    // Validate order and check if user purchased the product
    const order = await Order.findOne({
      _id: orderId,
      user: req.user.id,
      orderStatus: 'delivered'
    });

    if (!order) {
      return sendError(res, 'You can only review products from delivered orders', 400);
    }

    // Check if product was in the order
    const orderItem = order.items.find(item => item.product.toString() === productId);
    if (!orderItem) {
      return sendError(res, 'Product not found in this order', 400);
    }

    // Check if user already reviewed this product for this order
    const existingReview = await Review.findOne({
      user: req.user.id,
      product: productId,
      order: orderId
    });

    if (existingReview) {
      return sendError(res, 'You have already reviewed this product', 400);
    }

    // Handle image uploads
    const images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'reviews',
          transformation: [
            { width: 600, height: 600, crop: 'limit' },
            { quality: 'auto' }
          ]
        });
        images.push(result.secure_url);
      }
    }

    const review = new Review({
      user: req.user.id,
      product: productId,
      order: orderId,
      rating: parseInt(rating),
      title,
      comment,
      images,
      isVerified: true // Since it's from a verified purchase
    });

    await review.save();
    await review.populate('user', 'name avatar');

    // Update product rating
    await updateProductRating(productId);

    sendSuccess(res, 'Review created successfully', review, 201);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const updateReview = async (req, res) => {
  try {
    const { rating, title, comment } = req.body;
    const reviewId = req.params.id;

    const review = await Review.findOne({
      _id: reviewId,
      user: req.user.id
    });

    if (!review) {
      return sendError(res, 'Review not found', 404);
    }

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      // Delete old images
      for (const imageUrl of review.images) {
        if (imageUrl.includes('cloudinary')) {
          const publicId = imageUrl.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`reviews/${publicId}`);
        }
      }

      // Upload new images
      const images = [];
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'reviews',
          transformation: [
            { width: 600, height: 600, crop: 'limit' },
            { quality: 'auto' }
          ]
        });
        images.push(result.secure_url);
      }
      review.images = images;
    }

    if (rating) review.rating = parseInt(rating);
    if (title) review.title = title;
    if (comment) review.comment = comment;

    await review.save();
    await review.populate('user', 'name avatar');

    // Update product rating
    await updateProductRating(review.product);

    sendSuccess(res, 'Review updated successfully', review);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.id;

    const review = await Review.findOne({
      _id: reviewId,
      user: req.user.id
    });

    if (!review) {
      return sendError(res, 'Review not found', 404);
    }

    const productId = review.product;

    // Delete images
    for (const imageUrl of review.images) {
      if (imageUrl.includes('cloudinary')) {
        const publicId = imageUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`reviews/${publicId}`);
      }
    }

    await Review.findByIdAndDelete(reviewId);

    // Update product rating
    await updateProductRating(productId);

    sendSuccess(res, 'Review deleted successfully');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const getUserReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reviews = await Review.find({ user: req.user.id })
      .populate('product', 'name images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({ user: req.user.id });

    sendSuccess(res, 'User reviews fetched successfully', {
      reviews,
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

// Helper function to update product rating
const updateProductRating = async (productId) => {
  const stats = await Review.aggregate([
    { $match: { product: productId, isApproved: true } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  const product = await Product.findById(productId);
  if (product) {
    product.rating = {
      average: stats[0]?.averageRating || 0,
      count: stats[0]?.totalReviews || 0
    };
    await product.save();
  }
};

module.exports = {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  getUserReviews
};