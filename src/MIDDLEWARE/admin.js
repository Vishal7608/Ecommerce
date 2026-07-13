const { sendError } = require('../utils/response');

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return sendError(res, 'Admin access required', 403);
  }
};

module.exports = adminOnly;