const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const InspectionPackage = require('../models/InspectionPackage');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Helper to generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'wmt-fallback-super-secret-key-2026', {
    expiresIn: '30d',
  });
};

// @desc    Register a new Inspection Company account
// @route   POST /api/inspection/companies/register
// @access  Public
const registerCompany = asyncHandler(async (req, res) => {
  const { name, email, password, phone, companyName, description, address, city, operatingHours, website } = req.body;

  if (!name || !email || !password || !phone || !companyName || !city) {
    res.status(400);
    throw new Error('Please provide: name, email, password, phone, companyName, and city');
  }

  // Check if account already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('An account already exists with this email');
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: 'InspectionCompany',
    companyProfile: {
      companyName,
      description: description || '',
      address: address || '',
      city,
      operatingHours: operatingHours || 'Mon-Sat 8:00 AM - 6:00 PM',
      website: website || '',
      rating: 0,
      totalReviews: 0,
      isVerified: false,
    },
  });

  if (user) {
    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      companyProfile: user.companyProfile,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid company details. Registration failed.');
  }
});

// @desc    Get own company profile
// @route   GET /api/inspection/companies/profile
// @access  Private (InspectionCompany)
const getCompanyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  if (!user || user.role !== 'InspectionCompany') {
    res.status(404);
    throw new Error('Company profile not found');
  }

  // Also fetch package count
  const packageCount = await InspectionPackage.countDocuments({ companyId: req.user._id });

  res.status(200).json({
    ...user.toObject(),
    packageCount,
  });
});

// @desc    Update own company profile
// @route   PUT /api/inspection/companies/profile
// @access  Private (InspectionCompany)
const updateCompanyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user || user.role !== 'InspectionCompany') {
    res.status(404);
    throw new Error('Company profile not found');
  }

  const { companyName, description, address, city, operatingHours, website, name, phone } = req.body;

  // Update top-level user fields
  if (name) user.name = name;
  if (phone) user.phone = phone;

  // Update companyProfile subfields
  if (companyName) user.companyProfile.companyName = companyName;
  if (description) user.companyProfile.description = description;
  if (address) user.companyProfile.address = address;
  if (city) user.companyProfile.city = city;
  if (operatingHours) user.companyProfile.operatingHours = operatingHours;
  if (website) user.companyProfile.website = website;

  // Handle logo upload
  if (req.files && req.files.length > 0) {
    user.companyProfile.logo = `/uploads/${req.files[0].filename}`;
  }

  const updated = await user.save();
  res.status(200).json({
    _id: updated.id,
    name: updated.name,
    email: updated.email,
    phone: updated.phone,
    role: updated.role,
    companyProfile: updated.companyProfile,
  });
});

// @desc    Get all inspection companies (public browsing)
// @route   GET /api/inspection/companies
// @access  Public
const getAllCompanies = asyncHandler(async (req, res) => {
  const { city, search } = req.query;

  let query = { role: 'InspectionCompany' };

  if (city && city !== 'All Cities') {
    query['companyProfile.city'] = city;
  }

  if (search) {
    query['companyProfile.companyName'] = new RegExp(search, 'i');
  }

  const companies = await User.find(query)
    .select('-password')
    .sort({ 'companyProfile.rating': -1, createdAt: -1 });

  // Fetch package counts for each company
  const companiesWithCounts = await Promise.all(
    companies.map(async (company) => {
      const packageCount = await InspectionPackage.countDocuments({
        companyId: company._id,
        isActive: true,
      });
      return { ...company.toObject(), packageCount };
    })
  );

  res.status(200).json(companiesWithCounts);
});

// @desc    Get single company by ID with their packages
// @route   GET /api/inspection/companies/:id
// @access  Public
const getCompanyById = asyncHandler(async (req, res) => {
  const company = await User.findById(req.params.id).select('-password');
  if (!company || company.role !== 'InspectionCompany') {
    res.status(404);
    throw new Error('Inspection company not found');
  }

  const packages = await InspectionPackage.find({
    companyId: company._id,
    isActive: true,
  }).sort({ price: 1 });

  res.status(200).json({
    ...company.toObject(),
    packages,
  });
});

// @desc    Create a new inspection package
// @route   POST /api/inspection/packages
// @access  Private (InspectionCompany)
const createPackage = asyncHandler(async (req, res) => {
  const { name, description, price, duration, vehicleTypes, checklistItems } = req.body;

  if (!name || !description || !price || !duration) {
    res.status(400);
    throw new Error('Please provide: name, description, price, and duration');
  }

  let images = [];
  if (req.files && req.files.length > 0) {
    images = req.files.map(file => `/uploads/${file.filename}`);
  }

  // Parse arrays if sent as JSON strings (from FormData)
  let parsedVehicleTypes = vehicleTypes;
  let parsedChecklistItems = checklistItems;
  if (typeof vehicleTypes === 'string') {
    try { parsedVehicleTypes = JSON.parse(vehicleTypes); } catch (e) { parsedVehicleTypes = [vehicleTypes]; }
  }
  if (typeof checklistItems === 'string') {
    try { parsedChecklistItems = JSON.parse(checklistItems); } catch (e) { parsedChecklistItems = [checklistItems]; }
  }

  const pkg = await InspectionPackage.create({
    companyId: req.user._id,
    name,
    description,
    price: Number(price),
    duration: Number(duration),
    vehicleTypes: parsedVehicleTypes || ['Car'],
    checklistItems: parsedChecklistItems || [],
    images,
  });

  res.status(201).json(pkg);
});

// @desc    Get own packages
// @route   GET /api/inspection/packages/my-packages
// @access  Private (InspectionCompany)
const getMyPackages = asyncHandler(async (req, res) => {
  const packages = await InspectionPackage.find({ companyId: req.user._id }).sort({ createdAt: -1 });
  res.status(200).json(packages);
});

// @desc    Update own package
// @route   PUT /api/inspection/packages/:id
// @access  Private (InspectionCompany)
const updatePackage = asyncHandler(async (req, res) => {
  const pkg = await InspectionPackage.findById(req.params.id);
  if (!pkg) {
    res.status(404);
    throw new Error('Package not found');
  }

  if (pkg.companyId.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to update this package');
  }

  const updateData = { ...req.body };

  // Numerical conversions
  if (updateData.price) updateData.price = Number(updateData.price);
  if (updateData.duration) updateData.duration = Number(updateData.duration);
  if (updateData.isActive !== undefined) {
    updateData.isActive = updateData.isActive === 'true' || updateData.isActive === true;
  }

  // Parse arrays
  if (typeof updateData.vehicleTypes === 'string') {
    try { updateData.vehicleTypes = JSON.parse(updateData.vehicleTypes); } catch (e) { updateData.vehicleTypes = [updateData.vehicleTypes]; }
  }
  if (typeof updateData.checklistItems === 'string') {
    try { updateData.checklistItems = JSON.parse(updateData.checklistItems); } catch (e) { updateData.checklistItems = [updateData.checklistItems]; }
  }

  // Handle image uploads
  if (req.files && req.files.length > 0) {
    updateData.images = req.files.map(file => `/uploads/${file.filename}`);
  }

  Object.assign(pkg, updateData);
  const updated = await pkg.save();
  res.status(200).json(updated);
});

// @desc    Delete own package
// @route   DELETE /api/inspection/packages/:id
// @access  Private (InspectionCompany)
const deletePackage = asyncHandler(async (req, res) => {
  const pkg = await InspectionPackage.findById(req.params.id);
  if (!pkg) {
    res.status(404);
    throw new Error('Package not found');
  }

  if (pkg.companyId.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to delete this package');
  }

  await pkg.deleteOne();
  res.status(200).json({ message: 'Package removed successfully' });
});

// @desc    Get all active packages for a specific company
// @route   GET /api/inspection/companies/:id/packages
// @access  Public
const getPackagesByCompany = asyncHandler(async (req, res) => {
  const packages = await InspectionPackage.find({
    companyId: req.params.id,
    isActive: true,
  }).sort({ price: 1 });

  res.status(200).json(packages);
});

module.exports = {
  registerCompany,
  getCompanyProfile,
  updateCompanyProfile,
  getAllCompanies,
  getCompanyById,
  createPackage,
  updatePackage,
  deletePackage,
  getMyPackages,
  getPackagesByCompany,
};
