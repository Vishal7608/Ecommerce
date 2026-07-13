const Category = require('../../models/Category');
const cloudinary = require('../../config/cloudinary');
const { sendSuccess, sendError } = require('../../utils/response');

// Get all categories with pagination and filtering
const getAllCategories = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const filter = {};
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }
    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }

    const categories = await Category.find(filter)
      .populate('parent', 'name')
      .sort({ sortOrder: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Category.countDocuments(filter);

    sendSuccess(res, 'Categories fetched successfully', {
      categories,
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

// Get single category
const getCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate('parent', 'name');

    if (!category) {
      return sendError(res, 'Category not found', 404);
    }

    sendSuccess(res, 'Category fetched successfully', category);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Create new category
const createCategory = async (req, res) => {
  try {
    const { name, description, parent, sortOrder } = req.body;

    // Check if category name already exists
    const existing = await Category.findOne({ name: { $regex: name, $options: 'i' } });
    if (existing) {
      return sendError(res, 'Category name already exists', 400);
    }

    // If parent is provided, verify it exists
    if (parent) {
      const parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        return sendError(res, 'Parent category not found', 404);
      }
    }

    // Handle image upload
    let imageUrl = null;
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'ecommerce/categories'
        });
        imageUrl = result.secure_url;
      } catch (uploadError) {
        return sendError(res, 'Image upload failed: ' + uploadError.message, 400);
      }
    }

    const category = new Category({
      name,
      description,
      image: imageUrl,
      parent: parent || null,
      sortOrder: sortOrder || 0
    });

    await category.save();

    sendSuccess(res, 'Category created successfully', category, 201);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const { name, description, parent, sortOrder, isActive } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category) {
      return sendError(res, 'Category not found', 404);
    }

    // Check if new name already exists (excluding current category)
    if (name && name !== category.name) {
      const existing = await Category.findOne({ 
        name: { $regex: name, $options: 'i' },
        _id: { $ne: req.params.id }
      });
      if (existing) {
        return sendError(res, 'Category name already exists', 400);
      }
    }

    // If parent is provided, verify it exists and is not the category itself
    if (parent && parent !== category._id.toString()) {
      const parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        return sendError(res, 'Parent category not found', 404);
      }
    }

    // Handle image upload
    if (req.file) {
      // Delete old image if exists
      if (category.image) {
        try {
          const publicId = category.image.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`ecommerce/categories/${publicId}`);
        } catch (err) {
          console.log('Error deleting old image:', err);
        }
      }

      // Upload new image
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'ecommerce/categories'
        });
        category.image = result.secure_url;
      } catch (uploadError) {
        return sendError(res, 'Image upload failed: ' + uploadError.message, 400);
      }
    }

    // Update fields
    if (name) category.name = name;
    if (description) category.description = description;
    if (parent) category.parent = parent;
    if (sortOrder !== undefined) category.sortOrder = sortOrder;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    sendSuccess(res, 'Category updated successfully', category);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return sendError(res, 'Category not found', 404);
    }

    // Check if category has children
    const children = await Category.countDocuments({ parent: req.params.id });
    if (children > 0) {
      return sendError(res, 'Cannot delete category with subcategories', 400);
    }

    // Delete image from cloudinary
    if (category.image) {
      try {
        const publicId = category.image.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`ecommerce/categories/${publicId}`);
      } catch (err) {
        console.log('Error deleting image:', err);
      }
    }

    await Category.deleteOne({ _id: req.params.id });

    sendSuccess(res, 'Category deleted successfully');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Get category tree structure
const getCategoryTree = async (req, res) => {
  try {
    // Get all root categories
    const rootCategories = await Category.find({ parent: null }).sort({ sortOrder: 1 });

    // Build tree structure recursively
    const buildTree = async (categories) => {
      const tree = [];
      for (const category of categories) {
        const children = await Category.find({ parent: category._id }).sort({ sortOrder: 1 });
        tree.push({
          ...category.toObject(),
          children: await buildTree(children)
        });
      }
      return tree;
    };

    const tree = await buildTree(rootCategories);

    sendSuccess(res, 'Category tree fetched successfully', tree);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Update category order
const updateCategoryOrder = async (req, res) => {
  try {
    const { orders } = req.body; // Array of { id, sortOrder }

    if (!Array.isArray(orders)) {
      return sendError(res, 'Orders must be an array', 400);
    }

    // Update sort order for each category
    for (const order of orders) {
      await Category.findByIdAndUpdate(
        order.id,
        { sortOrder: order.sortOrder },
        { new: true }
      );
    }

    sendSuccess(res, 'Category order updated successfully');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

module.exports = {
  getAllCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryTree,
  updateCategoryOrder
};
