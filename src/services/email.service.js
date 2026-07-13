const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
  }

  getTransporter() {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransporter({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    }
    return this.transporter;
  }

  async sendEmail({ to, subject, html, text }) {
    try {
      const transporter = this.getTransporter();
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        html,
        text
      };

      return await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Email sending error:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(user) {
    const subject = 'Welcome to our store!';
    const html = `
      <h1>Welcome ${user.name}!</h1>
      <p>Thank you for joining our store. We're excited to have you!</p>
    `;
    
    return await this.sendEmail({
      to: user.email,
      subject,
      html
    });
  }

  async sendOrderConfirmation(user, order) {
    const subject = `Order Confirmation - ${order.orderId}`;
    const html = `
      <h1>Order Confirmed!</h1>
      <p>Hi ${user.name},</p>
      <p>Your order ${order.orderId} has been confirmed.</p>
      <p>Total: $${order.total.toFixed(2)}</p>
      <p>We'll send you tracking information once your order ships.</p>
    `;
    
    return await this.sendEmail({
      to: user.email,
      subject,
      html
    });
  }

  async sendPasswordReset(user, resetToken) {
    const subject = 'Password Reset Request';
    const html = `
      <h1>Password Reset</h1>
      <p>Hi ${user.name},</p>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}">Reset Password</a>
      <p>If you didn't request this, please ignore this email.</p>
    `;
    
    return await this.sendEmail({
      to: user.email,
      subject,
      html
    });
  }
}

module.exports = new EmailService();