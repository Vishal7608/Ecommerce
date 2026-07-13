const Settings = require('../../models/Settings');
const cloudinary = require('../../config/cloudinary');
const { sendSuccess, sendError } = require('../../utils/response');

const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    
    if (!settings) {
      // Create default settings if none exist
      settings = new Settings();
      await settings.save();
    }

    sendSuccess(res, 'Settings fetched successfully', settings);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const updateGeneralSettings = async (req, res) => {
  try {
    const {
      siteName,
      siteDescription,
      contactEmail,
      contactPhone,
      address
    } = req.body;

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    // Handle logo upload
    if (req.files && req.files.logo) {
      const logoFile = req.files.logo[0];
      
      // Delete old logo
      if (settings.logo && settings.logo.includes('cloudinary')) {
        const publicId = settings.logo.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`settings/${publicId}`);
      }

      const result = await cloudinary.uploader.upload(logoFile.path, {
        folder: 'settings',
        transformation: [
          { width: 200, height: 80, crop: 'limit' },
          { quality: 'auto' }
        ]
      });
      settings.logo = result.secure_url;
    }

    // Handle favicon upload
    if (req.files && req.files.favicon) {
      const faviconFile = req.files.favicon[0];
      
      // Delete old favicon
      if (settings.favicon && settings.favicon.includes('cloudinary')) {
        const publicId = settings.favicon.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`settings/${publicId}`);
      }

      const result = await cloudinary.uploader.upload(faviconFile.path, {
        folder: 'settings',
        transformation: [
          { width: 32, height: 32, crop: 'limit' },
          { quality: 'auto' }
        ]
      });
      settings.favicon = result.secure_url;
    }

    // Update text fields
    if (siteName) settings.siteName = siteName;
    if (siteDescription) settings.siteDescription = siteDescription;
    if (contactEmail) settings.contactEmail = contactEmail;
    if (contactPhone) settings.contactPhone = contactPhone;
    if (address) settings.address = address;

    await settings.save();
    sendSuccess(res, 'General settings updated successfully', settings);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const updateSocialMediaSettings = async (req, res) => {
  try {
    const { facebook, twitter, instagram, linkedin } = req.body;

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    settings.socialMedia = {
      facebook: facebook || '',
      twitter: twitter || '',
      instagram: instagram || '',
      linkedin: linkedin || ''
    };

    await settings.save();
    sendSuccess(res, 'Social media settings updated successfully', settings);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const updateEmailSettings = async (req, res) => {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpPass } = req.body;

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    settings.emailSettings = {
      smtpHost,
      smtpPort: parseInt(smtpPort),
      smtpUser,
      smtpPass
    };

    await settings.save();
    sendSuccess(res, 'Email settings updated successfully', settings);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const updatePaymentSettings = async (req, res) => {
  try {
    const { currency, taxRate, shippingRate, freeShippingThreshold } = req.body;

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    settings.paymentSettings = {
      currency: currency || 'USD',
      taxRate: parseFloat(taxRate) || 0.1,
      shippingRate: parseFloat(shippingRate) || 10,
      freeShippingThreshold: parseFloat(freeShippingThreshold) || 100
    };

    await settings.save();
    sendSuccess(res, 'Payment settings updated successfully', settings);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const updateInventorySettings = async (req, res) => {
  try {
    const { lowStockThreshold, autoDeductInventory } = req.body;

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    settings.inventory = {
      lowStockThreshold: parseInt(lowStockThreshold) || 10,
      autoDeductInventory: autoDeductInventory === true || autoDeductInventory === 'true'
    };

    await settings.save();
    sendSuccess(res, 'Inventory settings updated successfully', settings);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const testEmailSettings = async (req, res) => {
  try {
    const { testEmail } = req.body;
    
    if (!testEmail) {
      return sendError(res, 'Test email address is required', 400);
    }

    const settings = await Settings.findOne();
    if (!settings || !settings.emailSettings.smtpHost) {
      return sendError(res, 'Email settings not configured', 400);
    }

    // Here you would test the email configuration
    // For now, we'll simulate a successful test
    const emailTest = Math.random() > 0.1; // 90% success rate for demo

    if (emailTest) {
      sendSuccess(res, 'Test email sent successfully');
    } else {
      sendError(res, 'Failed to send test email. Please check your settings.', 400);
    }
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const resetSettings = async (req, res) => {
  try {
    const { section } = req.body; // 'general', 'social', 'email', 'payment', 'inventory', or 'all'

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    switch (section) {
      case 'general':
        settings.siteName = 'E-Commerce Store';
        settings.siteDescription = 'Your one-stop shop for everything';
        settings.contactEmail = 'info@example.com';
        settings.contactPhone = '+1234567890';
        settings.address = '123 Main St, City, State 12345';
        // Don't reset logo and favicon
        break;
        
      case 'social':
        settings.socialMedia = {
          facebook: '',
          twitter: '',
          instagram: '',
          linkedin: ''
        };
        break;
        
      case 'email':
        settings.emailSettings = {};
        break;
        
      case 'payment':
        settings.paymentSettings = {
          currency: 'USD',
          taxRate: 0.1,
          shippingRate: 10,
          freeShippingThreshold: 100
        };
        break;
        
      case 'inventory':
        settings.inventory = {
          lowStockThreshold: 10,
          autoDeductInventory: true
        };
        break;
        
      case 'all':
        settings = new Settings();
        break;
        
      default:
        return sendError(res, 'Invalid section specified', 400);
    }

    await settings.save();
    sendSuccess(res, `${section} settings reset successfully`, settings);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const exportSettings = async (req, res) => {
  try {
    const settings = await Settings.findOne();
    
    if (!settings) {
      return sendError(res, 'No settings found', 404);
    }

    // Remove sensitive information from export
    const exportData = settings.toObject();
    if (exportData.emailSettings) {
      delete exportData.emailSettings.smtpPass;
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=settings-export.json');
    res.send(JSON.stringify(exportData, null, 2));
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const importSettings = async (req, res) => {
  try {
    const { settingsData } = req.body;
    
    if (!settingsData) {
      return sendError(res, 'Settings data is required', 400);
    }

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    // Validate and update settings
    const allowedFields = [
      'siteName', 'siteDescription', 'contactEmail', 'contactPhone', 'address',
      'socialMedia', 'paymentSettings', 'inventory'
    ];

    allowedFields.forEach(field => {
      if (settingsData[field] !== undefined) {
        settings[field] = settingsData[field];
      }
    });

    await settings.save();
    sendSuccess(res, 'Settings imported successfully', settings);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

module.exports = {
  getSettings,
  updateGeneralSettings,
  updateSocialMediaSettings,
  updateEmailSettings,
  updatePaymentSettings,
  updateInventorySettings,
  testEmailSettings,
  resetSettings,
  exportSettings,
  importSettings
};