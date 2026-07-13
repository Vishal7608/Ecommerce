// src/middleware/errorHandler.js

const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Real error log in Terminal
  console.error(`❌ [ERROR HANDLER ${statusCode}]:`, err.message);

  res.status(statusCode).json({
    success: false,
    // Exact error show hoga taaki "Internal server error" na aaye!
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};

module.exports = { notFound, errorHandler };