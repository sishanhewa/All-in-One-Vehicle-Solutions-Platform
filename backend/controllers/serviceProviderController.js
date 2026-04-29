const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const User = require('../models/User');
const ServiceProvider = require('../models/ServiceProvider');
const ServiceOffering = require('../models/ServiceOffering');
const Review = require('../models/Review');
const jwt = require('jsonwebtoken');

// Helper: normalize phone number to international format (+94 for Sri Lanka)
const normalizePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return phone;
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('0')) {
    digits = '94' + digits.substring(1);
  }
  if (digits.length === 11 && digits.startsWith('94')) {
    return '+' + digits;
  }
  if (phone.trim().startsWith('+')) {
    return '+' + digits;
  }
  return phone.trim();
};

// Helper: sanitize and validate string length
const sanitizeString = (str, maxLength = 500, fieldName = 'Field') => {
  if (!str || typeof str !== 'string') return str;
  const trimmed = str.trim();
  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} exceeds maximum length of ${maxLength} characters`);
  }
  return trimmed;
};

// Helper: validate city against predefined list (Sri Lankan major cities)
const VALID_CITIES = [
  'Colombo', 'Kandy', 'Galle', 'Negombo', 'Jaffna', 'Anuradhapura', 'Trincomalee',
  'Batticaloa', 'Matara', 'Kurunegala', 'Ratnapura', 'Badulla', 'Polonnaruwa',
  'Hambantota', 'Kalutara', 'Gampaha', 'Matale', 'Nuwara Eliya', 'Ampara',
  'Monaragala', 'Kegalle', 'Puttalam', 'Vavuniya', 'Mannar', 'Kilinochchi',
  'Mullaitivu', 'Chilaw', 'Katunayake', 'Maharagama', 'Moratuwa', 'Panadura',
  'Beruwala', 'Bentota', 'Weligama', 'Hikkaduwa', 'Tangalle', 'Kataragama',
];

const validateCity = (city) => {
  if (!city || typeof city !== 'string') return false;
  const trimmed = city.trim();
  // Case-insensitive comparison
  return VALID_CITIES.some(validCity => validCity.toLowerCase() === trimmed.toLowerCase());
};

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

  // Validate city against predefined list
  if (!validateCity(city)) {
    res.status(400);
    throw new Error(`Invalid city. Please select from: ${VALID_CITIES.slice(0, 10).join(', ')}...`);
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
      const normalizedPhone = normalizePhone(phone);
      [user] = await User.create([
        {
          name: sanitizeString(name, 100, 'Name'),
          email: sanitizeString(email, 100, 'Email').toLowerCase(),
          password,
          phone: normalizedPhone,
          role: 'GarageOwner',
        },
      ], { session });

      [serviceProvider] = await ServiceProvider.create([
        {
          ownerId: user._id,
          garageName: sanitizeString(garageName, 100, 'Garage name'),
          description: description ? sanitizeString(description, 1000, 'Description') : '',
          address: address ? sanitizeString(address, 200, 'Address') : '',
          city: sanitizeString(city, 50, 'City'),
          logo,
          operatingHours: operatingHours ? sanitizeString(operatingHours, 50, 'Operating hours') : 'Mon-Sat 8:00 AM - 6:00 PM',
          website: website ? sanitizeString(website, 200, 'Website') : '',
          phone: normalizedPhone,
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
      _id:      user._id,
      name:     user.name,
      email:    user.email,
      phone:    user.phone,
      role:     user.role,
      garageId: serviceProvider._id,   // ← critical: lets AuthContext store garageId
      token:    generateToken(user._id),
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

  // Build base filter: only verified, active garages
  const filter = { isVerified: true, isActive: true };

  if (city) {
    filter.city = { $regex: escapeRegex(city), $options: 'i' };
  }

  if (search) {
    const escapedSearch = escapeRegex(search);
    filter.$or = [
      { garageName: { $regex: escapedSearch, $options: 'i' } },
      { description: { $regex: escapedSearch, $options: 'i' } },
    ];
  }

  // Category filter: find garageIds that have an active offering in this category
  if (category) {
    const matchingOfferings = await ServiceOffering.distinct('garageId', {
      category,
      isActive: true,
    });
    filter._id = { $in: matchingOfferings };
  }

  const pageNum  = Number(page);
  const limitNum = Number(limit);

  // Use aggregation to count active offerings per garage in a single query (no N+1)
  const pipeline = [
    { $match: filter },
    {
      $lookup: {
        from: 'serviceofferings',
        let: { gid: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [
            { $eq: ['$garageId', '$$gid'] },
            { $eq: ['$isActive', true] },
          ]}}},
          { $count: 'n' },
        ],
        as: '_offeringCountArr',
      },
    },
    {
      $addFields: {
        offeringCount: { $ifNull: [{ $arrayElemAt: ['$_offeringCountArr.n', 0] }, 0] },
      },
    },
    { $project: { _offeringCountArr: 0 } },
    { $sort: { rating: -1, createdAt: -1 } },
    { $skip: (pageNum - 1) * limitNum },
    { $limit: limitNum },
  ];

  const garages = await ServiceProvider.aggregate(pipeline);
  const total   = await ServiceProvider.countDocuments(filter);
  const pages   = Math.ceil(total / limitNum);

  res.status(200).json({
    garages,
    total,
    page: pageNum,
    pages,
  });
});



// @desc    Get single garage by ID with offerings and reviews
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

  // Validate city if provided
  if (city && !validateCity(city)) {
    res.status(400);
    throw new Error(`Invalid city. Please select from: ${VALID_CITIES.slice(0, 10).join(', ')}...`);
  }

  // Build update object with whitelisted fields only
  const updateFields = {};
  if (garageName) updateFields.garageName = sanitizeString(garageName, 100, 'Garage name');
  if (description) updateFields.description = sanitizeString(description, 1000, 'Description');
  if (address) updateFields.address = sanitizeString(address, 200, 'Address');
  if (city) updateFields.city = sanitizeString(city, 50, 'City');
  if (operatingHours) updateFields.operatingHours = sanitizeString(operatingHours, 50, 'Operating hours');
  if (website) updateFields.website = sanitizeString(website, 200, 'Website');
  if (phone) updateFields.phone = normalizePhone(phone);

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
  getOwnerGarage,
  updateOwnerGarage,
};
