const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    select: true // Ensure password is selected by default for auth purposes
  },
  avatar: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    default: null
  },
  address: [{
    label: { 
      type: String, 
      required: true,
      enum: ['home', 'work', 'other']
    },
    fullName: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 100
    },
    phone: { 
      type: String, 
      required: true,
      validate: {
        // Allows both local 10 digit numbers and numbers with country codes (like +91)
        validator: function(v) {
          return /^(?:\+?\d{1,3})?[-.\s]?[6-9]\d{9}$/.test(v);
        },
        message: 'Invalid phone number format'
      }
    },
    street: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 200
    },
    city: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 50
    },
    state: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 50
    },
    pincode: { 
      type: String, 
      required: true,
      validate: {
        validator: function(v) {
          return /^\d{6}$/.test(v);
        },
        message: 'Invalid pincode format (must be 6 digits)'
      }
    },
    isDefault: { 
      type: Boolean, 
      default: false 
    }
  }],
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Hash password only when modified
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  try {
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);