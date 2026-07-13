const mongoose = require('mongoose');
const Product = require('../../models/Product');
const Category = require('../../models/Category');

// ==============================
// Helper: Escape Regex
// ==============================
const escapeRegExp = (string = '') => {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// ==============================
// Helper: Create Slug
// ==============================
const createSlug = (name = '') => {
  return (
    String(name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `category-${Date.now()}`
  );
};

// ==============================
// Helper: Generate Unique SKU
// ==============================
const generateUniqueSKU = async (name = 'PROD') => {
  const prefix =
    String(name)
      .slice(0, 3)
      .toUpperCase()
      .replace(/[^A-Z]/g, '') || 'PRD';

  let sku;
  let exists = true;

  while (exists) {
    sku = `SKU-${prefix}-${Date.now().toString().slice(-6)}-${Math.floor(
      Math.random() * 899 + 100
    )}`;

    exists = await Product.findOne({ sku });
  }

  return sku;
};

// ==============================
// Helper: Resolve Category
// Allows ObjectId OR category name like "Women"
// ==============================
const resolveCategory = async (category) => {
  let categoryDoc = null;

  // Case 1: Valid MongoDB ObjectId
  if (category && mongoose.Types.ObjectId.isValid(category)) {
    categoryDoc = await Category.findById(category);
    if (categoryDoc) return categoryDoc;
  }

  // Case 2: Category name like "Women"
  if (typeof category === 'string' && category.trim() && category !== 'null') {
    const cleanName = category.trim();

    categoryDoc = await Category.findOne({
      name: { $regex: new RegExp(`^${escapeRegExp(cleanName)}$`, 'i') }
    });

    if (categoryDoc) return categoryDoc;

    const slug = createSlug(cleanName);

    try {
      categoryDoc = await Category.create({
        name: cleanName,
        slug,
        description: `${cleanName} Category`,
        image:
          'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=600&auto=format&fit=crop',
        isActive: true
      });

      console.log(`✅ Auto-created category: ${cleanName}`);

      return categoryDoc;
    } catch (catError) {
      console.warn('⚠️ Category create failed:', catError.message);

      categoryDoc =
        (await Category.findOne({ slug })) ||
        (await Category.findOne({ name: { $regex: /^general$/i } })) ||
        (await Category.findOne({}));

      if (categoryDoc) return categoryDoc;
    }
  }

  // Case 3: Fallback General category
  categoryDoc = await Category.findOne({ name: { $regex: /^general$/i } });

  if (!categoryDoc) {
    categoryDoc = await Category.create({
      name: 'General',
      slug: `general-${Date.now()}`,
      description: 'General Category',
      image:
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=600&auto=format&fit=crop',
      isActive: true
    });
  }

  return categoryDoc;
};

// ==============================
// GET ALL PRODUCTS
// ==============================
const getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    }

    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const products = await Product.find(filter)
      .populate('category', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: 'Products fetched successfully',
      data: {
        products,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total
        }
      }
    });
  } catch (error) {
    console.error('❌ Get products error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch products'
    });
  }
};

// ==============================
// GET SINGLE PRODUCT
// ==============================
const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      'category',
      'name slug'
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Product fetched successfully',
      data: product
    });
  } catch (error) {
    console.error('❌ Get product error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch product'
    });
  }
};

// ==============================
// CREATE PRODUCT
// ==============================
const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      salePrice,
      category,
      inventory,
      specifications,
      tags,
      isFeatured,
      images: bodyImages
    } = req.body;

    if (!name || price === undefined || price === null) {
      return res.status(400).json({
        success: false,
        message: 'Product name and price are required'
      });
    }

    const categoryDoc = await resolveCategory(category || 'General');

    if (!categoryDoc?._id) {
      return res.status(400).json({
        success: false,
        message: 'Unable to resolve category'
      });
    }

    const sku = await generateUniqueSKU(name);

    // Images
    let images = [];

    if (req.files && req.files.length > 0) {
      images = req.files.map((file, index) => ({
        url: `/uploads/${file.filename}`,
        alt: name,
        isPrimary: index === 0
      }));
    } else if (Array.isArray(bodyImages) && bodyImages.length > 0) {
      images = bodyImages
        .map((img, index) => ({
          url: typeof img === 'string' ? img : img?.url,
          alt: typeof img === 'object' ? img?.alt || name : name,
          isPrimary:
            typeof img === 'object'
              ? img?.isPrimary ?? index === 0
              : index === 0
        }))
        .filter((img) => img.url);
    }

    if (images.length === 0) {
      images.push({
        url:
          'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop',
        alt: name,
        isPrimary: true
      });
    }

    // Tags
    const parsedTags = Array.isArray(tags)
      ? tags.filter(Boolean)
      : typeof tags === 'string'
        ? tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : ['New'];

    const product = await Product.create({
      name: name.trim(),
      description: description?.trim() || 'Modern luxury apparel item.',
      sku,
      price: Number(price) || 0,
      salePrice: salePrice ? Number(salePrice) : null,
      category: categoryDoc._id,
      images,
      inventory: {
        quantity: Number(inventory?.quantity ?? 10),
        lowStockThreshold: Number(inventory?.lowStockThreshold ?? 5)
      },
      specifications: specifications || {
        material: 'Premium Blend'
      },
      tags: parsedTags,
      isActive: true,
      isFeatured: isFeatured === true || isFeatured === 'true'
    });

    await product.populate('category', 'name slug');

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    console.error('❌ Create product error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create product'
    });
  }
};

// ==============================
// UPDATE PRODUCT
// ==============================
const updateProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      salePrice,
      category,
      inventory,
      specifications,
      tags,
      isFeatured,
      isActive,
      images: bodyImages
    } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (name) product.name = name.trim();
    if (description) product.description = description.trim();

    if (price !== undefined) {
      product.price = Number(price);
    }

    if (salePrice !== undefined) {
      product.salePrice = salePrice ? Number(salePrice) : null;
    }

    if (category) {
      const categoryDoc = await resolveCategory(category);

      if (categoryDoc?._id) {
        product.category = categoryDoc._id;
      }
    }

    if (inventory) {
      product.inventory.quantity = Number(
        inventory?.quantity ?? product.inventory.quantity
      );

      product.inventory.lowStockThreshold = Number(
        inventory?.lowStockThreshold ?? product.inventory.lowStockThreshold
      );
    }

    if (specifications) {
      product.specifications = specifications;
    }

    if (tags !== undefined) {
      product.tags = Array.isArray(tags)
        ? tags.filter(Boolean)
        : typeof tags === 'string'
          ? tags.split(',').map((tag) => tag.trim()).filter(Boolean)
          : [];
    }

    if (isFeatured !== undefined) {
      product.isFeatured = isFeatured === true || isFeatured === 'true';
    }

    if (isActive !== undefined) {
      product.isActive = isActive === true || isActive === 'true';
    }

    if (req.files && req.files.length > 0) {
      const uploadedImages = req.files.map((file, index) => ({
        url: `/uploads/${file.filename}`,
        alt: product.name,
        isPrimary: product.images.length === 0 && index === 0
      }));

      product.images.push(...uploadedImages);
    } else if (Array.isArray(bodyImages)) {
      product.images = bodyImages
        .map((img, index) => ({
          url: typeof img === 'string' ? img : img?.url,
          alt: typeof img === 'object' ? img?.alt || product.name : product.name,
          isPrimary:
            typeof img === 'object'
              ? img?.isPrimary ?? index === 0
              : index === 0
        }))
        .filter((img) => img.url);
    }

    await product.save();
    await product.populate('category', 'name slug');

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('❌ Update product error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update product'
    });
  }
};

// ==============================
// DELETE PRODUCT
// ==============================
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete product error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete product'
    });
  }
};

// ==============================
// DELETE PRODUCT IMAGE
// ==============================
const deleteProductImage = async (req, res) => {
  try {
    const { id, imageId } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const imageIndex = product.images.findIndex(
      (img) => img._id.toString() === imageId
    );

    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    product.images.splice(imageIndex, 1);

    await product.save();

    return res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete product image error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete product image'
    });
  }
};

// ==============================
// BULK UPDATE STATUS
// ==============================
const bulkUpdateStatus = async (req, res) => {
  try {
    const { productIds, isActive } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product IDs are required'
      });
    }

    await Product.updateMany(
      { _id: { $in: productIds } },
      { isActive: Boolean(isActive) }
    );

    return res.status(200).json({
      success: true,
      message: `Products ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('❌ Bulk update product status error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update product status'
    });
  }
};

// ==============================
// EXPORT CONTROLLERS
// ==============================
module.exports = {
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteProductImage,
  bulkUpdateStatus
};