const Product = require('../../models/Product');
const Category = require('../../models/Category');
const { sendSuccess, sendError } = require('../../utils/response');

const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      minPrice,
      maxPrice,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      tags
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter query
    const filter = { isActive: true };

    if (category) {
      filter.category = category;
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    if (search) {
      filter.$text = { $search: search };
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      filter.tags = { $in: tagArray };
    }

    // Build sort query
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get products
    const products = await Product.find(filter)
      .populate('category', 'name')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Product.countDocuments(filter);

    // Get price range for filters
    const priceRange = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }
      }
    ]);

    // Get available tags
    const allTags = await Product.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    sendSuccess(res, 'Products fetched successfully', {
      products,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      },
      filters: {
        priceRange: priceRange[0] || { minPrice: 0, maxPrice: 0 },
        tags: allTags.map(tag => tag._id)
      }
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const getProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id)
      .populate('category', 'name description')
      .populate({
        path: 'reviews',
        populate: {
          path: 'user',
          select: 'name avatar'
        }
      });

    if (!product || !product.isActive) {
      return sendError(res, 'Product not found', 404);
    }

    // Increment view count
    product.views += 1;
    await product.save();

    // Get related products
    const relatedProducts = await Product.find({
      category: product.category._id,
      _id: { $ne: product._id },
      isActive: true
    })
      .populate('category', 'name')
      .limit(4);

    sendSuccess(res, 'Product fetched successfully', {
      product,
      relatedProducts
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ sortOrder: 1 });

    sendSuccess(res, 'Categories fetched successfully', categories);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const searchProducts = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return sendSuccess(res, 'Search results', []);
    }

    const products = await Product.find({
      $and: [
        { isActive: true },
        {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
            { tags: { $in: [new RegExp(q, 'i')] } }
          ]
        }
      ]
    })
      .select('name price images category')
      .populate('category', 'name')
      .limit(parseInt(limit));

    sendSuccess(res, 'Search results', products);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

module.exports = {
  getProducts,
  getProduct,
  getCategories,
  searchProducts
};