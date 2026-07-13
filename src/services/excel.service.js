const XLSX = require('xlsx');
const path = require('path');

class ExcelService {
  parseExcelFile(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      return data;
    } catch (error) {
      throw new Error('Failed to parse Excel file: ' + error.message);
    }
  }

  validateProductData(data) {
    const errors = [];
    const validProducts = [];

    data.forEach((row, index) => {
      const rowErrors = [];
      
      if (!row.name || row.name.trim() === '') {
        rowErrors.push('Product name is required');
      }
      
      if (!row.description || row.description.trim() === '') {
        rowErrors.push('Description is required');
      }
      
      if (!row.price || isNaN(row.price) || row.price <= 0) {
        rowErrors.push('Valid price is required');
      }
      
      if (!row.category || row.category.trim() === '') {
        rowErrors.push('Category is required');
      }
      
      if (!row.quantity || isNaN(row.quantity) || row.quantity < 0) {
        rowErrors.push('Valid quantity is required');
      }

      if (rowErrors.length > 0) {
        errors.push({
          row: index + 2, // +2 because Excel rows start from 1 and we skip header
          errors: rowErrors
        });
      } else {
        validProducts.push({
          name: row.name.trim(),
          description: row.description.trim(),
          price: parseFloat(row.price),
          category: row.category.trim(),
          quantity: parseInt(row.quantity),
          sku: row.sku || null,
          tags: row.tags ? row.tags.split(',').map(tag => tag.trim()) : []
        });
      }
    });

    return { errors, validProducts };
  }

  generateSampleExcel() {
    const sampleData = [
      {
        name: 'Sample Product 1',
        description: 'This is a sample product description',
        price: 29.99,
        category: 'Electronics',
        quantity: 100,
        sku: 'SP001',
        tags: 'electronics,gadget,sample'
      },
      {
        name: 'Sample Product 2',
        description: 'Another sample product description',
        price: 19.99,
        category: 'Clothing',
        quantity: 50,
        sku: 'SP002',
        tags: 'clothing,fashion,sample'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

    const fileName = `sample-products-${Date.now()}.xlsx`;
    const filePath = path.join(__dirname, '../uploads/excel', fileName);
    
    XLSX.writeFile(workbook, filePath);
    return fileName;
  }
}

module.exports = new ExcelService();