const User = require('../../models/User');
const cloudinary = require('../../config/cloudinary');
const { sendSuccess, sendError } = require('../../utils/response');

// ============ PROFILE MANAGEMENT ============

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return sendError(res, 'User not found', 404);
    }
    sendSuccess(res, 'Profile fetched successfully', user);
  } catch (error) {
    console.error('Get profile error:', error);
    sendError(res, error.message, 500);
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    
    // Validate phone format if provided
    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
      return sendError(res, 'Invalid phone number format', 400);
    }

    // Validate name if provided
    if (name && (name.trim().length < 2 || name.trim().length > 50)) {
      return sendError(res, 'Name must be between 2 and 50 characters', 400);
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { 
        ...(name && { name: name.trim() }),
        ...(phone && { phone: phone.trim() })
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    sendSuccess(res, 'Profile updated successfully', user);
  } catch (error) {
    console.error('Update profile error:', error);
    sendError(res, error.message, 500);
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validation
    if (!currentPassword || !newPassword) {
      return sendError(res, 'Current password and new password are required', 400);
    }

    if (newPassword.length < 6) {
      return sendError(res, 'New password must be at least 6 characters long', 400);
    }
    
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return sendError(res, 'User not found', 404);
    }
    
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return sendError(res, 'Current password is incorrect', 400);
    }

    user.password = newPassword;
    await user.save();

    sendSuccess(res, 'Password changed successfully');
  } catch (error) {
    console.error('Change password error:', error);
    sendError(res, error.message, 500);
  }
};

const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'Please upload an image', 400);
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return sendError(res, 'Only JPEG, JPG, and PNG files are allowed', 400);
    }

    // Validate file size (5MB max)
    if (req.file.size > 5 * 1024 * 1024) {
      return sendError(res, 'File size must be less than 5MB', 400);
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    // Delete old avatar from cloudinary
    if (user.avatar && user.avatar.includes('cloudinary')) {
      try {
        const publicId = user.avatar.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`avatars/${publicId}`);
      } catch (deleteError) {
        console.error('Error deleting old avatar:', deleteError);
        // Continue with upload even if delete fails
      }
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'avatars',
      transformation: [
        { width: 200, height: 200, crop: 'fill', gravity: 'face' },
        { quality: 'auto' }
      ]
    });

    user.avatar = result.secure_url;
    await user.save();

    sendSuccess(res, 'Avatar updated successfully', { avatar: user.avatar });
  } catch (error) {
    console.error('Upload avatar error:', error);
    sendError(res, error.message, 500);
  }
};

const deleteAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    if (!user.avatar) {
      return sendError(res, 'No avatar to delete', 400);
    }

    // Delete from cloudinary
    if (user.avatar.includes('cloudinary')) {
      try {
        const publicId = user.avatar.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`avatars/${publicId}`);
      } catch (deleteError) {
        console.error('Error deleting avatar from cloudinary:', deleteError);
      }
    }

    user.avatar = null;
    await user.save();

    sendSuccess(res, 'Avatar deleted successfully');
  } catch (error) {
    console.error('Delete avatar error:', error);
    sendError(res, error.message, 500);
  }
};

// ============ ADDRESS MANAGEMENT ============

const addAddress = async (req, res) => {
  try {
    const { label, fullName, phone, street, city, state, pincode, isDefault } = req.body;
    
    // Validation
    if (!label || !fullName || !phone || !street || !city || !state || !pincode) {
      return sendError(res, 'All address fields are required', 400);
    }

    // Validate label
    if (!['home', 'work', 'other'].includes(label.toLowerCase())) {
      return sendError(res, 'Label must be home, work, or other', 400);
    }

    // Validate phone and pincode format
    const phoneRegex = /^[6-9]\d{9}$/;
    const pincodeRegex = /^\d{6}$/;
    
    if (!phoneRegex.test(phone)) {
      return sendError(res, 'Invalid phone number format', 400);
    }
    
    if (!pincodeRegex.test(pincode)) {
      return sendError(res, 'Invalid pincode format', 400);
    }

    // Validate name length
    if (fullName.trim().length < 2 || fullName.trim().length > 50) {
      return sendError(res, 'Full name must be between 2 and 50 characters', 400);
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    // Check address limit (optional - prevent spam)
    if (user.address.length >= 5) {
      return sendError(res, 'Maximum 5 addresses allowed', 400);
    }
    
    // If this is set as default or first address, unset others
    if (isDefault || user.address.length === 0) {
      user.address.forEach(addr => addr.isDefault = false);
    }

    user.address.push({
      label: label.toLowerCase().trim(),
      fullName: fullName.trim(),
      phone: phone.trim(),
      street: street.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      isDefault: isDefault || user.address.length === 0
    });

    await user.save();
    
    const updatedUser = await User.findById(req.user.id).select('-password');
    sendSuccess(res, 'Address added successfully', updatedUser);
  } catch (error) {
    console.error('Add address error:', error);
    sendError(res, error.message, 500);
  }
};

const getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('address');
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    sendSuccess(res, 'Addresses fetched successfully', user.address);
  } catch (error) {
    console.error('Get addresses error:', error);
    sendError(res, error.message, 500);
  }
};

const updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const { label, fullName, phone, street, city, state, pincode, isDefault } = req.body;
    
    // Validation for provided fields
    if (label && !['home', 'work', 'other'].includes(label.toLowerCase())) {
      return sendError(res, 'Label must be home, work, or other', 400);
    }

    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
      return sendError(res, 'Invalid phone number format', 400);
    }
    
    if (pincode && !/^\d{6}$/.test(pincode)) {
      return sendError(res, 'Invalid pincode format', 400);
    }

    if (fullName && (fullName.trim().length < 2 || fullName.trim().length > 50)) {
      return sendError(res, 'Full name must be between 2 and 50 characters', 400);
    }
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    const addressIndex = user.address.findIndex(addr => addr._id.toString() === addressId);
    
    if (addressIndex === -1) {
      return sendError(res, 'Address not found', 404);
    }

    // If setting as default, unset others
    if (isDefault) {
      user.address.forEach(addr => addr.isDefault = false);
    }

    const address = user.address[addressIndex];
    
    // Update only provided fields
    if (label !== undefined) address.label = label.toLowerCase().trim();
    if (fullName !== undefined) address.fullName = fullName.trim();
    if (phone !== undefined) address.phone = phone.trim();
    if (street !== undefined) address.street = street.trim();
    if (city !== undefined) address.city = city.trim();
    if (state !== undefined) address.state = state.trim();
    if (pincode !== undefined) address.pincode = pincode.trim();
    if (isDefault !== undefined) address.isDefault = isDefault;

    await user.save();
    
    const updatedUser = await User.findById(req.user.id).select('-password');
    sendSuccess(res, 'Address updated successfully', updatedUser);
  } catch (error) {
    console.error('Update address error:', error);
    sendError(res, error.message, 500);
  }
};

const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    const addressIndex = user.address.findIndex(addr => addr._id.toString() === addressId);
    
    if (addressIndex === -1) {
      return sendError(res, 'Address not found', 404);
    }

    const wasDefault = user.address[addressIndex].isDefault;
    user.address.splice(addressIndex, 1);

    // If deleted address was default, set first remaining address as default
    if (wasDefault && user.address.length > 0) {
      user.address[0].isDefault = true;
    }

    await user.save();
    
    const updatedUser = await User.findById(req.user.id).select('-password');
    sendSuccess(res, 'Address deleted successfully', updatedUser);
  } catch (error) {
    console.error('Delete address error:', error);
    sendError(res, error.message, 500);
  }
};

const setDefaultAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    const addressIndex = user.address.findIndex(addr => addr._id.toString() === addressId);
    
    if (addressIndex === -1) {
      return sendError(res, 'Address not found', 404);
    }

    // Unset all default addresses
    user.address.forEach(addr => addr.isDefault = false);
    
    // Set selected address as default
    user.address[addressIndex].isDefault = true;

    await user.save();
    
    const updatedUser = await User.findById(req.user.id).select('-password');
    sendSuccess(res, 'Default address updated successfully', updatedUser);
  } catch (error) {
    console.error('Set default address error:', error);
    sendError(res, error.message, 500);
  }
};

module.exports = {
  // Profile management
  getProfile,
  updateProfile,
  changePassword,
  uploadAvatar,
  deleteAvatar,
  
  // Address management
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress
};