const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Safety fallback for response sending helper to avoid crashes
let sendError;
try {
  sendError = require('../utils/response').sendError;
} catch (error) {
  sendError = (res, message, statusCode = 500) => {
    return res.status(statusCode).json({
      success: false,
      message
    });
  };
}

// ==============================
// ✅ MAIN AUTHENTICATION MIDDLEWARE
// ==============================
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : authHeader;
    
    if (!token) {
      return sendError(res, 'Access token required. Please sign in.', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    
    // Support both payload structures: 'id' or 'userId'
    const userId = decoded.id || decoded.userId;
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return sendError(res, 'User session not found. Please log in again.', 401);
    }

    if (!user.isActive) {
      return sendError(res, 'This account is currently deactivated.', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Your session has expired. Please login again.', 401);
    }
    
    if (error.name === 'JsonWebTokenError') {
      return sendError(res, 'Invalid security token.', 401);
    }
    
    return sendError(res, 'Authentication failed', 401);
  }
};

// ==============================
// ✅ PROTECT MIDDLEWARE (Alias)
// ==============================
const protect = authenticate;

// ==============================
// ✅ ADMIN ONLY MIDDLEWARE
// ==============================
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return sendError(res, 'Access denied. Admin privileges required.', 403);
  }
};

// ==============================
// ✅ OPTIONAL AUTH MIDDLEWARE
// ==============================
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : authHeader;

    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
      const userId = decoded.id || decoded.userId;
      const user = await User.findById(userId).select('-password');

      if (user && user.isActive) {
        req.user = user;
      } else {
        req.user = null;
      }
      next();
    } catch (error) {
      req.user = null;
      next();
    }
  } catch (error) {
    req.user = null;
    next();
  }
};

// ==============================
// ✅ CHECK OWNERSHIP MIDDLEWARE
// ==============================
const checkOwnership = (resourceField = 'user') => {
  return (req, res, next) => {
    try {
      const resourceUserId = req[resourceField]?._id || req[resourceField];
      const currentUserId = req.user.id || req.user._id;

      if (req.user.role === 'admin') {
        return next();
      }

      if (resourceUserId.toString() !== currentUserId.toString()) {
        return sendError(res, 'You do not have permission to modify this resource.', 403);
      }

      next();
    } catch (error) {
      console.error('Ownership validation error:', error);
      return sendError(res, 'Error verifying document ownership.', 500);
    }
  };
};

// ==============================
// ✅ VERIFY EMAIL MIDDLEWARE
// ==============================
const verifyEmail = (req, res, next) => {
  if (req.user && req.user.isEmailVerified) {
    next();
  } else {
    return sendError(res, 'Please verify your email address.', 403);
  }
};

// ==============================
// ✅ RATE LIMIT BY USER MIDDLEWARE
// ==============================
const userRequestTracker = new Map();
const rateLimitByUser = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.id || req.user._id;
    const now = Date.now();
    const userKey = userId.toString();

    if (!userRequestTracker.has(userKey)) {
      userRequestTracker.set(userKey, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    const userRecord = userRequestTracker.get(userKey);

    if (now > userRecord.resetTime) {
      userRequestTracker.set(userKey, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    if (userRecord.count >= maxRequests) {
      return sendError(res, 'Too many requests. Please try again later.', 429);
    }

    userRecord.count++;
    next();
  };
};

// ==============================
// ✅ BULLETPROOF RESILIENT EXPORT
// ==============================
// Exporting the main function as default base level function, 
// while appending all secondary middleware functions directly to it.
const authModule = authenticate;

authModule.authenticate = authenticate;
authModule.protect = protect;
authModule.adminOnly = adminOnly;
authModule.optionalAuth = optionalAuth;
authModule.checkOwnership = checkOwnership;
authModule.verifyEmail = verifyEmail;
authModule.rateLimitByUser = rateLimitByUser;
authModule.default = authenticate;

module.exports = authModule;