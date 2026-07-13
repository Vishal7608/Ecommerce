const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  sku: {
    type: String,
    required: true,
    unique: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  salePrice: {
    type: Number,
    default: null,
    min: 0
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  images: [{
    url: String,
    alt: String,
    isPrimary: { type: Boolean, default: false }
  }],
  inventory: {
    quantity: { type: Number, required: true, min: 0 },
    lowStockThreshold: { type: Number, default: 10 }
  },
  specifications: {
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    color: String,
    size: String,
    material: String
  },
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

productSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema);