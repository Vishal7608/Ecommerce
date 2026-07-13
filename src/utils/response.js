// ==============================
// ✅ STANDARD RESPONSE HELPERS
// ==============================

/**
 * Send success response
 */
exports.sendSuccess = (res, message = 'Success', data = null, statusCode = 200) => {
  const response = {
    success: true,
    message
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send error response
 */
exports.sendError = (res, message = 'Error', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message
  };

  if (errors !== null) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send paginated response
 */
exports.sendPaginated = (res, data, pagination, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      currentPage: pagination.page || 1,
      totalPages: pagination.totalPages || 1,
      pageSize: pagination.limit || 10,
      totalItems: pagination.total || 0,
      hasNext: pagination.hasNext || false,
      hasPrev: pagination.hasPrev || false
    }
  });
};

/**
 * Send created response
 */
exports.sendCreated = (res, message = 'Created successfully', data = null) => {
  return exports.sendSuccess(res, message, data, 201);
};

/**
 * Send no content response
 */
exports.sendNoContent = (res) => {
  return res.status(204).send();
};