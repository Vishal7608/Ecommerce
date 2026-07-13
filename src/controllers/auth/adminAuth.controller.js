const User = require('../../models/User');
const { generateToken } = require('../../utils/jwt');
const { sendSuccess, sendError } = require('../../utils/response');

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user || user.role !== 'admin') {
      return sendError(res, 'Invalid admin credentials', 401);
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 'Invalid admin credentials', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      return sendError(res, 'Account is deactivated', 401);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken({ id: user._id, email: user.email, role: user.role });

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    sendSuccess(res, 'Admin login successful', {
      user: userResponse,
      token
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const createAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError(res, 'User already exists with this email', 400);
    }

    // Create admin user
    const user = await User.create({
      name,
      email,
      password,
      role: 'admin'
    });

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    sendSuccess(res, 'Admin created successfully', userResponse, 201);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

module.exports = {
  adminLogin,
  createAdmin
};