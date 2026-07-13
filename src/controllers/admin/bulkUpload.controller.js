const Product = require('../../models/Product');
const Category = require('../../models/Category');
const ExcelService = require('../../services/excel.service');
const generateSKU = require('../../utils/generateSKU');
const { sendSuccess, sendError } = require('../../utils/response');
const fs = require('fs');

const uploadProducts = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'Please upload an Excel file', 400);
    }

    // Parse Excel file
    const data = ExcelService.parseExcelFile(req.file.path);
    
    if (data.length === 0) {
      return sendError(res, 'Excel file is empty', 400);
    }

    // Validate data
    const { errors, validProducts } = ExcelService.validateProductData(data);

    if (errors.length > 0) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      return sendError(res, 'Validation errors found', 400, { errors });
    }

    // Get all categories for mapping
    const categories = await Category.find({ isActive: true });
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name.toLowerCase()] = cat._id;
    });

    const successProducts = [];
    const failedProducts = [];

    for (let i = 0; i < validProducts.length; i++) {
      const productData = validProducts[i];
      
      try {
        // Find category
        const categoryId = categoryMap[productData.category.toLowerCase()];
        if (!categoryId) {
          failedProducts.push({
            row: i + 2,
            name: productData.name,
            error: `Category '${productData.category}' not found`
          });
          continue;
        }

        // Generate SKU if not provided
        const sku = productData.sku || generateSKU(productData.name, productData.category);

        // Check if product with same SKU exists
        const existingProduct = await Product.findOne({ sku });
        if (existingProduct) {
          failedProducts.push({
            row: i + 2,
            name: productData.name,
            error: `Product with SKU '${sku}' already exists`
          });
          continue;
        }

        // Create product
        const product = new Product({
          name: productData.name,
          description: productData.description,
          sku,
          price: productData.price,
          category: categoryId,
          inventory: {
            quantity: productData.quantity,
            lowStockThreshold: 10
          },
          tags: productData.tags || [],
          isActive: true
        });

        await product.save();
        successProducts.push(product.name);
        
      } catch (error) {
        failedProducts.push({
          row: i + 2,
          name: productData.name,
          error: error.message
        });
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    sendSuccess(res, 'Bulk upload completed', {
      totalProcessed: validProducts.length,
      successful: successProducts.length,
      failed: failedProducts.length,
      successProducts,
      failedProducts
    });

  } catch (error) {
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    sendError(res, error.message, 500);
  }
};

const downloadSample = async (req, res) => {
  try {
    const fileName = ExcelService.generateSampleExcel();
    const filePath = require('path').join(__dirname, '../../uploads/excel', fileName);
    
    res.download(filePath, 'sample-products.xlsx', (err) => {
      if (err) {
        sendError(res, 'Error downloading file', 500);
      }
      // Clean up file after download
      fs.unlinkSync(filePath);
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const getUploadHistory = async (req, res) => {
  try {
    // This would typically come from a separate uploads tracking collection
    // For now, returning mock data
    const uploadHistory = [
      {
        id: 1,
        fileName: 'products_batch_1.xlsx',
        uploadDate: new Date(),
        status: 'completed',
        totalProducts: 150,
        successCount: 145,
        failureCount: 5,
        uploadedBy: req.user.name
      }
    ];

    sendSuccess(res, 'Upload history fetched successfully', uploadHistory);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

module.exports = {
  uploadProducts,
  downloadSample,
  getUploadHistory
};