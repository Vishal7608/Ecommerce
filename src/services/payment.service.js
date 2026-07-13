// Mock payment service - Replace with actual payment gateway integration
class PaymentService {
  async processPayment(paymentData) {
    // Mock payment processing
    const { amount, paymentMethod, cardDetails } = paymentData;
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock success/failure based on amount (for demo purposes)
    const success = Math.random() > 0.1; // 90% success rate
    
    if (success) {
      return {
        success: true,
        transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount,
        paymentMethod,
        status: 'completed'
      };
    } else {
      throw new Error('Payment failed. Please try again.');
    }
  }

  async refundPayment(transactionId, amount) {
    // Mock refund processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      refundId: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transactionId,
      amount,
      status: 'refunded'
    };
  }

  async validateCard(cardDetails) {
    const { cardNumber, expiryMonth, expiryYear, cvv } = cardDetails;
    
    // Basic validation
    if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
      throw new Error('Invalid card number');
    }
    
    if (!expiryMonth || expiryMonth < 1 || expiryMonth > 12) {
      throw new Error('Invalid expiry month');
    }
    
    if (!expiryYear || expiryYear < new Date().getFullYear()) {
      throw new Error('Card has expired');
    }
    
    if (!cvv || cvv.length < 3 || cvv.length > 4) {
      throw new Error('Invalid CVV');
    }
    
    return true;
  }
}

module.exports = new PaymentService();