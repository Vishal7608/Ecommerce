const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    required: true
  },
  link: {
    type: String,
    default: '#'
  },
  position: {
    type: String,
    enum: ['main', 'secondary', 'sidebar'],
    default: 'main'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  validFrom: {
    type: Date,
    default: Date.now
  },
  validTo: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Banner', bannerSchema);