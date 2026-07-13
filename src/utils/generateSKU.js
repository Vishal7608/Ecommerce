const generateSKU = (productName, category) => {
  const timestamp = Date.now().toString().slice(-6);
  const nameCode = productName.substring(0, 3).toUpperCase();
  const categoryCode = category.substring(0, 2).toUpperCase();
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  
  return `${categoryCode}${nameCode}${timestamp}${random}`;
};

module.exports = generateSKU;