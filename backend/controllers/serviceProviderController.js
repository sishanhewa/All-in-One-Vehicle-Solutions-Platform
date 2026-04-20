const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const User = require('../models/User');
const ServiceProvider = require('../models/ServiceProvider');
const ServiceOffering = require('../models/ServiceOffering');
const Review = require('../models/Review');
const jwt = require('jsonwebtoken');

// Helper to generate JWT Token
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required for garage registration');
  }

  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Register a new Garage Owner account
// @route   POST /api/service/garages/register
// @access  Public
const registerGarage = asyncHandler(async (req, res) => {
  const { name, email, password, phone, garageName, city, description, address, operatingHours, website } = req.body;

  if (!name || !email || !password || !phone || !garageName || !city) {
    res.status(400);
    throw new Error('Please provide: name, email, password, phone, garageName, and city');
  }

  // Check if account already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists with this email');
  }

  // Handle logo upload
  const logo = req.file ? `/uploads/${req.file.filename}` : '';

  const session = await mongoose.startSession();
  let user;
  let serviceProvider;

  try {
    await session.withTransaction(async () => {
      [user] = await User.create([
        {
          name,
          email,
          password,
          phone,
          role: 'GarageOwner',
        },
      ], { session });

      [serviceProvider] = await ServiceProvider.create([
        {
          ownerId: user._id,
          garageName,
          description: description || '',
          address: address || '',
          city,
          logo,
          operatingHours: operatingHours || 'Mon-Sat 8:00 AM - 6:00 PM',
          website: website || '',
          phone,
          rating: 0,
          totalReviews: 0,
          isVerified: false,
          isActive: true,
        },
      ], { session });

      await User.findByIdAndUpdate(
        user._id,
        { $set: { garageId: serviceProvider._id } },
        { session }
      );
    });
  } catch (error) {
    if (error && error.code === 11000) {
      res.status(400);
      throw new Error('User already exists with this email');
    }

    throw error;
  } finally {
    await session.endSession();
  }

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      token: generateToken(user._id),
      serviceProvider: serviceProvider.toObject(),
    });
  } else {
    res.status(400);
    throw new Error('Invalid garage details. Registration failed.');
  }
});

// @desc    Get all verified, active garages (public browsing)
// @route   GET /api/service/garages
// @access  Public
const getAllGarages = asyncHandler(async (req, res) => {
  const { city, search, category, page = 1, limit = 20 } = req.query;

  // Category filtering not implemented yet
  if (category) {
    res.status(400);
    throw new Error('category filtering is not yet implemented');
  }

  // Build base filter: only verified, active garages
  const filter = {
    isVerified: true,
    isActive: true,
  };

  // Optional city filter
  if (city) {
    filter.city = { $regex: escapeRegex(city), $options: 'i' };
  }

  // Optional search filter: garageName or description
  if (search) {
    const escapedSearch = escapeRegex(search);
    filter.$or = [
      { garageName: { $regex: escapedSearch, $options: 'i' } },
      { description: { $regex: escapedSearch, $options: 'i' } },
    ];
  }

  const pageNum = Number(page);
  const limitNum = Number(limit);

  // Fetch ServiceProviders with pagination
  const serviceProviders = await ServiceProvider.find(filter)
    .populate('ownerId', 'name email phone')
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  // Count active service offerings for each garage
  const garagesWithOfferings = [];
  for (const sp of serviceProviders) {
    const offeringCount = await ServiceOffering.countDocuments({
      garageId: sp._id,
      isActive: true,
    });

    garagesWithOfferings.push({
      ...sp.toObject(),
      offeringCount,
    });
  }

  // Total count for pagination
  const total = await ServiceProvider.countDocuments(filter);
  const pages = Math.ceil(total / limitNum);

  res.status(200).json({
    garages: garagesWithOfferings,
    total,
    page: pageNum,
    pages,
  });
});

// @desc    Get single garage by ID with offerings and reviews
// @route   GET /api/service/garages/:id
// @access  Public
// @desc    Get garage by ID (public garage details page)
// @route   GET /api/service/garages/:id
// @access  Public
const getGarageById = asyncHandler(async (req, res) => {
  // Find and populate ServiceProvider
  const garage = await ServiceProvider.findById(req.params.id).populate('ownerId', 'name email phone');

  if (!garage) {
    res.status(404);
    throw new Error('Garage not found');
  }

  // Find active service offerings for this garage
  const offerings = await ServiceOffering.find({
    garageId: garage._id,
    isActive: true,
  });

  // Find latest 10 reviews for this garage
  const reviews = await Review.find({ garageId: garage._id })
    .populate('customerId', 'name')
    .sort('-createdAt')
    .limit(10);

  res.status(200).json({
    garage: garage.toObject(),
    offerings,
    reviews,
  });
});

// @desc    Get own garage owner profile
// @route   GET /api/service/garages/profile
// @access  Private (GarageOwner only)
const getOwnerProfile = asyncHandler(async (req, res) => {
  const serviceProvider = await ServiceProvider.findOne({ ownerId: req.user._id }).populate('ownerId', 'name email phone role');

  if (!serviceProvider) {
    res.status(404);
    throw new Error('Garage owner profile not found');
  }

  res.status(200).json(serviceProvider.toObject());
});

// @desc    Update own garage owner profile
// @route   PUT /api/service/garages/profile
// @access  Private (GarageOwner only)
const updateOwnerProfile = asyncHandler(async (req, res) => {
  const body = req.body != null && typeof req.body === 'object' ? req.body : {};
  const { garageName, description, address, city, operatingHours, website, phone, serviceCategories } = body;

  const updateFields = {};

  if (garageName) updateFields.garageName = garageName;
  if (description) updateFields.description = description;
  if (address) updateFields.address = address;
  if (city) updateFields.city = city;
  if (operatingHours) updateFields.operatingHours = operatingHours;
  if (website) updateFields.website = website;
  if (phone) updateFields.phone = phone;

  // Backwards-compatible no-op for legacy forms that still submit this field.
  void serviceCategories;

  // Handle logo upload
  if (req.file) {
    updateFields.logo = `/uploads/${req.file.filename}`;
  }

  if (Object.keys(updateFields).length === 0) {
    const serviceProvider = await ServiceProvider.findOne({ ownerId: req.user._id }).populate('ownerId', 'name email phone role');
    if (!serviceProvider) {
      res.status(404);
      throw new Error('Garage owner profile not found');
    }
    return res.status(200).json(serviceProvider.toObject());
  }

  const serviceProvider = await ServiceProvider.findOneAndUpdate(
    { ownerId: req.user._id },
    { $set: updateFields },
    { new: true }
  ).populate('ownerId', 'name email phone role');

  if (!serviceProvider) {
    res.status(404);
    throw new Error('Garage owner profile not found');
  }

  res.status(200).json(serviceProvider.toObject());
});

// @desc    Get owner's garage details
// @route   GET /api/service/garages/me
// @access  Private (GarageOwner)
const getOwnerGarage = asyncHandler(async (req, res) => {
  const garage = await ServiceProvider.findOne({ ownerId: req.user._id }).populate('ownerId', 'name email phone');

  if (!garage) {
    res.status(404);
    throw new Error('Garage not found');
  }

  res.status(200).json(garage.toObject());
});

// @desc    Update owner's garage details
// @route   PUT /api/service/garages/me
// @access  Private (GarageOwner)
const updateOwnerGarage = asyncHandler(async (req, res) => {
  const body = req.body != null && typeof req.body === 'object' ? req.body : {};
  const { garageName, description, address, city, operatingHours, website, phone } = body;

  // Build update object with whitelisted fields only
  const updateFields = {};
  if (garageName) updateFields.garageName = garageName;
  if (description) updateFields.description = description;
  if (address) updateFields.address = address;
  if (city) updateFields.city = city;
  if (operatingHours) updateFields.operatingHours = operatingHours;
  if (website) updateFields.website = website;
  if (phone) updateFields.phone = phone;

  // Handle logo upload
  if (req.file) {
    updateFields.logo = `/uploads/${req.file.filename}`;
  }

  if (Object.keys(updateFields).length === 0) {
    const garage = await ServiceProvider.findOne({ ownerId: req.user._id }).populate('ownerId', 'name email phone');
    if (!garage) {
      res.status(404);
      throw new Error('Garage not found');
    }
    return res.status(200).json(garage.toObject());
  }

  const garage = await ServiceProvider.findOneAndUpdate(
    { ownerId: req.user._id },
    { $set: updateFields },
    { new: true }
  ).populate('ownerId', 'name email phone');

  if (!garage) {
    res.status(404);
    throw new Error('Garage not found');
  }

  res.status(200).json(garage.toObject());
});

module.exports = {
  registerGarage,
  getAllGarages,
  getGarageById,
  getOwnerProfile,
  updateOwnerProfile,
  getOwnerGarage,
  updateOwnerGarage,
};
