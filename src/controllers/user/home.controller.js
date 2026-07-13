const Product = require('../../models/Product');
const Category = require('../../models/Category');
const Banner = require('../../models/Banner');
const HeroBanner = require('../../models/HeroBanner');
const { sendSuccess, sendError } = require('../../utils/response');

const getHomeData = async (req, res) => {
  try {
    // Get hero banners
    const heroBanners = await HeroBanner.find({ isActive: true })
      .sort({ sortOrder: 1 })
      .limit(5);

    // Get featured products
    const featuredProducts = await Product.find({
      isActive: true,
      isFeatured: true
    })
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(8);

    // Get latest products
    const latestProducts = await Product.find({ isActive: true })
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(8);

    // Get categories with product count
    const categories = await Category.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'category',
          as: 'products'
        }
      },
      {
        $project: {
          name: 1,
          description: 1,
          image: 1,
          productCount: { $size: '$products' }
        }
      },
      { $sort: { sortOrder: 1 } },
      { $limit: 6 }
    ]);

    // Get promotional banners
    const banners = await Banner.find({
      isActive: true,
      $or: [
        { validTo: null },
        { validTo: { $gte: new Date() } }
      ]
    }).sort({ sortOrder: 1 });

    sendSuccess(res, 'Home data fetched successfully', {
      heroBanners,
      featuredProducts,
      latestProducts,
      categories,
      banners
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const getStats = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments({ isActive: true });
    const totalCategories = await Category.countDocuments({ isActive: true });
    
    sendSuccess(res, 'Stats fetched successfully', {
      totalProducts,
      totalCategories
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

module.exports = {
  getHomeData,
  getStats
};