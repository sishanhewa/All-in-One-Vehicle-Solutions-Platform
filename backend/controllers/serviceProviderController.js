const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const ServiceOffering = require('../models/ServiceOffering');
const Review = require('../models/Review');
const jwt = require('jsonwebtoken');

// Helper to generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'wmt-fallback-super-secret-key-2026', {
    expiresIn: '30d',
  });
};

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

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: 'GarageOwner',
    serviceProviderProfile: {
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
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      serviceProviderProfile: user.serviceProviderProfile,
      token: generateToken(user._id),
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

  // Build base filter
  const filter = {
    role: 'GarageOwner',
    'serviceProviderProfile.isVerified': true,
    'serviceProviderProfile.isActive': true,
  };

  // City filter
  if (city) {
    filter['serviceProviderProfile.city'] = { $regex: city, $options: 'i' };
  }

  // Search filter
  if (search) {
    filter.$or = [
      { 'serviceProviderProfile.garageName': { $regex: search, $options: 'i' } },
      { 'serviceProviderProfile.description': { $regex: search, $options: 'i' } },
      { 'serviceProviderProfile.serviceCategories': { $regex: search, $options: 'i' } },
    ];
  }

  // Category filter
  if (category) {
    filter['serviceProviderProfile.serviceCategories'] = { $in: [category] };
  }

  const pageNum = Number(page);
  const limitNum = Number(limit);

  // Fetch garages
  const garages = await User.find(filter)
    .select('-password')
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  // Count service offerings for each garage
  const garageIds = garages.map((g) => g._id);
  const offeringCounts = await ServiceOffering.aggregate([
    { $match: { garageId: { $in: garageIds }, isActive: true } },
    { $group: { _id: '$garageId', count: { $sum: 1 } } },
  ]);

  // Merge offering counts
  const offeringCountMap = {};
  offeringCounts.forEach((item) => {
    offeringCountMap[item._id.toString()] = item.count;
  });

  const garagesWithCounts = garages.map((garage) => ({
    ...garage.toObject(),
    offeringCount: offeringCountMap[garage._id.toString()] || 0,
  }));

  // Total count for pagination
  const total = await User.countDocuments(filter);

  res.status(200).json({
    garages: garagesWithCounts,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
  });
});

// @desc    Get single garage by ID with offerings and reviews
// @route   GET /api/service/garages/:id
// @access  Public
const getGarageById = asyncHandler(async (req, res) => {
  const garage = await User.findById(req.params.id).select('-password');

  if (!garage || garage.role !== 'GarageOwner') {
    res.status(404);
    throw new Error('Garage not found');
  }

  // Fetch active service offerings
  const offerings = await ServiceOffering.find({
    garageId: req.params.id,
    isActive: true,
  });

  // Fetch latest 10 reviews
  const reviews = await Review.find({ garageId: req.params.id })
    .populate('customerId', 'name')
    .sort({ createdAt: -1 })
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
  const user = await User.findById(req.user._id).select('-password');

  if (!user || user.role !== 'GarageOwner') {
    res.status(404);
    throw new Error('Garage owner profile not found');
  }

  res.status(200).json(user);
});

// @desc    Update own garage owner profile
// @route   PUT /api/service/garages/profile
// @access  Private (GarageOwner only)
const updateOwnerProfile = asyncHandler(async (req, res) => {
  const { garageName, description, address, city, operatingHours, website, phone, serviceCategories } = req.body;

  const updateFields = {};

  if (garageName) updateFields['serviceProviderProfile.garageName'] = garageName;
  if (description) updateFields['serviceProviderProfile.description'] = description;
  if (address) updateFields['serviceProviderProfile.address'] = address;
  if (city) updateFields['serviceProviderProfile.city'] = city;
  if (operatingHours) updateFields['serviceProviderProfile.operatingHours'] = operatingHours;
  if (website) updateFields['serviceProviderProfile.website'] = website;
  if (phone) updateFields['serviceProviderProfile.phone'] = phone;

  // Parse serviceCategories if string
  if (serviceCategories) {
    let parsedCategories = serviceCategories;
    if (typeof serviceCategories === 'string') {
      try {
        parsedCategories = JSON.parse(serviceCategories);
      } catch (e) {
        parsedCategories = [serviceCategories];
      }
    }
    updateFields['serviceProviderProfile.serviceCategories'] = parsedCategories;
  }

  // Handle logo upload
  if (req.file) {
    updateFields['serviceProviderProfile.logo'] = `/uploads/${req.file.filename}`;
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updateFields },
    { new: true }
  ).select('-password');

  if (!user) {
    res.status(404);
    throw new Error('Garage owner profile not found');
  }

  res.status(200).json(user);
});

module.exports = {
  registerGarage,
  getAllGarages,
  getGarageById,
  getOwnerProfile,
  updateOwnerProfile,
};
