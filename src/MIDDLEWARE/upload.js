const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ==============================
// Upload Directory
// ==============================
const uploadDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ==============================
// Multer Storage
// ==============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path
      .basename(file.originalname, ext)
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9-_]/g, '');

    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${baseName}${ext}`;

    cb(null, uniqueName);
  }
});

// ==============================
// File Filter
// ==============================
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',

    // Excel
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

    // CSV
    'text/csv'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}`), false);
  }
};

// ==============================
// Multer Instance
// ==============================
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// ==============================
// Safe Upload Middleware
// ==============================
// Usage:
// handleUpload('productImages', 5)
// handleUpload('excelFile', 1)
const handleUpload = (fieldName, maxCount = 1) => {
  return (req, res, next) => {
    const contentType = req.headers['content-type'] || '';

    // ✅ If request is JSON, skip multer completely
    // Your frontend is sending JSON, not multipart/form-data
    if (!contentType.includes('multipart/form-data')) {
      req.files = [];
      req.file = null;
      return next();
    }

    const uploader = upload.array(fieldName, maxCount);

    uploader(req, res, (err) => {
      if (err) {
        console.error('❌ Upload middleware error:', err);

        // ✅ Do NOT use: err instanceof multer.MulterError
        // That caused your crash.
        if (err.code && String(err.code).startsWith('LIMIT_')) {
          return res.status(400).json({
            success: false,
            message: err.message || 'File upload limit error'
          });
        }

        return res.status(400).json({
          success: false,
          message: err.message || 'File upload failed'
        });
      }

      // Compatibility: if only one file uploaded, also expose req.file
      if (Array.isArray(req.files) && req.files.length === 1) {
        req.file = req.files[0];
      }

      return next();
    });
  };
};

// ✅ Supports both:
// const handleUpload = require('../../middleware/upload')
// const { handleUpload } = require('../../middleware/upload')
module.exports = handleUpload;
module.exports.handleUpload = handleUpload;
module.exports.upload = upload;