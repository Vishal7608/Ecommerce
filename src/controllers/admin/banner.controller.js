const Banner = require('../../models/Banner');
const HeroBanner = require('../../models/HeroBanner');
const cloudinary = require('../../config/cloudinary');
const { sendSuccess, sendError } = require('../../utils/response');

// Regular Banners
const getAllBanners = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      position,
      status,
      sortBy = 'sortOrder',
      sortOrder = 'asc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const filter = {};
    if (position) filter.position = position;
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const banners = await Banner.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Banner.countDocuments(filter);

    sendSuccess(res, 'Banners fetched successfully', {
      banners,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const getBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      return sendError(res, 'Banner not found', 404);
    }

    sendSuccess(res, 'Banner fetched successfully', banner);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const createBanner = async (req, res) => {
  try {
    const { title, subtitle, link, position, sortOrder, validFrom, validTo } = req.body;

    if (!req.file) {
      return sendError(res, 'Banner image is required', 400);
    }

    // Upload image to cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'banners',
      transformation: [
        { width: 1200, height: 400, crop: 'limit' },
        { quality: 'auto' }
      ]
    });

    const banner = new Banner({
      title,
      subtitle,
      image: result.secure_url,
      link: link || '#',
      position: position || 'main',
      sortOrder: sortOrder || 0,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validTo: validTo ? new Date(validTo) : null
    });

    await banner.save();
    sendSuccess(res, 'Banner created successfully', banner, 201);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const updateBanner = async (req, res) => {
  try {
    const { title, subtitle, link, position, sortOrder, validFrom, validTo, isActive } = req.body;
    const bannerId = req.params.id;

    const banner = await Banner.findById(bannerId);
    if (!banner) {
      return sendError(res, 'Banner not found', 404);
    }

    // Handle image upload
    if (req.file) {
      // Delete old image
      if (banner.image.includes('cloudinary')) {
        const publicId = banner.image.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`banners/${publicId}`);
      }

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'banners',
        transformation: [
          { width: 1200, height: 400, crop: 'limit' },
          { quality: 'auto' }
        ]
      });
      banner.image = result.secure_url;
    }

    // Update fields
    if (title) banner.title = title;
    if (subtitle !== undefined) banner.subtitle = subtitle;
    if (link) banner.link = link;
    if (position) banner.position = position;
    if (sortOrder !== undefined) banner.sortOrder = sortOrder;
    if (validFrom) banner.validFrom = new Date(validFrom);
    if (validTo !== undefined) banner.validTo = validTo ? new Date(validTo) : null;
    if (isActive !== undefined) banner.isActive = isActive;

    await banner.save();
    sendSuccess(res, 'Banner updated successfully', banner);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return sendError(res, 'Banner not found', 404);
    }

    // Delete image from cloudinary
    if (banner.image.includes('cloudinary')) {
      const publicId = banner.image.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`banners/${publicId}`);
    }

    await Banner.findByIdAndDelete(req.params.id);
    sendSuccess(res, 'Banner deleted successfully');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Hero Banners
const getAllHeroBanners = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'sortOrder',
      sortOrder = 'asc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const filter = {};
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const heroBanners = await HeroBanner.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await HeroBanner.countDocuments(filter);

    sendSuccess(res, 'Hero banners fetched successfully', {
      banners: heroBanners,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const getHeroBanner = async (req, res) => {
  try {
    const banner = await HeroBanner.findById(req.params.id);

    if (!banner) {
      return sendError(res, 'Hero banner not found', 404);
    }

    sendSuccess(res, 'Hero banner fetched successfully', banner);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const createHeroBanner = async (req, res) => {
  try {
    const { title, subtitle, description, buttonText, buttonLink, sortOrder } = req.body;

    if (!req.file) {
      return sendError(res, 'Banner image is required', 400);
    }

    // Upload image to cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'hero-banners',
      transformation: [
        { width: 1920, height: 800, crop: 'limit' },
        { quality: 'auto' }
      ]
    });

    const heroBanner = new HeroBanner({
      title,
      subtitle,
      description,
      buttonText: buttonText || 'Shop Now',
      buttonLink: buttonLink || '/shop',
      image: result.secure_url,
      sortOrder: sortOrder || 0
    });

    await heroBanner.save();
    sendSuccess(res, 'Hero banner created successfully', heroBanner, 201);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const updateHeroBanner = async (req, res) => {
  try {
    const { title, subtitle, description, buttonText, buttonLink, sortOrder, isActive } = req.body;
    const bannerId = req.params.id;

    const banner = await HeroBanner.findById(bannerId);
    if (!banner) {
      return sendError(res, 'Hero banner not found', 404);
    }

    // Handle image upload
    if (req.file) {
      // Delete old image
      if (banner.image.includes('cloudinary')) {
        const publicId = banner.image.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`hero-banners/${publicId}`);
      }

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'hero-banners',
        transformation: [
          { width: 1920, height: 800, crop: 'limit' },
          { quality: 'auto' }
        ]
      });
      banner.image = result.secure_url;
    }

    // Update fields
    if (title) banner.title = title;
    if (subtitle !== undefined) banner.subtitle = subtitle;
    if (description !== undefined) banner.description = description;
    if (buttonText) banner.buttonText = buttonText;
    if (buttonLink) banner.buttonLink = buttonLink;
    if (sortOrder !== undefined) banner.sortOrder = sortOrder;
    if (isActive !== undefined) banner.isActive = isActive;

    await banner.save();
    sendSuccess(res, 'Hero banner updated successfully', banner);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const deleteHeroBanner = async (req, res) => {
  try {
    const banner = await HeroBanner.findById(req.params.id);
    if (!banner) {
      return sendError(res, 'Hero banner not found', 404);
    }

    // Delete image from cloudinary
    if (banner.image.includes('cloudinary')) {
      const publicId = banner.image.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`hero-banners/${publicId}`);
    }

    await HeroBanner.findByIdAndDelete(req.params.id);
    sendSuccess(res, 'Hero banner deleted successfully');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const updateBannerOrder = async (req, res) => {
  try {
    const { banners, type } = req.body; // type: 'banner' or 'hero'
    const Model = type === 'hero' ? HeroBanner : Banner;

    const updatePromises = banners.map(({ id, sortOrder }) =>
      Model.findByIdAndUpdate(id, { sortOrder })
    );

    await Promise.all(updatePromises);
    sendSuccess(res, 'Banner order updated successfully');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

module.exports = {
  getAllBanners,
  getBanner,
  createBanner,
  updateBanner,
  deleteBanner,
  getAllHeroBanners,
  getHeroBanner,
  createHeroBanner,
  updateHeroBanner,
  deleteHeroBanner,
  updateBannerOrder
};