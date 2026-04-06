const asyncHandler = require('express-async-handler');
const ServiceOffering = require('../models/ServiceOffering');

// @desc    Create a new service offering
// @route   POST /api/service/offerings
// @access  Private (GarageOwner)
const createOffering = asyncHandler(async (req, res) => {
  const { name, description, category, estimatedPrice, estimatedDuration, vehicleTypes, images } = req.body;

  if (!name || !description || !category || !estimatedPrice || !estimatedDuration) {
    res.status(400);
    throw new Error('Please provide: name, description, category, estimatedPrice, and estimatedDuration');
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

  const offering = await ServiceOffering.create({
    garageId: req.user._id,
    name,
    description,
    category,
    estimatedPrice: Number(estimatedPrice),
    estimatedDuration: Number(estimatedDuration),
    vehicleTypes: parsedVehicleTypes || ['Any'],
    images: parsedImages,
  });

  res.status(201).json(offering);
});

// @desc    Get own service offerings
// @route   GET /api/service/offerings/my-offerings
// @access  Private (GarageOwner)
const getMyOfferings = asyncHandler(async (req, res) => {
  const offerings = await ServiceOffering.find({ garageId: req.user._id }).sort({ createdAt: -1 });
  res.status(200).json(offerings);
});

// @desc    Get service offerings by garage (public)
// @route   GET /api/service/garages/:garageId/offerings
// @access  Public
const getGarageOfferings = asyncHandler(async (req, res) => {
  const offerings = await ServiceOffering.find({ garageId: req.params.garageId, isActive: true });
  res.status(200).json(offerings);
});

// @desc    Update own service offering
// @route   PUT /api/service/offerings/:id
// @access  Private (GarageOwner)
const updateOffering = asyncHandler(async (req, res) => {
  const offering = await ServiceOffering.findById(req.params.id);

  if (!offering) {
    res.status(404);
    throw new Error('Offering not found');
  }

  if (offering.garageId.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to update this offering');
  }

  const updateData = { ...req.body };

  // Numerical conversions
  if (updateData.estimatedPrice) updateData.estimatedPrice = Number(updateData.estimatedPrice);
  if (updateData.estimatedDuration) updateData.estimatedDuration = Number(updateData.estimatedDuration);
  if (updateData.isActive !== undefined) {
    updateData.isActive = updateData.isActive === 'true' || updateData.isActive === true;
  }

  // Parse vehicleTypes if string
  if (typeof updateData.vehicleTypes === 'string') {
    try { updateData.vehicleTypes = JSON.parse(updateData.vehicleTypes); } catch (e) { updateData.vehicleTypes = [updateData.vehicleTypes]; }
  }

  // Handle image uploads
  if (req.files && req.files.length > 0) {
    updateData.images = req.files.map(file => `/uploads/${file.filename}`);
  }

  Object.assign(offering, updateData);
  const updated = await offering.save();
  res.status(200).json(updated);
});

// @desc    Delete own service offering
// @route   DELETE /api/service/offerings/:id
// @access  Private (GarageOwner)
const deleteOffering = asyncHandler(async (req, res) => {
  const offering = await ServiceOffering.findById(req.params.id);

  if (!offering) {
    res.status(404);
    throw new Error('Offering not found');
  }

  if (offering.garageId.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to delete this offering');
  }

  await offering.deleteOne();
  res.status(200).json({ message: 'Offering removed' });
});

module.exports = {
  createOffering,
  getMyOfferings,
  getGarageOfferings,
  updateOffering,
  deleteOffering,
};
