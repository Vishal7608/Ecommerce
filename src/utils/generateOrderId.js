const { v4: uuidv4 } = require('uuid');

const generateOrderId = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD${timestamp.slice(-8)}${random}`;
};

const generateTrackingNumber = () => {
  const uuid = uuidv4().replace(/-/g, '').toUpperCase();
  return `TRK${uuid.substring(0, 12)}`;
};

module.exports = {
  generateOrderId,
  generateTrackingNumber
};