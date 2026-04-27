const asyncHandler = require('express-async-handler');
const ServiceProvider = require('../models/ServiceProvider');
const ServiceOffering = require('../models/ServiceOffering');

// Helper to validate positive numbers
const toPositiveNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

// Helper: recompute + persist serviceCategories from active offerings
const syncServiceCategories = async (garageId) => {
  const categories = await ServiceOffering.distinct('category', {
    garageId,
    isActive: true,
  });
  await ServiceProvider.findByIdAndUpdate(garageId, { serviceCategories: categories });
};

// @desc    Create a new service offering
// @route   POST /api/service/offerings
// @access  Private (GarageOwner)
const createOffering = asyncHandler(async (req, res) => {
  const { name, description, category, estimatedPrice, estimatedDuration, vehicleTypes, images } = req.body;

  if (!name || !description || !category || !estimatedPrice || !estimatedDuration) {
    res.status(400);
    throw new Error('Please provide: name, description, category, estimatedPrice, and estimatedDuration');
  }

  // Find the garage owned by current user
  const myGarage = await ServiceProvider.findOne({ ownerId: req.user._id });
  if (!myGarage) {
    res.status(404);
    throw new Error('You do not own a registered garage');
  }

  // Parse vehicleTypes if sent as JSON string (from FormData)
  let parsedVehicleTypes = vehicleTypes;
  if (typeof vehicleTypes === 'string') {
    try { parsedVehicleTypes = JSON.parse(vehicleTypes); } catch (e) { parsedVehicleTypes = [vehicleTypes]; }
  }

  // Handle images
  let parsedImages = images || [];
  if (req.files && req.files.length > 0) {
    parsedImages = req.files.map(file => `/uploads/${file.filename}`);
  }

  const parsedEstimatedPrice = toPositiveNumber(estimatedPrice);
  const parsedEstimatedDuration = toPositiveNumber(estimatedDuration);

  if (parsedEstimatedPrice === null || parsedEstimatedDuration === null) {
    res.status(400);
    throw new Error('estimatedPrice and estimatedDuration must be positive numbers');
  }

  const offering = await ServiceOffering.create({
    garageId: myGarage._id,
    name,
    description,
    category,
    estimatedPrice: parsedEstimatedPrice,
    estimatedDuration: parsedEstimatedDuration,
    vehicleTypes: parsedVehicleTypes || ['Any'],
    images: parsedImages,
  });

  await syncServiceCategories(myGarage._id);

  res.status(201).json(offering);
});

// @desc    Get own service offerings
// @route   GET /api/service/offerings/my-offerings
// @access  Private (GarageOwner)
const getMyOfferings = asyncHandler(async (req, res) => {
  // Find the garage owned by current user
  const myGarage = await ServiceProvider.findOne({ ownerId: req.user._id });
  if (!myGarage) {
    res.status(404);
    throw new Error('You do not own a registered garage');
  }

  const offerings = await ServiceOffering.find({ garageId: myGarage._id }).sort({ createdAt: -1 });
  res.status(200).json(offerings);
});

// @desc    Get service offerings by garage (public)
// @route   GET /api/service/garages/:garageId/offerings
// @access  Public
const getGarageOfferings = asyncHandler(async (req, res) => {
  const offerings = await ServiceOffering.find({ garageId: req.params.garageId, isActive: true });
  res.status(200).json(offerings);
});

// @desc    Get a single offering by ID (public)
// @route   GET /api/service/offerings/:id
// @access  Public
const getOfferingById = asyncHandler(async (req, res) => {
  const offering = await ServiceOffering.findById(req.params.id);
  if (!offering) {
    res.status(404);
    throw new Error('Service offering not found');
  }
  res.status(200).json(offering);
});

// @desc    Update own service offering
// @route   PUT /api/service/offerings/:id
// @access  Private (GarageOwner)
const updateOffering = asyncHandler(async (req, res) => {
  // Find the garage owned by current user
  const myGarage = await ServiceProvider.findOne({ ownerId: req.user._id });
  if (!myGarage) {
    res.status(404);
    throw new Error('You do not own a registered garage');
  }

  const offering = await ServiceOffering.findById(req.params.id);

  if (!offering) {
    res.status(404);
    throw new Error('Offering not found');
  }

  if (offering.garageId.toString() !== myGarage._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to update this offering');
  }

  const updateData = { ...req.body };
  const safeUpdates = {};

  if (updateData.name !== undefined) safeUpdates.name = updateData.name;
  if (updateData.description !== undefined) safeUpdates.description = updateData.description;
  if (updateData.category !== undefined) safeUpdates.category = updateData.category;
  if (updateData.estimatedPrice !== undefined) {
    const parsedEstimatedPrice = toPositiveNumber(updateData.estimatedPrice);
    if (parsedEstimatedPrice === null) {
      res.status(400);
      throw new Error('estimatedPrice must be a positive number');
    }
    safeUpdates.estimatedPrice = parsedEstimatedPrice;
  }
  if (updateData.estimatedDuration !== undefined) {
    const parsedEstimatedDuration = toPositiveNumber(updateData.estimatedDuration);
    if (parsedEstimatedDuration === null) {
      res.status(400);
      throw new Error('estimatedDuration must be a positive number');
    }
    safeUpdates.estimatedDuration = parsedEstimatedDuration;
  }
  if (updateData.isActive !== undefined) {
    safeUpdates.isActive = updateData.isActive === 'true' || updateData.isActive === true;
  }

  // Parse vehicleTypes if string
  if (typeof updateData.vehicleTypes === 'string') {
    try { safeUpdates.vehicleTypes = JSON.parse(updateData.vehicleTypes); } catch (e) { safeUpdates.vehicleTypes = [updateData.vehicleTypes]; }
  } else if (Array.isArray(updateData.vehicleTypes)) {
    safeUpdates.vehicleTypes = updateData.vehicleTypes;
  }

  // Handle image uploads
  if (req.files && req.files.length > 0) {
    safeUpdates.images = req.files.map(file => `/uploads/${file.filename}`);
  }

  Object.assign(offering, safeUpdates);
  const updated = await offering.save();
  await syncServiceCategories(myGarage._id);
  res.status(200).json(updated);
});

// @desc    Delete own service offering
// @route   DELETE /api/service/offerings/:id
// @access  Private (GarageOwner)
const deleteOffering = asyncHandler(async (req, res) => {
  // Find the garage owned by current user
  const myGarage = await ServiceProvider.findOne({ ownerId: req.user._id });
  if (!myGarage) {
    res.status(404);
    throw new Error('You do not own a registered garage');
  }

  const offering = await ServiceOffering.findById(req.params.id);

  if (!offering) {
    res.status(404);
    throw new Error('Offering not found');
  }

  if (offering.garageId.toString() !== myGarage._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to delete this offering');
  }

  await offering.deleteOne();
  await syncServiceCategories(myGarage._id);
  res.status(200).json({ message: 'Offering removed' });
});

module.exports = {
  createOffering,
  getMyOfferings,
  getGarageOfferings,
  getOfferingById,
  updateOffering,
  deleteOffering,
};
