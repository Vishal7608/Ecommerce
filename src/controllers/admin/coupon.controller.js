const Coupon = require('../../models/Coupon');
const Order = require('../../models/Order');
const Category = require('../../models/Category');
const Product = require('../../models/Product');
const { sendSuccess, sendError } = require('../../utils/response');

const getAllCoupons = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      type,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const filter = {};
    
    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status === 'active') {
      filter.isActive = true;
      filter.validFrom = { $lte: new Date() };
      filter.validTo = { $gte: new Date() };
    } else if (status === 'expired') {
      filter.validTo = { $lt: new Date() };
    } else if (status === 'inactive') {
      filter.isActive = false;
    }
    
    if (type) filter.type = type;

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const coupons = await Coupon.find(filter)
      .populate('applicableCategories', 'name')
      .populate('applicableProducts', 'name')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Coupon.countDocuments(filter);

    // Calculate usage statistics for each coupon
    const couponsWithStats = await Promise.all(
      coupons.map(async (coupon) => {
        const usageCount = await Order.countDocuments({
          'discount.coupon': coupon.code
        });

        return {
          ...coupon.toObject(),
          actualUsageCount: usageCount
        };
      })
    );

    sendSuccess(res, 'Coupons fetched successfully', {
      coupons: couponsWithStats,
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

const getCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
      .populate('applicableCategories', 'name')
      .populate('applicableProducts', 'name');

    if (!coupon) {
      return sendError(res, 'Coupon not found', 404);
    }

    // Get usage statistics
    const usageCount = await Order.countDocuments({
      'discount.coupon': coupon.code
    });

    const recentUsage = await Order.find({
      'discount.coupon': coupon.code
    })
      .populate('user', 'name email')
      .select('orderId user discount.amount createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    sendSuccess(res, 'Coupon fetched successfully', {
      coupon,
      stats: {
        usageCount,
        remainingUses: coupon.usageLimit ? coupon.usageLimit - usageCount : null,
        recentUsage
      }
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      type,
      value,
      minimumAmount,
      maximumDiscount,
      usageLimit,
      validFrom,
      validTo,
      applicableCategories,
      applicableProducts
    } = req.body;

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return sendError(res, 'Coupon code already exists', 400);
    }

    // Validate dates
    if (new Date(validTo) <= new Date(validFrom)) {
      return sendError(res, 'Valid to date must be after valid from date', 400);
    }

    // Validate percentage value
    if (type === 'percentage' && value > 100) {
      return sendError(res, 'Percentage value cannot exceed 100', 400);
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      description,
      type,
      value: parseFloat(value),
      minimumAmount: minimumAmount ? parseFloat(minimumAmount) : 0,
      maximumDiscount: maximumDiscount ? parseFloat(maximumDiscount) : null,
      usageLimit: usageLimit ? parseInt(usageLimit) : null,
      validFrom: new Date(validFrom),
      validTo: new Date(validTo),
      applicableCategories: applicableCategories || [],
      applicableProducts: applicableProducts || []
    });

    await coupon.save();
    await coupon.populate([
      { path: 'applicableCategories', select: 'name' },
      { path: 'applicableProducts', select: 'name' }
    ]);

    sendSuccess(res, 'Coupon created successfully', coupon, 201);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const updateCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      type,
      value,
      minimumAmount,
      maximumDiscount,
      usageLimit,
      validFrom,
      validTo,
      isActive,
      applicableCategories,
      applicableProducts
    } = req.body;

    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return sendError(res, 'Coupon not found', 404);
    }

    // Check if code is being changed and doesn't conflict
    if (code && code.toUpperCase() !== coupon.code) {
      const existingCoupon = await Coupon.findOne({ 
        code: code.toUpperCase(),
        _id: { $ne: req.params.id }
      });
      if (existingCoupon) {
        return sendError(res, 'Coupon code already exists', 400);
      }
      coupon.code = code.toUpperCase();
    }

    // Validate dates if provided
    const newValidFrom = validFrom ? new Date(validFrom) : coupon.validFrom;
    const newValidTo = validTo ? new Date(validTo) : coupon.validTo;
    
    if (newValidTo <= newValidFrom) {
      return sendError(res, 'Valid to date must be after valid from date', 400);
    }

    // Validate percentage value
    if (type === 'percentage' && value > 100) {
      return sendError(res, 'Percentage value cannot exceed 100', 400);
    }

    // Update fields
    if (description) coupon.description = description;
    if (type) coupon.type = type;
    if (value) coupon.value = parseFloat(value);
    if (minimumAmount !== undefined) coupon.minimumAmount = minimumAmount ? parseFloat(minimumAmount) : 0;
    if (maximumDiscount !== undefined) coupon.maximumDiscount = maximumDiscount ? parseFloat(maximumDiscount) : null;
    if (usageLimit !== undefined) coupon.usageLimit = usageLimit ? parseInt(usageLimit) : null;
    if (validFrom) coupon.validFrom = new Date(validFrom);
    if (validTo) coupon.validTo = new Date(validTo);
    if (isActive !== undefined) coupon.isActive = isActive;
    if (applicableCategories !== undefined) coupon.applicableCategories = applicableCategories;
    if (applicableProducts !== undefined) coupon.applicableProducts = applicableProducts;

    await coupon.save();
    await coupon.populate([
      { path: 'applicableCategories', select: 'name' },
      { path: 'applicableProducts', select: 'name' }
    ]);

    sendSuccess(res, 'Coupon updated successfully', coupon);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return sendError(res, 'Coupon not found', 404);
    }

    // Check if coupon has been used
    const usageCount = await Order.countDocuments({
      'discount.coupon': coupon.code
    });

    if (usageCount > 0) {
      return sendError(res, 'Cannot delete coupon that has been used. Deactivate it instead.', 400);
    }

    await Coupon.findByIdAndDelete(req.params.id);
    sendSuccess(res, 'Coupon deleted successfully');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const validateCoupon = async (req, res) => {
  try {
    const { code, userId, cartTotal, items } = req.body;

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true })
      .populate('applicableCategories')
      .populate('applicableProducts');

    if (!coupon) {
      return sendError(res, 'Invalid coupon code', 404);
    }

    // Check validity dates
    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validTo) {
      return sendError(res, 'Coupon has expired or not yet valid', 400);
    }

    // Check minimum amount
    if (cartTotal < coupon.minimumAmount) {
      return sendError(res, `Minimum order amount of $${coupon.minimumAmount} required`, 400);
    }

    // Check usage limit
    if (coupon.usageLimit) {
      const usageCount = await Order.countDocuments({
        'discount.coupon': coupon.code
      });
      
      if (usageCount >= coupon.usageLimit) {
        return sendError(res, 'Coupon usage limit reached', 400);
      }
    }

    // Check applicable categories/products
    if (coupon.applicableCategories.length > 0 || coupon.applicableProducts.length > 0) {
      const applicableCategoryIds = coupon.applicableCategories.map(cat => cat._id.toString());
      const applicableProductIds = coupon.applicableProducts.map(prod => prod._id.toString());
      
      const isApplicable = items.some(item => {
        return applicableProductIds.includes(item.product.toString()) ||
               applicableCategoryIds.includes(item.category.toString());
      });

      if (!isApplicable) {
        return sendError(res, 'Coupon not applicable to items in cart', 400);
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === 'percentage') {
      discountAmount = (cartTotal * coupon.value) / 100;
    } else {
      discountAmount = coupon.value;
    }

    // Apply maximum discount limit
    if (coupon.maximumDiscount && discountAmount > coupon.maximumDiscount) {
      discountAmount = coupon.maximumDiscount;
    }

    // Don't exceed cart total
    if (discountAmount > cartTotal) {
      discountAmount = cartTotal;
    }

    sendSuccess(res, 'Coupon is valid', {
      coupon: {
        code: coupon.code,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value
      },
      discountAmount: parseFloat(discountAmount.toFixed(2))
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const getCouponStats = async (req, res) => {
  try {
    const totalCoupons = await Coupon.countDocuments();
    const activeCoupons = await Coupon.countDocuments({
      isActive: true,
      validFrom: { $lte: new Date() },
      validTo: { $gte: new Date() }
    });
    
    const expiredCoupons = await Coupon.countDocuments({
      validTo: { $lt: new Date() }
    });

    // Usage statistics
    const usageStats = await Order.aggregate([
      { $match: { 'discount.coupon': { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$discount.coupon',
          totalUsage: { $sum: 1 },
          totalDiscount: { $sum: '$discount.amount' }
        }
      },
      { $sort: { totalUsage: -1 } },
      { $limit: 10 }
    ]);

    sendSuccess(res, 'Coupon stats fetched successfully', {
      totalCoupons,
      activeCoupons,
      expiredCoupons,
      inactiveCoupons: totalCoupons - activeCoupons - expiredCoupons,
      topUsedCoupons: usageStats
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

module.exports = {
  getAllCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  getCouponStats
};