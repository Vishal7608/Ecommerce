const User = require('../../models/User');
const { generateToken } = require('../../utils/jwt');
const { sendSuccess, sendError } = require('../../utils/response');
const EmailService = require('../../services/email.service');

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const normalizedEmail = email?.trim().toLowerCase();

    if (!name?.trim() || !normalizedEmail || !password) {
      return sendError(res, "All fields are required", 400);
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return sendError(res, "User already exists with this email", 400);
    }

    // Password is plain here.
    // User model pre-save hook hashes it ONE time.
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
    });

    const token = generateToken({
      id: user._id,
      email: user.email,
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    return sendSuccess(
      res,
      "User registered successfully",
      {
        user: userResponse,
        token,
      },
      201
    );
  } catch (error) {
    console.error("Register error:", error);
    return sendError(res, error.message, 500);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return sendError(res, "Email and password are required", 400);
    }

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user) {
      return sendError(res, "Invalid credentials", 401);
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return sendError(res, "Invalid credentials", 401);
    }

    if (user.isActive === false) {
      return sendError(res, "Account is deactivated", 403);
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken({
      id: user._id,
      email: user.email,
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    return sendSuccess(res, "Login successful", {
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return sendError(res, "Server error", 500);
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    sendSuccess(res, 'Profile fetched successfully', user);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, phone, address },
      { new: true, runValidators: true }
    ).select('-password');

    sendSuccess(res, 'Profile updated successfully', user);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.id).select('+password');
    
    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return sendError(res, 'Current password is incorrect', 400);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    sendSuccess(res, 'Password changed successfully');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
};