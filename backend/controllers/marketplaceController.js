const asyncHandler = require('express-async-handler');
const Listing = require('../models/Listing');

// @desc    Get all active listings (with optional filters)
// @route   GET /api/marketplace
// @access  Public
const getListings = asyncHandler(async (req, res) => {
  const { 
    make, fuelType, transmission, bodyType, location, 
    minPrice, maxPrice, yearMin, yearMax, condition, search, sellerId 
  } = req.query;

  let query = { status: 'Available' };

  if (sellerId) query.sellerId = sellerId;
  if (make) query.make = new RegExp(make, 'i');
  if (fuelType) query.fuelType = fuelType;
  if (transmission) query.transmission = transmission;
  if (bodyType) query.bodyType = bodyType;
  if (condition) query.condition = condition;
  if (location) query.location = new RegExp(location, 'i');

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  if (yearMin || yearMax) {
    query.year = {};
    if (yearMin) query.year.$gte = Number(yearMin);
    if (yearMax) query.year.$lte = Number(yearMax);
  }

  if (search) {
    query.$or = [
      { make: new RegExp(search, 'i') },
      { model: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') },
    ];
  }

  const listings = await Listing.find(query)
    .populate('sellerId', 'name phone email')
    .populate('inspectionReportId', 'inspectionResult overallScore')
    .sort({ createdAt: -1 });

  res.status(200).json(listings);
});

// @desc    Get a single listing by ID
// @route   GET /api/marketplace/:id
// @access  Public
const getListingById = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id)
    .populate('sellerId', 'name phone email')
    .populate('inspectionReportId', 'inspectionResult overallScore');

  if (!listing) {
    res.status(404);
    throw new Error('Listing not found');
  }

  res.status(200).json(listing);
});

// @desc    Create a new vehicle listing
// @route   POST /api/marketplace
// @access  Private
const createListing = asyncHandler(async (req, res) => {
  const { make, model, year, price, mileage, fuelType, transmission, bodyType, location, description, inspectionReportId } = req.body;

  if (!make || !model || !year || !price || !location) {
    res.status(400);
    throw new Error('Please provide: make, model, year, price, and location');
  }

  // Collect image paths from multer
  const images = req.files ? req.files.map(file => file.path) : [];

  const listing = await Listing.create({
    sellerId: req.user._id,
    make,
    model,
    year: Number(year),
    price: Number(price),
    mileage: mileage ? Number(mileage) : 0,
    fuelType: fuelType || 'Petrol',
    transmission: transmission || 'Manual',
    bodyType: bodyType || 'Sedan',
    location,
    description: description || '',
    images,
    inspectionReportId: inspectionReportId || null,
  });

  const populated = await Listing.findById(listing._id)
    .populate('sellerId', 'name phone email')
    .populate('inspectionReportId', 'inspectionResult overallScore');

  res.status(201).json(populated);
});

// @desc    Update a listing
// @route   PUT /api/marketplace/:id
// @access  Private (Owner only)
const updateListing = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id);

  if (!listing) {
    res.status(404);
    throw new Error('Listing not found');
  }

  if (listing.sellerId.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to update this listing');
  }

  // Update text fields
  const fields = ['make', 'model', 'year', 'price', 'mileage', 'fuelType', 'transmission', 'bodyType', 'location', 'description', 'status', 'inspectionReportId'];
  fields.forEach(field => {
    if (req.body[field] !== undefined) {
      listing[field] = req.body[field];
    }
  });

  // If new images were uploaded, replace the existing images
  if (req.files && req.files.length > 0) {
    listing.images = req.files.map(file => file.path);
  }

  const updated = await listing.save();
  const populated = await Listing.findById(updated._id)
    .populate('sellerId', 'name phone email')
    .populate('inspectionReportId', 'inspectionResult overallScore');

  res.status(200).json(populated);
});

// @desc    Delete a listing
// @route   DELETE /api/marketplace/:id
// @access  Private (Owner only)
const deleteListing = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id);

  if (!listing) {
    res.status(404);
    throw new Error('Listing not found');
  }

  if (listing.sellerId.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to delete this listing');
  }

  await listing.deleteOne();
  res.status(200).json({ message: 'Listing removed successfully', id: req.params.id });
});

// @desc    Get logged-in user's listings
// @route   GET /api/marketplace/my-listings
// @access  Private
const getMyListings = asyncHandler(async (req, res) => {
  const listings = await Listing.find({ sellerId: req.user._id })
    .sort({ createdAt: -1 });

  res.status(200).json(listings);
});

module.exports = {
  getListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  getMyListings,
};
